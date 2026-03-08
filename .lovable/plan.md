

# Landing Page Optimization — SEO, Copy, Trust Signals

## What's Already In Place
Your site already has: meta description, OG tags, Twitter cards, "Join Waitlist" CTAs, How It Works, Features, Demo with audio, FAQ, Testimonials, Pricing, B2B section, and responsive Tailwind layout. Most of the suggestions in that list are already covered.

## What Actually Needs Fixing

### 1. SEO — Better Meta Tags + Structured Data (`index.html`)
- Add `keywords` meta tag targeting Indian elderly care searches
- Improve meta description to be more conversion-focused (mention ₹699, Hindi/English, no app needed)
- Add JSON-LD structured data (Organization + Product) for rich Google results
- Add canonical URL pointing to `https://sentio.in.net`
- Update OG image to use hero image instead of tiny favicon

### 2. Hero Copy — More Emotional, Benefit-First (`HeroSection.tsx`)
Current: "AI-Powered Care For Your Loved Ones" — generic
Change to: **"Your Parents Are Safe. We Check Every Day."** with subheadline mentioning ₹699/mo, no app required, Hindi & English

### 3. Stats Section — Show Real Traction (`StatsSection.tsx`)
Current stats are generic (15+ languages, 99.9% uptime) — these look fake for an early-stage product.
Change to honest, compelling numbers:
- "50+" → Families on Waitlist
- "2" → Languages (Hindi & English)  
- "24/7" → AI Availability
- "5" → Day Free Trial

### 4. Footer — Add WhatsApp + Phone Contact (`Footer.tsx`)
- Add WhatsApp chat link (wa.me link)
- Add contact email prominently
- Add social media links if available

### 5. FAQ — Add Missing Key Questions (`FAQSection.tsx`)
Add:
- "Does my parent need a smartphone?" → No, just any phone
- "Can I try before I pay?" → Yes, 5-day free trial after approval
- "How much does it cost?" → ₹699/month per elder

### 6. Pricing Comparison (`PricingSection.tsx`)
Add a comparison row below pricing card:
- Full-time caregiver: ₹25,000/mo
- Wearable devices: ₹15,000 + 40% abandon
- Sentio: ₹699/mo

## Files Modified

| File | Change |
|------|--------|
| `index.html` | Better meta tags, keywords, JSON-LD structured data, canonical URL |
| `src/components/landing/HeroSection.tsx` | Stronger emotional headline + benefit-first copy |
| `src/components/landing/StatsSection.tsx` | Honest traction numbers |
| `src/components/landing/Footer.tsx` | WhatsApp link, email, social links |
| `src/components/landing/FAQSection.tsx` | Add 3 missing key questions |
| `src/components/landing/PricingSection.tsx` | Add cost comparison section |

## Out of Scope (Not Code Changes)
- Domain name (sentio.in.net vs sentio.in) — this is a registrar purchase decision, not a code change
- Google Analytics / Hotjar — requires external account setup, can add tracking scripts if you provide IDs
- Exit intent popup — can add later, focus on fundamentals first

