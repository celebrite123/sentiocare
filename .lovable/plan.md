

# Separate B2B Hospital Portal to Subdomain

## Overview
Extract the B2B post-discharge hospital portal so it runs on `hospital.sentio.in.net` as a standalone experience — separate landing, login, navigation, and routing — while sharing the same database and edge functions.

## Approach: Domain-Based Routing in Same Project

Since Lovable supports custom domains, we'll point `hospital.sentio.in.net` to this same project and use domain detection at the app root to render either the B2C app or the B2B hospital portal.

## Changes

### 1. Create domain detection utility
- New file: `src/lib/domain.ts`
- Export `isHospitalPortal()` — checks `window.location.hostname` for `hospital.sentio.in.net` (and localhost dev flag)
- All routing decisions branch on this

### 2. Create B2B App shell (`src/B2BApp.tsx`)
- Standalone route tree containing only B2B routes (login, dashboard, upload, patients, alerts, reports, settings, staff)
- No B2C routes (no `/auth`, `/elders`, `/dashboard`, `/select-plan`, etc.)
- Uses `B2BLayout` and `OrganizationProvider` at the root
- Default route `/` goes to B2B login (instead of `/b2b/login`)
- All B2B paths become top-level: `/dashboard`, `/patients`, `/alerts`, etc. (no `/b2b/` prefix)

### 3. Update `src/App.tsx` (B2C App)
- Wrap existing content in a domain check
- If `isHospitalPortal()` → render `<B2BApp />`
- Otherwise → render current B2C routes as-is
- Remove `/b2b/*` routes from the B2C app (they'll only exist in B2BApp)

### 4. Update B2B components for new paths
- `B2BNavbar.tsx` — change nav hrefs from `/b2b/dashboard` to `/dashboard`, etc.
- `B2BRoute.tsx` — redirect to `/login` instead of `/b2b/login`
- `B2BLogin.tsx` — navigate to `/dashboard` instead of `/b2b/dashboard`
- All B2B page imports that use `navigate('/b2b/...')` updated to `/...`

### 5. B2B Landing page (optional but recommended)
- Create a simple hospital-facing landing at `/` for the hospital subdomain
- Shows hospital branding, login CTA, and brief product description
- Or just redirect `/` to `/login` directly

### 6. Domain setup
- Add `hospital.sentio.in.net` as a custom domain in Lovable project settings (A record → 185.158.133.1)
- Both domains serve the same project; the JS detects which experience to show

## What stays the same
- Same database, same edge functions, same auth system
- Same Lovable project and deployment
- B2B branding still says "Sentio"
- All existing B2B components reused as-is (just path changes)

## Technical detail

```text
hospital.sentio.in.net          sentio.in.net
        │                            │
        ▼                            ▼
   Same Lovable Project (App.tsx)
        │
   isHospitalPortal()?
   ├─ YES → B2BApp.tsx (hospital routes only)
   └─ NO  → B2C routes (consumer app)
```

### Files to create
- `src/lib/domain.ts`
- `src/B2BApp.tsx`

### Files to modify
- `src/App.tsx` — domain branching + remove `/b2b/*` routes
- `src/components/b2b/B2BNavbar.tsx` — update paths
- `src/components/B2BRoute.tsx` — update redirect path
- `src/pages/b2b/B2BLogin.tsx` — update navigation target
- `src/pages/b2b/B2BDashboard.tsx` — update any `/b2b/` navigations
- `src/pages/b2b/PatientList.tsx` — update patient detail links
- Other B2B pages with hardcoded `/b2b/` paths

