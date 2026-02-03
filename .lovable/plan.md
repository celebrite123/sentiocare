

# B2B Post-Discharge Follow-Up: Complete Feature Enhancement Plan

## Overview

This plan addresses three main areas:
1. **Time slot expansion** - Allow 24-hour callback scheduling
2. **Missing B2B features** - Complete the post-discharge workflow
3. **Call transfer implementation** - Enable warm handoff to human agents using Bolna's transfer API

---

## Fix 1: Schedule Callback 24-Hour Time Slots

**Current Problem:**
The `ScheduleCallbackDialog.tsx` time slots are limited to 9:00 AM - 6:00 PM (17 slots).

**File to modify:** `src/components/b2b/ScheduleCallbackDialog.tsx`

**Change:**
```text
Current timeSlots array (line 41-45):
["09:00", "09:30", "10:00", ... "17:30", "18:00"]

New timeSlots array - Full 24 hours:
["00:00", "00:30", "01:00", ..., "23:00", "23:30"]
```

**Implementation:**
- Generate all 48 half-hour slots programmatically
- Add AM/PM labels for clarity in the dropdown
- Keep 10:00 AM as the default selection

---

## Fix 2: Missing B2B Features to Complete

### Feature A: Patient Notes Enhancement in PatientDetail

**Current State:** Nurse notes exist but are basic
**Enhancement:** Add structured notes with timestamps and ability to add multiple notes

**Files to modify:**
- `src/pages/b2b/PatientDetail.tsx` - Add notes timeline

---

### Feature B: Alert SLA Countdown Timer

**Current State:** SLA deadline is stored in `b2b_alerts.sla_deadline` but not displayed
**Enhancement:** Show countdown timer on AlertCard

**Files to modify:**
- `src/components/b2b/AlertCard.tsx` - Add SLA countdown display

**Implementation:**
```text
- Calculate time remaining: sla_deadline - now
- Show countdown: "⏱️ 12m left" or "⏱️ SLA Breached"
- Color code: green (>5min), yellow (<5min), red (breached)
- Update every minute using setInterval
```

---

### Feature C: Callback Execution Tracking

**Current State:** `scheduled_callbacks` table exists but no automation to execute them
**Enhancement:** Create edge function to process scheduled callbacks via AI voice

**Files to create:**
- `supabase/functions/process-scheduled-callbacks/index.ts`

**Logic:**
1. Run every 5 minutes via cron
2. Find callbacks where `scheduled_for <= now` and `status = 'pending'`
3. Trigger AI voice call using same logic as `run-scheduled-b2b-calls`
4. Update callback status to `in_progress` then `completed`

---

### Feature D: Patient Communication Log

**Current State:** Check-ins are shown but no detailed communication timeline
**Enhancement:** Show all communications (voice, WhatsApp, SMS) in unified timeline

**Files to modify:**
- `src/pages/b2b/PatientDetail.tsx` - Add communication timeline section

**Implementation:**
- Query `patient_checkins` for call/WhatsApp records
- Show recording playback (already added)
- Display AI summary and risk assessment from each interaction

---

## Fix 3: Bolna Call Transfer (Warm Handoff)

**Bolna API Capability:**
According to Bolna documentation, call transfer is configured in the Bolna Dashboard with:
- Description: Prompt for when to transfer
- Transfer to Phone number: The human agent's number

**Implementation Approach:**

### Step A: Add Transfer Phone Numbers to Organization Settings

**File to modify:** `src/pages/b2b/B2BSettings.tsx`

**Add fields for:**
- On-call clinician phone (for RED alerts)
- Duty nurse phone (for YELLOW alerts)
- Care coordinator phone (for general transfers)

The database already has these columns in `organizations`:
- `on_call_clinician_phone`
- `duty_nurse_phone`
- `care_coordinator_email`

---

### Step B: Update Bolna Agent Configuration

