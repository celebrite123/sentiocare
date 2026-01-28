
# B2B Voice Agent Production Hardening Plan

This plan addresses critical gaps to make the voice agent production-ready with proper identity verification, structured safety checks, multi-channel escalation, and human handover capabilities.

## Overview

The current system has a good foundation but lacks the clinical rigor required for production healthcare use. We need to:
1. Restructure the voice script for compliance
2. Implement multi-channel escalation (SMS + WhatsApp)  
3. Add human handover with guaranteed callback
4. Enhance audit logging for compliance

---

## Phase 1: Voice Script Restructuring

### 1.1 Update B2B_VOICE_AGENT_PROMPT.md

Replace the current unstructured script with a clinical-grade flow:

**New Call Structure (2-3 minutes):**

```text
## CALL FLOW (2-3 minutes, structured)

### STEP 1: IDENTITY VERIFICATION (Required)
- Hindi: "क्या मैं {patient_name} जी से बात कर रहा/रही हूं?"
- English: "Am I speaking with {patient_name}?"
- If NO/WRONG PERSON: "कृपया {patient_name} जी को फ़ोन दीजिए" → Wait or reschedule

### STEP 2: CONSENT CHECK (Required)
- Hindi: "यह {hospital_name} से स्वास्थ्य जांच कॉल है। क्या आपके पास 2 मिनट हैं?"
- English: "This is a health check call from {hospital_name}. Do you have 2 minutes?"
- If NO: "कोई बात नहीं, हम फिर कॉल करेंगे। धन्यवाद।" → END & reschedule

### STEP 3: CORE SAFETY CHECKS (Ask each, Yes/No only)
Ask these 5 questions IN ORDER. Wait for clear Yes/No after each:

1. "क्या आज आपको बुखार है?" / "Are you having fever today?"
2. "क्या आपको कोई नया दर्द है जो दवाई से कम नहीं हो रहा?" / "Are you having new or worsening pain that tablets are not controlling?"
3. "क्या आपको सांस लेने में तकलीफ़ हो रही है?" / "Are you having difficulty breathing or shortness of breath more than usual?"
4. "क्या आपके घाव से खून, मवाद या पानी आ रहा है? या कोई नई सूजन?" / "Do you have bleeding, pus, or heavy discharge from your wound or any new swelling?"
5. "क्या आपको चक्कर आया, भ्रम हुआ, या अचानक कमज़ोरी महसूस हुई?" / "Have you felt faint, confused, or had sudden weakness?"

⚠️ IF ANY ANSWER IS "YES" → IMMEDIATELY go to EMERGENCY PROTOCOL

### STEP 4: MEDICINE CHECK
- "क्या आप अपनी दवाइयाँ नियमित ले रहे हैं?" / "Are you taking your medicines regularly?"
- If NO: Ask why (cost/confusion/side effects)

### STEP 5: FOLLOW-UP CONFIRMATION (if within 5 days)
- "आपका अगला डॉक्टर अपॉइंटमेंट {follow_up_date} को है। क्या आप आएंगे?"
- If can't attend: Note for coordinator callback

### STEP 6: CLOSING
- "और कोई सवाल या परेशानी?" / "Any other questions or concerns?"
- If complex response: "मैं आपको एक नर्स से connect कराता हूं" → HUMAN HANDOVER
- Normal close: "अपना ख्याल रखिए। जल्दी ठीक हों।"

## EMERGENCY PROTOCOL (Any YES on safety questions)
1. STOP all other questions immediately
2. Say: "यह महत्वपूर्ण है। मैं अभी अस्पताल को सूचित कर रहा हूं।"
3. Say: "कृपया तुरंत {hospital_contact} पर कॉल करें या नज़दीकी अस्पताल जाएं।"
4. Say: "एक स्टाफ़ मेंबर 15 मिनट में आपको कॉल करेगा।"
5. END CALL immediately

## HUMAN HANDOVER TRIGGERS
Transfer to human when:
- Patient explicitly asks: "मुझे किसी से बात करनी है" / "I want to speak to someone"
- Complex free-text response that can't be categorized
- Patient sounds confused, distressed, or unresponsive
- ANY "YES" on red-flag questions

Handover script:
- "मैं आपको एक नर्स से connect कराता हूं।"
- If nurse unavailable: "नर्स अभी busy हैं। 30 मिनट में वापस कॉल आएगा। ज़रूरत हो तो {hospital_contact} पर कॉल करें।"
```

---

## Phase 2: Enhanced Escalation System

### 2.1 Create Multi-Channel Alert Function

**New file: `supabase/functions/escalate-b2b-alert/index.ts`**

This function handles tiered escalation:
- **RED (Immediate)**: SMS + WhatsApp to on-call clinician AND duty nurse
- **YELLOW (Urgent)**: Email + SMS to duty nurse
- **GREEN (Advisory)**: Email to care coordinator

```typescript
// Key logic:
const escalationConfig = {
  red: {
    channels: ['sms', 'whatsapp', 'voice_call'],
    targets: ['on_call_clinician', 'duty_nurse'],
    sla_minutes: 15,
    template: 'URGENT: {patient_name} ({ward}) reported {symptom}. Immediate callback required.'
  },
  yellow: {
    channels: ['sms', 'email'],
    targets: ['duty_nurse'],
    sla_minutes: 120,
    template: 'Follow-up needed: {patient_name} - {reason}'
  },
  green: {
    channels: ['email'],
    targets: ['care_coordinator'],
    sla_minutes: 480,
    template: 'Advisory: {patient_name} - {reason}'
  }
};
```

