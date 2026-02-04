
# Fix Plan: B2B Webhook - Check-in Creation & Symptom Detection Issues

## Problems Identified

### Problem 1: Check-in record not being created
**Root Cause:** `call_duration_seconds` column expects INTEGER but webhook sends DECIMAL (87.6)

```
ERROR: 'invalid input syntax for type integer: "87.6"'
```

The Bolna API returns `conversation_duration: 87.6` as a decimal, but the database column `patient_checkins.call_duration_seconds` is type INTEGER.

### Problem 2: All symptoms shown as triggered (when only 1 was reported)
**Root Cause:** AI analysis API failed (404), fallback parser has broken logic

```
ERROR: AI request failed: 404
```

The fallback `parseSafetyResponses()` function at line 498 has flawed logic:
- It looks for symptom keywords in one segment
- Then checks the NEXT segment for yes/no
- This doesn't work when the assistant asks AND the user answers in the same turn or adjacent segments

### Problem 3: Today's call shows "not answered" 
**Root Cause:** Since the check-in INSERT failed, no record exists for today's call. The dashboard shows older records only.

---

## Technical Fixes

### Fix 1: Round duration to integer before insert
**File:** `supabase/functions/b2b-bolna-webhook/index.ts`
**Location:** Line 265

```typescript
// Current (broken)
call_duration_seconds: actualDuration,

// Fixed
call_duration_seconds: actualDuration ? Math.round(actualDuration) : null,
```

### Fix 2: Fix safety response parsing logic
**File:** `supabase/functions/b2b-bolna-webhook/index.ts`
**Location:** Lines 498-533

The current parser splits by sentence and checks the NEXT segment for yes/no. This fails because:
1. Hindi transcripts often have assistant question + user answer in consecutive lines
2. The pattern matching is too naive

Replace with a more robust approach:
- Parse the transcript line by line (split by `\n`)
- When assistant asks about a symptom, look at the user's NEXT line
- Only mark as "yes" if the user explicitly says yes, NOT if they say "no"

```typescript
function parseSafetyResponses(transcript: string): Record<string, string> {
  const responses: Record<string, string> = {
    fever: "unclear",
    uncontrolled_pain: "unclear",
    breathing_difficulty: "unclear",
    wound_discharge: "unclear",
    neurological_symptoms: "unclear",
  };

  // Split by newlines to get individual turns
  const lines = transcript.split('\n').map(l => l.trim().toLowerCase());

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Skip user lines - we want to find assistant questions
    if (line.startsWith('user:')) continue;
    
    const assistantLine = line.replace(/^assistant:\s*/i, '');
    
    // Check which symptom the assistant is asking about
    for (const [key, patterns] of Object.entries(safetyQuestionPatterns)) {
      const isAskingAboutSymptom = patterns.some(p => assistantLine.includes(p));
      
      if (isAskingAboutSymptom) {
        // Find the next user response
        for (let j = i + 1; j < lines.length; j++) {
          const nextLine = lines[j];
          if (nextLine.startsWith('user:')) {
            const userResponse = nextLine.replace(/^user:\s*/i, '');
            
            // Check for YES response - user confirms having symptom
            if (yesPatterns.some(p => userResponse.includes(p)) && 
                !noPatterns.some(p => userResponse.includes(p))) {
              responses[key] = "yes";
            } 
            // Check for NO response - user denies symptom
            else if (noPatterns.some(p => userResponse.includes(p))) {
              responses[key] = "no";
            }
            break;
          }
          // If we hit another assistant line without user response, stop looking
          if (nextLine.startsWith('assistant:')) break;
        }
        break; // Move to next symptom after processing
      }
    }
  }

  return responses;
}
```

### Fix 3: Better error handling for AI failure
**File:** `supabase/functions/b2b-bolna-webhook/index.ts`
**Location:** Lines 233-239

When AI analysis fails, don't default to pattern matching. Instead:
1. Log the failure clearly
2. Set risk_level to "nurse_followup" for human review
3. Don't auto-trigger red flag escalation based on flawed parsing

```typescript
if (wasAnswered && transcript) {
  try {
    analysis = await analyzeTranscript(transcript, patient, safetyCheckResponses, supabase);
  } catch (e) {
    console.error("AI analysis failed, marking for manual review:", e);
    // Don't trust pattern matching - flag for nurse review
    analysis.risk_level = "nurse_followup";
    analysis.risk_reason = "AI analysis failed - manual review required";
    analysis.ai_summary = "Call transcript requires manual review due to AI processing error";
  }
}
```

---

## Summary of Changes

| File | Changes |
|------|---------|
| `supabase/functions/b2b-bolna-webhook/index.ts` | 1. Round call duration to integer<br>2. Fix safety response parsing logic<br>3. Improve AI failure handling |

---

## Expected Behavior After Fix

1. **Check-in records** will be created successfully with rounded duration
2. **Safety responses** will accurately reflect what the user said (only symptoms they confirmed)
3. **Alerts** will only trigger for symptoms the user actually reported
4. **AI failures** will result in "nurse_followup" status for human review, not false red flags

---

## Verification Steps

After deploying the fix:
1. Trigger a "Call Now" for a test patient
2. During the call, answer "No" to all symptoms except one
3. Verify the dashboard shows:
   - Today's call with "answered: true"
   - Correct symptom in `danger_symptoms_reported` (only the one you said "Yes" to)
   - Alert created only for the symptoms you confirmed
