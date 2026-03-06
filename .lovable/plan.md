

# Fix: Voice Call Crash + Emergency Call Error

## Root Cause

There is a **runtime crash** in `bolna-voice-call/index.ts` that kills ALL voice calls (scheduled AND emergency):

```
ReferenceError: previousSymptoms is not defined
    at line 434
```

In the recent symptom-sorting fix, the variable was renamed from `previousSymptoms` to `sortedSymptoms` (line 422-424), but the logging statement on line 434 still references `previousSymptoms`. This crash happens BEFORE the Bolna API call and BEFORE the `call_attempts` record is created, so:
- No call is made
- No record is saved
- Scheduler sees the HTTP 500 from `bolna-voice-call`, tries WhatsApp fallback (if configured), and updates `last_run_at`
- Emergency calls from the Dashboard also hit this same crash

This is why:
- No scheduled calls since Mar 3 (when the fix was deployed)
- Emergency call from Dashboard also fails with an error

## Fix

### File: `supabase/functions/bolna-voice-call/index.ts`

**Line 434**: Change `previousSymptoms.length` to `sortedSymptoms.length`

This is a one-line fix that unblocks ALL voice calls immediately.

### User preference: Voice-only retries (no WhatsApp fallback)

The scheduler currently falls back to WhatsApp when voice fails. Per your preference for "Voice only retries" for premium users, modify `run-scheduled-checkins/index.ts`:
- For premium users with `check_in_method: "both"`, if voice fails, do NOT trigger WhatsApp fallback. Instead, mark the attempt as failed and let the retry system handle it.
- Keep WhatsApp fallback ONLY for users whose `check_in_method` is explicitly `"whatsapp"`.

### Recovery: Manual call trigger

After deployment, trigger an immediate test call for elder `17fa63bf-3f6d-418c-b600-9e748055b662` (Aditya Raj) to confirm the fix works.

## Files Modified

| File | Change |
|------|--------|
| `supabase/functions/bolna-voice-call/index.ts` | Fix `previousSymptoms` -> `sortedSymptoms` reference on line 434 |
| `supabase/functions/run-scheduled-checkins/index.ts` | Remove WhatsApp fallback for premium voice users per user preference |

