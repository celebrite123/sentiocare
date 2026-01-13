import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Webhook endpoints don't need CORS headers as they're server-to-server
const responseHeaders = {
  "Content-Type": "application/json",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200 });
  }

  try {
    const payload = await req.json();
    console.log("Bolna webhook received:", { 
      status: payload.status, 
      call_id: payload.call_id,
      execution_id: payload.execution_id,
      hasTranscript: !!payload.transcript,
      hangup_reason: payload.hangup_reason
    });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Extract call data from Bolna webhook
    const { 
      call_id,
      execution_id,
      status,
      transcript,
      duration,
      hangup_reason,
      call_analysis,
      context_details,
      telephony_data,
      conversation_duration,
    } = payload;

    const user_data = payload.user_data;
    const actualExecutionId = execution_id || call_id;

    // Check if this is an end-of-call event
    const isCallEnded = status === 'completed' || status === 'ended' || status === 'failed' || 
                        status === 'no-answer' || status === 'busy' || status === 'canceled';
    
    if (!isCallEnded) {
      console.log(`Call status update: ${status} for call ${actualExecutionId}`);
      return new Response(JSON.stringify({ success: true, status }), {
        headers: responseHeaders,
      });
    }

    // Extract elder ID
    const elderId = 
      context_details?.recipient_data?.elder_id ||
      context_details?.user_data?.elder_id ||
      user_data?.elder_id ||
      payload.elder_id;
    
    console.log("Extracted elder_id:", elderId);

    // Find the call attempt by execution_id first
    let callAttempt = null;
    if (actualExecutionId) {
      const { data: attempt } = await supabase
        .from("call_attempts")
        .select("*")
        .eq("execution_id", actualExecutionId)
        .single();
      callAttempt = attempt;
    }

    // Determine if call was answered
    const callDuration = conversation_duration || duration || 0;
    const wasAnswered = (
      status === 'completed' || 
      status === 'ended' ||
      callDuration > 30 || 
      (transcript && transcript.length > 50)
    );

    const wasNoAnswer = (
      status === 'no-answer' || 
      status === 'busy' ||
      status === 'failed' ||
      status === 'canceled' ||
      hangup_reason === 'no_answer' ||
      hangup_reason === 'busy' ||
      (callDuration < 15 && !transcript)
    );

    console.log("Call analysis:", { wasAnswered, wasNoAnswer, status, callDuration, hasAttempt: !!callAttempt });

    // Handle callback retry logic if we have a call attempt record
    if (callAttempt && !wasAnswered && wasNoAnswer) {
      const retryCount = callAttempt.retry_count || 0;
      const maxRetries = callAttempt.max_retries || 2;

      console.log("Call not answered - handling retry logic:", { retryCount, maxRetries });

      if (retryCount < maxRetries) {
        // Schedule retry: 10 min after first attempt, 2 hours after second
        const nextRetryMinutes = retryCount === 0 ? 10 : 120;
        const nextRetryAt = new Date(Date.now() + nextRetryMinutes * 60 * 1000);

        await supabase
          .from("call_attempts")
          .update({
            status: 'no_answer',
            completed_at: new Date().toISOString(),
            retry_count: retryCount + 1,
            next_retry_at: nextRetryAt.toISOString()
          })
          .eq("id", callAttempt.id);

        console.log(`Retry scheduled for ${nextRetryMinutes} minutes from now`);

        // After first failed attempt, notify both elder and caregiver via WhatsApp
        if (retryCount === 0 && elderId) {
          await sendMissedCallNotifications(supabase, elderId);
        }

        // Skip creating check-in for unanswered calls
        return new Response(JSON.stringify({ 
          success: true, 
          message: "Call not answered, retry scheduled",
          nextRetryAt: nextRetryAt.toISOString()
        }), { headers: responseHeaders });

      } else {
        // Max retries reached
        await supabase
          .from("call_attempts")
          .update({
            status: 'failed',
            completed_at: new Date().toISOString(),
            next_retry_at: null,
            notification_sent: true
          })
          .eq("id", callAttempt.id);

        // Send final failure alert
        if (elderId) {
          await sendFinalFailureAlert(supabase, elderId, supabaseUrl, supabaseKey);
        }

        console.log("Max retries reached, final alert sent");
        return new Response(JSON.stringify({ 
          success: true, 
          message: "Max retries reached, alert sent"
        }), { headers: responseHeaders });
      }
    }

    // Mark call attempt as answered if we have one
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
        success: false, 
        message: "No elder ID found in webhook payload",
      }), { headers: responseHeaders });
    }

    // Extract recording URL
    const recordingUrl = telephony_data?.recording_url || payload.recording_url || null;

    // Use AI to analyze the conversation
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    let analysis = {
      sentiment: "neutral",
      wellBeingScore: 7,
      medicinesTaken: true,
      symptomsReported: [] as string[],
      resolvedSymptoms: [] as string[],
      alertTriggered: false,
      alertReason: null as string | null,
    };

    if (lovableApiKey && transcript) {
      try {
        console.log("Analyzing transcript with AI...");
        
        const analysisPrompt = `You are an AI health analyst for Sentio, an elder care check-in system. Analyze this call transcript carefully.

EMERGENCY KEYWORDS TO CHECK (CRITICAL):
- Chest pain, heart pain, heart attack
- Difficulty breathing, can't breathe
- Fainting, collapse, fell down
- Severe pain (rating 7+)
- "I want to die", "don't want to live"

SYMPTOM RESOLUTION DETECTION:
Look for phrases indicating a symptom has been RESOLVED:
Hindi: "ठीक हो गया", "अब ठीक है", "बेहतर है"
English: "better now", "resolved", "gone", "no more", "fine now"

Respond ONLY in valid JSON format:
{
  "sentiment": "positive|neutral|negative",
  "wellBeingScore": 1-10,
  "medicinesTaken": true|false,
  "symptomsReported": ["symptom1", "symptom2"],
  "resolvedSymptoms": ["symptom that is now better"],
  "alertTriggered": true|false,
  "alertReason": "reason or null",
  "emergencyDetected": true|false,
  "mentalHealthConcern": true|false
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

    // Save resolved symptoms
    const resolvedSymptoms = (analysis as any).resolvedSymptoms || [];
    if (resolvedSymptoms.length > 0) {
      for (const symptom of resolvedSymptoms) {
        const { data: existing } = await supabase
          .from("resolved_symptoms")
          .select("id")
          .eq("elder_id", elderId)
          .ilike("symptom", `%${symptom}%`)
          .limit(1);
        
        if (!existing || existing.length === 0) {
          await supabase.from("resolved_symptoms").insert({
            elder_id: elderId,
            symptom: symptom,
            reported_at: new Date().toISOString(),
            resolved_at: new Date().toISOString(),
            resolution_note: `Confirmed resolved during voice check-in`,
          });
        }
      }
    }

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
        alert_triggered: analysis.alertTriggered,
        alert_reason: analysis.alertReason,
        recording_url: recordingUrl,
      })
      .select()
      .single();

    if (checkInError) {
      console.error("Error saving check-in:", checkInError);
      return new Response(JSON.stringify({ success: false, error: checkInError.message }), {
        status: 500,
        headers: responseHeaders,
      });
    }

    // Create alert if needed
    if (analysis.alertTriggered) {
      const isEmergency = (analysis as any).emergencyDetected || false;
      const isMentalHealth = (analysis as any).mentalHealthConcern || false;
      let severity = "medium";
      
      if (isEmergency || isMentalHealth || analysis.wellBeingScore <= 2) {
        severity = "critical";
      } else if (analysis.wellBeingScore <= 3) {
        severity = "high";
      }

      await supabase.from("alerts").insert({
        elder_id: elderId,
        title: isEmergency ? "Emergency Detected" : 
               analysis.wellBeingScore <= 3 ? "Low Well-being Detected" : 
               "Health Concern Detected",
        description: analysis.alertReason,
        severity: severity,
        alert_type: isEmergency ? "emergency" : "health",
      });

      // Notify caregiver for serious alerts
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

    // Save conversation logs
    if (transcript) {
      const lines = transcript.split("\n").filter((l: string) => l.trim());
      for (const line of lines) {
        const isAI = line.toLowerCase().startsWith("assistant:") || 
                     line.toLowerCase().startsWith("ai:") || 
                     line.toLowerCase().startsWith("agent:");
        const role = isAI ? "assistant" : "user";
        const message = line.replace(/^(assistant|ai|agent|user|elder):\s*/i, "");
        
        if (message.trim()) {
          await supabase.from("conversation_logs").insert({
            check_in_id: checkIn.id,
            role,
            message: message.trim(),
          });
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        checkInId: checkIn.id, 
        analysis,
        recordingUrl,
        callDuration 
      }),
      { headers: responseHeaders }
    );

  } catch (error: unknown) {
    console.error("Webhook error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: responseHeaders,
    });
  }
});

// Send WhatsApp notifications when elder doesn't answer
async function sendMissedCallNotifications(supabase: any, elderId: string) {
  // Get elder and notification settings
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

  // Send to elder
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

  // Send to caregiver
  if (settings?.caregiver_phone) {
    const caregiverMessage = isHindi
      ? `📞 Sentio सूचना: ${elder.full_name} ने कॉल का जवाब नहीं दिया। हम 10 मिनट में दोबारा कोशिश करेंगे।`
      : `📞 Sentio Notice: ${elder.full_name} didn't answer our check-in call. We'll try again in 10 minutes.`;

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
      console.log("Missed call WhatsApp sent to caregiver");
    } catch (error) {
      console.error("Error sending WhatsApp to caregiver:", error);
    }
  }
}

// Send final alert when all retries fail
async function sendFinalFailureAlert(
  supabase: any, 
  elderId: string, 
  supabaseUrl: string, 
  supabaseServiceKey: string
) {
  const { data: elder } = await supabase
    .from("elders")
    .select("full_name, preferred_language")
    .eq("id", elderId)
    .single();

  const elderName = elder?.full_name || 'Elder';
  const isHindi = elder?.preferred_language === 'hindi';

  // Create alert
  await supabase.from("alerts").insert({
    elder_id: elderId,
    alert_type: 'missed_checkin',
    severity: 'high',
    title: isHindi ? 'कॉल का कोई जवाब नहीं' : 'No Response to Calls',
    description: isHindi 
      ? `${elderName} ने 3 कॉल का जवाब नहीं दिया। कृपया उनसे संपर्क करें।`
      : `${elderName} didn't answer 3 call attempts. Please check on them.`,
    resolved: false
  });

  // Notify caregiver urgently
  await fetch(`${supabaseUrl}/functions/v1/notify-caregiver`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${supabaseServiceKey}`,
    },
    body: JSON.stringify({
      elderId: elderId,
      alertType: "missed_checkin",
      severity: "high",
      title: "Unable to Reach Elder",
      description: `We tried calling ${elderName} 3 times but couldn't reach them. Please check on them immediately.`,
      initiateCall: false
    }),
  });
}
