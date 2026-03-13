

# Fix: Active Symptoms Not Passed to Agent After Cleanup

## Problem

When we cleaned up `userData` to fix the "bahut acche + nahi li" bug, we removed `active_symptoms` from the payload. The code still **computes** active symptoms correctly (lines 322-395 in `bolna-voice-call`), but never sends them to the agent. So if you report "leg pain" in one call, the next call has no idea about it.

## Solution

Add active symptoms back — but as a **pre-built follow-up question** (not raw data), consistent with how we handle medicines and wellbeing.

### File 1: `supabase/functions/bolna-voice-call/index.ts`

**Build a `symptom_followup` question variable** (around line 465, after `newConcernPrompt`):

```typescript
// Build symptom follow-up question from active symptoms
let symptomFollowup = '';
if (activeSymptoms.length > 0) {
  const topSymptom = activeSymptoms[0]; // Most recent unresolved
  const days = symptomDaysMap[topSymptom] || 0;
  if (isHindi) {
    symptomFollowup = days > 1
      ? `पिछली बार आपने ${topSymptom} बताया था। अभी कैसा है?`
      : `आपने ${topSymptom} बताया था। अभी कैसा है?`;
  } else {
    symptomFollowup = days > 1
      ? `Last time you mentioned ${topSymptom}. How is it now?`
      : `You mentioned ${topSymptom}. How is it now?`;
  }
}
```

**Add to `userData`** (line 602-619):
```typescript
symptom_followup: isEmergency ? "" : symptomFollowup,
```

### File 2: `SENTIO_VOICE_AGENT_GUARDRAILS.md`

Update STEP 3 to use `{symptom_followup}` before the generic wellbeing question:

```
STEP 3: 
  If {symptom_followup} is not empty → ask it FIRST. Wait. Acknowledge.
  Then ask: {wellbeing_question}. Wait. Acknowledge.
  Then ask: {new_concern_prompt}. Wait.
  If they mention pain → ask severity 1-10. Only say "doctor" if 8+.
```

Add `symptom_followup` to the variables reference table.

## Result

- Call 1: Elder reports "leg pain" → saved in `check_ins.symptoms_reported`
- Call 2: Code finds "leg pain" as active symptom → builds question "पिछली बार आपने leg pain बताया था। अभी कैसा है?" → agent asks it in Step 3
- If elder says it's better → webhook marks it resolved → removed from future calls

