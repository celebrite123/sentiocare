
## What I found from recent transcripts + logs

1. **Your “error 2xx” issue is real and reproducible**  
   Recent backend logs show `DAILY CALL LIMIT REACHED ... 3 calls today` right when Call Now is pressed.  
   So the call is being blocked by daily cap, and UI is surfacing a generic non-2xx function error.

2. **Current call quality has 5 concrete failures**
   - Template leak: `"[medicine from Sugar ki dawai (Glycoma)]"` spoken literally.
   - Bad acknowledgement: elder says “not well”, agent replies “हाँ, ठीक है”.
   - Over-escalation: “Serious hai” without proper safety branch logic.
   - Flow breaks: calls end early, missing one or more required checks.
   - Context drop: elder gives symptom detail, agent doesn’t always follow immediately.

3. **Prompt/logic mismatch is causing drift**
   - Prompt is long/contradictory (e.g., strict question count vs multi-step requirements).
   - Code sends multiple variables, but flow control is still too open-ended.
   - Emergency interrupt behavior is not enforced strongly enough during live turn handling.

---

## Implementation plan (focused + fast)

### Phase 1 — Fix “Call Now” reliability first
**Files:**  
- `supabase/functions/bolna-voice-call/index.ts`  
- `supabase/functions/admin-demo-call/index.ts`  
- `src/components/admin/DemoCallPanel.tsx` (and call UI where applicable)

**Changes:**
1. **Daily-limit policy split**
   - Keep limit for normal routine calls.
   - Allow controlled bypass for admin/demo calls.
   - Do not let emergency-triggered calls be blocked by routine daily cap.
2. **Caller detection hardening**
   - Make service/internal call detection robust (not fragile token equality only).
3. **Error surface fix**
   - Return structured error payloads (`code`, `message`, `callsToday`).
   - UI shows human message (not generic “function non-2xx”).

---

### Phase 2 — Simplify agent behavior to your exact desired flow
**Files:**  
- `supabase/functions/bolna-voice-call/index.ts`  
- `SENTIO_VOICE_AGENT_GUARDRAILS.md`

**Target call structure (simple + efficient):**
1. **Day check** (“How was your day/how are you feeling?”)
2. **Medicine adherence**
3. **Active symptom update (most recent unresolved first)**
4. **Any current/new problem**
5. Close warmly

**Changes:**
1. Send explicit prebuilt question fields for each step (not inferred templates).
2. Keep medicine data simple (name-safe, no ambiguous template wording).
3. Remove contradictory prompt rules and shorten to a strict “minimal protocol”.
4. Enforce mandatory one-line acknowledgement before next question.

---

### Phase 3 — Hard emergency interrupt (your key requirement)
**Files:**  
- `SENTIO_VOICE_AGENT_GUARDRAILS.md`  
- `supabase/functions/bolna-voice-call/index.ts`  
- `supabase/functions/bolna-webhook/index.ts` (safety net)

**Changes:**
1. Add explicit **interrupt rule**: if elder says high-risk terms (example: **left-side chest pain**, breathlessness, fainting, stroke-like signs, suicidal statements), agent must immediately switch to emergency flow.
2. For non-red-flag pain, still ask severity (1–10) before advice.
3. Add webhook safety fallback: if transcript contains hard red flags but agent missed escalation, force high-priority alert tagging.

---

## Rollout + verification plan

1. Update and sync prompt on **both** Bolna agents (Hindi + English) using the revised guardrails.
2. Run 6 scripted call tests:
   - normal day flow
   - medicine missed
   - active symptom follow-up
   - new concern
   - explicit left chest pain (must emergency interrupt immediately)
   - no-symptom short response case
3. Validate transcripts for:
   - no template leak text
   - all required steps covered in routine calls
   - emergency interrupt within same turn when red flag appears
4. Re-test Call Now after 3 prior calls to confirm:
   - admin/demo path works
   - users receive clear limit reason when applicable

---

## Technical details (implementation-level)

- **Root reliability bug:** routine daily cap currently blocks calls and returns non-2xx; UI doesn’t decode meaningful cause.
- **Root quality bug:** over-constrained long prompt + open generation path causes protocol drift.
- **Deterministic fix:** move from “agent improvises sequence” to “backend sends explicit step questions + strict interrupt rules”.
- **Safety model:** dual-layer  
  1) real-time prompt interrupt logic  
  2) post-call transcript safety net in webhook for missed escalations.
- **No major schema migration required** for core fix; can be done in function/prompt/UI layers.
