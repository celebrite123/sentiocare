
# Comprehensive Fix: B2B Dashboard Call Data, Bulk Management & UI/UX

## Issues Identified

### Issue 1: Call Recording Not Being Extracted
**Root Cause:** The B2B webhook doesn't extract `telephony_data` from Bolna payload, which is where Bolna stores the recording URL.

**Evidence from B2C webhook (working):**
```typescript
// B2C webhook correctly extracts from telephony_data
const recordingUrl = telephony_data?.recording_url || payload.recording_url || null;
```

**B2B webhook (missing):**
```typescript
// Only checks top-level recording_url, misses telephony_data
recording_url,  // from payload destructuring
```

**Fix:** Add `telephony_data` extraction to B2B webhook and check multiple locations for recording URL.

---

### Issue 2: Webhook Deployment Issue
**Evidence:** 
- `b2b_pending_calls` table shows `processed: false` for execution_id `9b1abb36-8f8b-460b-b24e-b9cc3c08fc12`
- But the webhook log shows "B2B call processed for patient..." 
- This means the code that updates `processed = true` isn't running

**Fix:** Force redeploy the webhook with the complete updated code.

---

### Issue 3: Transcript Data IS Being Stored
**Good News:** The database query shows `patient_response` field IS populated with the full transcript for recent checkins:
```
patient_response: "assistant: नमस्ते Aditya जी... user: Hello... assistant: धन्यवाद Aditya जी..."
answered: true
ai_summary: "Call completed. Medicine adherence: Unclear..."
```

**Issue:** The data exists but may not be displaying properly due to query caching or component rendering issues.

---

### Issue 4: No Bulk Patient Management
**Current State:** PatientList only has:
- Export CSV (existing)
- Refresh (existing)

**Needed:**
- Bulk status update (mark multiple patients as completed/opted-out)
- Bulk call trigger (call multiple patients at once)
- Select all / deselect all
- Bulk actions bar (like AlertsQueue already has)

---

## Implementation Plan

### Step 1: Fix B2B Webhook Recording URL Extraction
Add `telephony_data` extraction and check multiple locations for recording URL:

```typescript
// Add to destructuring
const {
  // ... existing fields
  telephony_data,  // ADD THIS
} = payload;

// Check multiple locations for recording URL
const actualRecordingUrl = 
  telephony_data?.recording_url || 
  payload.recording_url || 
  payload.call_recording?.url ||
  recording_url || 
  null;

// Use in insert
recording_url: actualRecordingUrl,
```

### Step 2: Fix Call Duration Extraction
Bolna sends duration in multiple places:

```typescript
// Extract duration from multiple locations
const actualDuration = 
  payload.conversation_duration || 
  duration || 
  telephony_data?.duration ||
  Math.round(payload.total_cost / 0.12) || // Approximate from cost
  null;
```

### Step 3: Add Bulk Patient Management to PatientList
Add checkboxes and bulk action bar similar to AlertsQueue:

**New Features:**
- Checkbox column in patient table
- "Select All" checkbox in header
- Bulk actions bar with:
  - "Update Status" dropdown (Completed, Opted-out)
  - "Call Selected" button (trigger calls for all selected patients)
  - Clear selection button
- Patient count indicator

### Step 4: Improve Check-in Display
Ensure transcript and recording are prominently displayed:

- Add collapsible transcript section with "Show Full Transcript" toggle
- Add call duration in minutes:seconds format
- Add answered/not-answered badge with color coding
- Make recording play button more prominent
- Add "Copy Transcript" button for nurse documentation

### Step 5: UI/UX Improvements

**PatientDetail page:**
- Add loading states for check-in section
- Add "No check-ins yet" empty state with illustration
- Add auto-refresh after "Call Now" (currently waits 3s, extend to 30s with polling)
- Add visual indicator when new data arrives

**PatientList page:**
- Add patient count per status in summary
- Add quick-filter chips for risk status
- Add "Last Call" column showing how long ago
- Add color coding for overdue follow-ups

---

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/b2b-bolna-webhook/index.ts` | Extract telephony_data, fix recording URL extraction |
| `src/pages/b2b/PatientList.tsx` | Add bulk selection, bulk actions bar |
| `src/components/b2b/PatientTable.tsx` | Add checkbox column, selection state |
| `src/pages/b2b/PatientDetail.tsx` | Improve check-in display, add polling refresh |

---

## Technical Details

### Bulk Selection State in PatientList
```typescript
const [selectedPatients, setSelectedPatients] = useState<Set<string>>(new Set());
const [bulkProcessing, setBulkProcessing] = useState(false);

const handleBulkStatusUpdate = async (newStatus: string) => {
  setBulkProcessing(true);
  try {
    const updates = Array.from(selectedPatients).map(id =>
      supabase.from("discharged_patients")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", id)
    );
    await Promise.all(updates);
    toast.success(`${selectedPatients.size} patients updated to ${newStatus}`);
    fetchPatients();
  } finally {
    setBulkProcessing(false);
    setSelectedPatients(new Set());
  }
};
```

### Auto-Refresh After Call Now
```typescript
const handleCallNow = async () => {
  // ... existing call logic
  
  // Poll for updates every 5 seconds for 60 seconds
  let pollCount = 0;
  const pollInterval = setInterval(async () => {
    pollCount++;
    await loadPatientData();
    if (pollCount >= 12) { // 12 * 5s = 60 seconds
      clearInterval(pollInterval);
    }
  }, 5000);
};
```

### Enhanced Recording URL Extraction in Webhook
```typescript
// Check ALL possible locations where Bolna might put recording URL
const actualRecordingUrl = 
  telephony_data?.recording_url ||
  telephony_data?.call_recording_url ||
  payload.recording_url ||
  payload.call_recording?.url ||
  payload.call_recording ||
  context_details?.recording_url ||
  null;

console.log("Recording URL sources:", {
  telephony: telephony_data?.recording_url,
  payload: payload.recording_url,
  extracted: actualRecordingUrl
});
```

---

## Expected Results

After implementation:

1. **Call recordings will appear** in patient check-ins when Bolna provides them
2. **Transcripts will display** with proper formatting (they're already stored)
3. **Bulk patient management** will allow updating multiple patients at once
4. **Auto-refresh** will show call results without manual refresh
5. **Better UI feedback** for loading states and empty states

---

## Verification Steps

1. Force redeploy `b2b-bolna-webhook`
2. Click "Call Now" on a patient
3. Complete the call with conversation
4. Wait 30-60 seconds (auto-refresh should show updates)
5. Verify:
   - Transcript displays in check-in card
   - Recording playback button appears (if Bolna provides URL)
   - Call duration and answered status show
6. Test bulk operations:
   - Select multiple patients
   - Update status in bulk
   - Verify all selected patients updated
