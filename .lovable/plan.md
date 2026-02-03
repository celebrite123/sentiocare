

# Fix: B2B Dashboard Not Updating After Calls - Missing Webhook Configuration

## Problem Identified

The edge function logs show:
- **Calls are being initiated successfully**: `Call initiated for 9363fbb4-...: 4d074809-...`
- **No webhook logs received**: `b2b-bolna-webhook` has zero logs

**Root Cause:** The Bolna agent(s) do not have the webhook URL configured. When a call ends, Bolna has no URL to send the completion data to.

---

## Why This Happens

Looking at the call flow:

```text
1. Dashboard clicks "Call Now"
         ↓
2. run-scheduled-b2b-calls initiates call to Bolna API ✅ (Working)
         ↓
3. Bolna makes the call to patient ✅ (Working - you're receiving calls)
         ↓
4. Call ends → Bolna sends webhook to ??? ❌ (No URL configured)
         ↓
5. b2b-bolna-webhook never receives data ❌
         ↓
6. patient_checkins table not updated ❌
         ↓
7. Dashboard shows no changes ❌
```

---

## Required Fix (Manual Configuration in Bolna Dashboard)

### Step 1: Log in to Bolna Dashboard

Go to [app.bolna.dev](https://app.bolna.dev) and sign in.

### Step 2: Configure Webhook for Each Agent

For the agent ID `dff579d1-2f81-4a77-b29a-7db8aad4e34e` (Orchid Hospital Hindi agent):

1. Click on the agent to open settings
2. Find the **"Webhook URL"** or **"Post-Call Webhook"** field
3. Enter this URL:
   ```
   https://hcdwbpbvuvbrozttahfz.supabase.co/functions/v1/b2b-bolna-webhook
   ```
4. Save the agent configuration

### Step 3: Test the Flow

1. Go back to B2B Dashboard
2. Click "Call Now" on a patient
3. Answer the call and complete it
4. Check if the dashboard updates

---

## Verification After Fix

Once configured, the edge function logs should show:
```
INFO B2B Bolna webhook received: {"execution_id":"...", "status":"completed", ...}
INFO B2B call processed for patient [id]: stable, red_flags: false
```

And the dashboard will update with:
- Check-in records in `patient_checkins` table
- Updated risk status on patient
- Call schedule marked as completed

---

## Alternative: Pass Webhook URL in API Call

If the Bolna API supports it, I can modify `run-scheduled-b2b-calls` to include the webhook URL in each call request. However, based on the Bolna documentation, the webhook is typically configured per-agent in the dashboard, not per-call.

---

## Summary

| Component | Status |
|-----------|--------|
| API endpoint URL | ✅ Fixed (`api.bolna.ai/call`) |
| Call initiation | ✅ Working |
| Phone calls | ✅ Being received |
| Webhook URL | ❌ **Not configured in Bolna Dashboard** |
| Dashboard updates | ❌ Not working (blocked by webhook) |

**Action Required**: Configure the webhook URL in Bolna Dashboard for your B2B agent(s).

