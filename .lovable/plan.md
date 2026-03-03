

# Why Your 21:50 Call Didn't Fire -- and the Fix

## What Happened

Looking at the logs, your 21:50 IST schedule (schedule `52ba9416`) shows `timeMatch=false` at every recorded execution. The function ran at 23:50 and 23:55 IST -- but there are **no recorded executions near 21:50 IST**. The cron had a gap and missed the ±5 minute window entirely.

This is the same issue identified in the previous plan that was approved but **not yet implemented** for `run-scheduled-checkins/index.ts` -- only the Bolna/Vapi voice call fixes were applied.

## Root Cause

The scheduler uses a strict **±5 minute** time match window. If the cron job doesn't fire within that narrow window (due to cold starts, platform jitter, or transient failures), the schedule is silently skipped for the entire day.

## Fix: Three Changes to `run-scheduled-checkins/index.ts`

### 1. Widen time window from ±5 to ±8 minutes
Handles cron jitter and cold start delays.

### 2. Add a catch-up mechanism
If the current time is **past** the scheduled time, the schedule hasn't run today (`alreadyRunToday = false`), and `last_run_at` is from a previous day -- trigger it immediately. This ensures a missed 21:50 call gets picked up at 22:00, 22:05, etc., instead of being lost.

### 3. Log skipped-due-to-expired-trial explicitly
Currently expired trial users silently fail. Add a clear log line so you can distinguish "cron missed the window" from "trial expired."

## Files Modified

| File | Change |
|------|--------|
| `supabase/functions/run-scheduled-checkins/index.ts` | Widen window to ±8 min, add catch-up for missed schedules, add trial-expired logging |

