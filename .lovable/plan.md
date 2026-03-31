

# Fix: Google OAuth Users Not Appearing on Waitlist

## Problem
When users sign in with Google OAuth, they redirect back to `/auth` where `checkAndRedirect` runs. It detects no profile (PGRST116 error) and tries to `insert` one. But this insert is failing silently — the error is only `console.error`'d and the user is redirected to `/select-plan` anyway. Result: **no profile row exists**, so the user never appears on the waitlist.

The root cause is likely a race condition: `onAuthStateChange` fires `SIGNED_IN` which calls `checkAndRedirect`, but `checkSession` on mount also calls `checkAndRedirect`. Two concurrent calls try to insert the same profile — the second one fails with a unique constraint violation, but neither succeeds reliably because of timing.

## Changes

### 1. Fix profile creation race condition (`src/pages/Auth.tsx`)
- Change `insert` to `upsert` with `onConflict: "user_id"` in `checkAndRedirect` (line 123-133) — same pattern already used in `handleSignUp`
- Add a retry: after upsert, re-fetch the profile to confirm it exists before redirecting
- Add a guard to prevent `checkAndRedirect` from running concurrently (use a ref flag)

### 2. Fix the existing user's missing profile (migration)
- Insert the missing profile for `piyushkr483@gmail.com` so they appear on the waitlist immediately without needing to sign in again

## Files Changed
1. `src/pages/Auth.tsx` — use upsert + concurrency guard in `checkAndRedirect`
2. Database migration — insert missing profile for the Google OAuth user

