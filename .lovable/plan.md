

# Call Quality Analysis and Improvement Plan

## Transcript Analysis — Key Problems Found

I reviewed the last 5 call transcripts and identified these critical issues:

### 1. Medicine Name Template Leak (Worst Bug)
The agent literally says `[medicine from Sugar ki dawai (Glycoma)]` instead of naturally asking about the medicine. The Bolna agent is reading prompt instructions verbatim.

### 2. Ignoring Elder's Responses
- Elder says "तबियत तो नहीं है ठीक" (I'm not well), agent responds "हाँ, ठीक है" (Yes, fine) — completely wrong.
- The agent is not processing what the elder actually says before moving to the next step.

### 3. Over-Escalation Without Assessment
- Elder mentions leg pain → Agent immediately says "Serious है। तुरंत doctor को call करो" without asking severity (1-10 scale) first. The protocol requires severity assessment before escalation.

### 4. Too Short / Abrupt Calls
- Several calls are only 3 turns (greeting → one question → goodbye), missing medicine checks and health follow-ups entirely.
- The 3-step protocol (greeting → medicine → health) is not being followed.

### 5. Calls Ending Without Proper Closure
- Some calls cut off mid-conversation (e.g., "पैर में दर्द या सूजन है?" then nothing).

---

## Proposed Fixes (Code-Side)

### A. Simplify Medicine Format in `user_data`
The current `formatMedicines()` outputs `Sugar ki dawai (Glycoma)` which confuses the agent into reading instructions literally. Change to plain names with a separate instruction field.

### B. Add Explicit `medicine_question` Field
Pre-build the exact medicine question so the agent doesn't need to interpret a template:
- Hindi: `"क्या आपने आज Glycoma ली?"` 
- English: `"Did you take your Glycoma today?"`

### C. Add `first_question` Field  
Pre-build the first interactive question so the agent asks it naturally after the greeting statement, ensuring the elder's response is captured:
- Hindi: `"आज कैसी तबीयत है?"`
- English: `"How are you feeling today?"`

### D. Update Guardrails Doc
Update `SENTIO_VOICE_AGENT_GUARDRAILS.md` with corrected prompt that:
- Uses `{medicine_question}` directly instead of asking the agent to construct a question from `{medicines}`
- Emphasizes: "LISTEN to the answer before responding"
- Requires severity check (1-10) before any escalation

---

## Files to Modify

| File | Change |
|------|--------|
| `supabase/functions/bolna-voice-call/index.ts` | Add `medicine_question`, `first_question` fields to `userData`; simplify medicine format |
| `SENTIO_VOICE_AGENT_GUARDRAILS.md` | Update agent prompt with pre-built question variables and response-listening rules |

## Important Note
The most impactful fixes require updating the **Bolna dashboard prompt** to match these new variables. The code changes prepare better data — but you will also need to update the agent prompt in Bolna's dashboard using the updated guardrails doc.

