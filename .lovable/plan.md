

# Middle-Ground Prompt: Shorter but Not Generic

## The Problem with Both Extremes
- **Current prompt (170 lines)**: Too long for voice LLMs → word skipping, clipping
- **Proposed minimal (25 lines)**: Too generic → loses clinical intelligence (symptom day thresholds, severity scoring, emergency detection logic, acknowledgment pattern)

## Strategy: Surgical Trim
Keep the clinical brain. Remove the noise. Target: **~80 lines** (half of current).

### What Gets CUT (causes bloat, confuses LLM):
1. **"NEVER DO" list** (lines 147-160) — 14 lines of negatives that LLMs fixate on. The positive instructions already cover these.
2. **"RESPONSE ACKNOWLEDGMENT RULE" examples** (lines 55-59) — 4 example pairs are overkill. One sentence instruction is enough.
3. **"CRITICAL MEDICINE RULE" section** (lines 39-45) — Redundant with Step 2 which already says "EXACTLY as written". Collapse into one line in Step 2.
4. **Duplicate goodbye options** (lines 120-127) — 4 options + 2 "do NOT" lines. Replace with one line.
5. **Variables reference table** (lines 232-251) — Not needed in the prompt, it's documentation.
6. **Example call flows** (lines 174-228) — These are for humans reading the doc, not for the agent prompt.

### What STAYS (clinical intelligence):
1. **3-step structure** with Parts A, B, and new concern probe
2. **Symptom day thresholds** (3-4 days: suggest doctor, 5+: strongly recommend)
3. **Emergency flow** with life-threatening detection
4. **Medicine exactness** rule (one line)
5. **Severity 1-10 for new symptoms**
6. **Language/name rules** (condensed to 2 lines)
7. **{new_concern_prompt}** and **{wellbeing_question}** references

### What Gets CONDENSED:
- Emergency flow: 12 lines → 5 lines
- Step 1: 7 lines → 3 lines
- Step 2: 7 lines → 3 lines  
- Step 3: 15 lines → 8 lines (keeps Parts A, B, and new concern)
- Hard rules: 30+ lines → 6 essential lines

## File Change

### `SENTIO_VOICE_AGENT_GUARDRAILS.md`
Rewrite the agent prompt block (lines 16-169) to ~80 lines. Keep the example call flows and variables table outside the prompt block as documentation (they stay in the .md file but are NOT part of what you paste into Bolna).

The prompt will follow this structure:
```text
Identity + target (2 lines)
Briefing + Reference Data (15 lines)  
Emergency flow (5 lines)
Step 1: Greeting (3 lines)
Step 2: Medicine (3 lines)
Step 3: Health + Monitoring + New Concern (8 lines)
End (2 lines)
Rules (6 lines — medicine exactness, language, name, symptom tracking, max 10 words/sentence)
```

No backend code changes needed — the `user_data` payload already sends all variables correctly.

**After deploy**: Copy the new prompt block into Bolna Dashboard for both agents.

