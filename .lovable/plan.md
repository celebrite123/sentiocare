
# Fix: Website Performance, WhatsApp, and Email Issues

## Problems Identified

### 1. Email Notifications Not Working
Both `send-notification` and `notify-caregiver` use `from: "Sentio AI <onboarding@resend.dev>"`. The `onboarding@resend.dev` sender only works when sending to the Resend account owner's email address. Sending to any other email silently fails or gets rejected. You need a verified custom domain in Resend to send to real users.

**Fix**: You need to add a verified domain in your Resend account (e.g., `notifications@yourdomain.com`). Once done, I'll update both edge functions to use that sender. Alternatively, we can set up Lovable's built-in email system for auth emails and use a Resend verified domain for transactional alerts.

### 2. WhatsApp Not Working
The `send-whatsapp-checkin` function calls Twilio's WhatsApp API. Twilio WhatsApp requires an approved WhatsApp Business sender. If you're on a Twilio sandbox, messages only work with sandbox-joined numbers. For production, you need a Twilio WhatsApp-approved number. The CORS headers are also missing the newer Supabase client headers, which could cause preflight failures from the browser.

**Fix**: Update CORS headers in `send-whatsapp-checkin` and `send-notification` to include the full set of Supabase client headers. Also add better error handling so you can see exactly why Twilio is failing.

### 3. Website Performance Issues
Several things are slowing it down:
- **Dashboard makes 6+ sequential/parallel DB queries** on load, plus each sub-component (HealthMetrics, AIInsights, CheckInLog, WhatsAppChat, CallStatusCard, CallReliabilityCard, WellbeingTrendChart, MedicationAdherenceChart) each makes their own independent DB calls -- that's 10+ separate queries on dashboard load
- **QueryClient has no caching config** -- `new QueryClient()` with no `defaultOptions` means every navigation re-fetches everything
- **AuthContext checks session on every route** which is fine but combined with `useAdminRole` and `useB2BMembership` hooks in Navbar, that's 3 extra DB queries on every page
- **Landing page loads 5 PNG images** (hero, elder-phone-call, caregiver-peace-of-mind, elder-grandfather, elder-grandmother) without size optimization

## Plan

### A. Fix CORS Headers Across Edge Functions (Quick Win)

Update CORS headers in `send-whatsapp-checkin`, `send-notification`, and `notify-caregiver` to include the full set:
```
authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version
```

### B. Fix Email -- Add Custom Domain Support

Update `send-notification/index.ts` and `notify-caregiver/index.ts` to use a configurable `FROM_EMAIL` secret instead of hardcoded `onboarding@resend.dev`. Add a new secret `RESEND_FROM_EMAIL`. Default to `onboarding@resend.dev` if not set but log a warning.

### C. Fix WhatsApp Error Visibility

Update `WhatsAppChat.tsx` to show the actual Twilio error message in the toast so you can debug what's failing. Add a status indicator showing whether WhatsApp is properly configured.

### D. Performance -- Add QueryClient Caching

Configure the `QueryClient` in `App.tsx` with:
- `staleTime: 5 * 60 * 1000` (5 minutes) -- data stays fresh, no re-fetches on navigation
- `gcTime: 10 * 60 * 1000` (10 min garbage collection)
- `refetchOnWindowFocus: false` -- stop re-fetching when user switches tabs

### E. Performance -- Consolidate Dashboard Queries

Combine the Dashboard's parallel queries with the sub-component queries. Use React Query (`useQuery`) instead of raw `supabase` calls in Dashboard so data is cached and shared across components.

### F. Performance -- Optimize Images

Add `loading="lazy"` and explicit `width`/`height` to all landing page images. The hero image already has `fetchPriority="high"` which is correct. The other images in FeaturesSection already have `loading="lazy"`.

### G. UI/UX Improvements

- Add skeleton loading states to Navbar (currently shows nothing while admin/b2b hooks load)
- Improve mobile dashboard layout -- the 6-column stats grid is cramped on mobile
- Add smooth transitions between tab content on dashboard

## Files Modified

| File | Change |
|------|--------|
| `src/App.tsx` | Configure QueryClient with caching defaults |
| `src/pages/Dashboard.tsx` | Convert to useQuery for caching, fix stats grid responsive layout |
| `src/components/dashboard/WhatsAppChat.tsx` | Better error messages, loading states |
| `supabase/functions/send-whatsapp-checkin/index.ts` | Fix CORS headers |
| `supabase/functions/send-notification/index.ts` | Fix CORS headers, configurable FROM email |
| `supabase/functions/notify-caregiver/index.ts` | Fix CORS headers, configurable FROM email |

## What You Need To Do (Before or After)

1. **For email to work in production**: Add a verified domain in your Resend dashboard, then set the `RESEND_FROM_EMAIL` secret to something like `alerts@yourdomain.com`
2. **For WhatsApp to work in production**: Ensure your Twilio WhatsApp number is approved (not sandbox). Check Twilio console for the exact error on failed messages
