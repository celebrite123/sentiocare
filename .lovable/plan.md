
# Caregiver-Aware Voice Call Flow

This plan adds support for caregiver/family member answering calls on behalf of patients who may be too unwell to speak.

## Problem Statement

Currently, the voice agent strictly requires the patient to answer and verify identity. However, in real post-discharge scenarios:

1. **Patient may be bedridden** - recovering from surgery, can't get to phone
2. **Patient may be elderly/confused** - needs family assistance
3. **Family member is the actual caregiver** - handling medicines, symptoms, appointments
4. **Patient may have handed phone to family** - who can accurately report status

The current flow demands patient identity or reschedules, losing valuable health information.

---

## Solution Overview

```text
┌─────────────────────────────────────────────────────────────────┐
│                     ENHANCED IDENTITY FLOW                       │
├─────────────────────────────────────────────────────────────────┤
│  "Am I speaking with [Patient Name]?"                           │
│                                                                  │
│  ┌──────────┐    ┌──────────────────┐    ┌─────────────────┐    │
│  │   YES    │    │  NO, but I'm     │    │   WRONG NUMBER  │    │
│  │ (Patient)│    │  their caregiver │    │                 │    │
│  └────┬─────┘    └────────┬─────────┘    └────────┬────────┘    │
│       │                   │                       │             │
│       ▼                   ▼                       ▼             │
│  Continue as       Ask: "What is                Reschedule     │
│  normal flow       your relationship            & note error   │
│                    to [Patient]?"                              │
│                          │                                      │
│                          ▼                                      │
│                    Log caregiver                               │
│                    relationship &                              │
│                    continue call                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Database Schema Updates

Add caregiver fields to `discharged_patients` table to store caregiver information from Excel upload:

```sql
-- Add caregiver fields to discharged_patients
ALTER TABLE discharged_patients 
  ADD COLUMN IF NOT EXISTS caregiver_name text,
  ADD COLUMN IF NOT EXISTS caregiver_phone text,
  ADD COLUMN IF NOT EXISTS caregiver_relation text;

-- Track who answered in patient_checkins
ALTER TABLE patient_checkins
  ADD COLUMN IF NOT EXISTS respondent_type text DEFAULT 'patient',
  ADD COLUMN IF NOT EXISTS respondent_name text,
  ADD COLUMN IF NOT EXISTS respondent_relation text;
```

**Fields:**
- `caregiver_name`: Primary caregiver's name (e.g., "Priya")
- `caregiver_phone`: Alternate contact (if different from patient)
- `caregiver_relation`: Relationship (son, daughter, spouse, sibling, other)
- `respondent_type`: Who actually answered the call (patient/caregiver)
- `respondent_name`: Name of the person who answered
- `respondent_relation`: Their relationship if caregiver

---

## Phase 2: Voice Script Update (B2B_VOICE_AGENT_PROMPT.md)

Replace the rigid identity verification with a flexible caregiver-aware flow:

### Updated STEP 1: IDENTITY VERIFICATION

```text
### STEP 1: IDENTITY VERIFICATION (Required - Caregiver Aware)
Use {greeting} which includes hospital name.
Then verify identity:

**Hindi:** "क्या मैं {patient_name} जी से बात कर रहा हूं?"
**English:** "Am I speaking with {patient_name}?"

**If YES:** Proceed to Step 2

**If NO (someone else answered):**
Ask: "आप {patient_name} जी के कौन हैं?" / "What is your relationship to {patient_name}?"

- If FAMILY/CAREGIVER (wife, husband, son, daughter, bahu, beti, beta, relative, caregiver):
  Say: "ठीक है। मैं {patient_name} जी की सेहत के बारे में आपसे बात कर सकता हूं।"
  / "Okay. I can speak with you about {patient_name}'s health."
  → Note respondent as CAREGIVER with their relationship
  → Proceed to Step 2 (adjust questions to "Are THEY having fever?" instead of "Are YOU")

- If WRONG NUMBER or unrelated person:
  Say: "माफ़ कीजिए, शायद गलत नंबर है। हम बाद में कॉल करेंगे।" 
  / "Sorry, this might be a wrong number. We'll call back later."
  → END CALL & flag for review

