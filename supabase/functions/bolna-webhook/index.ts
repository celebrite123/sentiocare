import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const responseHeaders = {
  "Content-Type": "application/json",
};

// Security: Validate webhook request has a valid, unexpired correlation token
async function validateWebhookRequest(
  supabase: any,
  executionId: string | null,
  elderId: string | null
): Promise<{ valid: boolean; callAttempt: any | null; error?: string }> {
  if (!executionId && !elderId) {
    return { valid: false, callAttempt: null, error: "No execution_id or elder_id provided" };
  }

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  
  if (executionId) {
    const { data: attempt, error } = await supabase
      .from("call_attempts")
      .select("*")
      .eq("execution_id", executionId)
      .gte("created_at", oneHourAgo.toISOString())
      .single();
    
    if (attempt) {
      return { valid: true, callAttempt: attempt };
    }
    console.log("No call_attempt found for execution_id:", executionId, error?.message);
  }

  if (elderId) {
    const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000);
    const { data: recentAttempt, error } = await supabase
      .from("call_attempts")
      .select("*")
      .eq("elder_id", elderId)
      .eq("status", "initiated")
      .gte("created_at", thirtyMinsAgo.toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    
    if (recentAttempt) {
      console.log("Found call_attempt by elder_id fallback:", recentAttempt.id);
      return { valid: true, callAttempt: recentAttempt };
    }
    console.log("No recent call_attempt for elder_id:", elderId, error?.message);
  }

  return { valid: false, callAttempt: null, error: "No matching call_attempt found - request rejected" };
}

function parseTranscript(rawTranscript: string): Array<{role: string, message: string}> {
  if (!rawTranscript || typeof rawTranscript !== 'string') return [];

  const parsedLogs: Array<{role: string, message: string}> = [];
  const prefixPattern = /^(assistant|ai|agent|user|elder|sentio):\s*/i;
  const lines = rawTranscript.split(/\n+/).filter(l => l.trim());
  
  if (lines.some(line => prefixPattern.test(line.trim()))) {
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;
      const match = trimmedLine.match(prefixPattern);
      if (match) {
        const rolePrefix = match[1].toLowerCase();
        const isAI = ['assistant', 'ai', 'agent', 'sentio'].includes(rolePrefix);
        const message = trimmedLine.replace(prefixPattern, '').trim();
        if (message) parsedLogs.push({ role: isAI ? 'assistant' : 'user', message });
      } else if (parsedLogs.length > 0) {
        parsedLogs[parsedLogs.length - 1].message += ' ' + trimmedLine;
      }
    }
  }
  
  if (parsedLogs.length === 0 && rawTranscript.includes('"speaker"')) {
    try {
      const jsonMatch = rawTranscript.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const turns = JSON.parse(jsonMatch[0]);
        for (const turn of turns) {
          const isAI = ['assistant', 'ai', 'agent', 'sentio', 'bot'].includes(String(turn.speaker || turn.role || '').toLowerCase());
          const message = String(turn.text || turn.message || turn.content || '').trim();
          if (message) parsedLogs.push({ role: isAI ? 'assistant' : 'user', message });
        }
      }
    } catch (e) { /* ignore */ }
  }
  
  if (parsedLogs.length === 0) {
    const bracketPattern = /\[(assistant|ai|agent|user|elder|sentio|caller|callee)\]/i;
    const parts = rawTranscript.split(bracketPattern).filter(p => p.trim());
    let currentRole = 'user';
    for (const part of parts) {
      const lowerPart = part.toLowerCase().trim();
      if (['assistant', 'ai', 'agent', 'sentio', 'callee'].includes(lowerPart)) {
        currentRole = 'assistant';
      } else if (['user', 'elder', 'caller'].includes(lowerPart)) {
        currentRole = 'user';
      } else {
        const message = part.trim();
        if (message) parsedLogs.push({ role: currentRole, message });
      }
    }
  }
  
  if (parsedLogs.length === 0 && lines.length > 1) {
    let isAI = true;
    for (const line of lines) {
      const message = line.trim();
      if (message) { parsedLogs.push({ role: isAI ? 'assistant' : 'user', message }); isAI = !isAI; }
    }
  }
  
  if (parsedLogs.length === 0 && rawTranscript.trim()) {
    parsedLogs.push({ role: 'assistant', message: rawTranscript.trim().substring(0, 5000) });
  }
  
  return parsedLogs;
}

