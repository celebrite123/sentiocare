import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Map monitoring topic IDs to natural-language questions
const TOPIC_LABELS: Record<string, { hi: string; en: string }> = {
  meals:          { hi: "खाना कैसा खाया आज?", en: "How were your meals today?" },
  sleep_quality:  { hi: "रात को नींद कैसी आई?", en: "How did you sleep last night?" },
  blood_pressure: { hi: "BP चेक किया? कितना आया?", en: "Did you check your BP? What was the reading?" },
  blood_sugar:    { hi: "Sugar चेक किया? कितना आया?", en: "Did you check your blood sugar? What was it?" },
  water_intake:   { hi: "पानी कितना पिया आज?", en: "How much water did you drink today?" },
  mood:           { hi: "मन कैसा है आज? खुश हैं?", en: "How's your mood today? Feeling happy?" },
  exercise:       { hi: "थोड़ा चले-फिरे आज?", en: "Did you get some exercise or walk today?" },
  pain:           { hi: "कहीं दर्द तो नहीं है?", en: "Are you having any pain?" },
};

function buildMonitoringQuestions(topics: string[], customQuestions: any[], isHindi: boolean): string {
  const questions: string[] = [];
  for (const topic of topics) {
    const label = TOPIC_LABELS[topic];
    if (label) {
      questions.push(isHindi ? label.hi : label.en);
    } else {
      questions.push(isHindi ? `${topic} के बारे में पूछें` : `Ask about ${topic}`);
    }
  }
  for (const q of customQuestions) {
    if (q.question) questions.push(q.question);
  }
  return questions.join(' | ');
}

// Purpose-first medicine formatting so the AI asks about the condition, not brand name
function formatMedicines(medicines: any[], isHindi: boolean): string {
  if (!medicines || medicines.length === 0) {
    return isHindi ? 'कोई दवाई नहीं' : 'No medicines';
  }
  return medicines.map((m: any) => {
    const name = (m.name || '').trim();
    if (!name) return '';
    const purpose = (m.purpose || '').trim();
    if (purpose) {
      return isHindi
        ? `${purpose} ki dawai (${name})`
        : `${purpose} medicine (${name})`;
    }
    return name;
  }).filter(Boolean).join(', ');
}

function getMedicineNamesOnly(medicines: any[]): string {
  if (!medicines || medicines.length === 0) return '';
  return medicines.map((m: any) => (m.name || '').trim()).filter(Boolean).join(', ');
}

function getFirstName(fullName: string) {
  return fullName.split(' ')[0];
}

function buildRetryGreeting(firstName: string, isHindi: boolean): string {
  const dayHash = new Date().getDate() % 2;
  if (isHindi) {
    const options = [
      `${firstName} जी, थोड़ी देर पहले फोन किया था। कैसे हैं आप?`,
      `${firstName} जी, हमने पहले call किया था। अब बात कर सकते हैं?`,
    ];
    return options[dayHash];
  } else {
    const options = [
      `${firstName}, we tried calling a bit earlier. How are you doing?`,
      `Hi ${firstName}, we called earlier. Is this a good time to talk?`,
    ];
    return options[dayHash];
  }
}

// Symptom matching helpers (same as main function)
const normalizeSymptom = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9\s]/gi, '').replace(/\s+/g, ' ').trim();

const getSymptomKeywords = (s: string) => {
  const normalized = normalizeSymptom(s);
  return normalized.split(' ').filter(word =>
    word.length > 2 && !['the', 'and', 'has', 'had', 'was', 'for', 'with'].includes(word)
  );
};

