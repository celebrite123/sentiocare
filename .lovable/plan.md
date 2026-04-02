

# Fix: Google OAuth Users Not Appearing on Waitlist

## Root Cause
Google OAuth sign-ups create an `auth.users` record but the profile creation in `checkAndRedirect` is silently failing. 4 users signed up via Google and have no profile in the `profiles` table, making them invisible on the waitlist.

**Why it fails:**
1. The `upsert` with `onConflict: "user_id"` may fail if there's no unique constraint on `user_id`
2. The code uses `supabase.auth.signInWithOAuth` directly instead of the required `lovable.auth.signInWithOAuth` for Lovable Cloud
3. Errors are only logged to console, never surfaced to the user or retried

## Fix Plan

### 1. Add unique constraint on `profiles.user_id` (if missing)
- Migration to add `UNIQUE` constraint on `profiles.user_id` so upsert works correctly
- Use `IF NOT EXISTS` pattern to be safe

### 2. Fix Google OAuth to use Lovable Cloud auth
- Update `Auth.tsx` to use `lovable.auth.signInWithOAuth("google", ...)` instead of `supabase.auth.signInWithOAuth`
- Run the Configure Social Auth tool to generate the Lovable module

### 3. Make profile creation more robust
- In `checkAndRedirect`, add retry logic if upsert fails
- If upsert fails, fall back to a plain `INSERT` with explicit error handling
- Show a toast error if profile creation fails so the user knows something went wrong

### 4. Manually fix the 4 missing profiles
- Insert profiles for the 4 Google users who signed up but have no profile:
  - `860e8262` (piyushkr3505@gmail.com - "Piyush")
  - `e847a742` (dev.ayandg@gmail.com - "Ayan Dasgupta")
  - `c0cdb720` (adityasentiocare@gmail.com - "Aditya")
  - `c6d70b7b` (aryanisgreat098@gmail.com - "Aryan")

### Files to modify
- `src/pages/Auth.tsx` — fix OAuth method + robust profile creation
- Migration — add unique constraint on `profiles.user_id`
- Data insert — create missing profiles for 4 users

