## Features to Implement

### Feature 1: Manual Call Trigger from Patient Detail

**What it does:** Adds a "Call Now" button in `PatientDetail.tsx` to immediately trigger an AI voice call to the patient.

**Implementation:**
- Add "Call Now" button in the header section
- Call the `run-scheduled-b2b-calls` logic for a single patient
- Show loading state while call initiates
- Display success/error toast feedback

**Files to modify:**
- `src/pages/b2b/PatientDetail.tsx` - Add button and API call

---

### Feature 2: Patient Status Management (Deactivation/Completion)

**What it does:** Allows nurses to change patient status to `active`, `completed`, `readmitted`, or `opted_out`.

**Implementation:**
- Add a status dropdown in `PatientDetail.tsx`
- `completed`: Patient finished 7-day cycle successfully
- `readmitted`: Patient returned to hospital (stops calls)
- `opted_out`: Patient requested no more calls

**Database change:** Already supported - `status` column exists in `discharged_patients`

**Files to modify:**
- `src/pages/b2b/PatientDetail.tsx` - Add status dropdown

---

### Feature 3: Call Recording Playback

**What it does:** Adds an audio player in `PatientDetail.tsx` to play back AI call recordings stored in `patient_checkins.recording_url`.

**Implementation:**
- Check if `recording_url` exists on each check-in
- Use the existing `proxy-recording` edge function for secure playback
- Add play/pause controls similar to B2C Health Book

**Files to modify:**
- `src/pages/b2b/PatientDetail.tsx` - Add audio player in Check-ins section

---

### Feature 4: Bulk Actions in Alerts Queue

**What it does:** Allows nurses to select multiple alerts and perform bulk operations (Assign to Me, Resolve All).

**Implementation:**
- Add checkbox selection to `AlertCard.tsx`
- Add "Select All" toggle in `AlertsQueue.tsx` header
- Add floating action bar when items selected
- Implement bulk assign and bulk resolve functions

**Files to modify:**
- `src/components/b2b/AlertCard.tsx` - Add checkbox prop
- `src/pages/b2b/AlertsQueue.tsx` - Add selection state and bulk actions

---

### Feature 5: Follow-up Date Reminder System

**What it does:** Tracks `follow_up_date` and creates alerts when:
- 1 day before scheduled follow-up (reminder)
- Day of follow-up (prompt to confirm)
- 1 day after if not confirmed (overdue alert)

**Implementation:**
- Create new edge function `check-followup-reminders` 
- Run daily via cron job
- Create alerts in `b2b_alerts` for upcoming/overdue follow-ups
- Add UI indicator in `PatientDetail.tsx` for follow-up status

**Files to create/modify:**
- `supabase/functions/check-followup-reminders/index.ts` - New function
- `src/pages/b2b/PatientDetail.tsx` - Add follow-up status UI

---

### Feature 6: Dashboard Analytics Improvements

**What it does:** Adds charts and trends to `B2BDashboard.tsx`:
- Call completion rate by day (line chart)
- Risk distribution pie chart
- Medicine adherence trend
- 7-day follow-up funnel visualization

**Implementation:**
- Use Recharts (already installed)
- Fetch aggregated data from `patient_checkins` table
- Show trends over last 7/14/30 days
- Add toggle for time range

**Files to modify:**
- `src/pages/b2b/B2BDashboard.tsx` - Add chart components
- Potentially create `src/components/b2b/AnalyticsCharts.tsx`

---

## Technical Implementation Summary

| Feature | Priority | Complexity | Files |
|---------|----------|------------|-------|
| 1. Manual Call Trigger | High | Low | PatientDetail.tsx |
| 2. Patient Status Management | High | Low | PatientDetail.tsx |
| 3. Recording Playback | Medium | Low | PatientDetail.tsx |
| 4. Bulk Alert Actions | High | Medium | AlertCard.tsx, AlertsQueue.tsx |
| 5. Follow-up Reminders | Medium | Medium | New edge function + PatientDetail.tsx |
| 6. Dashboard Analytics | Low | High | B2BDashboard.tsx + new component |

---

## Bonus: Port B2C Symptom Tracking to B2B

The B2B system currently lacks symptom continuity. We could enhance `b2b-bolna-webhook` to:

1. Store reported symptoms in a dedicated field on `discharged_patients`
2. Track symptom duration across multiple calls
3. Alert if symptom persists across Day 1, 3, and 7 calls
4. Pass symptom history to the voice agent for contextual follow-up

This would bring the sophisticated B2C early detection capability to the hospital discharge workflow.

---

## Implementation Order

1. **Feature 1 + 2** (Quick wins - unblock nurses immediately)
2. **Feature 4** (Improve workflow efficiency)
3. **Feature 3** (Quality assurance capability)
4. **Feature 5** (Automation improvement)
5. **Feature 6** (Data insights)

All features can be implemented within the existing architecture without database migrations.
