

# Fix: AI Misclassifying Medicine Status in WhatsApp Summary

## Problem

The logs confirm it: AI analysis returned `medicinesTaken: false` even though your father said he took his BP medicine on the call. The root cause is in the AI analysis prompt — it has **zero guidance** on how to determine medicine adherence from the conversation, especially in Hindi.

The prompt (line 515-564) has detailed instructions for symptoms, emergencies, emotional state, and monitoring — but for `medicinesTaken`, it just says `"medicinesTaken": true|false` with no interpretation rules. The AI is guessing.

## Fix — Single file: `supabase/functions/bolna-webhook/index.ts`

### Add explicit medicine classification rules to the AI prompt (around line 532)

Insert a new `MEDICINE ADHERENCE RULES` section into the `analysisPrompt` with:

1. **Positive indicators** (set `medicinesTaken: true`):
   - Hindi: "हाँ ली", "ले ली", "खा ली", "BP ली", "दवाई ली", "गोली ली", "medicine ली"
   - English: "yes taken", "took my medicine", "had my BP", "already taken"
   - Any affirmative response when asked about medicines

2. **Negative indicators** (set `medicinesTaken: false`):
   - Hindi: "नहीं ली", "भूल गया", "छोड़ दी"
   - English: "didn't take", "forgot", "skipped", "missed"
   - Explicit denial when asked

3. **Default rule**: If the elder gives ANY affirmative response to a medicine question, default to `true`. Only set `false` if there's a clear denial. If not discussed at all, set `null`.

4. **Context awareness**: The elder's medicine list is passed in the prompt data — instruct the AI that mentioning taking ANY named medicine (like "BP") counts as `medicinesTaken: true`.

### Add transcript logging for debugging

Log a snippet of the raw transcript (first 300 chars) alongside the parsed analysis so we can cross-check future mismatches without needing to dig through Bolna.

## Why this fixes it

The AI had no Hindi-language medicine keywords to match against. Your father likely said something like "हाँ BP ली" and the AI, without specific guidance, defaulted to `false`. With explicit rules and a bias toward `true` on affirmative responses, this won't happen again.

