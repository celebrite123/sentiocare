

# Fix: Call Now Button Not Working for Completed Schedules

## Problem Identified

The "Call Now" button fails with **"No pending calls in schedule"** because:

1. Patient `9363fbb4-b88a-430c-8965-438d0aa02e20` has all 3 scheduled calls completed:
   - Day 1: completed ✓
   - Day 3: completed ✓  
   - Day 7: completed ✓

2. The function logic requires finding a pending call to proceed:
   ```typescript
   const nextCall = schedule.find((item: any) => !item.completed && item.status !== 'in_progress');
   
   if (!nextCall) {
     console.log(`Skipping ${patient.id}: No pending calls in schedule`);
     skipped++;
     continue;  // ← This skips manual triggers too!
   }
   ```

3. Manual triggers should allow calling even when all scheduled calls are done

## Solution

Update `run-scheduled-b2b-calls` to handle manual triggers differently:

- For **scheduled runs**: Continue requiring a pending call in the schedule
- For **manual triggers**: Allow calling even if schedule is complete, create an "ad-hoc" call type

## Technical Changes

### File: `supabase/functions/run-scheduled-b2b-calls/index.ts`

#### Change 1: Handle Manual Trigger Without Pending Calls

Replace lines 126-133 with logic that allows manual triggers to proceed:

```typescript
// Find next call that's not completed and not in-progress
let nextCall = schedule.find((item: any) => !item.completed && item.status !== 'in_progress');

// For manual triggers, allow ad-hoc calls even if schedule is complete
let dayNumber: number;
let callType: string;

if (!nextCall) {
  if (isManualTrigger) {
    // Manual trigger with no pending calls - create ad-hoc call
    // Use the last completed day + 1 or default to follow-up
    const completedDays = schedule.filter((s: any) => s.completed).map((s: any) => s.day);
    const lastCompletedDay = Math.max(...completedDays, 0);
    dayNumber = lastCompletedDay > 0 ? lastCompletedDay : 0;
    callType = "manual_followup";
    console.log(`Manual trigger for ${patient.id}: ad-hoc call (last completed: day ${dayNumber})`);
  } else {
    console.log(`Skipping ${patient.id}: No pending calls in schedule`);
    skipped++;
    continue;
  }
} else {
  dayNumber = nextCall.day;
  callType = dayNumber === 1 ? "day_1_check" : dayNumber === 3 ? "day_3_check" : "day_7_check";
}
```

#### Change 2: Update Greeting for Manual Follow-ups

For manual follow-up calls, use a different greeting that doesn't reference a specific day:

```typescript
const greeting = language === "hindi"
  ? callType === "manual_followup"
    ? `नमस्ते ${patient.patient_name.split(" ")[0]} जी, मैं ${org.name} से बोल रहा हूं। आपकी तबीयत की जांच के लिए कॉल किया है।`
    : `नमस्ते ${patient.patient_name.split(" ")[0]} जी, मैं ${org.name} से बोल रहा हूं।`
  : callType === "manual_followup"
    ? `Hello ${patient.patient_name.split(" ")[0]}, I'm calling from ${org.name} to check on your health.`
    : `Hello ${patient.patient_name.split(" ")[0]}, I'm calling from ${org.name}.`;
```

#### Change 3: Skip Schedule Update for Ad-hoc Calls

For manual follow-ups, don't update the call_schedule since there's no pending day to mark:

```typescript
// After successful Bolna call:
if (callType !== "manual_followup") {
  await updatePatientCallSchedule(supabase, patient, org, dayNumber, "voice");
} else {
  // For ad-hoc calls, only update last_call_date
  await supabase
    .from("discharged_patients")
    .update({ last_call_date: new Date().toISOString() })
    .eq("id", patient.id);
    
  // Still increment call count
  await supabase
    .from("organizations")
    .update({ calls_used_this_month: (org.calls_used_this_month || 0) + 1 })
    .eq("id", org.id);
}
```

## Summary of Changes

| File | Change |
|------|--------|
| `supabase/functions/run-scheduled-b2b-calls/index.ts` | Allow manual triggers to proceed with ad-hoc calls when schedule is complete |

## Expected Behavior After Fix

1. **Scheduled runs**: Only process patients with pending calls (Day 1, 3, or 7 not completed)
2. **Manual "Call Now"**: Works regardless of schedule status - creates an ad-hoc follow-up call
3. **Call logging**: Ad-hoc calls are tracked in `b2b_pending_calls` with type `manual_followup`
4. **Dashboard updates**: Results appear after webhook receives completion data

## Important Note

This fix still requires the Bolna webhook to be properly configured for call results to appear in the dashboard. The webhook configuration remains a separate critical requirement.

