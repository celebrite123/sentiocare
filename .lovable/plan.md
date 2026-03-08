

# Fix Plan: 4 Critical Issues

## Issue 1: Voice Recording Not Playing

**Root cause**: The `AudioPlayer` component fetches audio on button click, but the `<audio>` element is only created AFTER the async fetch completes. On mobile browsers (especially iOS Safari), this breaks the user gesture requirement — the browser blocks playback because the `audio.play()` call is no longer in the original gesture context.

**Fix**: In `CheckInLog.tsx`, restructure `AudioPlayer` to create the `Audio` element immediately on click (within gesture context), unlock it with a silent `.play().catch(()=>{})`, then fetch the blob and set `src`. This follows the proven pattern for iOS/Safari audio playback.

## Issue 2: Mobile Scaling Problems

**Root cause**: Several layout issues on phone screens:
- Dashboard stats grid: `grid-cols-2 sm:grid-cols-3 lg:grid-cols-6` — 6 stats cards in 2 columns on mobile creates cramped cards
- Action buttons row uses `flex-wrap` with `size="lg"` buttons that overflow on small screens
- Check-in history items have `flex gap-4` with badges that wrap poorly
- Hero section trust indicators use `gap-6` which is too wide on small phones

**Fix** (in `Dashboard.tsx`, `CheckInLog.tsx`, `HeroSection.tsx`):
- Dashboard stats: Change to `grid-cols-2 sm:grid-cols-3 lg:grid-cols-6` — keep but reduce card padding on mobile
- Action buttons: Add `w-full sm:w-auto` to buttons so they stack properly on mobile
- Check-in log: Reduce gap and fix badge wrapping with `flex-wrap` and smaller text on mobile
- Hero section: Reduce `gap-6` to `gap-4` on mobile for trust indicators

## Issue 3: Website Speed

**Root cause**: The `App.css` file has unused styles (Vite boilerplate). More importantly, the Dashboard page makes 4 parallel queries on load (good), but also loads `WhatsAppChat` component eagerly even when WhatsApp isn't enabled. The landing page already uses lazy loading (good).

**Fix**:
- Remove unused `App.css` boilerplate styles
- Lazy-load `WhatsAppChat` component in Dashboard
- Add `loading="lazy"` to hero image for non-LCP contexts
- Consider lazy-loading `AlertsPanel` since it's hidden by default

## Issue 4: Caregiver Not Getting WhatsApp After Check-in

**Root cause**: The `sendCaregiverDailyConfirmation` function in `bolna-webhook/index.ts` (line 126-200) queries `notification_settings.caregiver_phone`. If this field is empty/null, it silently skips with a `console.warn`. The logs show successful check-ins completing but no "Daily check-in confirmation sent" log, meaning either:
1. `caregiver_phone` is not set in `notification_settings` for the elder
2. Twilio is rejecting the message (the function logs the error but doesn't surface it)

**Fix**:
- Add better logging to identify which case is happening
- Add a fallback: also check `notification_settings.email_address` and `elders.emergency_contact` as alternative caregiver contacts
- Surface a warning in the dashboard if caregiver phone is not configured but daily notifications are expected

## Issue 5 (Bonus): `run-scheduled-b2b-calls` Boot Failure

**Root cause**: `const daysSinceDischarge` is declared twice in the same `for` loop scope — line 93 (staleness guard) and line 225 (call context). JavaScript/TypeScript doesn't allow duplicate `const` declarations in the same block scope. The Deno runtime rejects this at boot.

**Fix**: Rename the second declaration at line 225 to `const daysSinceDischargeContext` (or simply remove it since the value from line 93 is identical and still in scope).

---

## Files to Change

| File | Change |
|------|--------|
| `src/components/dashboard/CheckInLog.tsx` | Fix AudioPlayer: create Audio element in gesture context before async fetch; fix mobile badge wrapping |
| `src/pages/Dashboard.tsx` | Fix mobile button sizing (`w-full sm:w-auto`); lazy-load WhatsAppChat |
| `src/components/landing/HeroSection.tsx` | Reduce mobile trust indicator gap |
| `supabase/functions/run-scheduled-b2b-calls/index.ts` | Rename duplicate `daysSinceDischarge` at line 225 |
| `supabase/functions/bolna-webhook/index.ts` | Add fallback caregiver contact lookup + better error logging |
| `src/App.css` | Remove unused Vite boilerplate styles |

