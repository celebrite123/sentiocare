

# Fix: Emergency Call — Wrong Agent Behavior + Wrong Wellbeing Score

## Two Separate Problems

### Problem 1: AI Agent Said "dard tha, ab kaisa hai" During Emergency
The Bolna voice agent received `is_emergency: "true"` in `user_data`, but the agent prompt on Bolna's dashboard appears to not be following the emergency flow correctly. Looking at the logs, `active_symptoms` was **empty** — so the agent couldn't have gotten "dard tha" from the symptom data. It improvised.

**Root cause**: The agent prompt in Bolna dashboard may not have the latest guardrails from `SENTIO_VOICE_AGENT_GUARDRAILS.md`. The emergency flow says: ask "kya hua?", listen, acknowledge, end. It should NOT run Steps 2/3 (medicine + symptom follow-up).

**Fix**: This is a **Bolna Dashboard configuration issue**, not a code fix. You need to update the agent prompt in Bolna's dashboard with the exact prompt from `SENTIO_VOICE_AGENT_GUARDRAILS.md`. However, we can add a defensive measure in code — when `isEmergency` is true, set `active_symptoms`, `symptom_followup`, `monitoring_topics`, and `medicines` to empty so the agent has nothing to improvise with.

### Problem 2: Wellbeing Score Was 7 for Knee Pain Emergency
The `bolna-webhook` AI analysis prompt has **zero emergency context**. It doesn't know this was an emergency call, so it treats "knee pain" casually and defaults to score 7.

**Fix**: Extract `is_emergency` from `user_data` in the webhook payload. Pass it into the AI analysis prompt. Add post-analysis validation to cap scores and force alerts for emergency calls with symptoms.

## Code Changes

### File: `supabase/functions/bolna-voice-call/index.ts`
**Defensive: Clear routine data for emergency calls** (around line 636-655)

When `isEmergency` is true, override:
- `medicines` → empty
- `active_symptoms` → empty  
- `symptom_followup` → empty
- `monitoring_topics` → empty
- `briefing` → empty (already skipped via line 509 `!isEmergency` check)

This ensures the agent has no routine data to improvise with during emergencies.

### File: `supabase/functions/bolna-webhook/index.ts`
Three changes:

**A. Extract emergency flag** (after line 227)
```
const isEmergencyCall = user_data?.is_emergency === "true";
```

**B. Add emergency context to AI prompt** (around line 420)
Append to the analysis prompt:
- If emergency: "This was an EMERGENCY call. Any reported symptom should result in wellBeingScore ≤ 4 and alertTriggered: true."

**C. Emergency-aware defaults and post-analysis validation** (lines 381-390, after line 498)
- Default wellBeingScore: 4 (not 7) for emergency calls
- After AI analysis: if emergency + any symptoms → force score ≤ 4, force alert

| File | Change |
|------|--------|
| `bolna-voice-call/index.ts` | Clear routine data (meds, symptoms, monitoring) for emergency calls |
| `bolna-webhook/index.ts` | Extract `is_emergency`, add to AI prompt, cap scores, force alerts |

