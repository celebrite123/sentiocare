

# Fix: Agents Calling Every 10-15 Minutes Non-Stop

## Problem Identified

**Rajiv kumar** has been receiving calls every ~15 minutes all day today! Looking at the database:

| Time (UTC) | Status | What Happened |
|------------|--------|---------------|
| 14:25:04 | retried | Call attempt |
| 14:40:04 | retried | Call attempt |
| 14:55:03 | retried | Call attempt |
| 15:10:04 | retried | Call attempt |
| 15:25:04 | retried | Call attempt |
| ... | ... | **17+ more calls** |
| 18:55:05 | no_answer | **Latest - still pending retry!** |

**This is terrible user experience** - the elder is getting bombarded with calls!

---

## Root Cause Analysis

```text
┌───────────────────────────────────────────────────────────────────────────┐
│                    THE CALL BOMBARDMENT LOOP                               │
├───────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  Every 5 minutes (cron job runs):                                          │
│  ┌───────────────────┐                                                     │
│  │ run-scheduled-    │   Rajiv's time: 19:29 IST                          │
│  │ checkins          │   But last_run_at: 13:55 UTC (Jan 30)               │
│  │                   │   Today (Feb 1) ≠ Jan 30 → NOT alreadyRunToday!    │
│  └─────────┬─────────┘                                                     │
│            ▼                                                               │
│  ┌───────────────────┐                                                     │
│  │ Triggers new call │   Call fails (no answer)                           │
│  │ for Rajiv         │   bolna-webhook sets: next_retry_at = +10 mins     │
│  └─────────┬─────────┘                                                     │
│            ▼                                                               │
│  ┌───────────────────┐                                                     │
│  │ voiceSuccess=true │   Because bolna-voice-call returned success!       │
│  │ last_run_at=NOW   │   ← BUG: This marks call as "done" for today       │
│  └─────────┬─────────┘                                                     │
│            ▼                                                               │
│  ┌───────────────────┐   5 mins later...                                  │
│  │ Cron runs again   │   IST date check: last_run_at is TODAY            │
│  │                   │   alreadyRunToday = TRUE → Skip ✓                  │
│  └─────────────────────────────────────────────────────────────────────────┘
│                                                                            │
│  BUT ALSO...                                                               │
│                                                                            │
│  Every 5 minutes (another cron job runs):                                  │
│  ┌───────────────────┐                                                     │
│  │ process-call-     │   Finds: status='no_answer', next_retry_at < now   │
│  │ retries           │   Marks as 'retried', triggers NEW call            │
│  └─────────┬─────────┘   The NEW call creates ANOTHER call_attempt        │
│            ▼                                                               │
│  ┌───────────────────┐                                                     │
│  │ New call also     │   This NEW attempt also gets no_answer             │
│  │ fails             │   Gets scheduled for retry again!                  │
│  └─────────┬─────────┘                                                     │
│            ▼                                                               │
│  ┌───────────────────┐                                                     │
│  │ INFINITE LOOP!    │   Every ~15 mins: retry → fail → retry → fail...  │
│  └───────────────────┘                                                     │
│                                                                            │
└───────────────────────────────────────────────────────────────────────────┘
```

**Multiple Issues Found:**

1. **Daily scheduler keeps re-initiating**: Even though `last_run_at` is updated, when a call fails and gets marked as `retried`, the retry logic creates a NEW `call_attempts` record with `status='no_answer'` which then gets picked up again

2. **Retry counter never hits max**: Each NEW call_attempt starts with `retry_count: 0`, so the 2-retry limit is never enforced across the chain

3. **No daily call limit per elder**: There's no check to prevent more than X calls per elder per day

4. **Retry timing is wrong**: Retry should be 10 min for first, then 2 HOURS - but since new call_attempts are created, each "new" call gets the 10-min retry

---

## Solution

### Fix 1: Add Daily Call Limit Per Elder

In `bolna-voice-call`, check if elder already received max calls today:

