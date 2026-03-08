

# Diagnostic Results: What's Fixed, What's Still Broken

## Status of Previous Fixes

**Working correctly (verified from DB + logs):**
- Scheduler runs every 5 minutes, processes exact-time schedules first
- `bolna-voice-call` no longer crashes (`previousSymptoms` → `sortedSymptoms` fix applied)
- Dual-mode auth works in both `send-whatsapp-checkin` and `bolna-voice-call`
- Call attempts ARE being created (Mar 7: `status: answered`, execution_id present)
- Caregiver notification logic updated for `high` + `critical` severity
- `last_run_at` updates even on failure (no more retry storms)

**The Mar 7 call (the last one you received) used OLD code** — it happened BEFORE the medicine/symptom fixes were deployed. The "Thyroxin" and "no fell-down-stairs question" issues are from the old code. Tonight's 21:50 IST call will be the first using the new code.

## Remaining Issues Found

### 1. Weekly Email Summary Has No Cron Job
The `weekly-health-summary` edge function exists but has NO cron job configured. The B2B weekly report has one (`b2b-weekly-email-report`, Sundays 3:30 UTC), but B2C family caregivers never receive weekly email summaries.

**Fix:** Create a cron job for `weekly-health-summary` — run every Sunday at 4:00 UTC (9:30 AM IST).

### 2. `RESEND_FROM_EMAIL` Secret Missing
The `notify-caregiver` function uses `RESEND_FROM_EMAIL` to set the sender address. Without it, it falls back to `onboarding@resend.dev` which only delivers to the Resend account owner's email. All caregiver emails to other addresses silently fail.

**Fix:** You need to add a `RESEND_FROM_EMAIL` secret with a verified domain sender (e.g., `alerts@sentiocare.com`). Without this, email notifications will not reach real caregivers.

### 3. `process-scheduled-callbacks` Has No Cron Job
The function exists and is configured in `config.toml` but has no cron job. B2B scheduled callbacks will never auto-process.

**Fix:** Create a cron job — run every 5 minutes.

### 4. Bolna Dashboard Agent Prompt (Cannot Fix From Code)
The "Thyroxin" hallucination has a dual source:
- **Code side (FIXED):** `user_data` now sends `medicine_names_only: "dsa"` and `symptom_followup: "MANDATORY: Ask about fell down stairs first"`. The briefing validator strips hallucinated medicine names.
- **Bolna Dashboard side (NOT FIXABLE HERE):** The Bolna agent's system prompt on their dashboard likely still contains hardcoded examples or doesn't reference the `{medicine_names_only}` and `{symptom_followup}` variables. You must manually update the Bolna Dashboard agent prompt to use `{medicine_names_only}` and `{symptom_followup}` from the `SENTIO_VOICE_AGENT_GUARDRAILS.md` document.

## Implementation Plan

### A. Create missing cron jobs (database migration)
```sql
-- Weekly health summary for B2C caregivers (Sundays 4:00 UTC = 9:30 AM IST)
SELECT cron.schedule(
  'weekly-health-summary-email',
  '0 4 * * 0',
  $$SELECT net.http_post(
    url := 'https://hcdwbpbvuvbrozttahfz.supabase.co/functions/v1/weekly-health-summary',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer <anon_key>"}'::jsonb,
    body := '{"trigger": "cron"}'::jsonb
  ) AS request_id;$$
);

-- Process scheduled callbacks every 5 minutes
SELECT cron.schedule(
  'process-scheduled-callbacks',
  '*/5 * * * *',
  $$SELECT net.http_post(
    url := 'https://hcdwbpbvuvbrozttahfz.supabase.co/functions/v1/process-scheduled-callbacks',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer <anon_key>"}'::jsonb,
    body := '{"trigger": "cron"}'::jsonb
  ) AS request_id;$$
);
```

### B. Add `RESEND_FROM_EMAIL` secret
Prompt user to provide a verified domain sender email address.

### C. Manual action required
Update the Bolna Dashboard agent prompt to reference `{medicine_names_only}` and `{symptom_followup}` variables from `user_data`.

## Summary

| Issue | Status | Action |
|-------|--------|--------|
| Voice call crash (`previousSymptoms`) | FIXED | No action needed |
| Scheduler priority + starvation | FIXED | No action needed |
| Auth for internal calls | FIXED | No action needed |
| Caregiver call for wellbeing ≤ 3 | FIXED | No action needed |
| Medicine hallucination (code side) | FIXED | Will take effect tonight's call |
| Symptom follow-up context | FIXED | Will take effect tonight's call |
| Weekly email summary cron | MISSING | Create cron job |
| Scheduled callbacks cron | MISSING | Create cron job |
| `RESEND_FROM_EMAIL` secret | MISSING | User must provide verified sender |
| Bolna Dashboard prompt | NOT FIXABLE HERE | Manual update required |

