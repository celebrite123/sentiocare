

# Root Cause: Old `scheduled_callbacks` Triggered by New Cron Job

## What Happened

The `process-scheduled-callbacks` cron job was **just created** (running every 5 minutes). On its first run at 06:20 UTC Mar 8, it queried all callbacks with `status = 'pending'` and `scheduled_for <= now()`. It found **8 old callbacks from February 3-4** that were still in `pending` status. These were old RED ALERT callbacks for both "Aditya Raj" patient records.

For each one, it called `run-scheduled-b2b-calls` with `manual_trigger: true`, which bypasses all schedule guards (no staleness check, no debounce). Result: **8 parallel phone calls** to a patient discharged 37 days ago.

Nobody clicked anything. The new cron picked up stale data.

## Three Fixes Required

### 1. `process-scheduled-callbacks`: Add staleness guard
Skip any callback where `scheduled_for` is more than 24 hours in the past. Old callbacks should be auto-marked as `expired` instead of processed.

### 2. `run-scheduled-b2b-calls`: Add staleness guard on manual triggers
Even manual triggers should refuse to call patients discharged more than 14 days ago (max schedule day + 7 day buffer). Log a warning and skip.

### 3. `run-scheduled-b2b-calls`: Add debounce on manual triggers  
Check `last_call_date` — if it's within the last 5 minutes, reject with "call already in progress". Prevents parallel duplicate calls.

### 4. Database cleanup
- Mark both stale "Aditya Raj" patients as `status = 'completed'`
- Mark any remaining `pending` callbacks older than 24h as `expired`

### 5. `vapi-webhook`: Remove hardcoded "Thyroxin" example
Line 171 has `"Aditya said he's feeling fine but didn't take his Thyroxin today"` in the AI analysis prompt. This can influence hallucination. Replace with a generic placeholder.

## Files Modified

| File | Change |
|------|--------|
| `supabase/functions/process-scheduled-callbacks/index.ts` | Add 24h staleness guard — auto-expire old callbacks |
| `supabase/functions/run-scheduled-b2b-calls/index.ts` | Add discharge-age guard (14 days max) + 5-min debounce for manual triggers |
| `supabase/functions/vapi-webhook/index.ts` | Remove hardcoded "Thyroxin" example from AI prompt |
| Database | Mark stale patients as `completed`, expire old pending callbacks |

