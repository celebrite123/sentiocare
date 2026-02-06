

# Fix B2B Call Context + AI Analysis + Favicon

## Problem Summary

Two critical issues found in the B2B system, plus the favicon fix:

### Issue 1: No Call History Context Sent to Bolna (B2B)
The B2C `bolna-voice-call` function sends rich context to the voice agent: previous symptoms, symptom duration, last call summary, monitoring topics. The B2B `run-scheduled-b2b-calls` sends **none of this** -- only static patient data. This means the AI agent has zero memory of previous calls.

### Issue 2: AI Analysis Always Fails with 404
The B2B webhook uses the **wrong API URL**: `api.lovable.dev/v1/chat/completions` instead of `ai.gateway.lovable.dev/v1/chat/completions`. This causes every AI analysis to fail, forcing the flawed fallback parser. This also explains why symptoms were wrongly triggered previously.

### Issue 3: Favicon Not Displaying
The `index.html` references `/favicon.ico` which doesn't exist. Only `/favicon.png` exists. Need to remove the `.ico` reference to prevent browser fallback errors.

---

## Technical Changes

### Change 1: Add Call History Context to B2B Calls
**File:** `supabase/functions/run-scheduled-b2b-calls/index.ts`

Before making the Bolna API call for each patient, query `patient_checkins` for previous call data and pass it as context:

```typescript
// Fetch last check-in for this patient (context for voice agent)
const { data: lastCheckins } = await supabase
  .from("patient_checkins")
  .select("ai_summary, danger_symptoms_reported, medicines_taken, created_at, risk_level")
  .eq("patient_id", patient.id)
  .order("created_at", { ascending: false })
  .limit(3);

const lastSummary = lastCheckins?.[0]?.ai_summary || "";
const previousSymptoms = lastCheckins
  ?.flatMap(c => c.danger_symptoms_reported || [])
  .filter((v, i, a) => a.indexOf(v) === i) // deduplicate
  .slice(0, 3) || [];
const lastMedicineAdherence = lastCheckins?.[0]?.medicines_taken;
```

Then add to the `user_data` object sent to Bolna:

```typescript
user_data: {
  // ...existing fields...
  last_summary: lastSummary.substring(0, 200),
  previous_symptoms: previousSymptoms.join(", "),
  last_medicine_adherence: lastMedicineAdherence,
  days_since_discharge: Math.floor(
    (Date.now() - new Date(patient.discharge_date).getTime()) / (86400000)
  ),
}
```

### Change 2: Fix AI API URL in B2B Webhook
**File:** `supabase/functions/b2b-bolna-webhook/index.ts`
**Line:** 714

```typescript
// WRONG (returns 404):
const response = await fetch("https://api.lovable.dev/v1/chat/completions", ...);

// CORRECT:
const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", ...);
```

### Change 3: Fix AI API URL in B2B WhatsApp Webhook
**File:** `supabase/functions/b2b-whatsapp-webhook/index.ts`
**Line:** 229

Same fix -- update from `api.lovable.dev` to `ai.gateway.lovable.dev`.

### Change 4: Fix Favicon Reference
**File:** `index.html`

Remove the non-existent `/favicon.ico` reference that causes a 404:

```html
<!-- REMOVE this line (file doesn't exist): -->
<link rel="icon" type="image/x-icon" href="/favicon.ico" />
```

Keep the working PNG references.

---

## Impact

| Fix | Before | After |
|-----|--------|-------|
| Call context | Agent has zero memory of previous calls | Agent knows last call summary, symptoms, medicine adherence |
| AI analysis | Always fails (404), uses flawed fallback | Actually works, accurate risk assessment |
| Favicon | Browser tries .ico (404), may show blank | Clean PNG favicon loads correctly |

## Files Modified

| File | Changes |
|------|---------|
| `supabase/functions/run-scheduled-b2b-calls/index.ts` | Add patient check-in history query and pass as context |
| `supabase/functions/b2b-bolna-webhook/index.ts` | Fix AI API URL |
| `supabase/functions/b2b-whatsapp-webhook/index.ts` | Fix AI API URL |
| `index.html` | Remove broken favicon.ico reference |

