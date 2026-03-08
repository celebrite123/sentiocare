

# Fix: WhatsApp Updates, Email Summaries, Red Alert Caregiver Call, Medicine Hallucination, and Symptom Context

## Issues Found

### 1. Medicine name hallucination: "Thyroxin"
The actual medicines in the database are **"dsa"** and **"Glycoma"**. There is NO "Thyroxin" anywhere. The AI briefing is hallucinating "Thyroxin" and passing it to the Bolna agent. The universal hallucination validator in `bolna-voice-call` (lines 559-602) only catches capitalized words matching pharma suffixes — but "Thyroxin" ends in "in" which IS caught. However, looking at the transcripts, "Thyroxin" appears consistently across multiple calls (Mar 1, 2, 7), meaning:
- The Bolna agent prompt itself may be caching/using an old medicine name, OR
- The briefing validator is not working because "Thyroxin" passes the `actualNamesLower.some()` check incorrectly

**Root cause**: The `formatMedicines` function (line 104-116) prefers `m.purpose` over `m.name` when purpose exists. For "Glycoma", purpose is "Sugar" — so the medicine list sent to Bolna is `"dsa, Sugar"`. Neither is "Thyroxin". The hallucination is coming from the AI briefing generator inventing it, and the validator failing to strip it. The validator regex `capsWordRegex` only matches `[A-Z][a-z]{2,}` — "Thyroxin" has 8 chars and ends in "in" (a pharma suffix), so it SHOULD be caught. But wait — the check is `!actualNamesLower.some(n => n.includes(wordLower) || wordLower.includes(n))`. "thyroxin" does NOT include "dsa" or "glycoma", and vice versa. So it should be caught and replaced. Unless the briefing is in Hindi/Hinglish and "Thyroxin" appears differently.

Looking at the transcript: `"Thyroxin ली आज?"` — this is in the Bolna agent's speech, not the briefing. The briefing only guides the agent; the agent's own prompt on Bolna's side may have "Thyroxin" hardcoded or the agent is hallucinating independently.

**Fix**: Pass the explicit medicine names more prominently in `user_data` and add a `medicine_names_only` field that strictly lists just the names. Also fix `formatMedicines` to always include the name (not just purpose).

### 2. AI didn't ask about "fell down stairs"
The Mar 6 check-in recorded `symptoms_reported: ["fell down stairs"]` with `well_being_score: 2`. But the Mar 7 call transcript shows the AI asked about "Thyroxin" and didn't mention the fall at all. 

**Root cause**: The `activeSymptoms` list is built from `symptomRecencyMap` which scans `previousCheckIns` (last 7). "fell down stairs" from Mar 6 should be in the map. But then it's filtered against `resolved_symptoms`. The resolved symptoms are "back pain" and "तेज दर्द" — neither matches "fell down stairs". So "fell down stairs" SHOULD be in `activeSymptoms`.

The issue is that `activeSymptomsList` (line 486) is passed as `active_symptoms` in `user_data`, but the AI briefing and the Bolna agent may not be using it effectively. The briefing prompt does include `Active symptoms: {activeSymptomsList}`, but if the AI briefing ignores it and instead hallucinate Thyroxin, the symptom context is lost.

**Fix**: Make the active symptoms more prominent in the user_data. Add the symptom + context directly into the greeting or as a mandatory follow-up instruction.

### 3. Red alert (wellbeing ≤ 3) → Caregiver call not happening
In `bolna-webhook` lines 570-613, when `alertTriggered` is true and severity is "high" or "critical", it calls `notify-caregiver` with `initiateCall: severity === "critical"`. But the threshold is:
- `critical`: wellbeing ≤ 2 OR emergency OR mental health
- `high`: wellbeing ≤ 3

So for wellbeing = 3 (severity "high"), `initiateCall` is `false` — no call is made. For wellbeing ≤ 2 it IS critical and call IS initiated. But the user wants calls for wellbeing < 4 (i.e., ≤ 3).

**Fix**: Change the `initiateCall` condition to trigger for both "critical" AND "high" severity (wellbeing ≤ 3).

### 4. WhatsApp updates and email summaries
The daily caregiver WhatsApp confirmation (lines 632-651 in bolna-webhook) is already implemented. Let me check if it's actually working by examining the logs and the Twilio WhatsApp number format.

The `sendCaregiverDailyConfirmation` function sends via Twilio WhatsApp. If the `TWILIO_WHATSAPP_NUMBER` secret doesn't include the `whatsapp:` prefix properly, or the caregiver phone isn't in Twilio's sandbox contacts, it will silently fail. The function logs "Daily check-in confirmation sent to caregiver" on success but doesn't log the Twilio response on failure — it just catches errors.

**Fix**: Add Twilio response logging to catch silent failures. Also verify the weekly email summary cron is configured.

## Implementation Plan

### File: `supabase/functions/bolna-voice-call/index.ts`

**A) Fix medicine formatting** (lines 104-116):
- Change `formatMedicines` to always include the medicine `name` as the primary identifier, with purpose in parentheses. Never omit the name.
- Add a new `medicine_names_only` field in `user_data` with just the raw names for the Bolna agent prompt.

**B) Make symptom context mandatory** (lines 616-633):
- Add `symptom_followup` field in `user_data` with explicit instruction like "Ask about fall from stairs on Mar 6" when active symptoms exist.
- Include this in the greeting for severe symptoms (wellbeing ≤ 4 in previous call).

### File: `supabase/functions/bolna-webhook/index.ts`

**C) Enable caregiver call for wellbeing ≤ 3** (lines 597-613):
- Change `initiateCall: severity === "critical"` to `initiateCall: severity === "critical" || severity === "high"` so caregivers get called for any red alert (wellbeing ≤ 3).

**D) Add WhatsApp confirmation error logging** (lines 170-184):
- Log the Twilio response body on failure so we can debug silent WhatsApp delivery issues.

### File: `supabase/functions/notify-caregiver/index.ts`

**E) Enable calls for "high" severity** (line 177):
- Change `severity === "critical"` to `severity === "critical" || severity === "high"` in the emergency call condition, matching the webhook change.

## Files Modified

| File | Change |
|------|--------|
| `supabase/functions/bolna-voice-call/index.ts` | Fix medicine formatting to always include name; add symptom follow-up context to user_data; add medicine_names_only field |
| `supabase/functions/bolna-webhook/index.ts` | Enable caregiver call for high severity (wellbeing ≤ 3); add WhatsApp error logging |
| `supabase/functions/notify-caregiver/index.ts` | Enable voice call to caregiver for "high" severity alerts |

