
## What I found

I checked the last two completed voice calls plus the saved check-ins/alerts.

### Last 2 transcripts
1. **2026-04-03**
   - User: “मैं ... गिर गया हूं मुझे बहुत दर्द हो रहा है”
   - Bot replied: “ठीक है, मैं इसे note कर रही हूं और family को update करूंगी.”
   - This should have been an immediate emergency script, not a soft note.

2. **2026-04-02**
   - User: “मैं सीढ़ी से गिर गया हूं”
   - Bot replied: “क्या आपने आज dsa ली?”
   - This is a clear emergency miss.

### Important conclusion
The system **did escalate after the call**:
- both calls created **critical emergency alerts** in the backend
- so the failure is **not only TTS/STT**
- STT is noisy, but the saved transcript still clearly contains **fall / stairs / severe pain**
- the real gap is: **the live Bolna agent did not interrupt the flow immediately**

## Why this is happening

### 1. The live agent prompt is drifting from the code
Your current dashboard prompt uses variables like:
- `{active_symptoms}`

But the actual `bolna-voice-call` function sends:
- `symptom_followup`
- `first_question`
- `medicine_question`
- `wellbeing_question`
- `new_concern_prompt`

That mismatch makes the runtime behavior less predictable in production.

### 2. Emergency handling is too prompt-dependent
Right now, immediate escalation depends on the agent obeying natural-language instructions inside the provider prompt.

That is fragile when:
- ASR paraphrases the sentence
- the model prioritizes step flow over interrupt rules
- the transcript says “सीढ़ी से गिर गया हूं”, “मुझे बहुत दर्द हो रहा है”, “help”, “I need help”, etc. in slightly different wording

### 3. Backend safety net is only post-call
`bolna-webhook` correctly detects red flags **after** the call and creates alerts, but that does not protect the elder **during** the conversation.

### 4. Keyword coverage is still incomplete
The backend red-flag safety net catches some phrases, but it should be expanded for real-world speech variants like:
- fall / fell / fallen / fell down / slipped / stairs / stair fall
- help / help me / I need help / save me
- गिर गया / गिर गई / सीढ़ी से गिर गया / गिर पड़ा
- बहुत दर्द / तेज़ दर्द / उठ नहीं पा रहा / चल नहीं पा रहा

## Plan to fix this safely

### 1. Make one production source of truth for the B2C voice prompt
- Replace the drifting dashboard prompt with a hardened prompt aligned to the variables the code actually sends
- Remove unsupported or stale references like `{active_symptoms}`
- Keep the prompt in repo docs as the canonical version, then sync the provider config from that

### 2. Harden the emergency branch so it always wins
Update the prompt so that **any mention of fall/help/severe distress** immediately overrides normal flow.

Emergency triggers should include:
- chest pain / breathing difficulty / fainting / unconscious
- fell / fell down / stairs fall / slipped
- help me / I need help / emergency
- गिर गया / गिर गई / सीढ़ी से गिर गया / मदद / बहुत दर्द / तेज़ दर्द

And the behavior should be:
```text
- Stop current step immediately
- Do not ask medicine
- Do not ask pain score first
- Do not continue routine questions
- Say emergency script
- End / hand off
```

### 3. Remove ambiguous “non-emergency pain” handling for fall cases
Right now the flow allows:
- pain severity questions
- “I’ll note it and update family”

That is unsafe when the user says they fell or needs help.

New rule:
- **fall/help/breathing/chest pain/fainting** = instant emergency
- no severity scoring before escalation
- no medicine step afterward

### 4. Strengthen backend safety net in `bolna-webhook`
Even though the main issue is live-call behavior, the backend should be stricter too.

Update `bolna-webhook` to:
- expand red-flag phrase list
- force `emergencyDetected = true` for fall/help phrases
- force `severity = critical`
- force caregiver notification/callback for those phrases
- log exactly which phrase triggered the emergency decision

This protects against model misses and ASR variation.

### 5. Add regression tests using the exact bad transcripts
Create deterministic tests around the two real failing examples:
- “मैं सीढ़ी से गिर गया हूं”
- “मुझे बहुत दर्द हो रहा है, मैं गिर गया हूं”
- “I fell down”
- “I need help”
- “help me, I fell”
- Hindi mixed variants

Expected result:
- emergency detected
- critical alert
- caregiver notify path triggered

### 6. Add safer observability for production
For each voice check-in, capture:
- whether emergency keyword safety net fired
- which keyword/phrase matched
- whether alert was created
- whether caregiver notification was attempted

That makes future misses diagnosable fast.

### 7. Optional but recommended: add a real handoff path
If the provider supports it, upgrade emergency handling from “say message and end” to:
- immediate caregiver callback trigger
- or warm transfer / nurse handoff

That is the strongest production-safe behavior.

## Technical details

### Files/areas to update
- `supabase/functions/bolna-webhook/index.ts`
  - expand deterministic emergency phrase matching
  - force critical escalation on fall/help phrases
- `supabase/functions/bolna-voice-call/index.ts`
  - keep payload/prompt variables aligned
  - optionally pass a stronger normalized emergency instruction set
- `SENTIO_VOICE_AGENT_GUARDRAILS.md`
  - rewrite to match actual runtime variables and emergency behavior
- Bolna dashboard agent prompt
  - must be synced to the hardened version, because this behavior currently lives there

### Specific mismatch I would fix first
Your current dashboard prompt references `{active_symptoms}`, but `bolna-voice-call` sends `symptom_followup` instead. That inconsistency should be removed before production rollout.

### What success looks like
For any utterance like:
- “I fell down”
- “I need help”
- “मैं गिर गया हूं”
- “मैं सीढ़ी से गिर गया हूं”
- “मुझे बहुत दर्द हो रहा है”
the agent should:
1. stop routine flow instantly
2. speak the emergency escalation script
3. not ask medicine / wellbeing / new concern
4. trigger critical backend escalation

### Rollout order
1. Harden prompt
2. Expand backend safety net
3. Add transcript regression tests
4. Verify against the two exact failing transcripts
5. Then use in production

This is the safest path because the current system already catches emergencies **after** the call, but it is still unsafe **during** the call, which is the part that must be fixed first.
