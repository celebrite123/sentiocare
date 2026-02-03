
# Critical Fix: Stop Repeated Calls & Fix Webhook Integration

## Problem Summary

**You are getting repeated calls because:**

1. **Bolna webhook is NOT configured** - The Bolna agent does not have the webhook URL set, so after completing a call, Bolna never sends the completion data back to your system
2. **Scheduler keeps advancing** - When a call is initiated, the scheduler marks the current day "complete" and immediately schedules the NEXT day (Day 1 → Day 3 → Day 7)
3. **No deduplication** - There's no check to prevent multiple calls on the same day

**Evidence:**
```
b2b_pending_calls:
- Patient: 00870550-1cfd-45e0-aea3-0641b4416b68
  - Day 3 call (18:00) - processed: false
  - Day 1 call (17:00) - processed: false
  
b2b-bolna-webhook logs: NO LOGS FOUND
```

---

## Root Cause: Missing Webhook Configuration

**You MUST configure this in Bolna Dashboard:**

1. Go to https://app.bolna.dev
2. Open your B2B agent (ID: `dff579d1-2f81-4a77-b29a-7db8aad4e34e`)
3. Find "Webhook URL" or "Post-Call Webhook" setting
4. Enter: `https://hcdwbpbvuvbrozttahfz.supabase.co/functions/v1/b2b-bolna-webhook`
5. Save

**Without this, calls will NEVER update in your dashboard!**

---

## Code Fixes Required

### Fix 1: Add Daily Call Limit Protection (CRITICAL)
Prevent more than 1 call per patient per day:

```typescript
// In run-scheduled-b2b-calls - Add check:
const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

// Skip if patient was already called today
if (patient.last_call_date) {
  const lastCallDay = patient.last_call_date.split('T')[0];
  if (lastCallDay === today) {
    console.log(`Skipping ${patient.id}: Already called today`);
    skipped++;
    continue;
  }
}
```

### Fix 2: Don't Mark Day Complete Until Webhook Confirms
Currently the scheduler marks a day "complete" immediately when initiating a call. This should only happen in the webhook after call completes.

**Change in `updatePatientCallSchedule`:**
- Remove the `completed: true` update
- Only update `last_call_date` and store "in_progress" state
- Webhook handles marking as complete

### Fix 3: Add "In Progress" Call State
Track calls that are initiated but not completed:

```typescript
// When initiating call:
const updatedSchedule = schedule.map((item: any) => {
  if (item.day === completedDay) {
    return { 
      ...item, 
      status: 'in_progress',  // Not completed yet
      initiated_at: new Date().toISOString() 
    };
  }
  return item;
});
```

### Fix 4: Skip Patients with In-Progress Calls
Don't initiate new calls if a call is already in progress:

```typescript
// Check for in-progress call
const inProgressCall = schedule.find((item: any) => item.status === 'in_progress');
if (inProgressCall && !isManualTrigger) {
  console.log(`Skipping ${patient.id}: Call in progress for day ${inProgressCall.day}`);
  skipped++;
  continue;
}
```

---

## Implementation Steps

### Step 1: Immediate Relief (Manual)
Run this SQL to stop the bleeding:
```sql
-- Mark all current pending calls as processed to stop reruns
UPDATE b2b_pending_calls SET processed = true, processed_at = NOW();

-- Reset patient schedules to stop immediate recalling
UPDATE discharged_patients 
SET next_call_due = NULL 
WHERE id IN ('00870550-1cfd-45e0-aea3-0641b4416b68', '9363fbb4-b88a-430c-8965-438d0aa02e20');
```

### Step 2: Update run-scheduled-b2b-calls
Add protection against:
- Multiple calls per day
- Calls while another is in progress
- Better tracking of call states

### Step 3: Update b2b-bolna-webhook
Ensure it properly:
- Marks calls as complete
- Updates next_call_due correctly
- Clears in-progress state

### Step 4: Redeploy Functions
Deploy both updated functions.

---

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/run-scheduled-b2b-calls/index.ts` | Add daily limit, in-progress checks, deduplication |
| `supabase/functions/b2b-bolna-webhook/index.ts` | Handle in-progress state, proper completion marking |

---

## Expected Results

After implementation:

1. **Maximum 1 call per patient per day** - Hard limit prevents bombardment
2. **In-progress tracking** - No new calls while one is active
3. **Proper completion flow** - Calls only marked complete when webhook confirms
4. **Dashboard updates** - Once Bolna webhook is configured, call data will flow correctly

---

## CRITICAL ACTION REQUIRED (Manual)

**You MUST configure the Bolna webhook URL:**

```
URL: https://hcdwbpbvuvbrozttahfz.supabase.co/functions/v1/b2b-bolna-webhook
```

Configure this in the Bolna Dashboard for agent `dff579d1-2f81-4a77-b29a-7db8aad4e34e`.

Without this configuration, the code fixes alone will NOT solve the problem - call completion data will never arrive.
