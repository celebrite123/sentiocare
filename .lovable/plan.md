

# Fix: Agent Doesn't Ask About New Symptoms or Probe Mental Health

## The Problems

1. **No new symptom discovery**: The agent ONLY follows up on *existing* symptoms from `{active_symptoms}`. If the elder has a brand new problem today (e.g., knee pain for the first time), the agent never asks. The hard rules even say "Do NOT say 'aur kuch?' or 'koi aur problem?'" — this was to keep calls short but means new symptoms are only captured if the elder volunteers them unprompted.

2. **No open-ended wellbeing probe**: Step 1 asks "din kaisa gaya?" only if the elder says "theek hai" with nothing else. There's no consistent question like "कोई नई तकलीफ़ तो नहीं?" that gives the elder space to share new concerns.

3. **Mental health is passive, not active**: The webhook extracts `mentalHealthConcern` from transcripts post-call, but the agent never actively asks about mood or emotional state unless "mood" is configured as a monitoring topic (which most caregivers haven't set up). There's no default emotional check.

## What Changes

### File 1: `SENTIO_VOICE_AGENT_GUARDRAILS.md`

**Restructure Step 3 to include a new-concern probe and emotional check:**

Current Step 3 flow:
```text
Part A: Follow up existing symptoms → Part B: Monitoring topic → END
```

New Step 3 flow:
```text
Part A: Follow up existing symptoms (unchanged)
Part B: Monitoring topic OR emotional check (if no monitoring topics, ask about mood/feelings instead of just sleep)
Part C (NEW): Open-ended close — "aur koi nai taklif toh nahi?" / "anything else bothering you?"
   → If elder shares something: acknowledge, note it, THEN end
   → If elder says no: end warmly
```

This adds ~10 seconds but catches new symptoms the elder was hesitant to volunteer. The "aur kuch?" was previously banned, but the problem is it was too generic. The new phrasing specifically asks about *new health issues*, not open-ended chat.

**Remove the "NEVER DO: aur kuch?"** rule and replace with: "Do NOT ask generic open questions like 'aur kuch batana hai?' — but DO ask specifically about new health concerns."

**Add emotional awareness default**: When no monitoring topics include "mood", the agent should use an emotionally aware general question instead of always defaulting to "नींद कैसी आई?". Rotate between:
- "मन कैसा है आज?" / "How's your mood today?"
- "नींद कैसी आई?" / "How did you sleep?"
- "अकेला तो नहीं लगता?" / "Do you feel lonely sometimes?"

This ensures mental health data is captured in at least some calls even without explicit monitoring config.

### File 2: `supabase/functions/bolna-voice-call/index.ts`

**Add a `new_concern_prompt` field to `user_data`** so the agent has the exact phrasing ready:
- Hindi: `"कोई नई तकलीफ़ तो नहीं है?"`
- English: `"Any new health concern today?"`

**Add a `wellbeing_question` field** that rotates between mood/sleep/loneliness questions (using the same date-hash approach as greetings) when no monitoring topics are configured. This replaces the hardcoded "नींद कैसी आई?" fallback.

### File 3: `supabase/functions/bolna-webhook/index.ts`

**Enhance the AI analysis prompt** to explicitly extract:
- `emotionalState`: "happy" | "neutral" | "sad" | "lonely" | "anxious" | "withdrawn"
- `newSymptomsVolunteered`: boolean — whether the elder brought up a new concern in response to the open question
- `maskingDistress`: boolean — whether verbal responses contradict tone/engagement patterns (e.g., says "theek hai" but voice is flat, responses are very brief)

**Create mental health alerts**: If `emotionalState` is "lonely", "anxious", or "withdrawn" for 3+ consecutive calls, trigger a "Mental Health Concern" alert with medium severity.

### File 4: `supabase/functions/process-call-retries/index.ts`

Add the same `new_concern_prompt` and `wellbeing_question` fields to retry `user_data` for parity.

## How Mental Health Measurement Works After This

```text
During Call:
  Agent asks mood/emotional question (rotated) → Elder responds
  Agent asks "koi nai taklif?" → Elder may share emotional concerns

Post-Call (Webhook):
  AI extracts emotionalState from transcript
  AI detects masking (says "fine" but brief/flat responses)
  Stored in check_in's monitoring_responses

Alert Logic:
  3+ consecutive calls with sad/lonely/anxious/withdrawn → Mental Health Alert
  mentalHealthConcern flag (existing) → Critical alert
```

## Summary

| File | Change |
|------|--------|
| `SENTIO_VOICE_AGENT_GUARDRAILS.md` | Add Part C (new concern probe), rotate emotional questions as default, update hard rules |
| `bolna-voice-call/index.ts` | Add `new_concern_prompt` and `wellbeing_question` to user_data |
| `bolna-webhook/index.ts` | Add `emotionalState` extraction, masking detection, consecutive-call mental health alerts |
| `process-call-retries/index.ts` | Add same new fields to retry user_data |

After deployment, copy the updated prompt from the guardrails doc into the Bolna Dashboard.

