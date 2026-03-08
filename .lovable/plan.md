

# Clean Up: Remove Redundant Hardcoded Directives

## Problem
The backend injects `MANDATORY_CLOSE: ...` into `monitoring_topics` and appends a `mandatoryNewConcernDirective` to `briefing`. These were workarounds added because the Bolna Dashboard prompt didn't have Part C. Now that the guardrails prompt properly uses `{new_concern_prompt}` and `{wellbeing_question}` as dedicated variables, these injections are redundant noise that could confuse the AI agent with duplicate instructions.

## What's Actually Wrong
**The Bolna Dashboard still has the OLD prompt.** You need to copy the prompt from `SENTIO_VOICE_AGENT_GUARDRAILS.md` (lines 14-184, the copy-paste ready block) into the Bolna Dashboard. That's the real fix — no code change will help until the dashboard prompt is updated.

## Code Cleanup

### File 1: `supabase/functions/bolna-voice-call/index.ts`
- Remove `mandatoryNewConcernDirective` variable and its injection into `briefing`
- Remove `MANDATORY_CLOSE` tag from `monitoringTopicsWithMandatoryClose` — just pass `monitoringQuestions` directly
- Keep `new_concern_prompt` and `wellbeing_question` as standalone fields in `user_data` (these are correct — the prompt references them via `{new_concern_prompt}` and `{wellbeing_question}`)

### File 2: `supabase/functions/process-call-retries/index.ts`
- Same cleanup: remove `mandatoryNewConcernDirective` and `MANDATORY_CLOSE` tag injection

## Action Required (Manual)
After cleanup deploys, copy the full agent prompt from `SENTIO_VOICE_AGENT_GUARDRAILS.md` into the Bolna Dashboard for both Hindi and English agents. The prompt already includes:
- `{new_concern_prompt}` in Reference Data
- `{wellbeing_question}` in Reference Data
- Part C instructions to ALWAYS ask `{new_concern_prompt}` before ending
- Part B fallback to use `{wellbeing_question}` when no monitoring topics exist

