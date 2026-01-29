

# Fix: Rajiv's Missed Scheduled Call - Authentication Bug

## Problem Identified

Rajiv registered yesterday and scheduled a call for **7:29 PM IST** (based on database: `time_of_day: 19:29:00`). The system attempted to run the call at **19:25 IST** today, but **the call never completed**.

### Root Cause: Service Role Authentication Failure

The `bolna-voice-call` edge function has a strict authentication check that requires a **user JWT token**:

```text
┌─────────────────────────────────────────────────────────────────┐
│              AUTHENTICATION FLOW - CURRENT BUG                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Manual Call (Dashboard):                                        │
│  ┌──────────┐    ┌─────────────────┐    ┌─────────────────┐     │
│  │ User JWT │ ──▶│ bolna-voice-call│ ──▶│  ✓ Works!      │     │
│  └──────────┘    └─────────────────┘    └─────────────────┘     │
│                                                                  │
│  Scheduled Call (Cron):                                          │
│  ┌────────────────┐    ┌─────────────────┐    ┌─────────────┐   │
│  │ Service Role   │ ──▶│ bolna-voice-call│ ──▶│ ❌ REJECTED │   │
│  │ Key            │    │                 │    │ (401 Error) │   │
│  └────────────────┘    └─────────────────┘    └─────────────────┘│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Line 47-72 in `bolna-voice-call/index.ts`:**
- Requires `Authorization: Bearer <user_jwt_token>`
- Calls `supabaseAuth.auth.getUser()` which fails with service role key
- Returns 401 Unauthorized, silently failing the scheduled call

**Evidence:**
- `last_run_at` was updated to `2026-01-29 13:55:03.194+00` (system tried)
- No `call_attempts` record for today (call initiation failed)
- No `check_ins` record for today (call never happened)

---

## Solution: Dual Authentication Mode

Modify `bolna-voice-call` to accept **both** user JWT tokens (for dashboard calls) AND service role keys (for internal scheduled calls).

### Implementation

```typescript
// Check if this is a service role call (internal) or user call (dashboard)
const authHeader = req.headers.get('Authorization');
const token = authHeader?.replace('Bearer ', '');

// Service role key check - for internal edge function calls
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const isServiceRoleCall = token === serviceRoleKey;

if (isServiceRoleCall) {
  // Internal call from run-scheduled-checkins - skip user auth
  // Authorization is handled by the caller (service already verified elder ownership)
  console.log('Internal service call - bypassing user auth');
} else {
  // Dashboard call - require user JWT
  const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader! } }
  });
  
  const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
  if (userError || !user) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized - Invalid token' }),
      { status: 401, headers: corsHeaders }
    );
  }
  
  // Verify user owns this elder (existing ownership check)
  // ...
}
```

### Authorization Changes

For service role calls, we skip the owner verification since:
1. The service role has full database access
2. `run-scheduled-checkins` already fetches valid elder data
3. Only internal Supabase functions can use the service role key

---

## Files to Modify

| File | Change |
|------|--------|
| `supabase/functions/bolna-voice-call/index.ts` | Add dual auth mode (service role + user JWT) |

---

## Secondary Issue: Time Input Confusion

User says they scheduled for "7:30 am" but database shows `19:29:00` (7:29 PM).

**Possible causes:**
1. User entered "7:30" in 24-hour format thinking it was AM (user error)
2. UI time picker confusion (less likely - uses standard HTML time input)

**Recommendation:**
- After fixing the auth bug, verify with Rajiv what time they intended
- Consider adding AM/PM clarity hints to the time picker UI

---

## Additional Safety: Better Error Handling

Update `run-scheduled-checkins` to properly handle failed voice call responses:

```typescript
const voiceResponse = await fetch(...);
const voiceResult = await voiceResponse.json();

if (!voiceResponse.ok || !voiceResult.success) {
  console.error(`Voice call failed for elder ${elder?.id}:`, voiceResult);
  // DON'T update last_run_at if call failed
  // Mark as error in results
  results.push({
    schedule_id: schedule.id,
    elder_id: schedule.elder_id,
    status: "voice_failed",
    error: voiceResult.error || "Voice call initiation failed",
  });
  continue; // Skip to next schedule
}
```

---

## Expected Outcome

After fix:
1. ✅ Scheduled calls will work for trial users (voice enabled)
2. ✅ Service role authentication accepted for internal calls
3. ✅ Dashboard calls continue to work with user JWT
4. ✅ Failed calls won't mark the day as "complete"
5. ✅ Proper error logging for debugging

---

## Testing After Deployment

1. **Manually trigger** `run-scheduled-checkins` to verify it works
2. **Check logs** for successful voice call initiation
3. **Verify Rajiv receives call** at next scheduled time (19:29 IST)
4. **Confirm `call_attempts`** record is created

