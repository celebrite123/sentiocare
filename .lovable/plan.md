

# Fix the Broken Voice Agent -- Every Problem, Root Cause, and Fix

## What the Transcripts Actually Show

### Problem 1: Emergency Call Has ZERO Emergency Behavior
The call log from today shows `is_emergency: true` but the user_data sent to Bolna was:
```
greeting: "Aditya जी, 3 दिन हो गए। सब ठीक है ना?"
```
That's a casual greeting for an EMERGENCY call. The Bolna prompt expects `{emergency_intro}`, `{has_caregiver}`, `{caregiver_name}`, `{caregiver_relation}` -- but **none of these are in the user_data object** (lines 403-414 of `bolna-voice-call`). They simply don't exist. So the Bolna agent sees empty strings for all emergency variables and acts like a normal call.

**Root cause:** The user_data object is missing 4 critical fields. The `buildGreeting` function also has no emergency path.

### Problem 2: AI Says "काफी दिन हो गए" for BRAND NEW Symptoms
Today's transcript:
> User: "आज मैं सुबह जिम कर रहा था थोड़ा पीठ में दर्द है" (back pain from gym TODAY)
> AI: "काफी दिन हो गए, डॉक्टर को दिखाना चाहिए"

Feb 2 transcript:
> User: "there is a bit of a headache"
> AI: "सरदर्द 3 दिन से ज़्यादा हो गया है"
> User: "Where has it been more than three days, like?"

The AI cannot distinguish between a FOLLOW-UP symptom (from `{active_symptoms}`) and a NEWLY REPORTED symptom. The Bolna prompt lumps them together, so the "3+ days" rule gets applied to everything.

**Root cause:** The Bolna dashboard prompt doesn't clearly separate "follow-up on existing symptoms" from "new symptom reported during this call."

### Problem 3: Greetings Are Robotic and Repetitive
Every call: "Aditya जी, कल बात हुई थी। आज कैसी तबीयत है?" or "3 दिन हो गए। सब ठीक है ना?" -- repeated verbatim across days.

**Root cause:** `buildGreeting` has only 4 templates with no variety.

### Problem 4: Goodbye Is Always the Same Line
Every single call ends with: "ठीक है, अपना ख्याल रखिए।" -- word for word, every time.

**Root cause:** The Bolna prompt gives exactly ONE goodbye line.

### Problem 5: Medicine Question Is Still Generic
Despite having medicine data, the AI says "आज दवाई ली?" instead of "Thyroxin ली?" because the Bolna dashboard prompt hardcodes: `"आज दवाई ली?" / "Did you take your medicine today?"` as the instruction. Even though we send specific medicine names, the prompt tells the AI to use the generic phrasing.

**Root cause:** The Bolna prompt instruction overrides the medicine data we pass.

---

## The Fix (Two Parts)

### Part 1: Fix the Edge Function (bolna-voice-call/index.ts)

**A. Add missing emergency + caregiver fields to user_data:**
Currently (lines 403-414), these fields are completely absent:
- `emergency_intro`
- `has_caregiver`
- `caregiver_name`
- `caregiver_relation`

Add a query for `notification_settings` (caregiver info) and build `emergency_intro` message. Include all 4 fields in user_data.

**B. Fix buildGreeting for emergency calls:**
Add an `isEmergency` parameter. When true, the greeting should be:
- Hindi: "Aditya जी, ये Sentio की तरफ़ से emergency call है। मुझे बताइए, क्या हुआ?"
- English: "Aditya, this is an emergency call from Sentio. Please tell me what happened."

**C. Add greeting variety:**
Instead of 4 rigid templates, use 8-10 warm variations that rotate based on a hash of the date, so the elder doesn't hear the exact same greeting every day.

### Part 2: Rewrite the Bolna Agent Prompt (SENTIO_VOICE_AGENT_GUARDRAILS.md)

This is the prompt configured on the Bolna Dashboard. The document needs to be updated so it can be copy-pasted to Bolna. Key changes:

**A. Fix medicine question to use actual names:**
Change from:
> "आज दवाई ली?" / "Did you take your medicine today?"

