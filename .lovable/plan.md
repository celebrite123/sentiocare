
Diagnosis from current backend data/logs:

1) Your premium schedule is active, but stuck:
- Schedule `52ba9416...` (Aditya Raj, 21:50 IST, premium) has `last_run_at = 2026-03-02`.
- No new `call_attempts` exist after Mar 2 for that elder.

2) Cron is not the main issue now:
- `cron.job` shows `run-scheduled-checkins` every 5 minutes.
- `cron.job_run_details` confirms it ran at yesterday’s relevant window (16:15/16:20 UTC = 21:45/21:50 IST).

3) Current hard failure found in logs:
- `send-whatsapp-checkin` repeatedly returns `Unauthorized - Invalid token`.
- Error is `invalid claim: missing sub claim`.
- Root cause: `run-scheduled-checkins` calls `send-whatsapp-checkin` with service-role bearer token, but `send-whatsapp-checkin` currently enforces end-user JWT via `auth.getUser()` and rejects internal service calls.

Implementation plan (safe production-first):

A) Fix internal auth compatibility
- File: `supabase/functions/send-whatsapp-checkin/index.ts`
- Add dual-mode auth:
  - If bearer token equals `SUPABASE_SERVICE_ROLE_KEY`: allow trusted internal call path (skip `auth.getUser()`).
  - Else keep existing user JWT + ownership/authorization checks.
- Keep CORS and response structure unchanged.

B) Prevent scheduler starvation from repeated catch-up failures
- File: `supabase/functions/run-scheduled-checkins/index.ts`
- Process exact-time schedules before catch-up schedules.
- Limit catch-up processing per run (small cap) so due-now schedules (like 21:50) are never blocked.
- On all-method failure, record attempt state and avoid infinite same-day reprocessing loop (today this loop is amplifying load).

C) Improve observability for production reliability
- Add explicit logs per schedule outcome: `triggered_exact`, `triggered_catchup`, `failed_auth_internal_call`, `skipped_no_channel`, `completed`.
- Include elder id + schedule id + method decisions in one structured log line.

D) Recovery + validation checklist after fix
1. Invoke `send-whatsapp-checkin` internally and confirm 200 (no `missing sub claim`).
2. Run `run-scheduled-checkins` once and verify no auth failures in downstream WhatsApp call path.
3. Confirm new `call_attempts` created for premium elder on next 21:50 window.
4. Confirm `check_in_schedules.last_run_at` advances for successful runs.
5. Do one manual end-to-end trigger for Aditya immediately after deploy to recover missed check-in and verify live delivery.

Technical scope:
- No database migration required for this fix.
- No RLS policy changes required.
- Changes limited to 2 backend functions (`send-whatsapp-checkin`, `run-scheduled-checkins`), minimizing blast radius.
