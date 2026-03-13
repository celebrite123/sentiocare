

# Fix: Simplify Voice Agent — Stop "Bahut Acche + Nahi Li" and Clean Up

## Problems (from latest transcripts)

1. **"Bahut acche, aapne dawai nahi li"** — Agent merges YES and NO medicine responses into one nonsensical sentence because the prompt puts both options on the same line
2. **Double greeting** — `welcome_message` = `{greeting}` AND prompt says "Say {greeting} exactly" → agent speaks greeting twice
3. **Context bloat** — `last_summary`, `recent_calls`, `symptom_followup`, `medicine_names_only`, `symptom_days` all dumped into userData, polluting the agent's working memory and causing it to read instructions literally
4. **Briefing echoes medicine question** — The AI briefing sometimes generates "Ask about dsa" which makes the agent double-ask about medicine

## Solution: Two files, surgical changes

### File 1: `SENTIO_VOICE_AGENT_GUARDRAILS.md` — Full rewrite to ~30 lines

Replace the entire agent prompt section with a dead-simple linear flow:

```
You are Sentio. Daily elder health check-in. Warm, caring, under 90 seconds.

BRIEFING: {briefing}

EMERGENCY — IMMEDIATE OVERRIDE (at ANY point in the call):
If elder says: chest pain, breathing difficulty, fainting, behosh, stroke signs, suicidal words, severe bleeding
→ 1. "Main samajh raha hu. Ye serious hai."
→ 2. "Turant {caregiver_name} ko call karein" (or "doctor ko call karein")
→ 3. "Aapke parivaar ko bata raha hu. Fikr mat karein."
→ 4. End call.

IF {is_emergency} = "true":
→ Ask "Kya hua? Bataiye." → Listen → Acknowledge → If life-threatening, do emergency above → Otherwise reassure and end.

NORMAL CALL — 4 STEPS IN ORDER:

STEP 1: Ask: {first_question}
  Wait for full answer. Acknowledge what they said in ONE sentence.
  Example: They say "theek nahi" → You say "accha, theek nahi lag raha"
  NEVER say "haan theek hai" if they said "theek nahi"

STEP 2: Ask: {medicine_question}   [skip if empty]
  Wait for answer.
  ✅ If they say YES / haan / li → Reply ONLY: "बहुत अच्छे"
  ❌ If they say NO / nahi / nahi li → Reply ONLY: "कोई बात नहीं, कल ज़रूर लीजिए"
  ⚠️ NEVER combine both. NEVER say "bahut acche" and "nahi li" together.

STEP 3: Ask: {wellbeing_question}
  Wait. Acknowledge.
  Then ask: {new_concern_prompt}
  Wait. If they mention pain → ask "1 se 10 mein kitna dard?" Only say "doctor" if 8+.

STEP 4: One warm closing sentence. End.

RULES:
- After EVERY question: WAIT → ACKNOWLEDGE → then next question
- Medicine names: ONLY from {medicines}. Never invent.
- Say {first_question}, {medicine_question}, {wellbeing_question}, {new_concern_prompt} EXACTLY as given
- Language: {preferred_language}
- Use {first_name} only in greeting. After that: "aap" / "you"
- Do NOT repeat the greeting. It is already spoken as the welcome message.
```

**Key differences from current prompt:**
- Removed "Say {greeting} exactly" → fixes double greeting
- Medicine YES/NO on separate lines with ✅/❌ markers and explicit "NEVER combine" rule
- Removed `{active_symptoms}`, `{symptom_days}`, `{monitoring_topics}` from the flow → dramatically simplifies branching
- Removed "max 4 questions" rule that conflicted with "complete all steps"
- ~30 lines instead of ~80
- Variables table updated to remove deprecated fields

### File 2: `supabase/functions/bolna-voice-call/index.ts` — Remove 6 noisy userData fields

**Remove these fields from the `userData` object (lines 697-720):**

| Field to remove | Why |
|---|---|
| `medicine_names_only` (line 704) | Redundant with `medicines`, adds noise |
| `symptom_followup` (line 707) | Contains instruction text the agent reads literally |
| `symptom_days` (line 708) | Removed from prompt, no longer needed |
| `last_summary` (line 709) | Raw transcript text, not a real summary — pollutes context |
| `recent_calls` (line 710) | Dumps full previous transcripts into context |
| `active_symptoms` (line 706) | Simplified flow doesn't branch on this; wellbeing question covers it |

**Keep these fields (unchanged):**
`elder_id`, `first_name`, `greeting`, `first_question`, `briefing`, `medicines`, `medicine_question`, `monitoring_topics`, `new_concern_prompt`, `wellbeing_question`, `is_emergency`, `emergency_intro`, `has_caregiver`, `caregiver_name`, `caregiver_relation`, `preferred_language`

**Also fix the briefing prompt (lines 584-601):**
- Remove bullet 2's instruction to "pick ONE medicine... to follow up" — this causes the briefing to echo the medicine question
- Change bullet 2 to: "One thing to watch for today (a symptom, mood, or health pattern)"
- This prevents the AI briefing from generating "Ask about dsa" which makes the agent double-ask

**Also remove dead code:**
- Remove `getMedicineNamesOnly()` function (line 126-129) — no longer called
- Remove `symptomFollowup` variable construction (lines 679-690) — no longer used
- Remove `recentCallSummaries` construction (lines 389-395) — no longer used
- Remove `symptomDaysFormatted` construction (lines 559-561) — no longer used

### After deployment

You **must** copy the updated prompt from `SENTIO_VOICE_AGENT_GUARDRAILS.md` and paste it into the **Bolna Dashboard** for both Hindi and English agents. The code sends correct data, but the dashboard prompt controls what the agent actually says.

## Summary

| File | What changes |
|------|-------------|
| `SENTIO_VOICE_AGENT_GUARDRAILS.md` | Full rewrite: ~30 line linear prompt, fix medicine YES/NO, fix double greeting, remove branching complexity |
| `supabase/functions/bolna-voice-call/index.ts` | Remove 6 noisy userData fields, fix briefing to not echo medicine question, remove dead code |

