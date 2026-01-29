

# Fix: Missed Scheduled Calls Bug (Parwati Devi - 3 Days Lost)

## Problem Confirmed

Parwati Devi, a trial customer (5 days), only received check-in calls on 2 days instead of 5. Investigation revealed:

| IST Date | Expected | Actual |
|----------|----------|--------|
| Jan 23 | Call | ✓ (Profile created) |
| Jan 24 | Call | ✓ |
| Jan 25 | Call | ✓ |
| Jan 26 | Call | ❌ MISSED |
| Jan 27 | Call | ❌ MISSED |
| Jan 28 | Call | ❌ MISSED (Trial ended) |

---

## Root Cause: UTC vs IST Date Comparison

The bug is in `run-scheduled-checkins/index.ts` at lines 84-85:

```javascript
const alreadyRunToday = lastRun && 
  lastRun.toDateString() === now.toDateString();  // Uses UTC dates!
```

**Problem**: `toDateString()` returns the date in UTC timezone, but check-in schedules are in IST (India Standard Time). 

**Example Failure Scenario**:
- Parwati's schedule: 08:00 IST = 02:30 UTC
- `last_run_at` from Jan 25: `2026-01-25T02:30:00Z`
- Current time on Jan 26 at 02:30 UTC: `2026-01-26T02:30:00Z`

In this case, the UTC dates are different ("Jan 25" vs "Jan 26"), so it works. BUT:

- If `last_run_at` = `2026-01-25T23:30:00Z` (from a late-night cron)
- Current time = `2026-01-26T02:30:00Z` (08:00 IST next day)
- Both dates in UTC = "Jan 26" and "Jan 26" → `alreadyRunToday = true` → **SKIPPED!**

The more insidious issue: if the `last_run_at` gets updated during late UTC hours (after ~18:30 UTC = midnight IST), it will incorrectly mark the next IST day as "already run" since they share the same UTC date.

---

## Fix: Use IST Date Comparison

Replace UTC-based date comparison with IST-aware logic:

```javascript
// OLD (BUG):
const lastRun = schedule.last_run_at ? new Date(schedule.last_run_at) : null;
const alreadyRunToday = lastRun && 
  lastRun.toDateString() === now.toDateString();

// NEW (FIXED):
const lastRun = schedule.last_run_at ? new Date(schedule.last_run_at) : null;

// Convert both dates to IST for comparison
function getISTDateString(date: Date): string {
  const istOffset = 5.5 * 60 * 60 * 1000; // 5 hours 30 minutes in ms
  const istDate = new Date(date.getTime() + istOffset);
  return istDate.toISOString().split('T')[0]; // Returns "YYYY-MM-DD"
}

const alreadyRunToday = lastRun && 
  getISTDateString(lastRun) === getISTDateString(now);
```

---

## Additional Safety Improvements

### 1. Add Explicit IST Helper Function

Create a reusable helper at the top of the file:

```javascript
// Convert UTC date to IST date string (YYYY-MM-DD)
function getISTDateString(date: Date): string {
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000; // 5 hours 30 minutes
  const istDate = new Date(date.getTime() + IST_OFFSET_MS);
  return istDate.toISOString().split('T')[0];
}
```

### 2. Add Detailed Logging for Debugging

```javascript
console.log(`Schedule ${schedule.id}: time=${schedule.time_of_day}, ` +
  `timeMatch=${isTimeMatch}, dayMatch=${isDayMatch}, ` +
  `alreadyRun=${alreadyRunToday}, ` +
  `lastRunIST=${lastRun ? getISTDateString(lastRun) : 'never'}, ` +
  `nowIST=${getISTDateString(now)}`);
```

### 3. Update last_run_at Only on Successful Call

Currently, `last_run_at` is updated even if the voice call fails. Move the update inside the success path:

```javascript
// Only update last_run_at AFTER successful voice/whatsapp initiation
if (shouldRunVoice || shouldRunWhatsApp) {
  // ... run calls ...
  
  // Update last_run_at only after successful initiation
  await supabase
    .from("check_in_schedules")
    .update({ last_run_at: now.toISOString() })
    .eq("id", schedule.id);
}
```

---

## Files to Modify

| File | Change |
|------|--------|
| `supabase/functions/run-scheduled-checkins/index.ts` | Fix IST date comparison, add helper function, improve logging |

---

## Verification After Fix

1. **Manual Test**: Trigger the edge function and verify logs show correct IST date comparison
2. **Database Check**: Ensure `last_run_at` updates only after successful calls
3. **Monitor**: Watch for next scheduled run at 08:00 IST to confirm fix works

---

## Recovery: Make Whole Missed Calls

Since Parwati missed 3 days of her trial, consider:
1. **Extend trial** by 3 days (update `trial_ends_at` in profiles)
2. **Trigger manual calls** for the missed days
3. **Contact caregiver** to apologize for the gap

Would you like me to also include a migration to extend Parwati's trial as compensation?