```javascript
// Before initiating call, check daily limit
const todayStart = new Date();
todayStart.setUTCHours(0, 0, 0, 0);

const { data: todayCalls, error: countError } = await supabase
  .from("call_attempts")
  .select("id")
  .eq("elder_id", elderId)
  .gte("created_at", todayStart.toISOString());

const MAX_CALLS_PER_DAY = 3; // 1 scheduled + 2 retries max
if (todayCalls && todayCalls.length >= MAX_CALLS_PER_DAY) {
  console.log(`Daily call limit reached for elder ${elderId}: ${todayCalls.length} calls today`);
  return new Response(
    JSON.stringify({ 
      error: "Daily call limit reached for this elder",
      code: "DAILY_LIMIT_REACHED",
      callsToday: todayCalls.length
    }),
    { status: 429, headers: corsHeaders }
  );
}
```

### Fix 2: Fix Retry Logic - Track Across Call Chain

In `bolna-webhook`, don't reset retry_count when creating the new call_attempt for a retry:

```javascript
// When bolna-voice-call is called from process-call-retries, 
// pass the retry_count so it can be preserved
// OR: Use a "call_chain_id" to track all attempts for one scheduled check-in
```

Better approach: Store `original_schedule_id` on call_attempts and count ALL attempts for that schedule today:

```javascript
// In bolna-voice-call, before creating call_attempt
const { data: existingAttempts } = await supabase
  .from("call_attempts")
  .select("id, retry_count")
  .eq("elder_id", elderId)
  .gte("created_at", todayStart.toISOString())
  .order("created_at", { ascending: false })
  .limit(1);

const totalAttemptsToday = existingAttempts?.length || 0;
const lastRetryCount = existingAttempts?.[0]?.retry_count || 0;

// If this is a retry (coming from process-call-retries), inherit retry_count
// Check the caller context
```

### Fix 3: Simplest Fix - Global Daily Debounce

Add a check in BOTH `run-scheduled-checkins` AND `process-call-retries`:

```javascript
// Check if elder has ANY call_attempt in last 30 minutes (regardless of status)
const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000);
const { data: recentCalls } = await supabase
  .from("call_attempts")
  .select("id, status, created_at")
  .eq("elder_id", elderId)
  .gte("created_at", thirtyMinsAgo.toISOString());

if (recentCalls && recentCalls.length > 0) {
  console.log(`Skipping - elder ${elderId} has ${recentCalls.length} call(s) in last 30 mins`);
  return; // Skip this elder
}
```

---

## Recommended Fix Implementation

### Step 1: Add Daily Call Limit in `bolna-voice-call`

Hard limit of 3 calls per elder per day (prevents bombardment)

### Step 2: Fix `process-call-retries` to NOT Create New Call Attempts

When retrying, UPDATE the existing call_attempt instead of creating new ones:

```javascript
// Instead of calling bolna-voice-call (which creates new call_attempt),
// directly call the Bolna API and update the SAME call_attempt record
```

### Step 3: Update `run-scheduled-checkins` to Check for Pending Retries

Before triggering a new call, check if there's already an active retry pending:

```javascript
// Before initiating new scheduled call
const { data: pendingRetry } = await supabase
  .from("call_attempts")
  .select("id, status, next_retry_at")
  .eq("elder_id", schedule.elder_id)
  .in("status", ["initiated", "no_answer"])
  .not("next_retry_at", "is", null)
  .single();

if (pendingRetry) {
  console.log(`Skipping new call - elder ${schedule.elder_id} has pending retry`);
  continue;
}
```

---

## Files to Modify

| File | Change |
|------|--------|
| `supabase/functions/bolna-voice-call/index.ts` | Add daily call limit check (max 3 per day) |
| `supabase/functions/run-scheduled-checkins/index.ts` | Check for pending retries before new call |
| `supabase/functions/process-call-retries/index.ts` | Don't create new call_attempts, update existing |

---

## Immediate Database Cleanup

Clear Rajiv's pending retry to stop the bombardment immediately:

```sql
UPDATE call_attempts 
SET status = 'cancelled', next_retry_at = NULL 
WHERE elder_id = 'f211508f-689d-4c99-a9f0-a6f3699fdb88' 
AND status = 'no_answer' 
AND next_retry_at IS NOT NULL;
```

---

## Expected Outcome After Fix

| Scenario | Before (Broken) | After (Fixed) |
|----------|-----------------|---------------|
| Call not answered | Retries every 10-15 min forever | Max 3 calls/day, proper 10min → 2hr spacing |
| Retry scheduling | Creates new call_attempt each time | Updates same record, respects retry_count |
| Daily limit | None | 3 calls max per elder per day |
| Pending retries | Scheduler ignores them | Scheduler waits for retry to complete |

