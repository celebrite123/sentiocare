# 🏥 Sentio AI — Elder Healthcare Management Platform

AI-powered post-discharge and elder care system using voice calls and WhatsApp to monitor medication adherence, detect health risks, and alert caregivers.

**Live:** [sentiocare.lovable.app](https://sentiocare.lovable.app)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite |
| UI | Tailwind CSS + shadcn/ui + Framer Motion |
| Backend | Lovable Cloud (Supabase) — PostgreSQL, Auth, Edge Functions, Storage |
| AI Voice | Bolna AI (English + Hindi agents) |
| AI Chat | Lovable AI (Google Gemini 2.5 Flash) |
| WhatsApp | Twilio WhatsApp Business API |
| Payments | Razorpay |
| Mobile | Capacitor (iOS + Android) |
| Email | Resend |

---

## Architecture Overview

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│  React SPA  │────▶│  Supabase    │────▶│  Edge Functions  │
│  (Vite)     │     │  (Auth + DB) │     │  (Deno runtime)  │
└─────────────┘     └──────────────┘     └────────┬────────┘
                                                   │
                              ┌────────────────────┼────────────────────┐
                              │                    │                    │
                        ┌─────▼─────┐      ┌──────▼──────┐    ┌───────▼───────┐
                        │  Bolna AI │      │   Twilio    │    │  Lovable AI   │
                        │  (Voice)  │      │ (WhatsApp)  │    │  (Gemini)     │
                        └───────────┘      └─────────────┘    └───────────────┘
```

---

## Database Schema

### B2C Tables (Family → Elder care)

| Table | Purpose |
|-------|---------|
| `profiles` | Family member accounts (linked to `auth.users` via `user_id`) |
| `elders` | Elder patient info, language, subscription plan |
| `medicines` | Medication schedules per elder |
| `check_ins` | AI call/WhatsApp interaction logs |
| `check_in_schedules` | Daily call scheduling config |
| `conversation_logs` | Full conversation transcripts |
| `health_metrics` | Vital signs tracking |
| `alerts` | Family notification alerts |
| `notification_settings` | Per-elder notification preferences |
| `elder_access` | Shared access (multiple family members) |
| `call_attempts` | Voice call retry tracking |
| `whatsapp_conversations` | WhatsApp session tracking |
| `whatsapp_messages` | Individual WhatsApp messages |
| `resolved_symptoms` | Historical symptom resolution |

### B2B Tables (Hospital → Discharged patients)

| Table | Purpose |
|-------|---------|
| `organizations` | Hospitals/nursing homes config |
| `organization_members` | Staff accounts with role-based permissions |
| `discharged_patients` | Patient records with risk status, medicine lists |
| `patient_checkins` | AI check-in results per patient |
| `patient_communications` | All outbound/inbound messages |
| `b2b_alerts` | Clinical alerts with SLA tracking |
| `b2b_pending_calls` | Queued voice calls |
| `scheduled_callbacks` | Nurse callback scheduling |
| `patient_upload_batches` | Excel bulk-upload tracking |

### Shared Tables

| Table | Purpose |
|-------|---------|
| `user_roles` | Admin/moderator/user roles (enum: `app_role`) |
| `blog_posts` | CMS for health blog |
| `b2b_leads` | Sales pipeline |
| `payment_history` | Razorpay payment records |
| `payment_methods` | Saved cards (tokenized) |
| `renewal_reminders` | Subscription renewal tracking |

### Key Database Functions

- `has_role(user_id, role)` — SECURITY DEFINER role check (prevents RLS recursion)
- `get_user_org_id(uid)` — Returns org ID for B2B member
- `is_org_admin(uid)` — Checks admin/staff-manager status
- `submit_b2b_lead(...)` — Rate-limited lead submission

### RLS Strategy

- **B2C:** Family members see only their own elders (via `profiles.user_id → elders.family_member_id`)
- **B2B:** Org members see only their org's data (via `get_user_org_id()`)
- **Admin:** Uses `has_role()` SECURITY DEFINER function
- **Service operations** (webhooks): Use `service_role` key, bypass RLS

---

## Edge Functions

### B2C Voice & Chat

| Function | JWT | Purpose |
|----------|-----|---------|
| `bolna-voice-call` | ✅ | Initiates Bolna AI voice call to elder |
| `bolna-webhook` | ❌ | Receives call completion data, runs AI analysis, sends WhatsApp summary |
| `whatsapp-ai-chat` | ✅ | Lovable AI (Gemini) powered WhatsApp conversation |
| `send-whatsapp-checkin` | ✅ | Sends scheduled WhatsApp check-in |
| `twilio-whatsapp-webhook` | ❌ | Receives incoming WhatsApp messages |
| `run-scheduled-checkins` | ❌ | Cron: triggers daily scheduled calls |
| `process-call-retries` | ❌ | Retries failed voice calls |
| `simulate-checkin` | ✅ | Dev/demo: simulates a check-in |

### B2B Hospital Functions

| Function | JWT | Purpose |
|----------|-----|---------|
| `run-scheduled-b2b-calls` | ❌ | Cron: processes B2B call queue |
| `b2b-bolna-webhook` | ❌ | Receives B2B call results |
| `b2b-whatsapp-webhook` | ❌ | Receives B2B WhatsApp replies |
| `run-48hr-check` | ❌ | Post-discharge 48hr safety check |
| `send-discharge-message` | ❌ | WhatsApp discharge instructions |
| `send-medicine-reminder` | ❌ | Daily medicine reminder messages |
| `escalate-b2b-alert` | ❌ | Auto-escalates unresolved alerts |
| `schedule-guaranteed-callback` | ❌ | Creates nurse callback with SLA |
| `process-scheduled-callbacks` | ❌ | Processes due callbacks |
| `send-b2b-alert-notification` | ❌ | Notifies staff of new alerts |
| `b2b-weekly-report` | ❌ | Generates weekly analytics |
| `create-b2b-organization` | ❌ | Admin: creates new org |
| `create-b2b-staff` | ❌ | Admin: adds staff member |
| `update-b2b-organization` | ❌ | Updates org settings |

### Admin & Utility

| Function | JWT | Purpose |
|----------|-----|---------|
| `admin-analytics` | ❌ | Dashboard analytics queries |
| `admin-demo-call` | ❌ | Triggers demo call for prospects |
| `elevenlabs-demo-tts` | ❌ | TTS audio for landing page demo |
| `notify-caregiver` | ✅ | Sends alert to family caregiver |
| `send-notification` | ✅ | Generic notification sender |
| `weekly-health-summary` | ❌ | Weekly health report emails |
| `send-renewal-reminders` | ❌ | Subscription expiry reminders |
| `process-subscription-renewals` | ❌ | Auto-renew subscriptions |
| `create-razorpay-order` | ❌ | Creates Razorpay payment order |
| `verify-razorpay-payment` | ❌ | Verifies payment signature |
| `proxy-recording` | ❌ | Proxies call recordings (avoids CORS) |
| `cleanup-old-recordings` | ❌ | Data retention cleanup |
| `check-followup-reminders` | ❌ | Follow-up appointment reminders |

---

## Environment Secrets

All managed via Lovable Cloud (never in code):

| Secret | Service |
|--------|---------|
| `BOLNA_API_KEY` | Bolna AI voice platform |
| `BOLNA_AGENT_ID` | English voice agent |
| `BOLNA_AGENT_ID_HINDI` | Hindi voice agent |
| `TWILIO_ACCOUNT_SID` | Twilio |
| `TWILIO_AUTH_TOKEN` | Twilio |
| `TWILIO_WHATSAPP_NUMBER` | Twilio WhatsApp sender |
| `RAZORPAY_KEY_ID` | Razorpay payments |
| `RAZORPAY_KEY_SECRET` | Razorpay payments |
| `RESEND_API_KEY` | Resend email |
| `RESEND_FROM_EMAIL` | Sender address |
| `ELEVENLABS_API_KEY` | ElevenLabs TTS (demo) |
| `VAPI_API_KEY` | VAPI (legacy) |
| `INTERAKT_API_KEY` | Interakt (legacy) |
| `LOVABLE_API_KEY` | Lovable AI (auto-configured) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role (auto-configured) |

---

## Local Development

```bash
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>
npm install
npm run dev        # Starts at http://localhost:8080
```

### Key Directories

```
src/
├── components/
│   ├── admin/       # Super-admin dashboard
│   ├── b2b/         # Hospital portal components
│   ├── dashboard/   # Family dashboard
│   ├── landing/     # Marketing pages
│   ├── settings/    # Elder settings
│   └── ui/          # shadcn/ui primitives
├── contexts/        # Auth, Organization providers
├── hooks/           # Custom hooks (subscription, roles, etc.)
├── pages/           # Route pages
│   └── b2b/         # Hospital portal pages
└── integrations/
    └── supabase/    # Auto-generated client & types (DO NOT EDIT)

supabase/
└── functions/       # Deno edge functions (auto-deployed)
```

### Important: Do NOT edit these auto-generated files
- `src/integrations/supabase/client.ts`
- `src/integrations/supabase/types.ts`
- `.env`

---

## Subscription Plans

### B2C (Family)

| Plan | Price | Features |
|------|-------|----------|
| Essential | ₹299/mo | WhatsApp check-ins, medicine reminders, health book |
| Premium | ₹999/mo | + 2x daily AI voice calls, emergency alerts, detailed reports |

### B2B (Hospital)

Custom pricing per organization with configurable:
- Monthly patient/SMS/call limits
- Call schedules (Day 1, 3, 7 post-discharge)
- Auto 48hr checks, medicine reminders
- SLA-based alert escalation

---

## Webhook URLs

Configure these in external service dashboards:

| Service | Webhook URL |
|---------|------------|
| Bolna (B2C) | `https://hcdwbpbvuvbrozttahfz.supabase.co/functions/v1/bolna-webhook` |
| Bolna (B2B) | `https://hcdwbpbvuvbrozttahfz.supabase.co/functions/v1/b2b-bolna-webhook` |
| Twilio WhatsApp | `https://hcdwbpbvuvbrozttahfz.supabase.co/functions/v1/twilio-whatsapp-webhook` |
| B2B WhatsApp | `https://hcdwbpbvuvbrozttahfz.supabase.co/functions/v1/b2b-whatsapp-webhook` |

---

## User Flows

### B2C: Family Member
1. Sign up → Add elder → Configure medicines & schedule
2. Elder receives daily voice call or WhatsApp
3. AI logs check-in → analyzes sentiment & adherence
4. Family sees dashboard with health trends, alerts

### B2B: Hospital Staff
1. Admin creates organization → adds staff
2. Staff uploads discharged patients (Excel or manual)
3. System sends discharge WhatsApp → schedules Day 1/3/7 calls
4. AI calls patient → detects risks → creates alerts
5. Staff resolves alerts, schedules nurse callbacks

---

Built with [Lovable](https://lovable.dev)
