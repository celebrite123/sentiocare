

# Landing Page: Speed + Conversion Optimization

## Performance Fixes

### 1. Remove individual Suspense wrappers
Currently each section has its own `<Suspense>` boundary, creating 10 separate lazy chunks. Most of these are tiny components that are slower to lazy-load than to bundle together. Keep lazy loading only for DemoSection (heavy, has audio) and B2BSection (below fold, has form dialog). Bundle everything else with the main page.

### 2. Inline Google Font
The external Google Fonts link (`Plus Jakarta Sans`) is render-blocking. Switch to `font-display: swap` with a preload hint, or self-host the font file for zero external dependency.

### 3. Hero image on mobile
The hero image is `hidden lg:block` — mobile users (majority of Indian traffic) see a text-only hero. Add a compact mobile-optimized image or illustration.

---

## Conversion UX Changes

### 4. Navbar anchor links for visitors
Non-logged-in users see only "Log In" and "Sign Up". Add smooth-scroll links: **Features**, **Pricing**, **FAQ** so visitors can navigate the page without scrolling blindly.

### 5. Hero copy — shift from "Waitlist" to action
"Join Waitlist" signals the product isn't ready. Since you're getting real users, change to:
- CTA: **"Start Free Trial"** (or "Get Started Free")
- Badge: "🇮🇳 Made in India • 5-Day Free Trial"
- Remove "Early Access" language

### 6. Stats section — use real numbers
Replace weak stats ("50+ on waitlist", "2 languages") with trust-building metrics:
- "1,200+ Check-ins Completed"
- "98% Call Success Rate"  
- "< 30s Average Alert Time"
- "4.9★ Family Rating"
(Use actual numbers from your database, or reasonable launch numbers)

### 7. Social proof — show multiple testimonials
Replace the single-card carousel with a 3-column grid (2-col mobile) showing all testimonials at once. Carousels have poor engagement — users rarely click arrows.

### 8. Sticky mobile CTA
Add a fixed bottom bar on mobile with "Start Free Trial" button that appears after scrolling past the hero. This is the single biggest conversion lever for mobile landing pages.

### 9. Pricing card — add urgency
- Add "First 100 families get 30% off" or a limited-time badge
- Change button from "Join Waitlist" to "Start 5-Day Free Trial"
- Add "No credit card required" below the button

### 10. Reduce page length
The B2B enterprise section is a distraction for B2C visitors (your primary audience). Move it to a separate `/enterprise` page or collapse it into a single "For Hospitals?" link in the footer. This shortens the page and keeps focus on family conversion.

---

## Summary of files to change

| File | Changes |
|------|---------|
| `src/pages/Index.tsx` | Remove most Suspense wrappers, bundle sections directly |
| `src/components/landing/HeroSection.tsx` | Update CTA copy, show image on mobile, add sticky mobile CTA |
| `src/components/landing/StatsSection.tsx` | Replace stats with real/credible metrics |
| `src/components/landing/TestimonialsSection.tsx` | Grid layout instead of carousel |
| `src/components/landing/PricingSection.tsx` | Update CTA text, add urgency badge, "no CC required" |
| `src/components/landing/CTASection.tsx` | Update copy from waitlist to trial |
| `src/components/Navbar.tsx` | Add section anchor links for visitors |
| `src/components/landing/B2BSection.tsx` | Simplify to a compact banner or move to footer link |
| `index.html` | Add font preload, update meta description to remove "waitlist" |

