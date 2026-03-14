

# Call Summary on WhatsApp for Families (Green/Yellow/Red)

## What we're building
After every successful voice check-in call, send a color-coded WhatsApp summary to the caregiver via Twilio WhatsApp Sandbox with:
- 🟢 **Green** (score 7-10): Elder is doing well
- 🟡 **Yellow** (score 4-6): Needs attention
- 🔴 **Red** (score 1-3): Urgent concern

## Current state
- `sendCaregiverDailyConfirmation()` in `bolna-webhook/index.ts` already sends a summary via **Interakt** using a template
- It's called at line ~823 after every answered, non-silent call
- Twilio WhatsApp credentials (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_NUMBER`) are already configured as secrets

## Changes — Single file: `supabase/functions/bolna-webhook/index.ts`

### Replace `sendCaregiverDailyConfirmation` function (lines 126-218)

Replace the Interakt-based implementation with a Twilio WhatsApp message:

1. **Keep** the same caregiver phone lookup logic (notification_settings → emergency_contact fallback)
2. **Replace** the Interakt API call with a Twilio WhatsApp message using the existing credentials
3. **Build a rich text message** with:
   - Color indicator: 🟢/🟡/🔴 based on wellbeing score
   - Elder name
   - Wellbeing score (X/10)
   - Medicine status (✅/❌)
   - Symptoms if any
   - AI summary (from analysis)
   - Appropriate call-to-action based on severity

**Message format example:**
```
🟢 Sentio Daily Update — Ramesh

Wellbeing: 8/10
Medicines: Taken ✅
Symptoms: None 😊

Summary: Ramesh is feeling well today, took all medicines on time.

Reply HELP for support.
```

For 🔴 Red:
```
🔴 Sentio Alert — Ramesh

Wellbeing: 2/10
Medicines: NOT taken ❌
Symptoms: Chest pain, fever

Summary: Ramesh reported chest pain and has not taken medicines.

⚠️ Please check on Ramesh immediately.
```

### Technical details
- Use `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_NUMBER` (already set)
- Send via Twilio REST API: `POST /2010-04-01/Accounts/{SID}/Messages.json`
- Format: `From: whatsapp:{TWILIO_WHATSAPP_NUMBER}`, `To: whatsapp:+91{phone}`
- No database changes needed
- No new secrets needed

