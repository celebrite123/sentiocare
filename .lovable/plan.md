

# Fix Blockers for Live Demo: WhatsApp Call Summary

## Analysis

The implementation in `bolna-webhook/index.ts` is correct code-wise. However, there are **two blockers** that will prevent it from working in a live demo:

### Blocker 1: Twilio Sandbox Opt-in Requirement

With Twilio WhatsApp Sandbox, the **caregiver must first send a "join \<keyword\>" message** to the sandbox number before they can receive messages. If they haven't, Twilio silently drops the message or returns a 400 error. This is the most likely reason summaries won't arrive during a demo.

**Fix:** Add a fallback — if the Twilio WhatsApp send fails (e.g. 400/403), log the error clearly so we know the caregiver hasn't opted in. No code can bypass this Twilio requirement, but we can make the failure visible and non-blocking.

### Blocker 2: Missing CORS Response Headers on OPTIONS

The `bolna-webhook` returns `new Response(null, { status: 200 })` on OPTIONS without CORS headers. While this isn't a blocker for Bolna (server-to-server), it's inconsistent. Low priority.

## Changes — Single file: `supabase/functions/bolna-webhook/index.ts`

### 1. Add retry-friendly error logging in `sendCaregiverDailyConfirmation`

Currently if Twilio returns an error (e.g. caregiver not opted into sandbox), the error is logged but not actionable. Enhance the error branch (lines 256-258) to:
- Parse Twilio error code from response JSON
- Log the specific error code (e.g. 63007 = "not opted in to sandbox")
- If it's a sandbox opt-in issue, log a clear message: "Caregiver needs to send 'join \<keyword\>' to the Twilio sandbox number"

### 2. Ensure the function doesn't crash on missing analysis fields

Add defensive defaults for `analysis.wellBeingScore`, `analysis.medicinesTaken`, and `analysis.symptomsReported` — some of these may be undefined if the AI analysis fails or returns unexpected field names. The current code handles `|| 0` for score but `symptomsReported` vs `symptoms` naming could mismatch depending on the AI response.

### 3. Verify `TWILIO_WHATSAPP_NUMBER` format

The sandbox number must be stored as `+14155238886` (or your specific sandbox number). The `From` field must be `whatsapp:+14155238886`. This is already handled in code, but I'll add a log to confirm the actual value being used during the demo call flow.

## Summary of changes

All changes are in one file: `supabase/functions/bolna-webhook/index.ts`
- Better Twilio error parsing with actionable sandbox opt-in guidance
- Defensive field access for AI analysis results  
- Debug logging of the From/To numbers to verify format during demo

