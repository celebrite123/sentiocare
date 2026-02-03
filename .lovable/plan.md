

# Fix Plan: B2B Dashboard Call Data Display (Transcripts & Recordings)

## Current Issues Identified

### Issue 1: Webhook Still Not Being Called
**Evidence from Database:**
- `b2b_pending_calls` table shows: `execution_id: 9b1abb36-8f8b-460b-b24e-b9cc3c08fc12` with `processed: false`
- No entries in edge function analytics for `b2b-bolna-webhook`
- Calls are being initiated successfully, but Bolna never sends completion data

**Root Cause:** The Bolna agent webhook URL is still not configured correctly in the Bolna Dashboard. The system works as follows:
1. `run-scheduled-b2b-calls` initiates call → stores `execution_id` in `b2b_pending_calls` table
2. Bolna makes the call to patient
3. **Bolna should call webhook** → `b2b-bolna-webhook` → but this never happens
4. Dashboard shows no data

**Action Required (Manual - You must do this):**
1. Go to [app.bolna.dev](https://app.bolna.dev)
2. Open your agent: `dff579d1-2f81-4a77-b29a-7db8aad4e34e` (Orchid Hospital Hindi)
3. Find "Webhook URL" or "Post-Call Webhook" setting
4. Enter: `https://hcdwbpbvuvbrozttahfz.supabase.co/functions/v1/b2b-bolna-webhook`
5. **Save and verify** the setting is saved

---

### Issue 2: Missing Transcript Field in UI
**Evidence:**
- The `patient_checkins` table has a `patient_response` column for storing transcripts
- The `Checkin` TypeScript interface does NOT include `patient_response`
- The check-in display UI has no place to show transcripts

**Technical Fix Required:**
1. Add `patient_response` to the Checkin interface
2. Update the SELECT query to include the field
3. Add UI component to display the transcript

---

### Issue 3: Webhook Stores Transcript Correctly
The webhook code already stores the transcript correctly:

```typescript
// In b2b-bolna-webhook (already exists)
await supabase.from("patient_checkins").insert({
  patient_id: patientId,
  recording_url: recording_url || null,  // ✅ Recording is stored
  ai_summary: analysis.ai_summary,        // ✅ AI summary is stored
  // But transcript (patient_response) is NOT being stored!
});
```

**Bug Found:** The webhook receives `transcript` from Bolna but does NOT store it in `patient_response` column!

---

## Implementation Plan

### Step 1: Fix Webhook to Store Transcript
Update `b2b-bolna-webhook` to save the transcript:

```typescript
await supabase.from("patient_checkins").insert({
  // ... existing fields
  patient_response: transcript || null,  // ADD THIS - stores full transcript
});
```

### Step 2: Update Checkin Interface
Add the missing field:

```typescript
interface Checkin {
  id: string;
  checkin_type: string;
  method: string;
  medicines_taken: boolean | null;
  danger_symptoms_reported: string[];
  risk_level: string | null;
  ai_summary: string | null;
  created_at: string;
  recording_url: string | null;
  patient_response: string | null;  // ADD THIS - transcript
  call_duration_seconds: number | null;  // ADD THIS - useful info
  answered: boolean | null;  // ADD THIS - was call answered
}
```

### Step 3: Update Check-in Display UI
Enhance `CheckinItem` component to show transcript:

```tsx
{/* Transcript Display */}
{checkin.patient_response && (
  <div className="mt-2">
    <p className="text-xs text-muted-foreground font-medium mb-1">Call Transcript:</p>
    <p className="text-sm bg-muted p-2 rounded text-muted-foreground max-h-32 overflow-y-auto">
      {checkin.patient_response}
    </p>
  </div>
)}

{/* Call Duration */}
{checkin.call_duration_seconds && (
  <p className="text-xs text-muted-foreground">
    Duration: {Math.floor(checkin.call_duration_seconds / 60)}:{String(checkin.call_duration_seconds % 60).padStart(2, '0')}
  </p>
)}

{/* Answered Status */}
{checkin.answered !== null && (
  <p className="text-xs">
    {checkin.answered ? "✅ Call answered" : "❌ Call not answered"}
  </p>
)}
```

### Step 4: Redeploy Webhook
Force redeploy `b2b-bolna-webhook` to ensure transcript storage is active.

---

## Files to Modify

| File | Change |
|------|--------|
| `supabase/functions/b2b-bolna-webhook/index.ts` | Add `patient_response: transcript` to insert |
| `src/pages/b2b/PatientDetail.tsx` | Update Checkin interface, add transcript UI |

---

## Verification Steps

After implementation:
1. **Configure Bolna webhook** (manual step - you must do this in Bolna Dashboard)
2. Click "Call Now" on a patient
3. Complete the call with a conversation
4. Wait 30 seconds for webhook processing
5. Refresh the patient detail page
6. Verify:
   - Check-in appears with "✅ Call answered"
   - AI Summary is displayed
   - Full transcript is shown
   - Recording playback button works
   - Call duration is displayed

---

## Critical Note

The code changes alone will NOT work until you configure the webhook URL in Bolna Dashboard. The system cannot receive call data without this configuration.

Please double-check:
1. The exact webhook URL is: `https://hcdwbpbvuvbrozttahfz.supabase.co/functions/v1/b2b-bolna-webhook`
2. The URL is saved in Bolna agent settings
3. You're configuring the correct agent ID: `dff579d1-2f81-4a77-b29a-7db8aad4e34e`