// Send daily check-in confirmation to caregiver via WhatsApp
async function sendCaregiverDailyConfirmation(
  supabase: any,
  elderId: string,
  analysis: any,
  elderName: string,
  isHindi: boolean
) {
  try {
    const { data: settings } = await supabase
      .from("notification_settings")
      .select("caregiver_name, caregiver_phone")
      .eq("elder_id", elderId)
      .single();

    if (!settings?.caregiver_phone) return;

    const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
    const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
    const TWILIO_WHATSAPP_NUMBER = Deno.env.get("TWILIO_WHATSAPP_NUMBER");
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_WHATSAPP_NUMBER) return;

    const firstName = elderName?.split(' ')[0] || 'Elder';
    const caregiverName = settings.caregiver_name?.split(' ')[0] || '';
    const score = analysis.wellBeingScore || '?';
    const medsTaken = analysis.medicinesTaken;
    const symptoms = (analysis.symptomsReported || []).length > 0
      ? (analysis.symptomsReported || []).slice(0, 2).join(', ')
      : null;

    let message: string;
    if (isHindi) {
      const medsText = medsTaken === true ? 'दवाई ली ✅' : medsTaken === false ? 'दवाई नहीं ली ❌' : '';
      const symptomText = symptoms ? `तकलीफ: ${symptoms}` : 'कोई तकलीफ नहीं 😊';
      message = `✅ ${caregiverName} जी, ${firstName} जी की check-in हो गई।\n📊 Score: ${score}/10\n💊 ${medsText}\n${symptomText}`;
    } else {
      const medsText = medsTaken === true ? 'Medicines taken ✅' : medsTaken === false ? 'Medicines NOT taken ❌' : '';
      const symptomText = symptoms ? `Concerns: ${symptoms}` : 'No concerns 😊';
      message = `✅ ${caregiverName}, ${firstName}'s check-in is done.\n📊 Score: ${score}/10\n💊 ${medsText}\n${symptomText}`;
    }

    const formattedPhone = settings.caregiver_phone.startsWith("+")
      ? settings.caregiver_phone
      : `+91${settings.caregiver_phone.replace(/^0+/, "")}`;

    const twilioRes = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
      {
        method: "POST",
        headers: {
          "Authorization": `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          From: `whatsapp:${TWILIO_WHATSAPP_NUMBER}`,
          To: `whatsapp:${formattedPhone}`,
          Body: message,
        }),
      }
    );
    if (twilioRes.ok) {
      console.log("Daily check-in confirmation sent to caregiver");
    } else {
      const errBody = await twilioRes.text();
      console.error("WhatsApp caregiver confirmation FAILED:", twilioRes.status, errBody);
    }
  } catch (error) {
    console.error("Error sending daily confirmation to caregiver:", error);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200 });
  }

  try {
    const rawPayload = await req.text();
    const payload = JSON.parse(rawPayload);
    
    console.log("Bolna webhook received:", { 
      hasPayload: !!payload,
      status: payload.status,
      hasTranscript: !!payload.transcript
    });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { 
      call_id, execution_id, status, transcript, duration,
      hangup_reason, call_analysis, context_details, telephony_data,
      conversation_duration,
    } = payload;

    const user_data = payload.user_data;
    const actualExecutionId = execution_id || call_id || payload.id;

    const normalizedStatus = String(status || '').toLowerCase().replace(/_/g, '-');
    const isCallEnded = ['completed', 'ended', 'failed', 'no-answer', 'busy', 'canceled', 'cancelled'].includes(normalizedStatus);
    
    if (!isCallEnded) {
      console.log(`Call status update: ${status} for call ${actualExecutionId}`);
      return new Response(JSON.stringify({ success: true, status }), { headers: responseHeaders });
    }

    const elderId = 
      context_details?.recipient_data?.elder_id ||
      context_details?.user_data?.elder_id ||
      user_data?.elder_id ||
      payload.recipient_data?.elder_id ||
      payload.metadata?.elder_id ||
      payload.elder_id;
    
    console.log("Extracted elder_id:", elderId, "execution_id:", actualExecutionId);

    // SECURITY: Validate webhook request
    const validation = await validateWebhookRequest(supabase, actualExecutionId, elderId);
    
    if (!validation.valid) {
      console.error("SECURITY: Webhook request validation failed:", validation.error);
      return new Response(JSON.stringify({ 
        success: false, error: "Unauthorized - no matching call record found"
      }), { status: 403, headers: responseHeaders });
    }

    let callAttempt = validation.callAttempt;
    
    if (callAttempt && actualExecutionId && callAttempt.execution_id !== actualExecutionId) {
      await supabase
        .from("call_attempts")
        .update({ execution_id: actualExecutionId })
        .eq("id", callAttempt.id);
    }

    const callDuration = conversation_duration || duration || 0;
    const transcriptLength = transcript?.length || 0;
    const wasAnswered = (
      normalizedStatus === 'completed' || 
      normalizedStatus === 'ended' ||
      callDuration > 30 || 
      transcriptLength > 50
    );

    const normalizedHangup = String(hangup_reason || '').toLowerCase().replace(/_/g, '-');
    const wasNoAnswer = (
      normalizedStatus === 'no-answer' || 
      normalizedStatus === 'busy' ||
      normalizedStatus === 'failed' ||
      normalizedStatus === 'canceled' ||
      normalizedStatus === 'cancelled' ||
      normalizedHangup === 'no-answer' ||
      normalizedHangup === 'busy' ||
      normalizedHangup === 'timeout' ||
      (callDuration < 15 && transcriptLength < 20)
    );

    const expectedMinTranscript = callDuration * 3;
    const wasSilentCall = wasAnswered && callDuration > 30 && transcriptLength < expectedMinTranscript && transcriptLength < 100;
    
    if (wasSilentCall) {
      console.warn("SILENT CALL DETECTED:", { callDuration, transcriptLength, expectedMin: expectedMinTranscript, executionId: actualExecutionId });
    }

    console.log("Call analysis:", { wasAnswered, wasNoAnswer, wasSilentCall, status, callDuration, transcriptLength, hasAttempt: !!callAttempt });

    // Handle retry logic for unanswered calls
    if (callAttempt && !wasAnswered && wasNoAnswer) {
      const retryCount = callAttempt.retry_count || 0;
      const maxRetries = callAttempt.max_retries || 2;

      console.log("Call not answered - handling retry logic:", { retryCount, maxRetries });

      if (retryCount < maxRetries) {
        const nextRetryMinutes = retryCount === 0 ? 10 : 120;
        const nextRetryAt = new Date(Date.now() + nextRetryMinutes * 60 * 1000);

        const failureReason = normalizedHangup || normalizedStatus || 'unknown';

        await supabase
          .from("call_attempts")
          .update({
            status: 'no_answer',
            completed_at: new Date().toISOString(),
            retry_count: retryCount + 1,
            next_retry_at: nextRetryAt.toISOString(),
            failure_reason: failureReason,
          })
          .eq("id", callAttempt.id);

        console.log(`Retry scheduled for ${nextRetryMinutes} minutes from now`);

        if (retryCount === 0 && elderId) {
          await sendMissedCallNotifications(supabase, elderId);
        }

        return new Response(JSON.stringify({ 
          success: true, message: "Call not answered, retry scheduled",
          nextRetryAt: nextRetryAt.toISOString()
        }), { headers: responseHeaders });

      } else {
        const failureReason = normalizedHangup || normalizedStatus || 'max_retries_exhausted';
        await supabase
          .from("call_attempts")
          .update({
            status: 'failed',
            completed_at: new Date().toISOString(),
            next_retry_at: null,
            notification_sent: true,
            failure_reason: failureReason,
          })
          .eq("id", callAttempt.id);

        if (elderId) {
          await sendFinalFailureAlert(supabase, elderId, supabaseUrl, supabaseKey);
        }

        console.log("Max retries reached, final alert sent");
        return new Response(JSON.stringify({ 
          success: true, message: "Max retries reached, alert sent"
        }), { headers: responseHeaders });
      }
    }

    // Mark call attempt as answered
    if (callAttempt && wasAnswered) {
      await supabase
        .from("call_attempts")
        .update({
          status: 'answered',
          completed_at: new Date().toISOString(),
          next_retry_at: null
        })
        .eq("id", callAttempt.id);
    }

    if (!elderId) {
      console.error("No elder ID found in payload. Available keys:", Object.keys(payload));
      return new Response(JSON.stringify({ 
        success: false, message: "No elder ID found in webhook payload",
      }), { headers: responseHeaders });
    }

    const recordingUrl = telephony_data?.recording_url || payload.recording_url || null;
    const rawTranscript = transcript || '';

    // AI transcript analysis
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    let analysis = {
      sentiment: "neutral",
      wellBeingScore: 7,
      medicinesTaken: true,
      symptomsReported: [] as string[],
      resolvedSymptoms: [] as string[],
      alertTriggered: false,
      alertReason: null as string | null,
      monitoringResponses: {} as Record<string, any>,
    };

    if (lovableApiKey && transcript) {
      try {
        console.log("Analyzing transcript with AI...");
        
        const { data: elderData } = await supabase
          .from("elders")
          .select("monitoring_config")
          .eq("id", elderId)
          .single();
        
        const monitoringConfig = elderData?.monitoring_config || { topics: [], custom_questions: [] };
        const monitoringTopics = monitoringConfig.topics || [];
        const customQuestions = monitoringConfig.custom_questions || [];
        
        let monitoringInstructions = '';
        if (monitoringTopics.length > 0 || customQuestions.length > 0) {
          monitoringInstructions = `

MONITORING TOPICS TO EXTRACT:
${monitoringTopics.map((t: string) => `- ${t}`).join('\n') || 'None'}

CUSTOM QUESTIONS TO EXTRACT ANSWERS FOR:
${customQuestions.map((q: any) => `- "${q.question}" (type: ${q.type})`).join('\n') || 'None'}

For each monitoring topic and custom question, extract the elder's response if discussed.
Return in "monitoringResponses" object with topic/question as key and response as value.`;
        }
        
        const analysisPrompt = `You are an AI health analyst for Sentio, an elder care check-in system. Analyze this call transcript carefully.

EMERGENCY KEYWORDS TO CHECK (CRITICAL):
- Chest pain, heart pain, heart attack
- Difficulty breathing, can't breathe
- Fainting, collapse, fell down
- Severe pain (rating 7+)
- "I want to die", "don't want to live"

SYMPTOM TRACKING (IMPORTANT):
1. NEW symptoms mentioned for the first time → Add to "symptomsReported"
2. EXISTING symptoms that elder says are BETTER/RESOLVED → Add to "resolvedSymptoms"
3. EXISTING symptoms with STATUS UPDATE (better/same/worse) → Add to "symptomUpdates"

RESOLUTION DETECTION PHRASES:
Hindi: "ठीक हो गया", "अब ठीक है", "बेहतर है", "कम हो गया"
English: "better now", "resolved", "gone", "no more", "fine now", "improved"

PROLONGED SYMPTOM CHECK:
If a symptom has persisted 5+ days without improvement → Set "prolongedSymptomAlert": true
${monitoringInstructions}

Respond ONLY in valid JSON format:
{
  "sentiment": "positive|neutral|negative",
  "wellBeingScore": 1-10,
  "medicinesTaken": true|false,
  "symptomsReported": ["NEW symptoms only"],
  "resolvedSymptoms": ["symptoms elder confirmed are better"],
  "symptomUpdates": {"symptom_name": "better|same|worse"},
  "prolongedSymptomAlert": true|false,
  "alertTriggered": true|false,
  "alertReason": "reason or null",
  "emergencyDetected": true|false,
  "mentalHealthConcern": true|false,
  "monitoringResponses": {"topic_or_question": "response_value"}
}`;

        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${lovableApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: analysisPrompt },
              { role: "user", content: `Analyze this call transcript:\n\n${transcript}` },
            ],
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const content = aiData.choices?.[0]?.message?.content;
          if (content) {
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              analysis = JSON.parse(jsonMatch[0]);
              console.log("Parsed analysis:", analysis);
            }
          }
        }
      } catch (aiError) {
        console.error("AI analysis error:", aiError);
      }
    }

    // Post-analysis validation
    if (!analysis.alertTriggered) {
      if (analysis.wellBeingScore <= 3) {
        analysis.alertTriggered = true;
        analysis.alertReason = `Low well-being score (${analysis.wellBeingScore}/10)`;
      } else if (analysis.medicinesTaken === false) {
        analysis.alertTriggered = true;
        analysis.alertReason = "Medicines not taken as scheduled";
      }
    }

    const prolongedSymptomAlert = (analysis as any).prolongedSymptomAlert || false;
    if (prolongedSymptomAlert && !analysis.alertTriggered) {
      analysis.alertTriggered = true;
      analysis.alertReason = "Symptom persisting for 5+ days - doctor consultation recommended";
    }

    // Save resolved symptoms
    const resolvedSymptoms = (analysis as any).resolvedSymptoms || [];
    if (resolvedSymptoms.length > 0) {
      for (const symptom of resolvedSymptoms) {
        const normalizedSymptom = symptom.toLowerCase().trim();
        const { data: existing } = await supabase
          .from("resolved_symptoms")
          .select("id")
          .eq("elder_id", elderId)
          .ilike("symptom", `%${normalizedSymptom}%`)
          .limit(1);
        
        if (!existing || existing.length === 0) {
          await supabase.from("resolved_symptoms").insert({
            elder_id: elderId,
            symptom: normalizedSymptom,
            reported_at: new Date().toISOString(),
            resolved_at: new Date().toISOString(),
            resolution_note: `Confirmed resolved during voice check-in`,
          });
          console.log(`Marked symptom as resolved: ${normalizedSymptom}`);
        }
      }
    }

    // Filter out resolved symptoms from new reports
    const { data: allResolvedSymptoms } = await supabase
      .from("resolved_symptoms")
      .select("symptom")
      .eq("elder_id", elderId);
    
    const resolvedSymptomSet = new Set(
      (allResolvedSymptoms || []).map(r => r.symptom.toLowerCase().trim())
    );
    
    const filteredSymptoms = (analysis.symptomsReported || []).filter((s: string) => {
      const normalized = s.toLowerCase().trim();
      const isResolved = Array.from(resolvedSymptomSet).some(resolved => 
        normalized.includes(resolved) || resolved.includes(normalized)
      );
      if (isResolved) console.log(`Filtering out resolved symptom from report: ${s}`);
      return !isResolved;
    });
    
    analysis.symptomsReported = filteredSymptoms;

    // Save check-in
    const { data: checkIn, error: checkInError } = await supabase
      .from("check_ins")
      .insert({
        elder_id: elderId,
        check_in_type: "voice",
        status: wasAnswered ? "completed" : "failed",
        sentiment: analysis.sentiment,
        well_being_score: analysis.wellBeingScore,
        medicines_taken: analysis.medicinesTaken,
        symptoms_reported: analysis.symptomsReported,
        conversation_summary: transcript?.substring(0, 500) || hangup_reason || `Call ${status}`,
        raw_transcript: rawTranscript,
        monitoring_responses: analysis.monitoringResponses || {},
        alert_triggered: analysis.alertTriggered,
        alert_reason: analysis.alertReason,
        recording_url: recordingUrl,
      })
      .select()
      .single();

    if (checkInError) {
      console.error("Error saving check-in:", checkInError);
      return new Response(JSON.stringify({ success: false, error: checkInError.message }), {
        status: 500, headers: responseHeaders,
      });
    }

    // Create alert if needed
    if (analysis.alertTriggered) {
      const isEmergency = (analysis as any).emergencyDetected || false;
      const isMentalHealth = (analysis as any).mentalHealthConcern || false;
      const isProlongedSymptom = (analysis as any).prolongedSymptomAlert || false;
      let severity = "medium";
      
      if (isEmergency || isMentalHealth || analysis.wellBeingScore <= 2) {
        severity = "critical";
      } else if (analysis.wellBeingScore <= 3) {
        severity = "high";
      } else if (isProlongedSymptom) {
        severity = "medium";
      }

      const alertTitle = isEmergency ? "Emergency Detected" : 
               isProlongedSymptom ? "Prolonged Symptom - Needs Attention" :
               analysis.wellBeingScore <= 3 ? "Low Well-being Detected" : 
               "Health Concern Detected";

      await supabase.from("alerts").insert({
        elder_id: elderId,
        title: alertTitle,
        description: analysis.alertReason,
        severity: severity,
        alert_type: isEmergency ? "emergency" : isProlongedSymptom ? "prolonged_symptom" : "health",
      });

      if (severity === "high" || severity === "critical") {
        await fetch(`${supabaseUrl}/functions/v1/notify-caregiver`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({
            elderId: elderId,
            alertType: isEmergency ? "emergency" : "health",
            severity: severity,
            title: analysis.alertReason,
            description: transcript?.substring(0, 200) || "Health concern detected during voice check-in",
            initiateCall: severity === "critical" || severity === "high",
          }),
        });
      }
    }

    // Parse and save conversation logs
    if (rawTranscript) {
      const parsedLogs = parseTranscript(rawTranscript);
      console.log(`Parsed ${parsedLogs.length} conversation turns from transcript`);
      
      for (const log of parsedLogs) {
        if (log.message.trim()) {
          await supabase.from("conversation_logs").insert({
            check_in_id: checkIn.id,
            role: log.role,
            message: log.message.trim(),
          });
        }
      }
    }

    // ============ DAILY CAREGIVER CONFIRMATION ============
    // Send a brief WhatsApp summary to caregiver after every successful check-in
    if (wasAnswered && !wasSilentCall) {
      const { data: elderInfo } = await supabase
        .from("elders")
        .select("full_name, preferred_language")
        .eq("id", elderId)
        .single();
      
      if (elderInfo) {
        await sendCaregiverDailyConfirmation(
          supabase,
          elderId,
          analysis,
          elderInfo.full_name,
          elderInfo.preferred_language === 'hindi'
        );
      }
    }
    // ============ END DAILY CAREGIVER CONFIRMATION ============

    return new Response(
      JSON.stringify({ 
        success: true, checkInId: checkIn.id, analysis, recordingUrl, callDuration 
      }),
      { headers: responseHeaders }
    );

  } catch (error: unknown) {
    console.error("Webhook error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: responseHeaders,
    });
  }
});

// Send WhatsApp notifications when elder doesn't answer
async function sendMissedCallNotifications(supabase: any, elderId: string) {
  const { data: elder } = await supabase
    .from("elders")
    .select("full_name, preferred_language, whatsapp_number, phone_number")
    .eq("id", elderId)
    .single();

  const { data: settings } = await supabase
    .from("notification_settings")
    .select("caregiver_name, caregiver_phone")
    .eq("elder_id", elderId)
    .single();

  if (!elder) return;

  const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
  const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
  const TWILIO_WHATSAPP_NUMBER = Deno.env.get("TWILIO_WHATSAPP_NUMBER");
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_WHATSAPP_NUMBER) return;

  const isHindi = elder.preferred_language === 'hindi';
  const firstName = elder.full_name?.split(' ')[0] || 'जी';

  const elderPhone = elder.whatsapp_number || elder.phone_number;
  if (elderPhone) {
    const elderMessage = isHindi
      ? `🙏 ${firstName} जी, हमने आपको कॉल किया था पर जवाब नहीं मिला। सब ठीक है? कृपया जवाब दें या हम वापस कॉल करेंगे। 💚`
      : `Hi ${firstName}! 👋 We tried calling but couldn't reach you. Is everything okay? Please reply or we'll try calling again. 💚`;

    const formattedElderPhone = elderPhone.startsWith("+") ? elderPhone : `+91${elderPhone.replace(/^0+/, "")}`;

    try {
      await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
        {
          method: "POST",
          headers: {
            "Authorization": `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            From: `whatsapp:${TWILIO_WHATSAPP_NUMBER}`,
            To: `whatsapp:${formattedElderPhone}`,
            Body: elderMessage,
          }),
        }
      );
      console.log("Missed call WhatsApp sent to elder");
    } catch (error) {
      console.error("Error sending WhatsApp to elder:", error);
    }
  }

  if (settings?.caregiver_phone) {
    const caregiverName = settings.caregiver_name?.split(' ')[0] || '';
    const caregiverMessage = isHindi
      ? `🔔 ${caregiverName} जी, ${firstName} जी ने कॉल का जवाब नहीं दिया। हम 10 मिनट में दोबारा कोशिश करेंगे।`
      : `🔔 ${caregiverName}, ${firstName} didn't answer our check-in call. We'll try again in 10 minutes.`;

    const formattedCaregiverPhone = settings.caregiver_phone.startsWith("+") 
      ? settings.caregiver_phone 
      : `+91${settings.caregiver_phone.replace(/^0+/, "")}`;

    try {
      await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
        {
          method: "POST",
          headers: {
            "Authorization": `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            From: `whatsapp:${TWILIO_WHATSAPP_NUMBER}`,
            To: `whatsapp:${formattedCaregiverPhone}`,
            Body: caregiverMessage,
          }),
        }
      );
      console.log("Missed call notification sent to caregiver");
    } catch (error) {
      console.error("Error sending WhatsApp to caregiver:", error);
    }
  }
}

async function sendFinalFailureAlert(supabase: any, elderId: string, supabaseUrl: string, supabaseKey: string) {
  const { data: elder } = await supabase
    .from("elders")
    .select("full_name")
    .eq("id", elderId)
    .single();

  const elderName = elder?.full_name || 'Elder';

  await supabase.from("alerts").insert({
    elder_id: elderId,
    title: "Missed Check-in - Unable to Reach",
    description: `We were unable to reach ${elderName} after 3 call attempts. Please check on them.`,
    severity: "high",
    alert_type: "missed_checkin",
  });

  await fetch(`${supabaseUrl}/functions/v1/notify-caregiver`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${supabaseKey}`,
    },
    body: JSON.stringify({
      elderId: elderId,
      alertType: "missed_checkin",
      severity: "high",
      title: "Unable to reach for check-in",
      description: `${elderName} did not answer after 3 call attempts. Please check on them immediately.`,
      initiateCall: false,
    }),
  });
}
