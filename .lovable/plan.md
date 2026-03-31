

# Fix: Waitlist Entries Not Showing in Admin

## Root Causes Found

**1. Admin page is completely blocked when analytics fails (CRITICAL)**
In `AdminCenter.tsx` (line 162), if the `admin-analytics` edge function returns an error, the entire page renders "Unable to load analytics" — the Waitlist tab never mounts. This means WaitlistManager never runs its query.

**2. Data mismatch: `subscription_status` is `'trial'` not `'waitlisted'`**
Database investigation shows ALL profiles have `subscription_status = 'trial'` despite the signup code explicitly setting `'waitlisted'`. The profiles table column default is `'trial'`. This suggests the explicit value is being overridden (likely by a race condition where the profile is created twice — once by `handleSignUp` with `'waitlisted'`, and once by the `checkAndRedirect` auth listener, where the second insert uses defaults, or the DB default wins in an upsert scenario).

The WaitlistManager query does filter for `waitlist_status.eq.pending` which matches all these profiles, so this alone wouldn't hide entries. But the inconsistency needs fixing.

**3. No separation between truly new and already-active users**
Even users with `subscription_status = 'active'` have `waitlist_status = 'pending'` (never updated on approval). This pollutes the pending list.

## Changes

### 1. Decouple WaitlistManager from analytics loading (`src/pages/AdminCenter.tsx`)
- Remove the early return that blocks all tabs when analytics is null
- Let WaitlistManager render independently regardless of analytics state
- Only show the "Unable to load analytics" message inside the analytics tab

### 2. Fix DB default for `subscription_status` (migration)
- Change column default from `'trial'` to `'waitlisted'` so new profiles start as waitlisted even if explicit value isn't applied
- Update existing pending profiles: set `subscription_status = 'waitlisted'` where `waitlist_status = 'pending'` and `subscription_status = 'trial'` (exclude the admin's own active profile)

### 3. Make WaitlistManager query more robust (`src/components/admin/WaitlistManager.tsx`)
- Update pending filter to exclude already-active/expired users
- Add `subscription_status` to the filter: treat users with `waitlist_status = 'pending'` AND `subscription_status NOT IN ('active', 'expired')` as truly pending
- Sort pending users newest-first for easier discovery

### 4. Fix signup race condition (`src/pages/Auth.tsx`)
- In `handleSignUp`, use `upsert` instead of `insert` to handle the case where a profile already exists
- In `checkAndRedirect`, ensure the profile is created with `subscription_status: 'waitlisted'` consistently

## Files Changed
1. `src/pages/AdminCenter.tsx` — decouple waitlist from analytics
2. `src/components/admin/WaitlistManager.tsx` — fix pending filter logic
3. `src/pages/Auth.tsx` — fix signup race condition
4. Database migration — fix column default + update existing data

