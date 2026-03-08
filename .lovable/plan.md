

# Fix: Wrong Medicine Names + Wrong Symptom Priority in Voice Calls

## Root Cause Analysis

### Problem 1: "Thyroxin" instead of "dsa"
The Bolna edge function has hallucination protection, BUT:
- The hardcoded hallucination list (line 549) only catches 7 common names. If the AI hallucinates a name NOT in that list, it passes through unchecked.
- The comment on line 472 still mentions "Thyroxin" as an example, which could influence the AI briefing context.
- **Most critically**: The actual prompt running on the Bolna Dashboard likely still has the OLD examples with hardcoded medicine names. The `SENTIO_VOICE_AGENT_GUARDRAILS.md` was updated but you need to manually copy-paste it into the Bolna Dashboard.

**Fix**: Replace the limited hallucination blocklist with a universal validator -- if ANY word in the briefing looks like a medicine name but is NOT in the elder's actual medicine list, flag and replace it. Also remove the misleading comment.

### Problem 2: Asking about "back pain" instead of "fever"
The code collects ALL symptoms from the last 7 check-ins and deduplicates them. But it does NOT prioritize by recency. If "back pain" was reported 5 days ago and "fever" was reported yesterday, the code sends both as `active_symptoms` but the prompt asks about "the FIRST symptom" -- which may be "back pain" because the deduplication order is unpredictable (uses `Set`).

**Fix**: Sort active symptoms by most recent first. The symptom from yesterday's call (fever) should always appear first in the list so the AI asks about it.

### Problem 3: AI doesn't acknowledge responses
This is a Bolna Dashboard prompt issue. The updated guardrails document already has the acknowledgment rules, but you need to paste the updated prompt into the Bolna Dashboard.

## Changes

### File 1: `supabase/functions/bolna-voice-call/index.ts`

**A. Fix symptom ordering (lines 407-420)**
Instead of collecting symptoms into a Set (which loses order), track each symptom with its most recent occurrence date, then sort by most recent first. This ensures "fever" (yesterday) comes before "back pain" (5 days ago).

**B. Improve medicine hallucination protection (lines 547-561)**
Replace the hardcoded blocklist approach with a smarter validator:
- Extract all capitalized words and known medicine patterns from the briefing
- Compare each against the actual medicine list
- If a word looks like a medicine name (capitalized, not a common English word) and is NOT in the actual list, replace it with the first actual medicine name
- This catches ALL hallucinations, not just 7 hardcoded ones

**C. Remove misleading comment (line 472)**
Change `// Format medicines with name + purpose (e.g. "Thyroxin (Thyroid)")` to remove the specific medicine name example.

### File 2: `supabase/functions/vapi-voice-call/index.ts`

The Vapi function is missing:
- Monitoring topics (never fetched or passed)
- Resolved symptom filtering (passes ALL symptoms)
- AI briefing generation
- Medicine hallucination protection

Since the Dashboard currently uses Bolna (not Vapi), this is lower priority but should be fixed for consistency. Add:
- Fetch `monitoring_config` from elder record
- Filter resolved symptoms
- Pass monitoring topics in `variableValues`

### Important: Bolna Dashboard Update Required

After these code changes deploy, you MUST copy the updated prompt from `SENTIO_VOICE_AGENT_GUARDRAILS.md` and paste it into your Bolna Dashboard agent configuration. The edge function sends the correct data (medicines, symptoms, monitoring topics), but the Bolna agent prompt is what actually controls what the AI says during the call. If the old prompt is still there, it will keep using hardcoded examples.

## Technical Details

### Symptom Ordering Fix
```text
Before: Set([back_pain, headache, fever]) -- random order
After:  [fever (1 day ago), back_pain (5 days ago), headache (3 days ago)] -- sorted by recency
```

### Medicine Validation Fix
```text
Before: Check against hardcoded list [thyroxin, amlodipine, metformin, aspirin, paracetamol, crocin, dolo]
After:  Check ANY capitalized word against actual medicine list. If not found AND not a common English word, replace it.
```

## Summary

| File | Change |
|------|--------|
| `supabase/functions/bolna-voice-call/index.ts` | Sort symptoms by recency, universal medicine hallucination detection, remove misleading comment |
| `supabase/functions/vapi-voice-call/index.ts` | Add monitoring topics, resolved symptom filtering, medicine validation |
| **Bolna Dashboard** (manual) | Copy updated prompt from `SENTIO_VOICE_AGENT_GUARDRAILS.md` |

