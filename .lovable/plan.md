

# Fix: Greeting Should Not Ask a Question

## Problem
The `greeting` passed to Bolna contains a question (e.g., "How are you feeling today?"), but since it's the agent's **first utterance** (not a conversational turn), Bolna treats it as a one-shot opening line and immediately moves into its scripted flow — ignoring the elder's answer to that question.

## Solution
Change the greeting to a **warm statement only** — no question. Let the Bolna agent's prompt handle the first real question naturally, so it listens for a response.

### Current greetings (examples):
- `"Hello Ramesh! How are you feeling today?"` — asks question, answer ignored
- `"नमस्ते रमेश जी! कैसी तबीयत है आज?"` — same issue

### New greetings (statement-only):
- `"Hello Ramesh, this is Sentio, your health companion."` — no question
- `"नमस्ते रमेश जी, मैं Sentio हूं, आपका health साथी।"` — no question

The agent prompt on Bolna's side will then naturally ask its first question (symptom follow-up or medicine check), and since it's a real conversational turn, the elder's response will be properly processed.

## File to modify
- `supabase/functions/bolna-voice-call/index.ts` — rewrite `buildGreeting()` to return statement-only greetings (no trailing questions)

## Changes in `buildGreeting()`
- Remove all question marks and question phrases from greetings
- Keep variety (day-hash rotation) and context-awareness (days since last call)
- Emergency greetings stay as-is (they already work correctly — direct and action-oriented)

