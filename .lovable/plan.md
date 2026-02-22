

# Fix Voice Call Hallucinations -- Tight, Crystal-Clear 90-Second Calls

## Root Cause

The current prompt tells the AI to "let the conversation breathe" and aim for "2-3 minutes." This causes:
- **Hallucinations**: The AI invents things to say to fill time
- **Repetition**: It asks the same thing twice because it's trying to extend the call
- **Blurred lines**: The long `{briefing}` paragraph gives too much unstructured context, and the AI mixes up what's real vs what it imagined

The briefing system is a good idea but the prompt around it is too loose.

## The Fix

### 1. Rewrite `SENTIO_VOICE_AGENT_GUARDRAILS.md` -- Structured, Short, Clear

Key changes to the prompt philosophy:

- **Target: 90 seconds (1.5 minutes)**, not 2-3 minutes
- **Exactly 3 steps** after greeting -- no more, no less:
  1. Greeting + one follow-up if they say "theek hai" (ask about their day)
  2. Medicine check BY NAME (one question, not a conversation about it)
  3. One symptom follow-up OR one monitoring topic (not both)
- **End after step 3** -- don't fish for more conversation
- **Short sentences only** -- max 15 words per sentence spoken by the AI
- **Never repeat a question** -- if you asked it, move on regardless of the answer
- **Never invent information** -- only reference what's in the variables, nothing else

Remove the vague instructions like "make them feel heard", "let the conversation breathe", "try harder to engage." These cause the AI to improvise and hallucinate.

### 2. Simplify the Briefing Prompt in `bolna-voice-call/index.ts`

The current briefing meta-prompt asks for a 200-word paragraph. That's too much unstructured text for a voice AI to process cleanly.

Changes:
- **Cut briefing to 3 bullet points max, 50 words total**
- New meta-prompt: "Write exactly 3 short bullet points for a voice agent. Bullet 1: What happened last call (one sentence). Bullet 2: What to ask today (medicine name OR symptom). Bullet 3: One conversation starter if they're brief. Max 50 words total."
- This gives the AI clear, actionable instructions instead of a rambling paragraph

### 3. Update Example Call Flows

Replace the 2-minute examples with tight 90-second examples that match the new structure.

## What Gets Modified

| File | Change |
|------|--------|
| `SENTIO_VOICE_AGENT_GUARDRAILS.md` | Full rewrite -- 3-step structure, 90-second target, no improvisation |
| `supabase/functions/bolna-voice-call/index.ts` | Simplify briefing meta-prompt to 3 bullets / 50 words max |

## New Prompt Structure (Summary)

```text
STEP 1: Use {greeting}. If they say "theek hai", ask ONE follow-up about their day. Then move to Step 2.
STEP 2: Ask about ONE medicine by name from {medicines}. Then move to Step 3.
STEP 3: IF {active_symptoms} exists -- ask about the FIRST one only. ELSE ask ONE {monitoring_topics} question. Then END.
END: Say goodbye. Do not ask "aur kuch?" -- just end warmly.
```

## Safety Rules (Unchanged)
- Emergency flow stays exactly the same
- Symptom new vs follow-up distinction stays
- No medical advice
- No hallucinating symptom duration

## After Deployment
Copy the updated prompt from `SENTIO_VOICE_AGENT_GUARDRAILS.md` into the Bolna Dashboard.
