

# Add "Demo Call" Button in Admin Center

## What it does
Adds a new "Live Demo" tab in the Admin Center that lists all elders across the platform. Each elder has a "Call Now" button that triggers a standard daily AI voice call (using Bolna) — perfect for live competition demos.

## Architecture

### New Edge Function: `admin-demo-call`
- Verifies the caller is an admin (same pattern as `admin-analytics`)
- Uses service role to fetch the elder's full data (name, phone, medicines, language, medical conditions, monitoring config)
- Calls the existing `bolna-voice-call` function internally using the service role key, which bypasses ownership and subscription checks
- Accepts `{ elderId }` in the request body

### New Component: `DemoCallPanel`
- Fetches all elders via the `admin-analytics` data (which already returns elder info) or via a dedicated call to the new edge function
- Actually simpler: the edge function can also have a `GET`-style mode that lists all elders (using service role to bypass RLS)
- Shows a card per elder: name, phone, language, and a "Call Now" button
- Button shows loading state while call is being initiated, then shows success/error toast
- No daily call limit enforcement for admin demo calls

### AdminCenter changes
- Add a new "Demo" tab with a Phone icon
- Render `DemoCallPanel` inside it

## Files to create/modify

| File | Action |
|------|--------|
| `supabase/functions/admin-demo-call/index.ts` | **Create** — admin-only edge function that lists elders or triggers a call |
| `src/components/admin/DemoCallPanel.tsx` | **Create** — UI component with elder list and call buttons |
| `src/pages/AdminCenter.tsx` | **Modify** — add Demo tab |

## Edge function flow
1. Verify auth + admin role (same as admin-analytics)
2. If `action === 'list'`: return all elders with their details
3. If `action === 'call'`: fetch elder data, then POST to `bolna-voice-call` with service role token to initiate the call