### 2.2 Update `b2b-bolna-webhook` for Immediate Escalation

When RED flag detected:
1. Create `b2b_alerts` with `severity: 'critical'`
2. Call `escalate-b2b-alert` immediately
3. Auto-schedule callback in `scheduled_callbacks` with 15-min SLA
4. Store structured responses in new `safety_check_responses` JSONB field

---

## Phase 3: Human Handover System

### 3.1 Database Changes

```sql
-- Add columns to organizations for staff routing
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS 
  on_call_clinician_phone text,
  duty_nurse_phone text,
  care_coordinator_email text;

-- Add guaranteed callback tracking
ALTER TABLE scheduled_callbacks ADD COLUMN IF NOT EXISTS 
  patient_notified boolean DEFAULT false,
  patient_notified_at timestamptz,
  sla_deadline timestamptz,
  escalated boolean DEFAULT false;

-- Track safety check responses
ALTER TABLE patient_checkins ADD COLUMN IF NOT EXISTS 
  safety_check_responses jsonb DEFAULT '{}';
```

### 3.2 Create Callback Guarantee Function

**New file: `supabase/functions/schedule-guaranteed-callback/index.ts`**

When nurse is unavailable:
1. Create callback record with SLA
2. Send WhatsApp to patient: "A nurse will call within 30 minutes"
3. Start SLA timer
4. If SLA breached → escalate to supervisor

---

## Phase 4: Enhanced Audit Logging

### 4.1 Update `b2b_audit_log` Table

```sql
-- Add new action types for compliance
-- Already exists, but ensure these action types are logged:
-- 'call_started', 'identity_verified', 'consent_obtained', 
-- 'safety_question_answered', 'red_flag_detected', 
-- 'escalation_triggered', 'handover_initiated', 
-- 'callback_scheduled', 'sla_breached'
```

### 4.2 Structured Call Logging

Every call should log:
```json
{
  "call_id": "...",
  "identity_verified": true,
  "consent_given": true,
  "safety_responses": {
    "fever": "no",
    "uncontrolled_pain": "no", 
    "breathing_difficulty": "yes",
    "wound_discharge": "no",
    "neurological_symptoms": "no"
  },
  "red_flag_triggered": true,
  "escalation_type": "red",
  "escalation_sent_to": ["clinician", "nurse"],
  "callback_scheduled": true,
  "call_duration_seconds": 145
}
```

---

## Phase 5: ASR Confidence Handling

### 5.1 Bolna Platform Limitations

Bolna does not expose ASR confidence scores directly. However, we can:

1. **Prompt-Level Handling**: Add to agent prompt:
   ```
   If patient's response is unclear, ask: "माफ़ कीजिए, क्या आप दोबारा बता सकते हैं?"
   After 2 unclear responses: "मैं आपकी बात समझ नहीं पा रहा। मैं एक नर्स से connect कराता हूं।"
   ```

2. **Transcript Analysis**: In webhook, detect:
   - Very short responses (< 3 words) for safety questions
   - High pause ratio (if Bolna provides timing)
   - Repeated "huh", "kya", confusion indicators

3. **Human Handover Trigger**: If 2 safety questions have unclear responses → auto-handover

---

## Implementation Summary

| Phase | Files Changed | Priority |
|-------|---------------|----------|
| 1 | `B2B_VOICE_AGENT_PROMPT.md` | Critical |
| 2 | `escalate-b2b-alert/index.ts` (new), `b2b-bolna-webhook/index.ts` | Critical |
| 3 | `schedule-guaranteed-callback/index.ts` (new), DB migration | High |
| 4 | `b2b-bolna-webhook/index.ts`, DB migration | High |
| 5 | `B2B_VOICE_AGENT_PROMPT.md`, `b2b-bolna-webhook/index.ts` | Medium |

### Database Migration Required

```sql
-- New columns for organizations
ALTER TABLE organizations 
  ADD COLUMN IF NOT EXISTS on_call_clinician_phone text,
  ADD COLUMN IF NOT EXISTS duty_nurse_phone text,
  ADD COLUMN IF NOT EXISTS care_coordinator_email text;

-- Enhanced callback tracking  
ALTER TABLE scheduled_callbacks
  ADD COLUMN IF NOT EXISTS patient_notified boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS patient_notified_at timestamptz,
  ADD COLUMN IF NOT EXISTS escalated boolean DEFAULT false;

-- Safety check responses
ALTER TABLE patient_checkins
  ADD COLUMN IF NOT EXISTS safety_check_responses jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS identity_verified boolean,
  ADD COLUMN IF NOT EXISTS consent_obtained boolean;
```

### Bolna Dashboard Updates Required (Manual)

After code deployment, the hospital admin must:
1. Update the agent prompt in Bolna Dashboard
2. Set Welcome Message to `{greeting}`
3. Test with sample calls before going live

---

## Expected Outcomes

After implementation:
- Every call follows identity → consent → safety → meds → close flow
- RED flags trigger immediate multi-channel notification (15-min SLA)
- Patients receive guaranteed callback notification if nurse unavailable
- Full audit trail for compliance/NABH requirements
- Unclear responses trigger human handover
