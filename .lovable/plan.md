

# Waitlist-First Model: Remove Basic Plan, Replace Payment with Waitlist

## What Changes

### New Flow
1. Landing page shows single ₹699/mo Premium plan with "Join Waitlist" CTA instead of "Start Free Trial" / "Buy Now"
2. Users sign up → land on a "You're on the waitlist!" page instead of plan selection
3. Admin Center gets a new "Waitlist" tab to view signups and approve users
4. When admin approves a user → their profile gets `subscription_status = 'trial'` and `trial_ends_at = now() + 5 days`
5. After trial expires → existing TrialExpiredModal shows single Premium plan with payment

### Database Changes (Migration)
- Add `waitlist_status` column to `profiles` table: `text DEFAULT 'pending'` (values: `pending`, `approved`, `rejected`)
- Add `waitlist_approved_at` column: `timestamp with time zone`
- Add `waitlist_approved_by` column: `uuid`

### Files to Modify

**1. Landing Page — Single plan, waitlist CTA**
- `src/components/landing/PricingSection.tsx` — Remove Basic plan, remove "Buy Now" button, change "Start Free Trial" to "Join Waitlist" → navigates to `/auth`
- `src/components/landing/HeroSection.tsx` — Change "Start Free Trial" to "Join Waitlist"
- `src/components/landing/CTASection.tsx` — Update CTA text

**2. Auth Flow — Waitlist instead of trial**
- `src/pages/Auth.tsx` — On signup, set `subscription_status = 'waitlisted'` instead of `'trial'`. After signup, redirect to a waitlist confirmation page instead of `/select-plan`. Remove `trial_ends_at` default for new signups (set it to null until approved).
- `src/pages/SelectPlan.tsx` — Repurpose into a waitlist status page for pending users. Show "You're on the waitlist!" message. For approved users with expired trial, show single Premium plan with payment.

**3. Subscription Hook**
- `src/hooks/useSubscription.tsx` — Add `isWaitlisted` state. When `subscription_status = 'waitlisted'`, block access to features and show waitlist status.

**4. TrialExpiredModal — Single plan only**
- `src/components/TrialExpiredModal.tsx` — Remove Basic plan, show only Premium ₹699

**5. Admin Center — Waitlist management tab**
- `src/pages/AdminCenter.tsx` — Add "Waitlist" tab
- New component `src/components/admin/WaitlistManager.tsx` — Table of waitlisted users (name, email, phone, signup date), with "Approve" and "Reject" buttons. Approve sets `waitlist_status = 'approved'`, `subscription_status = 'trial'`, `trial_ends_at = now() + 5 days`.

**6. Protected Route updates**
- `src/components/ProtectedRoute.tsx` — If user is waitlisted (not yet approved), redirect to waitlist page instead of dashboard

**7. Remove/simplify payment references for new signups**
- Keep Razorpay code intact (needed after trial expires)
- Remove "Buy Now" from landing page pricing section
- Keep payment flow in TrialExpiredModal and SelectPlan for post-trial

### Summary Table

| Area | Change |
|------|--------|
| Database | Add `waitlist_status`, `waitlist_approved_at`, `waitlist_approved_by` to `profiles` |
| Landing page | Single Premium plan, "Join Waitlist" buttons |
| Auth signup | Status = `waitlisted`, no trial until approved |
| SelectPlan | Waitlist status page for pending users |
| Admin Center | New "Waitlist" tab with approve/reject |
| TrialExpiredModal | Single Premium plan only |
| ProtectedRoute | Block waitlisted users from dashboard |

