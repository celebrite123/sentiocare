

# Make B2C Calls Smarter, More Reliable, and Production-Ready

## Problems Found

### Problem 1: AI Asks Generic Questions (Competition Feedback)
The scheduler (`run-scheduled-checkins`) passes `medicines: []` (empty array!) to the voice call function. So the AI can never say "Did you take your BP medicine?" -- it only says the generic "दवाई ली?" every time. Similarly, monitoring topics (meals, sleep, mood, blood pressure) are configured by caregivers but never reach the AI during scheduled calls.

### Problem 2: Retry Calls Have Zero Context
When a call goes to retry via `process-call-retries`, it sends only the elder's name and a generic medicine list. No symptoms, no monitoring topics, no previous call summary -- making retry calls even more generic.

### Problem 3: One Elder Fails Every Single Day
Rajiv Kumar (elder `f211508f`) has failed on Feb 4, 5, 6, 7 -- 4 consecutive days of all retries exhausted. There is no system to detect chronic failures or alert the caregiver differently.

### Problem 4: No Call Reliability Dashboard
Caregivers have no visibility into whether calls are actually connecting. The `CallStatusCard` shows the last call, but there's no trend or failure pattern visibility.

---

## Plan

### Change 1: Fetch Medicines in Scheduler (Critical Fix)
**File:** `supabase/functions/run-scheduled-checkins/index.ts`

Before calling `bolna-voice-call`, query the `medicines` table for the elder and pass the actual medicine list. This single fix will make every scheduled call personalized.

Currently (line 181):
```
medicines: [],
```

Will change to fetch active medicines for the elder and pass them:
```
medicines: elderMedicines (array of {name, dosage, timing, purpose})
```

Also pass `monitoring_config` topics so the voice agent can ask about configured health topics.

### Change 2: Enrich Retry Calls with Full Context
**File:** `supabase/functions/process-call-retries/index.ts`

Add queries for:
- Previous check-in history (last summary, symptoms)
- Monitoring config (topics, custom questions)
- Symptom days calculation

Pass all context in `user_data` so retry calls are just as smart as first-attempt calls.

### Change 3: Add Chronic Failure Detection
**File:** `supabase/functions/run-scheduled-checkins/index.ts`

Before initiating a call, check if the elder has failed calls on 3+ consecutive days. If so:
- Create a "Chronic Unreachable" alert (high severity)
- Send a special WhatsApp to the caregiver explaining the pattern
- Still attempt the call (don't skip it)

This prevents situations like Rajiv Kumar going 4+ days without successful contact.

### Change 4: Add Call Success Rate to Dashboard
**File:** `src/pages/Dashboard.tsx` + new component `src/components/dashboard/CallReliabilityCard.tsx`

Show a small card next to `CallStatusCard` displaying:
- Last 7 days call success rate (e.g., "5/7 calls connected")
- Visual indicator (green/yellow/red based on rate)
- If rate is below 50%, show a warning with suggestion to check phone number

### Change 5: Add Diagnostic Logging for Failed Calls
**File:** `supabase/functions/bolna-webhook/index.ts`

When a call fails or goes unanswered, log additional diagnostic data:
- `hangup_reason` from Bolna
- Call duration
- Whether it was a network issue vs. no-answer

Store this in the `call_attempts` table (add a `failure_reason` text field) so patterns can be identified.

---

## Technical Details

### Database Migration
Add a `failure_reason` column to `call_attempts`:
```sql
ALTER TABLE call_attempts ADD COLUMN IF NOT EXISTS failure_reason text;
```

### Files Modified

| File | Change |
|------|--------|
| `supabase/functions/run-scheduled-checkins/index.ts` | Fetch medicines + monitoring config before calling; add chronic failure detection |
| `supabase/functions/process-call-retries/index.ts` | Add full context (symptoms, monitoring, history) to retry calls |
| `supabase/functions/bolna-webhook/index.ts` | Store `failure_reason` on failed calls |
| `src/components/dashboard/CallReliabilityCard.tsx` | New component showing 7-day call success rate |
| `src/pages/Dashboard.tsx` | Add CallReliabilityCard to dashboard |

### Expected Impact

| Area | Before | After |
|------|--------|-------|
| Medicine questions | Generic "दवाई ली?" | "BP medicine ली?" / "Sugar medicine ली?" |
| Monitoring topics | Never asked | "नींद कैसी आई?" / "खाना खाया?" |
| Retry call quality | Generic, no memory | Full context like first call |
| Chronic failures | Invisible | Alert after 3 consecutive days |
| Caregiver visibility | Last call only | 7-day success rate trend |

