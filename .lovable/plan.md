

# Emotion Detection from Call Transcripts + Dashboard Display

## Current State

- The AI analyzes transcripts for `sentiment` (positive/neutral/negative) and `elderMood` (one word like "cheerful")
- But these are **not stored in a queryable column** -- `elderMood` is only inside `conversation_summary` text, and `sentiment` is a simple 3-value field
- The dashboard shows sentiment trends but does NOT show mood/emotional state anywhere
- There is NO "says fine but seems sad" detection -- the AI just takes words at face value

## Important Reality

Bolna/Vapi webhooks only send text transcripts, not raw audio. True voice pitch/tone analysis isn't possible with the current providers. However, we can do **deep linguistic emotion analysis** that catches:
- Contradictions: saying "theek hai" but mentioning pain/tiredness later
- Brevity patterns: consistently one-word answers = possible withdrawal/depression
- Hedging language: "thoda sa...", "kuch nahi bas..." = minimizing problems
- Energy markers: short vs long responses compared to their usual pattern

This is surprisingly accurate for elder care because elders who are struggling tend to give shorter, more dismissive answers over time.

## Changes

### 1. Database: Add `emotional_tone` column to `check_ins`

Add a new `jsonb` column `emotional_tone` to store structured emotion data:
```json
{
  "detected_emotion": "masking_distress",
  "confidence": "medium",
  "verbal_mood": "fine",
  "underlying_mood": "withdrawn",
  "indicators": ["very short responses", "said fine but didn't elaborate when asked about day"],
  "emotional_trend": "declining"
}
```

This is much richer than the current single-word `sentiment` field.

### 2. Webhook Enhancement: Deep Emotion Analysis

Update the AI analysis prompt in both `vapi-webhook/index.ts` and `bolna-webhook/index.ts` to add a dedicated emotion analysis section. The prompt will instruct the AI to:

- Compare what the elder SAYS vs HOW they say it (response length, engagement level, hedging)
- Look for contradiction patterns: "theek hai" + no elaboration + short call = possible masking
- Compare against recent call patterns (using the transcript itself): if someone who usually talks a lot is suddenly giving one-word answers, flag it
- Output a structured `emotionalTone` object with `detected_emotion`, `confidence`, `verbal_mood`, `underlying_mood`, and `indicators`

Key detected emotions:
- `genuinely_positive` -- sounds fine AND is fine
- `masking_distress` -- says fine but indicators suggest otherwise
- `withdrawn` -- minimal engagement, short responses
- `anxious` -- repetitive concerns, seeking reassurance
- `lonely` -- trying to extend the call, asking personal questions
- `irritable` -- curt responses, annoyance at questions
- `neutral` -- baseline, nothing notable

### 3. Alert Enhancement

If `detected_emotion` is `masking_distress` or `withdrawn` for 2+ consecutive calls, auto-trigger a medium-severity alert: "Elder may be hiding distress -- verbal responses don't match engagement pattern." This catches cases where an elder always says "theek hai" but is actually declining.

### 4. Dashboard: New Emotional Wellness Card

Add a new component `EmotionalWellnessCard` to the elder dashboard showing:

- **Current emotional state** with an icon and label (e.g., a small emoji-style indicator + "Seems withdrawn today")
- **Last 7 days emotion timeline** -- simple colored dots showing detected emotions over time (green = genuinely positive, yellow = neutral, orange = masking/anxious, red = withdrawn/distressed)
- **Contradiction flag** -- if the latest call detected masking, show a gentle alert: "Said everything is fine, but responses were unusually brief"

This card sits alongside the existing AI Insights card.

### 5. Update AIInsights to Show Mood Trends

The existing AIInsights component currently shows sentiment trends. Update it to also pull `emotional_tone` data and show a "Emotional Pattern" section that summarizes the last 7 days (e.g., "3 out of 7 calls showed withdrawn pattern -- consider checking in personally").

## Files Modified

| File | Change |
|------|--------|
| New migration | Add `emotional_tone jsonb` column to `check_ins` table |
| `supabase/functions/vapi-webhook/index.ts` | Add emotion analysis to AI prompt, save to new column |
| `supabase/functions/bolna-webhook/index.ts` | Same emotion analysis addition |
| `src/components/dashboard/EmotionalWellnessCard.tsx` | New component -- emotion display + 7-day timeline |
| `src/components/dashboard/AIInsights.tsx` | Add emotional pattern section |
| `src/pages/Dashboard.tsx` | Add EmotionalWellnessCard to dashboard layout |

## Technical Details

### New AI Analysis Fields (added to webhook prompts)

```json
{
  "emotionalTone": {
    "detected_emotion": "genuinely_positive | masking_distress | withdrawn | anxious | lonely | irritable | neutral",
    "confidence": "high | medium | low",
    "verbal_mood": "what they said they feel",
    "underlying_mood": "what their response patterns suggest",
    "indicators": ["array of specific evidence from transcript"]
  }
}
```

### Emotion Detection Prompt Addition

The key prompt section that makes this work:

```
EMOTIONAL ANALYSIS (CRITICAL -- look beyond words):
Analyze the elder's EMOTIONAL STATE by examining:
1. Response length: Are they giving one-word answers or elaborating?
2. Contradictions: Do they say "fine" but mention problems when probed?
3. Engagement: Did they ask questions back, or just answer minimally?
4. Hedging: "thoda sa", "kuch nahi bas", "theek hai theek hai" = minimizing
5. Energy: Compare response verbosity to what's typical for a phone call

If they say "theek hai" and nothing else despite follow-up questions, 
mark as "withdrawn" not "genuinely_positive".
If they say "theek hai" but then mention tiredness/pain later, 
mark as "masking_distress".
Only mark "genuinely_positive" if they actively engage and elaborate.
```

### Alert Logic

In the webhook, after emotion analysis:
- If `detected_emotion` is `masking_distress` with `high` confidence: create alert immediately
- If `detected_emotion` is `withdrawn` for current call: check last 2 calls -- if also withdrawn, create alert
- Alert title: "Emotional Concern: Elder may be masking distress" or "Pattern: Elder seems increasingly withdrawn"

### Dashboard Card Design

The EmotionalWellnessCard will show:
- A header icon (Brain or Heart) with title "How They're Really Feeling"
- Current emotion as a colored badge with plain-language label
- 7 small colored circles for the last 7 calls (hover for details)
- If masking detected: a subtle warning banner explaining the contradiction