const symptomsMatch = (s1: string, s2: string): boolean => {
  const n1 = normalizeSymptom(s1);
  const n2 = normalizeSymptom(s2);
  if (n1 === n2 || n1.includes(n2) || n2.includes(n1)) return true;
  const k1 = getSymptomKeywords(s1);
  const k2 = getSymptomKeywords(s2);
  const overlap = k1.filter(k => k2.some(kk => kk.includes(k) || k.includes(kk)));
  return overlap.length >= Math.min(k1.length, k2.length) * 0.5 && overlap.length > 0;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Processing call retries...");

    const now = new Date();

    // Find call attempts that need to be retried
    const { data: pendingRetries, error: fetchError } = await supabase
      .from("call_attempts")
      .select(`
        *,
        elders(id, full_name, phone_number, preferred_language, medical_conditions, family_member_id, monitoring_config)
      `)
      .eq("status", "no_answer")
      .not("next_retry_at", "is", null)
      .lte("next_retry_at", now.toISOString())
      .lt("retry_count", 2)
      .order("next_retry_at", { ascending: true })
      .limit(10);

    if (fetchError) {
      console.error("Error fetching pending retries:", fetchError);
      throw fetchError;
    }

    console.log(`Found ${pendingRetries?.length || 0} pending retries`);

    const results: any[] = [];

    for (const attempt of pendingRetries || []) {
      const elder = attempt.elders;
      
      if (!elder) {
        console.log(`Skipping attempt ${attempt.id} - elder not found`);
        continue;
      }

      // ============ DAILY LIMIT CHECK ============
      const todayStart = new Date();
      todayStart.setUTCHours(0, 0, 0, 0);
      
      const { data: todayCalls } = await supabase
        .from("call_attempts")
        .select("id")
        .eq("elder_id", elder.id)
        .gte("created_at", todayStart.toISOString());
      
      const MAX_CALLS_PER_DAY = 3;
      if (todayCalls && todayCalls.length >= MAX_CALLS_PER_DAY) {
        console.log(`DAILY LIMIT REACHED for elder ${elder.id}: ${todayCalls.length} calls. Cancelling retry.`);
        
        await supabase
          .from("call_attempts")
          .update({ status: 'daily_limit_reached', next_retry_at: null })
          .eq("id", attempt.id);
        
        results.push({ elderId: elder.id, elderName: elder.full_name, status: 'daily_limit_reached', callsToday: todayCalls.length });
        continue;
      }

      // DEBOUNCE CHECK
      const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000);
      const { data: recentCalls } = await supabase
        .from("call_attempts")
        .select("id, status, created_at")
        .eq("elder_id", elder.id)
        .in("status", ["initiated", "answered"])
        .gte("created_at", fifteenMinsAgo.toISOString())
        .limit(1);

      if (recentCalls && recentCalls.length > 0) {
        console.log(`Skipping retry for elder ${elder.id} - recent call exists:`, recentCalls[0]);
        await supabase
          .from("call_attempts")
          .update({ next_retry_at: null, status: 'superseded' })
          .eq("id", attempt.id);
        continue;
      }

      // ============ RETRY COUNT VALIDATION ============
      const currentRetryCount = attempt.retry_count || 0;
      const maxRetries = attempt.max_retries || 2;
      
      if (currentRetryCount >= maxRetries) {
        console.log(`Max retries reached for attempt ${attempt.id}: ${currentRetryCount}/${maxRetries}`);
        await supabase
          .from("call_attempts")
          .update({ status: 'max_retries_reached', next_retry_at: null })
          .eq("id", attempt.id);
        results.push({ elderId: elder.id, elderName: elder.full_name, status: 'max_retries_reached', retryCount: currentRetryCount });
        continue;
      }

      console.log(`Retrying call for elder ${elder.id} (attempt #${currentRetryCount + 1}/${maxRetries})`);

      try {
        const newRetryCount = currentRetryCount + 1;
        
        // Mark as 'retrying' to prevent duplicates
        await supabase
          .from("call_attempts")
          .update({ status: 'retrying', retry_count: newRetryCount, next_retry_at: null })
          .eq("id", attempt.id);

        const BOLNA_API_KEY = Deno.env.get('BOLNA_API_KEY');
        const isHindi = elder.preferred_language === 'hindi';
        const BOLNA_AGENT_ID = isHindi 
          ? Deno.env.get('BOLNA_AGENT_ID_HINDI') 
          : Deno.env.get('BOLNA_AGENT_ID');

        if (!BOLNA_API_KEY || !BOLNA_AGENT_ID) {
          throw new Error('Bolna API credentials not configured');
        }

        // ============ FETCH FULL CONTEXT (matching bolna-voice-call) ============
        
        // 1. Fetch medicines
        const { data: medicines } = await supabase
          .from("medicines")
          .select("name, dosage, timing, purpose")
          .eq("elder_id", elder.id)
          .eq("active", true);

        const medicineList = formatMedicines(medicines || [], isHindi);
        const medicineNamesOnly = getMedicineNamesOnly(medicines || []);

        // 2. Fetch last 7 check-ins for context
        const { data: previousCheckIns } = await supabase
          .from("check_ins")
          .select("created_at, symptoms_reported, conversation_summary, well_being_score, medicines_taken, sentiment")
          .eq("elder_id", elder.id)
          .order("created_at", { ascending: false })
          .limit(7);

        // 3. Build recent call summaries (last 3)
        const recentCallSummaries = (previousCheckIns || [])
          .slice(0, 3)
          .map(c => {
            const date = new Date(c.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
            return `[${date}] ${c.conversation_summary || 'No summary'}`;
          })
          .join('\n');

        // 4. Get resolved symptoms to filter active ones
        const { data: resolvedSymptomsData } = await supabase
          .from("resolved_symptoms")
          .select("symptom, resolved_at")
          .eq("elder_id", elder.id);
        const resolvedSymptomsList = resolvedSymptomsData || [];

        // 5. Track symptoms with recency, sort by most recent first
        const symptomRecencyMap = new Map<string, string>();
        previousCheckIns?.forEach(checkIn => {
          if (checkIn.symptoms_reported && checkIn.symptoms_reported.length > 0) {
            for (const symptom of checkIn.symptoms_reported) {
              const normalized = normalizeSymptom(symptom);
              const existing = symptomRecencyMap.get(normalized);
              if (!existing || new Date(checkIn.created_at) > new Date(existing)) {
                symptomRecencyMap.set(normalized, checkIn.created_at);
              }
            }
          }
        });

        const sortedSymptoms = [...symptomRecencyMap.entries()]
          .sort((a, b) => new Date(b[1]).getTime() - new Date(a[1]).getTime())
          .map(([symptom]) => symptom);

        const activeSymptoms = sortedSymptoms.filter(symptom => {
          return !resolvedSymptomsList.some(resolved => symptomsMatch(symptom, resolved.symptom));
        });

        // 6. Calculate symptom duration
        const symptomDaysMap: Record<string, number> = {};
        for (const symptom of activeSymptoms.slice(0, 3)) {
          const earliestWithSymptom = previousCheckIns
            ?.filter(c => c.symptoms_reported?.some((s: string) => symptomsMatch(s, symptom)))
            .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())[0];
          if (earliestWithSymptom) {
            symptomDaysMap[symptom] = Math.floor((now.getTime() - new Date(earliestWithSymptom.created_at).getTime()) / (1000 * 60 * 60 * 24));
          }
        }

        const activeSymptomsList = activeSymptoms.length > 0 ? activeSymptoms.slice(0, 2).join(', ') : '';
        const symptomDaysFormatted = Object.entries(symptomDaysMap).map(([s, d]) => `${s}:${d}`).join(', ');

        // 7. Fetch caregiver info
        const { data: notifSettings } = await supabase
          .from("notification_settings")
          .select("caregiver_name, caregiver_phone, caregiver_relation")
          .eq("elder_id", elder.id)
          .single();

        const hasCaregiverFlag = !!(notifSettings?.caregiver_name && notifSettings?.caregiver_phone);
        const caregiverName = notifSettings?.caregiver_name || '';
        const caregiverRelation = notifSettings?.caregiver_relation || '';

        // 8. Build monitoring questions
        const monitoringConfig = elder.monitoring_config || { topics: [], custom_questions: [] };
        const monitoringQuestions = buildMonitoringQuestions(
          monitoringConfig.topics || [], monitoringConfig.custom_questions || [], isHindi
        );

        // 9. Build symptom follow-up instruction
        let symptomFollowup = '';
        if (activeSymptoms.length > 0) {
          const topSymptom = activeSymptoms[0];
          const daysAgo = symptomDaysMap[topSymptom] || 0;
          const timeDesc = daysAgo === 0 ? 'today' : daysAgo === 1 ? 'yesterday' : `${daysAgo} days ago`;
          if (isHindi) {
            symptomFollowup = `MANDATORY: पहले "${topSymptom}" के बारे में पूछें (${timeDesc} बताया था)। दवाई के बारे में पूछने से पहले ये पूछें।`;
          } else {
            symptomFollowup = `MANDATORY: Ask about "${topSymptom}" first (reported ${timeDesc}). Ask this BEFORE asking about medicines.`;
          }
        }

        // 10. Generate AI briefing
        let briefing = '';
        const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
        
        if (LOVABLE_API_KEY) {
          try {
            console.log(`Generating AI briefing for retry call to ${elder.full_name}...`);
            
            const actualMedicineNames = (medicines || []).map((m: any) => m.name).filter(Boolean);
            const medicineNameConstraint = actualMedicineNames.length > 0
              ? `ALLOWED MEDICINE NAMES (use ONLY these exact names, never substitute): ${actualMedicineNames.join(', ')}`
              : 'No medicines prescribed — do not mention any medicine names.';

            const briefingLang = isHindi ? 'Hindi (Hinglish is fine)' : 'English';

            const metaPrompt = `Write exactly 3 short bullet points for a voice agent about to RETRY a call to ${getFirstName(elder.full_name)}. The first attempt went unanswered. Max 50 words total.

CONTEXT:
- ${medicineNameConstraint}
- Active symptoms: ${activeSymptomsList || 'None'}
- Symptom days: ${symptomDaysFormatted || 'None'}
- Monitoring topics: ${monitoringQuestions || 'None'}
- Last 3 calls:
${(previousCheckIns || []).slice(0, 3).map(c => `  ${new Date(c.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}: Score ${c.well_being_score}/10, Meds: ${c.medicines_taken ?? '?'}, ${c.conversation_summary || 'No details'}`).join('\n')}

RULES:
• Bullet 1: What happened last call (one sentence).
• Bullet 2: What to ask today — pick ONE medicine from the ALLOWED list above OR one symptom to follow up. NEVER use a medicine name not in the allowed list.
• Bullet 3: One conversation starter if they give brief answers.
• Max 50 words total. No paragraphs. No explanations.
• CRITICAL: Do NOT invent or substitute medicine names. Only use names from the ALLOWED list above.
• Language: ${briefingLang}`;

            const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${LOVABLE_API_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: "google/gemini-2.5-flash",
                messages: [{ role: "user", content: metaPrompt }],
              }),
            });

            if (aiResponse.ok) {
              const aiData = await aiResponse.json();
              briefing = aiData.choices?.[0]?.message?.content?.trim() || '';
              
              // Post-processing: medicine hallucination validator
              if (actualMedicineNames.length > 0 && briefing) {
                const actualNamesLower = actualMedicineNames.map((n: string) => n.toLowerCase().trim());
                const commonWords = new Set([
                  'the', 'and', 'for', 'with', 'was', 'has', 'had', 'are', 'his', 'her',
                  'how', 'did', 'not', 'but', 'ask', 'about', 'check', 'last', 'call',
                  'today', 'yesterday', 'score', 'taken', 'said', 'fine', 'well', 'good',
                  'feeling', 'pain', 'sleep', 'mood', 'meals', 'water', 'exercise',
                  'medicine', 'medicines', 'medication', 'medications', 'meds', 'tablet',
                  'dose', 'dosage', 'prescribed', 'doctor', 'follow', 'blood', 'pressure',
                  'sugar', 'test', 'report', 'none', 'summary', 'bullet', 'conversation',
                  'starter', 'brief', 'answers', 'one', 'two', 'three', 'first', 'second',
                  'sentio', 'hello', 'namaste', 'what', 'when', 'where', 'who', 'which',
                  'they', 'them', 'that', 'this', 'from', 'been', 'being', 'have', 'will',
                  'would', 'could', 'should', 'just', 'also', 'only', 'still', 'some',
                  'any', 'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other',
                  'such', 'than', 'then', 'very', 'much', 'many', 'same', 'make', 'take',
                ]);

                const capsWordRegex = /\b([A-Z][a-z]{2,}(?:\s*[A-Z][a-z]*)*)\b/g;
                let match;
                const suspectWords: string[] = [];
                while ((match = capsWordRegex.exec(briefing)) !== null) {
                  const word = match[1].trim();
                  const wordLower = word.toLowerCase();
                  if (!commonWords.has(wordLower) && !actualNamesLower.some(n => n.includes(wordLower) || wordLower.includes(n))) {
                    const pharmaSuffixes = ['in', 'ol', 'ide', 'ine', 'ate', 'one', 'ium', 'cin', 'min', 'tin', 'pril', 'tan', 'mab'];
                    const looksLikeMedicine = pharmaSuffixes.some(s => wordLower.endsWith(s)) || wordLower.length >= 5;
                    if (looksLikeMedicine) {
                      suspectWords.push(word);
                    }
                  }
                }

                for (const suspect of suspectWords) {
                  console.warn(`RETRY BRIEFING HALLUCINATION: "${suspect}" not in [${actualMedicineNames.join(', ')}]. Replacing.`);
                  const regex = new RegExp(`\\b${suspect}\\b`, 'gi');
                  briefing = briefing.replace(regex, actualMedicineNames[0]);
                }
              }
              
              console.log('Retry AI briefing generated:', briefing.substring(0, 100) + '...');
            } else {
              console.error('Retry AI briefing failed:', aiResponse.status);
            }
          } catch (briefingError) {
            console.error('Error generating retry briefing:', briefingError);
          }
        }

        // ============ BUILD FULL user_data (matching bolna-voice-call) ============
        const firstName = getFirstName(elder.full_name);
        const greeting = buildRetryGreeting(firstName, isHindi);

        // Build new concern prompt
        const newConcernPrompt = isHindi 
          ? "कोई नई तकलीफ़ तो नहीं है?"
          : "Any new health concern today?";

        // Build wellbeing question (rotated) — used when no monitoring topics configured
        const wellbeingQuestions = isHindi
          ? [
              "मन कैसा है आज? खुश हैं?",
              "रात को नींद कैसी आई?",
              "अकेला तो नहीं लगता? कोई मिलने आता है?",
            ]
          : [
              "How's your mood today? Feeling okay?",
              "How did you sleep last night?",
              "Do you feel lonely sometimes? Does anyone visit you?",
            ];
        const dayHash = new Date().getDate() % wellbeingQuestions.length;
        const wellbeingQuestion = wellbeingQuestions[dayHash];


        const userData = {
          elder_id: elder.id,
          first_name: firstName,
          greeting: greeting,
          briefing: briefing,
          medicines: medicineList,
          medicine_names_only: medicineNamesOnly,
          active_symptoms: activeSymptomsList,
          symptom_followup: symptomFollowup,
          symptom_days: symptomDaysFormatted,
          recent_calls: recentCallSummaries.substring(0, 500),
          monitoring_topics: monitoringTopicsWithMandatoryClose,
          new_concern_prompt: newConcernPrompt,
          wellbeing_question: wellbeingQuestion,
          is_emergency: "false",
          has_caregiver: hasCaregiverFlag ? "true" : "false",
          caregiver_name: caregiverName,
          caregiver_relation: caregiverRelation,
          preferred_language: elder.preferred_language || 'english',
          is_retry: true,
          retry_attempt: newRetryCount,
        };

        console.log('Sending retry user_data to Bolna:', JSON.stringify(userData));

        // Call Bolna API
        const bolnaResponse = await fetch('https://api.bolna.ai/call', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${BOLNA_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            agent_id: BOLNA_AGENT_ID,
            recipient_phone_number: elder.phone_number,
            user_data: userData,
          }),
        });

        if (!bolnaResponse.ok) {
          const error = await bolnaResponse.text();
          throw new Error(`Bolna API error: ${error}`);
        }

        const callData = await bolnaResponse.json();
        const newExecutionId = callData.execution_id || callData.call_id || callData.id;
        
        await supabase
          .from("call_attempts")
          .update({ status: 'initiated', execution_id: newExecutionId, initiated_at: new Date().toISOString() })
          .eq("id", attempt.id);

        console.log(`Retry call initiated for elder ${elder.id}, execution_id: ${newExecutionId}, using SAME record ${attempt.id}`);

        results.push({
          elderId: elder.id,
          elderName: elder.full_name,
          attemptNumber: newRetryCount,
          status: 'call_initiated',
          executionId: newExecutionId,
          callAttemptId: attempt.id
        });

      } catch (callError) {
        console.error(`Error processing retry for ${elder.full_name}:`, callError);
        
        await supabase
          .from("call_attempts")
          .update({ 
            status: 'failed',
            next_retry_at: null,
            failure_reason: callError instanceof Error ? callError.message.substring(0, 200) : 'Unknown retry error',
          })
          .eq("id", attempt.id);
          
        results.push({
          elderId: elder.id,
          elderName: elder.full_name,
          status: 'error',
          error: callError instanceof Error ? callError.message : 'Unknown error'
        });
      }
    }

    console.log(`Processed ${results.length} retries`);

    return new Response(
      JSON.stringify({ success: true, processed: results.length, results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Process call retries error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