**Action Required:** Configure in Bolna Dashboard (not code)
- Add Transfer Call tool with description: "Transfer to a nurse when the patient requests to speak with a human, says they don't understand, or becomes confused"
- Set transfer number to organization's `duty_nurse_phone`

**Alternative - Dynamic Transfer via API:**
Since each hospital has different transfer numbers, we need to pass the transfer number dynamically via `user_data`.

**File to modify:** `supabase/functions/run-scheduled-b2b-calls/index.ts`

**Add to user_data payload (line 154-175):**
```javascript
user_data: {
  // ... existing fields
  transfer_phone_red: org.on_call_clinician_phone || org.escalation_phone,
  transfer_phone_yellow: org.duty_nurse_phone || org.escalation_phone,
  enable_transfer: !!(org.duty_nurse_phone || org.escalation_phone),
}
```

---

### Step C: Handle Transfer Webhook

**File to modify:** `supabase/functions/b2b-bolna-webhook/index.ts`

**Add transfer detection:**
```javascript
// After receiving webhook payload
const wasTransferred = payload.transfer_status === "completed" || 
                       payload.status === "transferred";
const transferredTo = payload.transferred_to_number;

if (wasTransferred) {
  // Log the transfer in patient_checkins
  // Create alert for transfer event
  // Update callback status if this was from a scheduled callback
}
```

---

### Step D: UI Indicator for Transfer Capability

**File to modify:** `src/pages/b2b/PatientDetail.tsx`

**Add visual indicator:**
- Show "Transfer-enabled" badge if organization has transfer phones configured
- In call history, show "Transferred to nurse" status when applicable

---

## Database Changes Required

No new tables needed. All required columns exist:
- `organizations.on_call_clinician_phone`
- `organizations.duty_nurse_phone`
- `organizations.care_coordinator_email`
- `scheduled_callbacks.status`
- `b2b_alerts.sla_deadline`

---

## Implementation Summary

| Item | Type | Complexity | Files |
|------|------|------------|-------|
| 24-hour time slots | Fix | Low | ScheduleCallbackDialog.tsx |
| SLA countdown timer | Feature | Low | AlertCard.tsx |
| Callback automation | Feature | Medium | New edge function |
| Transfer phone settings | Feature | Low | B2BSettings.tsx |
| Transfer in call flow | Feature | Medium | run-scheduled-b2b-calls |
| Transfer webhook handling | Feature | Medium | b2b-bolna-webhook |
| Transfer UI indicators | Feature | Low | PatientDetail.tsx |

---

## Files to Create/Modify

### New Files
1. `supabase/functions/process-scheduled-callbacks/index.ts`

### Modified Files
1. `src/components/b2b/ScheduleCallbackDialog.tsx` - 24-hour slots
2. `src/components/b2b/AlertCard.tsx` - SLA countdown
3. `src/pages/b2b/B2BSettings.tsx` - Transfer phone config
4. `supabase/functions/run-scheduled-b2b-calls/index.ts` - Pass transfer phones
5. `supabase/functions/b2b-bolna-webhook/index.ts` - Handle transfer events
6. `src/pages/b2b/PatientDetail.tsx` - Transfer capability indicator

---

## Technical Notes

### Bolna Transfer Configuration

From Bolna docs: "You may add multiple transfer call tools for multiple phone numbers."

This means in Bolna Dashboard, you configure:
```text
Tool 1: Transfer to Clinician
- Description: "Transfer when patient reports chest pain, breathing difficulty, or other emergency"
- Phone: {transfer_phone_red} (from user_data)

Tool 2: Transfer to Nurse  
- Description: "Transfer when patient asks to speak with a person or seems confused"
- Phone: {transfer_phone_yellow} (from user_data)
```

The Bolna agent will use the `user_data` variables dynamically per call.

---

## Edge Cases Handled

1. **No transfer phone configured:** Calls proceed normally, no transfer option
2. **Transfer fails:** Webhook receives `transfer_status: failed`, system creates alert
3. **Callback already completed:** Skip in automation cron
4. **SLA already breached:** Show "Breached" instead of negative countdown

