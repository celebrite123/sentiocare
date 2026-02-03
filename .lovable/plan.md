

# Fix: B2B Voice Calls Not Working - Wrong Bolna API Endpoint

## Problem Identified

The edge function logs show:
```
ERROR Bolna call failed for [patient_id]: {"detail":"Not Found"}
```

**Root Cause:** The Bolna API endpoint URL is incorrect.

| Current (Wrong) | Correct (From Bolna Docs) |
|-----------------|---------------------------|
| `https://api.bolna.dev/v2/calls` | `https://api.bolna.ai/call` |

The `{"detail":"Not Found"}` error is returned because `api.bolna.dev/v2/calls` does not exist - it's the wrong domain and endpoint path.

---

## Technical Fix

**File to modify:** `supabase/functions/run-scheduled-b2b-calls/index.ts`

**Line 148 - Change:**
```javascript
// Current (wrong)
const bolnaResponse = await fetch("https://api.bolna.dev/v2/calls", {

// Fixed
const bolnaResponse = await fetch("https://api.bolna.ai/call", {
```

---

## Additional Verification

I also confirmed:
- `BOLNA_API_KEY` secret exists and is configured
- `BOLNA_AGENT_ID_HINDI` secret exists
- Organization "Orchid Hospital" has `bolna_agent_id_hindi` set to `dff579d1-2f81-4a77-b29a-7db8aad4e34e`
- Voice is enabled (`voice_enabled: true`)
- Call limits are not exceeded (`calls_used_this_month: 0`)

The only issue is the wrong API endpoint URL.

---

## Implementation Steps

1. Update the Bolna API URL from `https://api.bolna.dev/v2/calls` to `https://api.bolna.ai/call`
2. Deploy the updated edge function
3. Test by clicking "Call Now" on a patient

---

## Expected Result After Fix

Edge function logs should show:
```
INFO Call initiated for [patient_id]: [execution_id]
```

Instead of:
```
ERROR Bolna call failed for [patient_id]: {"detail":"Not Found"}
```

