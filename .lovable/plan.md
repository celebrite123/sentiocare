

# Critical Fix Plan: Favicon + B2B Webhook Deployment Issue

## Issue 1: Favicon Still Shows Lovable Logo

**Current State:**
- `index.html` references `/favicon.png` (which is the old Lovable favicon)
- Your actual Sentio logo is at `src/assets/sentio-logo-new.png`

**Fix:**
1. Copy `src/assets/sentio-logo-new.png` to `public/favicon.png` (replace the existing one)
2. Update the OG/Twitter image URLs in `index.html` to remove Lovable references

---

## Issue 2: B2B Webhook Not Processing Calls (CRITICAL)

**Root Cause Identified:**

Looking at the edge function logs, the error message says:
```
Missing patient_id or organization_id in user_data
```

But the updated webhook code (line 97) should say:
```
Missing patient_id or organization_id - not in user_data and not found in pending_calls
```

**This proves the deployed version is OLD** - the `b2b_pending_calls` lookup code was never actually deployed!

**Evidence:**
- `b2b_pending_calls` table has record: `execution_id: 9b1abb36-8f8b-460b-b24e-b9cc3c08fc12` with `processed: false`
- Webhook receives same `id` in payload
- But lookup is NOT happening (the record would be marked `processed: true` if it worked)
- Error message format confirms old code is running

**Fix:**
Force redeploy the `b2b-bolna-webhook` edge function to ensure the new code with `b2b_pending_calls` lookup is actually running.

---

## Implementation Steps

### Step 1: Fix Favicon
- Copy Sentio logo from `src/assets/sentio-logo-new.png` to `public/favicon.png`
- Update `index.html` to remove Lovable OG image references

### Step 2: Force Redeploy Webhook
- Redeploy `b2b-bolna-webhook` edge function
- Verify deployment by checking logs show new error message format

### Step 3: Test the Flow
- Click "Call Now" on a patient
- Complete the call
- Verify dashboard updates with risk status

---

## Technical Details

### Favicon Changes (index.html)
```html
<!-- Remove these Lovable references -->
<meta property="og:image" content="https://lovable.dev/opengraph-image-p98pqg.png" />
<meta name="twitter:site" content="@Lovable" />
<meta name="twitter:image" content="https://lovable.dev/opengraph-image-p98pqg.png" />
```

### Webhook Verification
After redeployment, logs should show:
```
INFO Looking up pending call for execution_id: xxx
INFO Found pending call: patient=xxx, org=xxx
INFO B2B call processed for patient xxx: stable, red_flags: false
```

Instead of:
```
ERROR Missing patient_id or organization_id in user_data
```

---

## Expected Results

1. **Favicon**: Browser shows Sentio heart logo instead of Lovable logo
2. **Dashboard**: After completing a call, the patient's risk status will update within 30 seconds

---

## Files to Modify

| File | Change |
|------|--------|
| `public/favicon.png` | Replace with Sentio logo from src/assets |
| `index.html` | Remove Lovable OG/Twitter image references |
| `b2b-bolna-webhook` | Force redeploy (no code changes - deployment issue) |

