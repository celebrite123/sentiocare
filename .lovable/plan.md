

# Fix: Retry Calls Send Incomplete Data + Medicine Names Need Purpose-Based Framing

## Problems Identified

1. **"Sugar li aaj?"** — The agent asks by medicine NAME ("sugar") instead of medicine PURPOSE ("sugar ki dawai"). Elders don't remember brand names; they understand the condition the medicine treats. This affects BOTH main calls and retries because `formatMedicines()` formats as `"sugar (for diabetes)"` but the agent prompt says "ask about the FIRST medicine name" — so the AI picks "sugar" literally.

2. **Agent dismissed knee pain at end of call** — Without `symptom_followup` (the MANDATORY instruction), the agent has no directive to prioritize or even acknowledge new symptoms. It just follows its vague routine and rushes to end.

3. **Agent didn't repeat/acknowledge when asked to repeat** — Without `briefing` (the AI-generated conversation objectives), the agent has no structured guidance and improvises badly, including ignoring repeat requests.

4. **Retry `user_data` is still missing critical fields**: `briefing`, `symptom_followup`, `medicine_names_only`, `is_emergency`, `caregiver_name`, `caregiver_relation`, `has_caregiver`, and `recent_calls` summaries.

## Changes

### File 1: `supabase/functions/process-call-retries/index.ts`

**A. Add AI briefing generation** — Use Lovable AI (same as main function) to generate 3-bullet conversation objectives for the agent. This is the single biggest quality driver.

**B. Add missing `user_data` fields:**
- `briefing` — AI-generated objectives
- `symptom_followup` — MANDATORY instruction to ask about most recent symptom first
- `medicine_names_only` — raw medicine names for strict validation
- `is_emergency: "false"` — explicit flag
- `has_caregiver`, `caregiver_name`, `caregiver_relation` — from notification_settings
- `recent_calls` — last 3 call summaries

**C. Fix medicine format** — Use purpose-based format matching `formatMedicines()` from the main function: `"sugar (for diabetes)"` instead of just `"sugar"`.

**D. Sort symptoms by recency** — Fetch last 7 check-ins instead of just 1, collect symptoms with dates, sort by most recent first (same fix from the earlier plan).

**E. Use context-aware greeting** — Use `buildGreeting()` logic instead of hardcoded retry message. The greeting should acknowledge this is a follow-up attempt but still feel natural.

### File 2: `supabase/functions/bolna-voice-call/index.ts`

**A. Change medicine format to purpose-first for the agent** — Update `formatMedicines()` so when a medicine has a purpose, the format is `"[purpose] ki dawai [name]"` (Hindi) or `"[name] (for [purpose])"` (English). This way when the agent asks "sugar ki dawai li?", the elder understands.

Actually, the better fix is in the agent prompt (Bolna Dashboard), not in the data format. The data already sends `"sugar (for diabetes)"`. The issue is the Bolna agent prompt says "ask about the FIRST medicine name" — it should say "ask about the medicine by its PURPOSE if available". But since we can't change the Bolna Dashboard from code, we should reformat the `medicines` field to be purpose-first so the AI naturally uses it.

**B. Update `formatMedicines()` to produce purpose-first format:**
- Hindi: `"diabetes ki dawai (sugar)"` instead of `"sugar (for diabetes)"`
- English: `"diabetes medicine (sugar)"` instead of `"sugar (for diabetes)"`
- This way, the AI naturally says "diabetes ki dawai li?" instead of "sugar li?"

### File 3: `SENTIO_VOICE_AGENT_GUARDRAILS.md` (documentation update)

Update the medicine check step to clarify: "Ask about the medicine using its PURPOSE/CONDITION, not the brand name. Example: 'diabetes ki dawai li?' NOT 'sugar li?'"

## Technical Details

### Medicine Format Change
```text
Before: "sugar (for diabetes), Ecosprin (for heart)"
After (Hindi): "diabetes ki dawai (sugar), heart ki dawai (Ecosprin)"  
After (English): "diabetes medicine (sugar), heart medicine (Ecosprin)"
```

### Retry user_data Parity
```text
Field                | Before (retry)      | After (retry)
---------------------|---------------------|--------------------
briefing             | MISSING             | AI-generated 3 bullets
symptom_followup     | MISSING             | MANDATORY instruction
medicine_names_only  | MISSING             | Raw names for validation
is_emergency         | MISSING             | "false"
has_caregiver        | MISSING             | "true"/"false"
caregiver_name       | MISSING             | From notification_settings
caregiver_relation   | MISSING             | From notification_settings
recent_calls         | MISSING             | Last 3 summaries
```

| File | Change |
|------|--------|
| `process-call-retries/index.ts` | Add AI briefing, all missing user_data fields, purpose-based medicine format, symptom sorting |
| `bolna-voice-call/index.ts` | Update `formatMedicines()` to purpose-first format |
| `SENTIO_VOICE_AGENT_GUARDRAILS.md` | Update medicine check instructions to use purpose-based asking |

**Important**: After deployment, update the Bolna Dashboard agent prompt with the new medicine check instructions from the guardrails doc.

