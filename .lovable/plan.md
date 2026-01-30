

# Fix: Rajiv's Missed Calls - Complete Solution

## Problem Summary

| Issue | Detail |
|-------|--------|
| **Yesterday (Jan 29)** | Call was attempted at 7:25 PM IST but FAILED silently |
| **Today (Jan 30)** | Call hasn't happened yet - scheduled for 7:29 PM IST (NOT 7:30 AM!) |
| **User Expectation** | Rajiv wanted 7:30 AM, but entered 19:29 (7:29 PM) |

## Root Causes Identified

### 1. Silent Failure - `last_run_at` Updated Despite Failed Calls

The code currently updates `last_run_at` whenever `shouldRunVoice || shouldRunWhatsApp` is true, regardless of whether the calls actually succeeded:

```text
Current Flow (BROKEN):
┌────────────────┐    ┌──────────────────┐    ┌───────────────────┐
│ Try voice call │ ──▶│ Update last_run  │ ──▶│ Mark as "done"   │
│ (may fail!)    │    │ regardless       │    │ for today        │
└────────────────┘    └──────────────────┘    └───────────────────┘
```

### 2. No Response Status Validation

The scheduler doesn't check if `voiceResponse.ok` is true before proceeding:
- Line 159-166: Logs the result but doesn't prevent `last_run_at` update on failure
- Line 209-214: Updates `last_run_at` without checking response status

### 3. Time Input UX Issue

The HTML time input shows 24-hour format, confusing users who think in AM/PM terms.

---

## Solution Plan

### Fix 1: Validate Response Before Updating `last_run_at`

Only update `last_run_at` when calls actually initiate successfully:

```javascript
// Track if any call actually succeeded
let voiceSuccess = false;
let whatsappSuccess = false;

if (shouldRunVoice) {
  const voiceResponse = await fetch(...);
  const voiceResult = await voiceResponse.json();
  
  // CHECK BOTH HTTP STATUS AND RESPONSE SUCCESS
  if (voiceResponse.ok && voiceResult.success) {
    voiceSuccess = true;
    console.log(`Voice call initiated. ID: ${voiceResult.execution_id}`);
  } else {
    console.error("Voice call FAILED:", voiceResult.error || voiceResult);
  }
}

if (shouldRunWhatsApp && elder?.whatsapp_number) {
  const whatsappResponse = await fetch(...);
  const whatsappResult = await whatsappResponse.json();
  
  if (whatsappResponse.ok && whatsappResult.success) {
    whatsappSuccess = true;
  } else {
    console.error("WhatsApp FAILED:", whatsappResult.error);
  }
}

// ONLY update last_run_at if at least ONE method succeeded
if (voiceSuccess || whatsappSuccess) {
  await supabase
    .from("check_in_schedules")
    .update({ last_run_at: now.toISOString() })
    .eq("id", schedule.id);
} else {
  // Mark as failed - don't update last_run_at so it retries
  results.push({
    schedule_id: schedule.id,
    elder_id: schedule.elder_id,
    status: "failed",
    error: "All check-in methods failed",
  });
}
```

### Fix 2: Add AM/PM Clarity to Time Picker UI

Update `ElderSettings.tsx` to show the time in both 24-hour AND 12-hour format:

```jsx
<div className="space-y-2">
  <Label>Time of Day (IST - India Standard Time)</Label>
  <Input
    type="time"
    value={timeOfDay}
    onChange={(e) => setTimeOfDay(e.target.value)}
  />
  {/* NEW: Show formatted time for clarity */}
  <p className="text-sm text-muted-foreground">
    {timeOfDay && formatTimeAMPM(timeOfDay)} IST
    {parseInt(timeOfDay.split(':')[0]) < 12 ? ' (Morning)' : ' (Evening)'}
  </p>
</div>
```

Helper function:
```javascript
const formatTimeAMPM = (time24: string) => {
  const [hours, minutes] = time24.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12;
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
};
```

---

## Immediate Actions Required

### 1. Fix Rajiv's Schedule (if he wanted AM)

If Rajiv wanted 7:30 AM, his schedule needs to be updated from `19:29:00` to `07:30:00`:

```sql
-- Only run this if Rajiv confirms he wanted 7:30 AM
UPDATE check_in_schedules 
SET time_of_day = '07:30:00', last_run_at = NULL
WHERE id = '19a2e39c-2469-440e-becc-10a67c6ee217';
```

### 2. Trigger a Manual Call Now

Since Rajiv missed yesterday's call, we should trigger one immediately to test the fix:
- Call the `bolna-voice-call` edge function directly for Rajiv's elder ID

### 3. Reset `last_run_at` for Yesterday

Since yesterday's call failed, we need to clear the `last_run_at` so the scheduler doesn't think it ran:

```sql
UPDATE check_in_schedules 
SET last_run_at = NULL
WHERE id = '19a2e39c-2469-440e-becc-10a67c6ee217';
```

---

## Files to Modify

| File | Change |
|------|--------|
| `supabase/functions/run-scheduled-checkins/index.ts` | Add response validation before updating `last_run_at` |
| `src/pages/ElderSettings.tsx` | Add AM/PM helper text to time picker |

---

## Testing After Deployment

1. Reset Rajiv's `last_run_at` to NULL
2. Trigger `run-scheduled-checkins` manually
3. Verify voice call is initiated (check bolna-voice-call logs)
4. Confirm `call_attempts` record is created
5. Wait for call completion and verify `check_ins` record

---

## User Communication

Contact Rajiv to:
1. Confirm if he wanted 7:30 AM or 7:30 PM
2. Apologize for the missed call
3. Let him know the next call will happen at [confirmed time]

