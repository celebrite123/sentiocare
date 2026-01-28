
# Logo and Branding Update Plan

## Overview

This plan updates all branding across the application to use the new Sentio logo (with elder and caregiver figures in a heart shape) and introduces a premium font for better visual appeal.

## Current State Analysis

### Logo Usage Locations Found

| Location | Current Asset | Issue |
|----------|---------------|-------|
| `src/components/Navbar.tsx` | `sentio-logo-optimized.png` | Old logo |
| `src/components/landing/Footer.tsx` | `sentio-logo.png` | Old logo |
| `src/components/dashboard/DashboardHeader.tsx` | `sentio-logo.png` | Old logo |
| `src/pages/Auth.tsx` | `sentio-logo.png` | Old logo |
| `src/pages/ContactUs.tsx` | `sentio-logo.png` | Old logo |
| `src/pages/CancellationRefund.tsx` | `sentio-logo.png` | Old logo |
| `src/pages/PrivacyPolicy.tsx` | Heart icon | No actual logo |
| `src/pages/TermsOfService.tsx` | Heart icon | No actual logo |
| `src/pages/SelectPlan.tsx` | Heart icon | No actual logo |
| `src/components/b2b/B2BNavbar.tsx` | Building2 icon | No Sentio branding |
| `src/pages/b2b/B2BLogin.tsx` | Building2 icon | No Sentio branding |
| `public/favicon.png` | Current favicon | Needs update |
| `index.html` | Preload reference | Needs path update |

### Current Font Stack
- Using default Tailwind CSS system fonts (ui-sans-serif stack)
- No custom premium font configured

---

## Implementation Plan

### Phase 1: Add New Logo Asset

1. **Copy uploaded logo to assets folder**
   - Save as `src/assets/sentio-logo-new.png` (the transparent background version)
   - This will be used across all components

2. **Create favicon version**
   - Update `public/favicon.png` with the new logo (cropped to icon format)

### Phase 2: Add Premium Font

Update font configuration for a more professional healthcare look. Recommended options:

**Option 1: Inter (Clean, Modern)**
- Highly readable, works well for healthcare apps
- Free Google Font

**Option 2: Plus Jakarta Sans (Friendly, Modern)**
- Warm and approachable, matches elder care branding
- Free Google Font

**Implementation:**
1. Add Google Fonts import to `index.html`
2. Update `tailwind.config.ts` to include the custom font
3. Update `src/index.css` to apply the font globally

### Phase 3: Update All Logo References

#### Consumer App Pages

| File | Change |
|------|--------|
| `src/components/Navbar.tsx` | Replace `sentio-logo-optimized.png` → `sentio-logo-new.png` |
| `src/components/landing/Footer.tsx` | Replace `sentio-logo.png` → `sentio-logo-new.png` |
| `src/components/dashboard/DashboardHeader.tsx` | Replace `sentio-logo.png` → `sentio-logo-new.png` |
| `src/pages/Auth.tsx` | Replace `sentio-logo.png` → `sentio-logo-new.png` |
| `src/pages/ContactUs.tsx` | Replace `sentio-logo.png` → `sentio-logo-new.png` |
| `src/pages/CancellationRefund.tsx` | Replace `sentio-logo.png` → `sentio-logo-new.png` |

#### Pages Using Heart Icon (Replace with actual logo)

| File | Change |
|------|--------|
| `src/pages/PrivacyPolicy.tsx` | Replace Heart icon → Sentio logo image |
| `src/pages/TermsOfService.tsx` | Replace Heart icon → Sentio logo image |
| `src/pages/SelectPlan.tsx` | Replace Heart icon → Sentio logo image |

#### B2B Portal (Add Sentio branding alongside hospital name)

| File | Change |
|------|--------|
| `src/components/b2b/B2BNavbar.tsx` | Add Sentio logo alongside Building2 icon |
| `src/pages/b2b/B2BLogin.tsx` | Add Sentio logo with "Powered by Sentio" text |

### Phase 4: Update Meta Assets

| File | Change |
|------|--------|
| `public/favicon.png` | Replace with new logo icon |
| `index.html` | Update preload path if filename changes |

---

## Technical Details

### Font Configuration (tailwind.config.ts)

```typescript
theme: {
  extend: {
    fontFamily: {
      sans: ['Plus Jakarta Sans', 'ui-sans-serif', 'system-ui', 'sans-serif'],
    },
  },
}
```

### Font Import (index.html)

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
```

### Logo Component Pattern

For consistency, we will use the same import pattern across all files:

```typescript
import sentioLogo from "@/assets/sentio-logo-new.png";

// Usage
<img 
  src={sentioLogo} 
  alt="Sentio" 
  className="h-10 w-auto"
  loading="lazy"
/>
```

---

## Files to Modify

| File | Type | Description |
|------|------|-------------|
| `src/assets/sentio-logo-new.png` | CREATE | Copy from uploaded logo |
| `public/favicon.png` | UPDATE | New favicon |
| `index.html` | UPDATE | Add font import, update preload |
| `tailwind.config.ts` | UPDATE | Add font family |
| `src/index.css` | UPDATE | Apply font to body |
| `src/components/Navbar.tsx` | UPDATE | New logo import |
| `src/components/landing/Footer.tsx` | UPDATE | New logo import |
| `src/components/dashboard/DashboardHeader.tsx` | UPDATE | New logo import |
| `src/pages/Auth.tsx` | UPDATE | New logo import |
| `src/pages/ContactUs.tsx` | UPDATE | New logo import |
| `src/pages/CancellationRefund.tsx` | UPDATE | New logo import |
| `src/pages/PrivacyPolicy.tsx` | UPDATE | Replace Heart icon with logo |
| `src/pages/TermsOfService.tsx` | UPDATE | Replace Heart icon with logo |
| `src/pages/SelectPlan.tsx` | UPDATE | Replace Heart icon with logo |
| `src/components/b2b/B2BNavbar.tsx` | UPDATE | Add Sentio branding |
| `src/pages/b2b/B2BLogin.tsx` | UPDATE | Add Sentio branding |

---

## Cleanup

After implementation, the old logo files can be removed:
- `src/assets/sentio-logo.png`
- `src/assets/sentio-logo-optimized.png`

(Or keep them as backup temporarily)

---

## Expected Outcome

After implementation:
- Consistent new Sentio logo across all 13+ screens
- Premium "Plus Jakarta Sans" font for modern healthcare feel
- B2B portal shows "Powered by Sentio" branding
- Updated favicon in browser tabs
- No more generic Heart icons as logo placeholders
