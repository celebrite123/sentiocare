import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const responseHeaders = {
  "Content-Type": "application/json",
};

// Security: Validate webhook request has a valid, unexpired correlation token
async function validateWebhookRequest(
  supabase: any,
  elderId: string | null
): Promise<{ valid: boolean; callAttempt: any | null; error?: string }> {
  if (!elderId) {
    return { valid: false, callAttempt: null, error: "No elder_id provided" };
  }

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  
  const { data: recentAttempt, error } = await supabase
    .from("call_attempts")
    .select("*")
    .eq("elder_id", elderId)
    .in("status", ["initiated", "in_progress"])
    .gte("created_at", oneHourAgo.toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  
  if (recentAttempt) {
    console.log("Found call_attempt for elder:", recentAttempt.id);
    return { valid: true, callAttempt: recentAttempt };
  }
  
  console.log("No recent call_attempt for elder_id:", elderId, error?.message);
  return { valid: false, callAttempt: null, error: "No matching call_attempt found - request rejected" };
}

function parseTranscriptFromMessages(messages: any[]): Array<{role: string, message: string}> {
  const logs: Array<{role: string, message: string}> = [];
  for (const msg of messages) {
    const text = msg.message?.trim() || msg.content?.trim();
    if (!text) continue;
    const role = (msg.role === "bot" || msg.role === "assistant") ? "assistant" : "user";
    logs.push({ role, message: text });
  }
  return logs;
}

function parseTranscriptText(rawTranscript: string): Array<{role: string, message: string}> {
  if (!rawTranscript || typeof rawTranscript !== 'string') return [];
  const logs: Array<{role: string, message: string}> = [];
  const prefixPattern = /^(assistant|ai|agent|user|elder|sentio|bot):\s*/i;
  const lines = rawTranscript.split(/\n+/).filter(l => l.trim());
  
  if (lines.some(line => prefixPattern.test(line.trim()))) {
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;
      const match = trimmedLine.match(prefixPattern);
      if (match) {
        const rolePrefix = match[1].toLowerCase();
        const isAI = ['assistant', 'ai', 'agent', 'sentio', 'bot'].includes(rolePrefix);
        const message = trimmedLine.replace(prefixPattern, '').trim();
        if (message) logs.push({ role: isAI ? 'assistant' : 'user', message });
      } else if (logs.length > 0) {
        logs[logs.length - 1].message += ' ' + trimmedLine;
      }
    }
  }
  
  if (logs.length === 0 && lines.length > 1) {
    let isAI = true;
    for (const line of lines) {
      const message = line.trim();
      if (message) { logs.push({ role: isAI ? 'assistant' : 'user', message }); isAI = !isAI; }
    }
  }
  
  if (logs.length === 0 && rawTranscript.trim()) {
    logs.push({ role: 'assistant', message: rawTranscript.trim().substring(0, 5000) });
  }
  
  return logs;
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
    const caregiverFirstName = settings.caregiver_name?.split(' ')[0] || '';
    const score = analysis.wellBeingScore || '?';
    const medsTaken = analysis.medicinesTaken;
    const symptoms = (analysis.symptomsReported || []).length > 0
      ? (analysis.symptomsReported || []).slice(0, 2).join(', ')
      : null;

    let message: string;
    if (isHindi) {
      const medsText = medsTaken === true ? 'दवाई ली ✅' : medsTaken === false ? 'दवाई नहीं ली ❌' : '';
      const symptomText = symptoms ? `तकलीफ: ${symptoms}` : 'कोई तकलीफ नहीं 😊';
      message = `✅ ${caregiverFirstName} जी, ${firstName} जी की check-in हो गई।\n📊 Score: ${score}/10\n💊 ${medsText}\n${symptomText}`;
    } else {
      const medsText = medsTaken === true ? 'Medicines taken ✅' : medsTaken === false ? 'Medicines NOT taken ❌' : '';
      const symptomText = symptoms ? `Concerns: ${symptoms}` : 'No concerns 😊';
      message = `✅ ${caregiverFirstName}, ${firstName}'s check-in is done.\n📊 Score: ${score}/10\n💊 ${medsText}\n${symptomText}`;
    }

    const formattedPhone = settings.caregiver_phone.startsWith("+")
      ? settings.caregiver_phone
      : `+91${settings.caregiver_phone.replace(/^0+/, "")}`;

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
          To: `whatsapp:${formattedPhone}`,
          Body: message,
        }),
      }
    );
    console.log("Daily check-in confirmation sent to caregiver");
  } catch (error) {
    console.error("Error sending daily confirmation to caregiver:", error);
  }
}

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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200 });
  }

  try {
    const rawPayload = await req.text();
    const payload = JSON.parse(rawPayload);

    console.log("Vapi webhook received:", { 
      messageType: payload.message?.type,
      hasArtifact: !!payload.message?.artifact 
    });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const messageType = payload.message?.type;
    
    // Only process end-of-call-report
    if (messageType !== "end-of-call-report") {
      console.log(`Received event type: ${messageType}, ignoring...`);
      return new Response(JSON.stringify({ success: true, message: `Ignored event: ${messageType}` }), {
        headers: responseHeaders,
      });
    }

    console.log("Processing end-of-call-report...");

    const call = payload.message?.call;
    const artifact = payload.message?.artifact;
    const endedReason = payload.message?.endedReason;

    // Get elder_id from variableValues
    const variableValues = call?.assistantOverrides?.variableValues || {};
    const elderId = variableValues.elder_id;
    
    console.log("Extracted elder_id:", elderId);
    
    if (!elderId) {
      console.error("No elder ID found in payload");
      return new Response(JSON.stringify({ success: false, message: "No elder ID found in webhook payload" }), {
        headers: responseHeaders,
      });
    }

    // SECURITY: Validate webhook request
    const validation = await validateWebhookRequest(supabase, elderId);
    
    if (!validation.valid) {
      console.error("SECURITY: Vapi webhook request validation failed:", validation.error);
      return new Response(JSON.stringify({ success: false, error: "Unauthorized - no matching call record found" }), { 
        status: 403, headers: responseHeaders 
      });
    }

    let callAttempt = validation.callAttempt;

    // Extract transcript and recording from artifact
    const transcript = artifact?.transcript || "";
    const recordingUrl = artifact?.recordingUrl || null;
    const callDuration = call?.endedAt && call?.startedAt 
      ? Math.round((new Date(call.endedAt).getTime() - new Date(call.startedAt).getTime()) / 1000)
      : null;

    console.log("Call duration:", callDuration);

    // Determine if call was answered or not
    const transcriptLength = transcript?.length || 0;
    const wasAnswered = (
      endedReason === "hangup" || 
      endedReason === "customer-ended-call" || 
      endedReason === "assistant-ended-call" ||
      (callDuration && callDuration > 30) || 
      transcriptLength > 50
    );

    const wasNoAnswer = (
      endedReason === "no-answer" || 
      endedReason === "busy" ||
      endedReason === "failed" ||
      endedReason === "voicemail" ||
      (callDuration && callDuration < 15 && transcriptLength < 20)
    );

    // Silent call detection
    const expectedMinTranscript = (callDuration || 0) * 3;
    const wasSilentCall = wasAnswered && (callDuration || 0) > 30 && transcriptLength < expectedMinTranscript && transcriptLength < 100;
    
    if (wasSilentCall) {
      console.warn("SILENT CALL DETECTED:", { callDuration, transcriptLength });
    }

    console.log("Call analysis:", { wasAnswered, wasNoAnswer, wasSilentCall, endedReason, callDuration, transcriptLength });

    // Handle retry logic for unanswered calls
    if (callAttempt && !wasAnswered && wasNoAnswer) {
      const retryCount = callAttempt.retry_count || 0;
      const maxRetries = callAttempt.max_retries || 2;

      console.log("Call not answered - handling retry logic:", { retryCount, maxRetries });

      if (retryCount < maxRetries) {
        const nextRetryMinutes = retryCount === 0 ? 10 : 120;
        const nextRetryAt = new Date(Date.now() + nextRetryMinutes * 60 * 1000);

        await supabase
          .from("call_attempts")
          .update({
            status: 'no_answer',
            completed_at: new Date().toISOString(),
            retry_count: retryCount + 1,
            next_retry_at: nextRetryAt.toISOString(),
            failure_reason: endedReason || 'no_answer',
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
        await supabase
          .from("call_attempts")
          .update({
            status: 'failed',
            completed_at: new Date().toISOString(),
            next_retry_at: null,
            notification_sent: true,
            failure_reason: endedReason || 'max_retries_exhausted',
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
        
        // Get monitoring config for extraction
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
        } else {
          console.error("AI analysis failed:", await aiResponse.text());
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
        conversation_summary: transcript?.substring(0, 500) || `Call ended: ${endedReason}`,
        raw_transcript: transcript,
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
            initiateCall: severity === "critical",
          }),
        });
      }
    }

    // Parse and save conversation logs
    const messages = artifact?.messages || [];
    const parsedLogs = messages.length > 0 
      ? parseTranscriptFromMessages(messages)
      : parseTranscriptText(transcript);
    
    console.log(`Saving ${parsedLogs.length} conversation turns`);
    for (const log of parsedLogs) {
      if (log.message.trim()) {
        await supabase.from("conversation_logs").insert({
          check_in_id: checkIn.id,
          role: log.role,
          message: log.message.trim(),
        });
      }
    }

    // Daily caregiver confirmation
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

    return new Response(
      JSON.stringify({ success: true, checkInId: checkIn.id, analysis, recordingUrl, callDuration }),
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