**Question Phrasing for Caregiver:**
When speaking to caregiver, use third-person references:
- "क्या उन्हें बुखार है?" instead of "क्या आपको बुखार है?"
- "Are they having fever?" instead of "Are you having fever?"
- "क्या वो दवाइयाँ ले रहे हैं?" instead of "क्या आप ले रहे हैं?"
```

### New Variables for Bolna Agent

```text
## ADDITIONAL CONTEXT VARIABLES
- caregiver_name: {caregiver_name}
- caregiver_relation: {caregiver_relation}
- respondent_type: "patient" or "caregiver" (determined during call)
```

---

## Phase 3: Update run-scheduled-b2b-calls Function

Pass caregiver information to voice agent:

```typescript
user_data: {
  // ...existing fields...
  patient_name: patient.patient_name,
  
  // NEW: Caregiver context
  caregiver_name: patient.caregiver_name || null,
  caregiver_relation: patient.caregiver_relation || null,
  has_registered_caregiver: !!patient.caregiver_name,
}
```

---

## Phase 4: Update b2b-bolna-webhook Function

Detect who answered and log appropriately:

```typescript
// NEW: Detect respondent type from transcript
function detectRespondent(transcript: string, patientName: string): {
  respondentType: "patient" | "caregiver" | "unknown";
  respondentRelation: string | null;
} {
  const lowerTranscript = transcript.toLowerCase();
  const firstName = patientName.split(" ")[0].toLowerCase();
  
  // Relationship patterns (Hindi + English)
  const relationPatterns = {
    "spouse": ["wife", "husband", "pati", "patni", "पति", "पत्नी"],
    "son": ["son", "beta", "बेटा", "ladka"],
    "daughter": ["daughter", "beti", "बेटी", "ladki"],
    "daughter_in_law": ["bahu", "बहू", "daughter-in-law"],
    "parent": ["father", "mother", "papa", "mummy", "पापा", "माँ"],
    "sibling": ["brother", "sister", "bhai", "behen", "भाई", "बहन"],
    "other": ["relative", "caregiver", "family", "rishtedar", "रिश्तेदार"],
  };
  
  // Check if patient answered directly
  const patientConfirmPatterns = [
    `${firstName}`, "haan main", "yes i am", "ji main", "speaking",
    "bol raha", "बोल रहा", "बोल रही"
  ];
  
  if (patientConfirmPatterns.some(p => lowerTranscript.includes(p))) {
    return { respondentType: "patient", respondentRelation: null };
  }
  
  // Check for caregiver indicators
  for (const [relation, patterns] of Object.entries(relationPatterns)) {
    if (patterns.some(p => lowerTranscript.includes(p))) {
      return { respondentType: "caregiver", respondentRelation: relation };
    }
  }
  
  return { respondentType: "unknown", respondentRelation: null };
}

// Store in patient_checkins
const { respondentType, respondentRelation } = detectRespondent(
  transcript, 
  patient.patient_name
);

// Include in checkin record
await supabase.from("patient_checkins").insert({
  // ...existing fields...
  respondent_type: respondentType,
  respondent_relation: respondentRelation,
});
```

---

## Phase 5: Update ExcelUploader for Caregiver Data

Allow hospitals to upload caregiver information during patient upload:

### New Excel Columns (Optional)
| Column | Example |
|--------|---------|
| Caregiver Name | Priya Sharma |
| Caregiver Phone | 9876543210 |
| Caregiver Relation | daughter |

### Update ExcelUploader.tsx Parsing

```typescript
const caregiverName = row['Caregiver Name'] || row['caregiver_name'] || 
                      row['Family Contact Name'] || null;
const caregiverPhone = row['Caregiver Phone'] || row['caregiver_phone'] || 
                       row['Family Phone'] || null;
const caregiverRelation = row['Caregiver Relation'] || row['caregiver_relation'] || 
                          row['Relation'] || null;

// Include in patient record
const patientRecord = {
  // ...existing fields...
  caregiver_name: caregiverName,
  caregiver_phone: caregiverPhone,
  caregiver_relation: normalizeRelation(caregiverRelation),
};
```

---

## Phase 6: Update Escalation to Include Caregiver

When escalating alerts, also notify the registered caregiver if available:

### In escalate-b2b-alert Function

```typescript
// Get caregiver contact if available
if (patient.caregiver_phone && severity === "red") {
  // Send WhatsApp to caregiver
  await sendWhatsAppToCaregiver(
    patient.caregiver_phone,
    patient.caregiver_name,
    patient.patient_name,
    symptomText,
    org.hospital_contact_number
  );
  notificationResults.push("WhatsApp sent to caregiver");
}
```

---

## Implementation Files Summary

| File | Change Type | Description |
|------|-------------|-------------|
| Database Migration | NEW | Add caregiver fields to `discharged_patients` and `patient_checkins` |
| `B2B_VOICE_AGENT_PROMPT.md` | UPDATE | Caregiver-aware identity flow with third-person questions |
| `run-scheduled-b2b-calls/index.ts` | UPDATE | Pass caregiver context to voice agent |
| `b2b-bolna-webhook/index.ts` | UPDATE | Detect respondent type, log who answered |
| `ExcelUploader.tsx` | UPDATE | Parse caregiver columns from upload |
| `escalate-b2b-alert/index.ts` | UPDATE | Notify caregiver on RED alerts |
| `PatientDetail.tsx` | UPDATE | Display caregiver info in patient view |

---

## Audit & Compliance Benefits

1. **Full Transparency**: Each checkin records WHO answered (patient vs caregiver)
2. **Clinical Accuracy**: Questions phrased appropriately for respondent
3. **Escalation Chain**: Caregiver is notified alongside hospital staff
4. **No Missed Data**: Information is collected even when patient can't speak
5. **Relationship Tracking**: Clear audit trail of who provided health updates

---

## Testing Recommendations

After implementation:
1. **Test with patient answering** - Should work as before
2. **Test with "I'm their daughter"** - Should continue call in third-person
3. **Test with wrong number** - Should reschedule gracefully
4. **Test Excel upload with caregiver fields** - Should parse and store correctly
5. **Test RED escalation with caregiver** - Should notify both hospital + caregiver
