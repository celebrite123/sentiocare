

# Fix: Recording Buffering + WhatsApp Migration to Interakt

## Issue 1: Recording Playback Buffering

**Root cause found in analytics**: The `proxy-recording` edge function downloads the **entire** S3 audio file into memory (`await audioResponse.arrayBuffer()`) before sending it back. For recordings that are 2-5MB, this causes the edge function to timeout or stall, leaving the browser buffering forever. The analytics confirm OPTIONS preflights succeed but actual GET requests never complete.

**Fix**: Stream the S3 response body directly instead of buffering.

### `supabase/functions/proxy-recording/index.ts`
Replace the buffering approach (lines 128-149) with response streaming:
```typescript
// BEFORE (buffers entire file — causes timeout):
const audioData = await audioResponse.arrayBuffer();
return new Response(audioData, { ... });

// AFTER (streams directly — instant start):
const contentType = audioResponse.headers.get('content-type') || 'audio/mpeg';
const contentLength = audioResponse.headers.get('content-length');

return new Response(audioResponse.body, {
  status: 200,
  headers: {
    ...corsHeaders,
    'Content-Type': contentType,
    ...(contentLength ? { 'Content-Length': contentLength } : {}),
    'Cache-Control': 'public, max-age=3600',
  },
});
```

This starts sending audio to the browser immediately as data arrives from S3, eliminating the buffering delay entirely.

---

## Issue 2: WhatsApp Migration — Twilio → Interakt (B2C only)

### What changes

Interakt uses a simple REST API with an API key. No SID/token pair, no `whatsapp:` prefix formatting. Much simpler.

**Interakt API pattern**:
```
POST https://api.interakt.ai/v1/public/message/
Header: Authorization: Basic {INTERAKT_API_KEY}
Body: { countryCode, phoneNumber, type: "Text", data: { message } }
```

### Step 1: Add INTERAKT_API_KEY secret
Before any code changes, we need the API key from your Interakt dashboard.

### Step 2: Create a shared WhatsApp sender utility
Create a new edge function `send-whatsapp-message/index.ts` that abstracts the send logic. All B2C functions call this instead of Twilio directly. This way the provider switch is in ONE place.

### Step 3: Update B2C functions (3 files)

| Function | Change |
|----------|--------|
| `bolna-webhook/index.ts` | `sendCaregiverDailyConfirmation` + `sendMissedCallNotifications`: Replace Twilio fetch calls with Interakt API calls |
| `send-whatsapp-checkin/index.ts` | Replace Twilio send block with Interakt API call |
| `twilio-whatsapp-webhook/index.ts` | This is the **inbound** webhook. Interakt uses a different webhook format. Need to create `interakt-whatsapp-webhook/index.ts` with Interakt's payload format and configure it in Interakt dashboard |

### Step 4: B2B stays on Twilio
`b2b-whatsapp-webhook/index.ts` and B2B notification functions stay untouched.

### Step 5: Interakt webhook setup
After deployment, you'll need to configure the webhook URL in your Interakt dashboard:
`https://hcdwbpbvuvbrozttahfz.supabase.co/functions/v1/interakt-whatsapp-webhook`

### Risk mitigation
- B2B is untouched
- All Twilio code stays in the codebase but B2C paths switch to Interakt
- If Interakt fails, we can revert by changing one utility function

---

## Execution order
1. Fix recording streaming (immediate, no secrets needed)
2. Request INTERAKT_API_KEY from you
3. Create shared WhatsApp sender + update B2C functions
4. Create Interakt inbound webhook handler
5. You configure webhook URL in Interakt dashboard

