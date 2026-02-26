

# Fix: Wrong Medicines, Missing Monitoring, AI Ignoring Responses

## Problems Found

### 1. Wrong medicine being asked (CRITICAL)
The example calls in the Bolna prompt hardcode medicine names like "Thyroxin", "Amlodipine", "Metformin". The AI treats these examples as real data and asks about them instead of reading the actual `{medicines}` variable. This is the #1 cause of the wrong medicine issue.

### 2. Custom monitoring topics never asked
The prompt only asks monitoring topics as a fallback in Step 3 when there are no active symptoms. If there are ANY previous symptoms (even old ones), monitoring is always skipped.

### 3. AI doesn't care about responses
The prompt says "acknowledge briefly" but doesn't give the AI specific instructions on HOW to respond to what the elder says. It just rushes through steps.

### 4. AI briefing may hallucinate medicines
The Gemini-generated briefing could mention wrong medicine names from example data or previous summaries that reference other elders.

## Fixes

### File 1: `SENTIO_VOICE_AGENT_GUARDRAILS.md`

**Remove all hardcoded medicine names from examples.** Replace "Thyroxin", "Amlodipine", "Metformin" with `[medicine from {medicines}]` placeholders. This prevents the AI from confusing example data with real data.

**Restructure Step 3** to always include monitoring:
- If active symptoms exist: ask about the first symptom
- THEN also ask ONE monitoring topic if available (making it a natural 2-part step)
- This ensures monitoring topics are never completely skipped

**Add explicit response handling rules:**
- After the elder responds to any question, repeat back what they said in 1 short sentence before moving on
- Example: Elder says "haan, kha li" -> AI says "accha, le li. Bahut achhe." THEN moves to next step
- This makes the elder feel heard instead of feeling interrogated

**Add a critical rule**: "The ONLY medicine names you may speak are those listed in {medicines}. If {medicines} says 'dsa', you ask about 'dsa'. NEVER substitute, correct, or guess medicine names."

### File 2: `supabase/functions/bolna-voice-call/index.ts`

**Harden the briefing meta-prompt** to explicitly forbid inventing medicine names:
- Add to the meta-prompt: "ONLY reference medicine names from this exact list: [medicines]. Do NOT use any other medicine names."
- Add validation after briefing generation: if the briefing contains any medicine name NOT in the elder's actual medicine list, strip it out

**Add medicine name validation** as a post-processing step on the briefing:
- Extract all potential medicine names from the generated briefing
- Cross-reference against the actual `medicineList`
- If a mismatch is found, regenerate with a stricter prompt or remove the hallucinated name

### File 3: `supabase/functions/vapi-voice-call/index.ts`

Apply the same medicine data fixes:
- The Vapi function passes `medicineList` as just `medicines.map(m => m.name).join(', ')` but the interface doesn't include `purpose`
- Fix the Elder interface in Dashboard.tsx to include `purpose` field
- Ensure Vapi also gets proper medicine data

### File 4: `src/pages/Dashboard.tsx`

Fix the Elder interface to include `purpose` in the medicines type so manual calls also pass correct data:
```
medicines: { id: string; name: string; dosage: string; timing: string; purpose?: string }[];
```

## Summary of Changes

| File | What Changes |
|------|-------------|
| `SENTIO_VOICE_AGENT_GUARDRAILS.md` | Remove hardcoded medicine examples, add "ONLY use {medicines}" rule, restructure Step 3 to include monitoring, add response acknowledgment rules |
| `supabase/functions/bolna-voice-call/index.ts` | Add medicine-name validation to briefing, add explicit constraint in meta-prompt |
| `supabase/functions/vapi-voice-call/index.ts` | Same medicine validation fixes |
| `src/pages/Dashboard.tsx` | Add `purpose` to Elder medicines interface |

## Key Principle

The root cause is that the AI has access to example data (hardcoded medicine names in the prompt) AND real data (`{medicines}` variable), and it can't tell them apart. The fix is simple: remove ALL example medicine names from the prompt and add an explicit rule that the AI may ONLY speak medicine names from `{medicines}`.
