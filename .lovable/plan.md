
# Make B2C the Absolute Best It Can Be

## Real Problems Found from Actual Call Transcripts

After reviewing real call data, the actual transcripts reveal critical issues that the previous fix didn't fully solve:

### Problem 1: AI Still Asks Generic "दवाई ली?" Despite Having Medicine Data
Real transcript from today (Sunita, who has Thyroxin for thyroid):
> "आज दवाई ली?" (generic)

Should be:
> "Thyroxin ली आज?" or "Thyroid की दवाई ली?"

The medicines are now PASSED to Bolna, but the `user_data` format sends them as a comma-separated string. The AI agent on Bolna's side needs the data in a more actionable format, and the `monitoringConfig` field from the scheduler isn't being used properly by `bolna-voice-call`.

**Fix:** The `bolna-voice-call` function receives `monitoringConfig` from the scheduler but ignores it -- it reads `monitoring_config` directly from the elder record instead. This is actually fine. The REAL issue is that `monitoring_topics` and `custom_questions` are passed as empty strings when they should contain the topic labels. Need to map topic IDs (like "meals", "sleep_quality") to human-readable labels.

### Problem 2: Monitoring Topics Never Asked, monitoring_responses Always Empty
Every single check-in has `monitoring_responses: {}` despite elders having topics configured. The AI is told the topics exist but never asks about them in conversation. The Bolna agent prompt needs clearer instructions to weave these into conversation.

**Fix:** Transform topic IDs into clear, natural-language instructions for the AI. Instead of sending `monitoring_topics: "meals, sleep_quality, blood_pressure"`, send `monitoring_topics: "Ask about meals today, Ask about sleep quality last night, Ask about blood pressure reading"`.

### Problem 3: simulate-checkin Still Runs on Every Scheduled Call
Lines 321-334 of `run-scheduled-checkins` call `simulate-checkin` for EVERY elder on every scheduled run. This creates fake check-in data alongside real data, polluting the dashboard.

**Fix:** Remove the simulate-checkin call entirely. Real calls are working now.

### Problem 4: Rajiv Kumar Has No failure_reason Despite Failing Daily
All `call_attempts` for Rajiv show `failure_reason: null` even though he's been failing for 5+ consecutive days. The webhook update we made hasn't captured diagnostic data yet because the failures happen before the webhook fires (Bolna never connects).

**Fix:** When `bolna-voice-call` gets an error response from the Bolna API, immediately write the failure reason to `call_attempts`. Also when the webhook receives a call with `status=failed`, ensure `failure_reason` is populated.

### Problem 5: No WhatsApp Fallback When Voice Fails
When voice calls fail for an elder (like Rajiv Kumar), the system should automatically send a WhatsApp check-in as a fallback. Currently it only does this if the elder's `check_in_method` is "both" AND the voice call initiation succeeds but the call isn't answered. If Bolna API itself errors out, no WhatsApp is sent.

**Fix:** Add WhatsApp fallback in the scheduler when voice call initiation fails.

### Problem 6: Caregiver Daily Summary Push Missing
Caregivers only get notified on alerts and weekly summaries. There's no daily "check-in completed" confirmation. For a production product, caregivers need to know their elder's check-in happened and what was said.

**Fix:** Send a brief WhatsApp message to the caregiver after every successful check-in with the key findings (wellbeing score, medicine status, any symptoms).

---

## Plan

### Change 1: Fix Monitoring Topic Labels and AI Instructions
**File:** `supabase/functions/bolna-voice-call/index.ts`

Map topic IDs to natural language instructions:
- "meals" becomes "खाना कैसा खाया?" / "How were your meals?"
- "sleep_quality" becomes "नींद कैसी आई?" / "How did you sleep?"
- "blood_pressure" becomes "BP चेक किया?" / "Did you check your BP?"
- "blood_sugar" becomes "Sugar चेक किया?" / "Blood sugar level?"
- "water_intake" becomes "पानी पिया?" / "Drinking enough water?"
- "mood" becomes "मन कैसा है?" / "How's your mood?"

This ensures the Bolna agent gets clear, actionable questions instead of raw topic IDs.

### Change 2: Remove simulate-checkin from Production Scheduler
**File:** `supabase/functions/run-scheduled-checkins/index.ts`

Remove the entire block (lines 321-334) that calls `simulate-checkin`. Real calls are working and this creates fake data that confuses the dashboard.

### Change 3: Add WhatsApp Fallback When Voice Call Initiation Fails  
**File:** `supabase/functions/run-scheduled-checkins/index.ts`

When the voice call to Bolna API fails (HTTP error or `voiceResult.success === false`), automatically trigger a WhatsApp check-in if the elder has a WhatsApp number configured. This ensures the elder still gets checked on even when the voice platform has issues.

### Change 4: Capture Failure Reason at Call Initiation
**File:** `supabase/functions/bolna-voice-call/index.ts`

When Bolna API returns an error, update the `call_attempts` record with the failure reason immediately, rather than waiting for a webhook that may never come.

### Change 5: Daily Check-in Confirmation to Caregiver
**File:** `supabase/functions/bolna-webhook/index.ts`

After a successful call is analyzed and the check-in is saved, send a brief WhatsApp summary to the caregiver:
- "Sunita ji ki check-in ho gayi. Score: 7/10. Davaai li. Koi taklif nahi."
- Only sent for successful calls, not failed ones (failed calls already have their own notification)

### Change 6: Fix Medicine Display in user_data
**File:** `supabase/functions/bolna-voice-call/index.ts`

Instead of just sending medicine purpose/name as a flat string, format medicines more clearly for the AI:
- Current: `medicines: "Thyroid control, Sugar"`
- New: `medicines: "Thyroxin (Thyroid), Sugar medicine (Sugar)"`

This gives the AI both the name and purpose to reference naturally.

---

## Technical Details

### Files Modified

| File | Change |
|------|--------|
| `supabase/functions/bolna-voice-call/index.ts` | Map monitoring topics to natural language, fix medicine format, capture failure reason |
| `supabase/functions/run-scheduled-checkins/index.ts` | Remove simulate-checkin, add WhatsApp fallback on voice failure |
| `supabase/functions/bolna-webhook/index.ts` | Send daily check-in confirmation WhatsApp to caregiver |

### No Database Changes Required

All changes are in edge function logic. No schema modifications needed.

### Expected Impact

| Area | Before | After |
|------|--------|-------|
| Medicine questions | Generic "दवाई ली?" | "Thyroxin ली?" / "Sugar medicine ली?" |
| Monitoring topics | Never asked (monitoring_responses always empty) | "नींद कैसी आई?" / "खाना खाया?" woven into conversation |
| Fake data pollution | simulate-checkin creates fake check-ins daily | Only real call data in database |
| Voice failure handling | Elder gets no check-in if Bolna API errors | Automatic WhatsApp fallback |
| Caregiver awareness | Only notified on alerts/weekly | Daily "check-in done" WhatsApp confirmation |
| Failure diagnostics | failure_reason always null | Specific error captured (e.g., "Bolna API 500", "busy", "no-answer") |
| Rajiv Kumar situation | Fails silently for 5+ days | WhatsApp fallback + caregiver notified daily + failure reason logged |
