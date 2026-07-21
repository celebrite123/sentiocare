# Redesign: Landing Page + Family Dashboard

Since this is production, we ship visual/UX changes only — no schema, RLS, edge function, or auth-logic rewrites. All backend behavior (waitlist, trial, calls, webhooks) stays intact.

## 1. Brand direction (locked)

- **Palette — Emerald Prestige**: deep emerald `#064e3b`, forest `#0d7a5f`, warm gold accent `#c9a84c`, cream surface `#f5f0e0`, ink `#0b1f18`. Feels clinical + human + premium, not "generic blue SaaS".
- **Typography — Instrument Serif + Work Sans**: serif for hero/section headlines (editorial, human, caring), Work Sans for body/UI (clean, trustworthy).
- **Motion**: subtle only — fade/slide on scroll, gentle hover lift on cards. No parallax gimmicks.
- **Tokens**: update `src/index.css` and `tailwind.config.ts` with new HSL semantic tokens (`--background`, `--foreground`, `--primary`, `--accent`, `--card`, `--muted`, `--border`, plus `--gradient-hero`, `--shadow-elegant`). All new components use tokens — zero hardcoded colors.

## 2. Landing page (`src/pages/Index.tsx` + section components)

Layout: split emotional hero → full-width narrative bands.

Sections, in order:
1. **Sticky nav** — logo left, `Features / How it works / Pricing / FAQ` center, `Sign in` (ghost) + `Join waitlist` (primary) right. Mobile: hamburger sheet.
2. **Hero (split)** — Left: serif headline "Your parents are never alone on the call.", subhead, primary CTA `Join the waitlist`, secondary `See how it works`, trust row ("DPDP compliant · Hindi + English · Doctor-designed"). Right: warm portrait of elder on phone + floating "AI check-in" call card mock with live waveform.
3. **Social proof strip** — quiet line of press/partner/pilot logos or "Trusted by X families across India".
4. **How it works** — 3 numbered steps (Add your parent → We call daily → You get a WhatsApp summary) with illustrated cards.
5. **Feature bento** — 6 tiles: Daily voice check-ins, Medicine adherence, Emergency escalation, WhatsApp summaries for family, Symptom tracking, Multi-language.
6. **Live demo teaser** — the existing voice demo, restyled into a cream card with proper play state (uses existing `useDemoAudio` fallback, no ElevenLabs call).
7. **Pricing** — single card "1 month free, then ₹X/month". Copy already says 30 days — just restyle.
8. **Trust & safety** — DPDP, data deletion, doctor-reviewed protocol, no ads.
9. **FAQ** — accordion, 6–8 questions.
10. **Final CTA band** — emerald background, gold accent, `Join the waitlist`.
11. **Footer** — links, legal, contact, socials.

Every button audited: correct href, correct handler, correct disabled/loading state, mobile tap target ≥ 44px, keyboard-focusable.

## 3. Family dashboard (`src/pages/Dashboard.tsx` + `src/components/dashboard/*`)

Keep all data hooks and logic. Only restyle + reflow.

- **Top bar**: logo, elder switcher (if multiple), notification bell, avatar menu.
- **Hero status card**: today's wellbeing score (large, color-coded green/amber/red using emerald/gold/rose tokens), last check-in time, next scheduled call, quick "Call now" button.
- **Grid below**:
  - **Adherence card** — 7-day medicine bar sparkline.
  - **Wellbeing trend** — 30-day line chart (existing Recharts).
  - **Active symptoms** — chips with days-active.
  - **Recent check-ins** — list with play button (uses fixed streaming audio).
  - **Alerts** — colored strip, most recent first.
- **Empty states**: friendly serif headline + illustration when no elders / no check-ins yet.
- **Waitlisted users**: dashboard shows a calm "You're on the waitlist" hero card instead of the trial-expired modal (already fixed, verify).

Mobile: single column, cards stack, sticky "Call now" FAB.

## 4. Post-login smart routing

New helper `src/lib/postLoginRoute.ts` used by `Auth.tsx` and `ProtectedRoute.tsx`:

```text
if !emailConfirmed        → /auth (verify email screen)
else if isWaitlisted      → /select-plan (waitlist status view)
else if no elders yet     → /elders (onboarding)
else                      → /dashboard
```

`/select-plan` becomes the canonical status page for waitlisted + trial users, showing: current state (Waitlisted / Trial – N days left / Active), what happens next, and (for waitlisted) a "You'll get an email when approved" panel. No trial-expired modal for waitlisted.

## 5. QA checklist (must pass before I hand back)

- Every landing CTA navigates correctly (Sign in → `/auth`, Join waitlist → `/auth?mode=signup`, See how it works → scroll).
- Dashboard renders for: waitlisted user, trial user w/ 0 elders, trial user w/ elders + check-ins, expired user.
- No hardcoded colors in new components (`rg "text-white|bg-black|#[0-9a-f]{3,6}" src/components/landing src/components/dashboard`).
- Mobile (375px) + desktop (1440px) screenshots via Playwright for landing and dashboard.
- Lighthouse-ish sanity: single H1, meta title/description updated, alt text on images.
- No changes to edge functions, migrations, RLS, or Supabase client.

## Technical notes

- Files touched (non-exhaustive): `src/index.css`, `tailwind.config.ts`, `src/pages/Index.tsx`, `src/pages/Dashboard.tsx`, `src/pages/Auth.tsx`, `src/pages/SelectPlan.tsx`, `src/components/ProtectedRoute.tsx`, new `src/components/landing/*` (Nav, Hero, HowItWorks, FeatureBento, DemoTeaser, Pricing, Trust, FAQ, FinalCTA, Footer), refactored `src/components/dashboard/*` presentation.
- New assets: 1–2 hero images generated via imagegen (elder-on-phone warm portrait, abstract emerald/gold texture), stored in `src/assets/`.
- No new dependencies.
- Favicon stays as-is (already fixed).

## Out of scope (intentionally)

- B2B hospital portal, admin center, voice prompts, edge functions, database schema, payment logic, notification logic.

Ship order: tokens → landing → routing → dashboard, each verified before moving on.