To:
> "Use the medicine names from {medicines}. Say 'आज [medicine name] ली?' If multiple, ask about the first one by name."

**B. Separate NEW symptoms from FOLLOW-UP symptoms clearly:**
Add explicit rules:
- FOLLOW-UP: If the symptom is in `{active_symptoms}` AND `{symptom_days}` shows 3+ days, THEN say "काफी दिन हो गए"
- NEW symptom (reported for the first time during THIS call, NOT in `{active_symptoms}`): Ask "1 se 10 mein kitna?", acknowledge empathetically, note it. Do NOT say "काफी दिन hue" for new symptoms.

**C. Fix emergency flow:**
The emergency section needs to be at the TOP of the call structure, not buried in rules. When `{is_emergency}` is "true":
- Use the `{greeting}` (which will now be emergency-specific)
- Ask "Kya hua? Bataiye" immediately
- If caregiver exists, mention them by name
- Skip medicine check and monitoring topics -- focus on the emergency

**D. Add goodbye variety:**
Instead of one line, provide 5-6 warm closings:
- "ठीक है, अपना ध्यान रखिए। कल फिर बात करेंगे।"
- "बहुत अच्छा, ख्याल रखिए अपना।"
- "चलिए, आराम कीजिए। ध्यान रखिए।"
- Tell the AI to rotate and not repeat the same one.

**E. Add monitoring topic instructions:**
Currently the prompt doesn't mention monitoring_topics at all. Add:
> "If {monitoring_topics} is not empty, weave ONE topic question naturally into the conversation after the medicine check."

---

## Technical Details

### Files Modified

| File | Change |
|------|--------|
| `supabase/functions/bolna-voice-call/index.ts` | Add caregiver query, emergency fields to user_data, fix buildGreeting for emergencies, add greeting variety |
| `SENTIO_VOICE_AGENT_GUARDRAILS.md` | Rewrite prompt: fix medicine naming, separate new vs follow-up symptoms, fix emergency flow, add goodbye variety, add monitoring topics |

### Specific Code Changes in bolna-voice-call/index.ts

1. **Add caregiver fetch** (after line 306): Query `notification_settings` for `caregiver_name`, `caregiver_phone`, `caregiver_relation`

2. **Fix buildGreeting** (lines 27-49): Add `isEmergency` parameter with dedicated emergency greetings

3. **Add greeting variety** (lines 27-49): Add 3-4 more greeting templates per bucket (same day, 1 day, 2+ days, 7+ days) and pick based on `Date.now()` hash

4. **Extend user_data** (lines 403-414): Add these fields:
```
emergency_intro: (built from emergency context + caregiver info)
has_caregiver: "true"/"false"
caregiver_name: "Priya" or ""
caregiver_relation: "daughter" or ""
```

### Expected Behavior After Fix

| Scenario | Before | After |
|----------|--------|-------|
| Emergency call greeting | "3 दिन हो गए। सब ठीक है ना?" | "ये emergency call है। मुझे बताइए, क्या हुआ?" |
| Emergency caregiver mention | Never mentioned | "Priya (daughter) को भी call कर सकते हैं" |
| New symptom (back pain from gym) | "काफी दिन हो गए, डॉक्टर को दिखाना चाहिए" | "1 से 10 में कितना? ठीक है, ध्यान रखिए।" |
| Old symptom persisting 5 days | Same as new symptom | "काफी दिन हो गए, डॉक्टर को दिखाना चाहिए" (correctly applied) |
| Medicine question | "आज दवाई ली?" | "Thyroxin ली आज?" |
| Goodbye | Always "ठीक है, अपना ख्याल रखिए।" | Rotates between 5-6 warm variations |
| Daily greeting | Same line every time | Varies naturally day to day |
| Monitoring topics | Never asked | "नींद कैसी आई?" woven into conversation |

### Important Note
The `SENTIO_VOICE_AGENT_GUARDRAILS.md` file is a reference document. After updating it, you will need to manually copy-paste the updated prompt into the Bolna Dashboard. The edge function changes will deploy automatically.

