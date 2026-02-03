import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Safety question keywords for detection
const safetyQuestionPatterns = {
  fever: ["fever", "bukhar", "बुखार", "temperature", "hot", "garam"],
  uncontrolled_pain: ["pain", "dard", "दर्द", "takleef", "तकलीफ़", "hurting", "ache"],
  breathing_difficulty: ["breath", "saans", "सांस", "breathing", "dam", "दम", "suffocate"],
  wound_discharge: ["wound", "ghav", "घाव", "blood", "khoon", "खून", "pus", "discharge", "sujan", "सूजन", "swelling"],
  neurological_symptoms: ["dizzy", "chakkar", "चक्कर", "faint", "confusion", "weakness", "kamzori", "कमज़ोरी", "behosh"],
};

// Yes/No detection patterns
const yesPatterns = ["yes", "haan", "हां", "ha", "हा", "ji", "जी", "right", "correct", "thik", "ठीक", "ho raha", "hai", "है"];
const noPatterns = ["no", "nahi", "नहीं", "na", "नहीं", "not", "nothing", "kuch nahi", "कुछ नहीं"];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    console.log("B2B Bolna webhook received:", JSON.stringify(payload).substring(0, 500));

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Extract call data from Bolna payload
    const {
      id: payloadId,
      execution_id,
      call_id,
      status,
      transcript,
      user_data,
      context_details,
      recipient_data,
      duration,
      recording_url,
      // Call transfer fields from Bolna
      transfer_status,
      transferred_to_number,
      transfer_duration,
      // Telephony data - where Bolna stores recording URL
      telephony_data,
    } = payload;

    // Extract recording URL from multiple possible locations (Bolna varies where it puts this)
    const actualRecordingUrl = 
      telephony_data?.recording_url ||
      telephony_data?.call_recording_url ||
      payload.recording_url ||
      payload.call_recording?.url ||
      (typeof payload.call_recording === 'string' ? payload.call_recording : null) ||
      context_details?.recording_url ||
      recording_url ||
      null;

    // Extract call duration from multiple possible locations
    const actualDuration = 
      payload.conversation_duration ||
      duration ||
      telephony_data?.duration ||
      telephony_data?.call_duration ||
      (payload.total_cost ? Math.round(payload.total_cost / 0.12) : null) || // Approximate from cost
      null;

    console.log("Recording URL sources:", {
      telephony: telephony_data?.recording_url,
      payload: payload.recording_url,
      call_recording: payload.call_recording,
      context: context_details?.recording_url,
      extracted: actualRecordingUrl
    });
    console.log("Duration sources:", {
      conversation_duration: payload.conversation_duration,
      duration,
      telephony_duration: telephony_data?.duration,
      extracted: actualDuration
    });

    // Extract execution ID from multiple possible locations
    const executionId = execution_id || call_id || payloadId || payload.execution_id || payload.id;

    // Try to get patient info from multiple locations in payload
    let patientId = user_data?.patient_id || 
                    context_details?.user_data?.patient_id ||
                    recipient_data?.patient_id ||
                    context_details?.recipient_data?.patient_id ||
                    payload.metadata?.patient_id;
    let organizationId = user_data?.organization_id ||
                         context_details?.user_data?.organization_id ||
                         recipient_data?.organization_id ||
                         context_details?.recipient_data?.organization_id ||
                         payload.metadata?.organization_id;
    let callType = user_data?.call_type || context_details?.user_data?.call_type || "health_check";
    let dayNumber = user_data?.day_number || context_details?.user_data?.day_number || 1;

    // If patient info not found in payload, look up from b2b_pending_calls table
    if ((!patientId || !organizationId) && executionId) {
      console.log(`Looking up pending call for execution_id: ${executionId}`);
      const { data: pendingCall, error: pendingError } = await supabase
        .from("b2b_pending_calls")
        .select("patient_id, organization_id, call_type, day_number")
        .eq("execution_id", executionId)
        .single();

      if (pendingCall && !pendingError) {
        console.log(`Found pending call: patient=${pendingCall.patient_id}, org=${pendingCall.organization_id}`);
        patientId = pendingCall.patient_id;
        organizationId = pendingCall.organization_id;
        callType = pendingCall.call_type || callType;
        dayNumber = pendingCall.day_number || dayNumber;

        // Mark the pending call as processed
        await supabase
          .from("b2b_pending_calls")
          .update({ processed: true, processed_at: new Date().toISOString() })
          .eq("execution_id", executionId);
      } else if (pendingError) {
        console.log(`No pending call found for execution_id ${executionId}:`, pendingError.message);
      }
    }

    if (!patientId || !organizationId) {
      console.error("Missing patient_id or organization_id - not in user_data and not found in pending_calls");
      return new Response(
        JSON.stringify({ error: "Missing patient context", execution_id: executionId }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get patient details
    const { data: patient, error: patientError } = await supabase
      .from("discharged_patients")
      .select("*, organizations(*)")
      .eq("id", patientId)
      .single();

    if (patientError || !patient) {
      console.error("Patient not found:", patientId);
      return new Response(
        JSON.stringify({ error: "Patient not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Detect if call was transferred
    const wasTransferred = transfer_status === "completed" || 
                          transfer_status === "success" || 
                          status === "transferred";
    const transferPhoneUsed = transferred_to_number || null;

    const wasAnswered = status === "completed" && transcript && transcript.length > 50;

    // Parse safety check responses from transcript
    const safetyCheckResponses = parseSafetyResponses(transcript || "");
    const redFlagTriggered = Object.values(safetyCheckResponses).some(v => v === "yes");
    const triggeredSymptoms = Object.entries(safetyCheckResponses)
      .filter(([_, v]) => v === "yes")
      .map(([k, _]) => k);

    // Detect identity, consent, and respondent type from transcript
    const identityVerified = detectIdentityVerification(transcript || "", patient.patient_name);
    const consentObtained = detectConsent(transcript || "");
    const { respondentType, respondentRelation } = detectRespondent(transcript || "", patient.patient_name);

    // Analyze transcript with AI if call was answered
    let analysis = {
      medicines_taken: null as boolean | null,
      symptoms_reported: [] as string[],
      needs_hospital_help: false,
      risk_level: "stable" as string,
      risk_reason: null as string | null,
      sentiment: "neutral" as string,
      ai_summary: null as string | null,
      medicine_issue_reason: null as string | null,
    };

    if (wasAnswered && transcript) {
      try {
        analysis = await analyzeTranscript(transcript, patient, safetyCheckResponses, supabase);
      } catch (e) {
        console.error("AI analysis failed:", e);
      }
    }

    // Override risk level if red flags detected
    if (redFlagTriggered) {
      analysis.risk_level = "urgent";
      analysis.symptoms_reported = triggeredSymptoms;
      analysis.risk_reason = `Red flag symptoms detected: ${triggeredSymptoms.join(", ")}`;
    }

    // Create patient checkin record with structured safety responses
    const { data: checkin, error: checkinError } = await supabase
      .from("patient_checkins")
      .insert({
        patient_id: patientId,
        organization_id: organizationId,
        checkin_type: callType,
        method: "voice",
        answered: wasAnswered,
        medicines_taken: analysis.medicines_taken,
        danger_symptoms_reported: analysis.symptoms_reported.length > 0 ? analysis.symptoms_reported : null,
        needs_hospital_help: analysis.needs_hospital_help || redFlagTriggered,
        risk_level: analysis.risk_level,
        risk_reason: analysis.risk_reason,
        sentiment: analysis.sentiment,
        ai_summary: analysis.ai_summary,
        call_id: execution_id || call_id,
        call_duration_seconds: actualDuration,
        recording_url: actualRecordingUrl,
        patient_response: transcript || null, // Store full transcript
        // Structured fields
        safety_check_responses: {
          ...safetyCheckResponses,
          red_flag_triggered: redFlagTriggered,
          triggered_symptoms: triggeredSymptoms,
          medicine_issue_reason: analysis.medicine_issue_reason,
          // Transfer tracking
          was_transferred: wasTransferred,
          transferred_to: transferPhoneUsed,
          transfer_duration: transfer_duration || null,
        },
        identity_verified: identityVerified,
        consent_obtained: consentObtained,
        // Respondent tracking (caregiver-aware)
        respondent_type: respondentType,
        respondent_relation: respondentRelation,
      })
      .select()
      .single();

    if (checkinError) {
      console.error("Failed to create checkin:", checkinError);
    }

    // Update patient record
    const patientUpdates: Record<string, any> = {
      last_call_date: new Date().toISOString(),
    };

    // Update risk status based on analysis
    if (analysis.risk_level === "urgent" || analysis.needs_hospital_help || redFlagTriggered) {
      patientUpdates.risk_status = "urgent";
      patientUpdates.risk_reason = analysis.risk_reason || "Critical symptoms detected during voice call";
    } else if (analysis.risk_level === "nurse_followup" || analysis.symptoms_reported.length > 0 || !analysis.medicines_taken) {
      patientUpdates.risk_status = "nurse_followup";
      patientUpdates.risk_reason = analysis.risk_reason || "Follow-up recommended based on call";
    } else if (wasAnswered) {
      patientUpdates.risk_status = "stable";
      patientUpdates.risk_reason = null;
    }

    if (patientUpdates.risk_status) {
      patientUpdates.risk_updated_at = new Date().toISOString();
    }

    // Mark call schedule day as completed
    if (patient.call_schedule && Array.isArray(patient.call_schedule)) {
      const updatedSchedule = patient.call_schedule.map((item: any) => {
        if (item.day === dayNumber) {
          return { ...item, completed: true, completed_at: new Date().toISOString() };
        }
        return item;
      });
      patientUpdates.call_schedule = updatedSchedule;

      // Calculate next call due
      const nextDue = updatedSchedule.find((item: any) => !item.completed);
      if (nextDue) {
        const dischargeDate = new Date(patient.discharge_date);
        const nextCallDate = new Date(dischargeDate);
        nextCallDate.setDate(nextCallDate.getDate() + nextDue.day);
        nextCallDate.setHours(10, 0, 0, 0); // 10 AM
        patientUpdates.next_call_due = nextCallDate.toISOString();
      } else {
        patientUpdates.next_call_due = null; // All calls completed
      }
    }

    await supabase
      .from("discharged_patients")
      .update(patientUpdates)
      .eq("id", patientId);

    // Determine escalation severity
    let escalationSeverity: "red" | "yellow" | "green" | null = null;
    
    if (redFlagTriggered || analysis.needs_hospital_help) {
      escalationSeverity = "red";
    } else if (analysis.risk_level === "nurse_followup" && analysis.symptoms_reported.length > 0) {
      escalationSeverity = "yellow";
    } else if (!analysis.medicines_taken && analysis.medicine_issue_reason) {
      escalationSeverity = analysis.medicine_issue_reason.includes("cost") || 
                          analysis.medicine_issue_reason.includes("confusion") 
                          ? "green" : "yellow";
    }

    // Create alert and trigger escalation
    if (escalationSeverity) {
      const severity = escalationSeverity === "red" ? "critical" : 
                      escalationSeverity === "yellow" ? "medium" : "low";
      const alertType = analysis.needs_hospital_help ? "help_request" : 
                       redFlagTriggered ? "red_flag_symptom" : "symptom_detected";

      const { data: alert, error: alertError } = await supabase
        .from("b2b_alerts")
        .insert({
          organization_id: organizationId,
          patient_id: patientId,
          alert_type: alertType,
          severity: severity,
          title: escalationSeverity === "red" 
            ? `🚨 URGENT: ${patient.patient_name} - Red Flag Detected`
            : escalationSeverity === "yellow"
            ? `⚠️ Follow-up: ${patient.patient_name}`
            : `ℹ️ Advisory: ${patient.patient_name}`,
          description: analysis.risk_reason || analysis.ai_summary || "Review required based on voice call",
          sla_deadline: new Date(Date.now() + (
            escalationSeverity === "red" ? 15 : 
            escalationSeverity === "yellow" ? 120 : 480
          ) * 60 * 1000).toISOString(),
        })
        .select()
        .single();

      if (alertError) {
        console.error("Failed to create alert:", alertError);
      }

      // Trigger escalation for RED and YELLOW alerts
      if ((escalationSeverity === "red" || escalationSeverity === "yellow") && alert) {
        try {
          await supabase.functions.invoke("escalate-b2b-alert", {
            body: {
              organization_id: organizationId,
              patient_id: patientId,
              alert_id: alert.id,
              severity: escalationSeverity,
              reason: analysis.risk_reason || "Symptoms detected during voice call",
              safety_responses: safetyCheckResponses,
              triggered_symptoms: triggeredSymptoms,
            },
          });
          console.log(`Escalation triggered: ${escalationSeverity}`);
        } catch (e) {
          console.error("Failed to trigger escalation:", e);
        }
      }

      // Schedule guaranteed callback for RED alerts
      if (escalationSeverity === "red") {
        try {
          await supabase.functions.invoke("schedule-guaranteed-callback", {
            body: {
              organization_id: organizationId,
              patient_id: patientId,
              reason: `RED ALERT: ${triggeredSymptoms.join(", ")}`,
              sla_minutes: 15,
              notify_patient: true,
            },
          });
          console.log("Guaranteed callback scheduled for RED alert");
        } catch (e) {
          console.error("Failed to schedule callback:", e);
        }
      }
    }

    // Handle call transfer events
    if (wasTransferred) {
      console.log(`Call was transferred to: ${transferPhoneUsed}`);
      
      // Create a notification/alert for the transfer event
      await supabase.from("b2b_alerts").insert({
        organization_id: organizationId,
        patient_id: patientId,
        alert_type: "call_transferred",
        severity: "low",
        title: `📞 Call transferred: ${patient.patient_name}`,
        description: `AI call was transferred to ${transferPhoneUsed || "staff member"}. Duration with AI: ${duration}s. Reason: Patient requested human assistance or urgent symptoms detected.`,
        resolved: true, // Auto-resolve transfer notifications
        resolved_at: new Date().toISOString(),
      });

      // Update any pending scheduled callback for this patient
      await supabase
        .from("scheduled_callbacks")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          notes: `Call transferred to ${transferPhoneUsed || "staff"}`,
        })
        .eq("patient_id", patientId)
        .eq("status", "in_progress");
    }

    // Increment calls used
    try {
      await supabase
        .from("organizations")
        .update({ calls_used_this_month: (patient.organizations?.calls_used_this_month || 0) + 1 })
        .eq("id", organizationId);
    } catch (e) {
      console.error("Failed to increment call count:", e);
    }

    console.log(`B2B call processed for patient ${patientId}: ${analysis.risk_level}, red_flags: ${redFlagTriggered}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        risk_level: analysis.risk_level,
        red_flag_triggered: redFlagTriggered,
        triggered_symptoms: triggeredSymptoms,
        escalation_severity: escalationSeverity,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("B2B webhook error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

/**
 * Parse safety check responses from transcript
 */
function parseSafetyResponses(transcript: string): Record<string, string> {
  const lowerTranscript = transcript.toLowerCase();
  const responses: Record<string, string> = {
    fever: "unclear",
    uncontrolled_pain: "unclear",
    breathing_difficulty: "unclear",
    wound_discharge: "unclear",
    neurological_symptoms: "unclear",
  };

  // Split transcript into segments (roughly by turn)
  const segments = lowerTranscript.split(/[.?!]/);

  for (const [key, patterns] of Object.entries(safetyQuestionPatterns)) {
    // Find segment that mentions this safety question
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const hasQuestion = patterns.some(p => segment.includes(p));
      
      if (hasQuestion && i + 1 < segments.length) {
        // Check the next segment for yes/no answer
        const answerSegment = segments[i + 1];
        
        if (yesPatterns.some(p => answerSegment.includes(p))) {
          responses[key] = "yes";
          break;
        } else if (noPatterns.some(p => answerSegment.includes(p))) {
          responses[key] = "no";
          break;
        }
      }
    }
  }

  return responses;
}

/**
 * Detect if identity was verified in transcript
 */
function detectIdentityVerification(transcript: string, patientName: string): boolean {
  const lowerTranscript = transcript.toLowerCase();
  const firstName = patientName.split(" ")[0].toLowerCase();
  
  // Check for identity confirmation patterns
  const identityPatterns = [
    "speaking with", "baat kar", "बात कर",
    "am i speaking", "kya main", "क्या मैं",
  ];
  
  const hasIdentityQuestion = identityPatterns.some(p => lowerTranscript.includes(p));
  const hasNameMention = lowerTranscript.includes(firstName);
  const hasConfirmation = yesPatterns.some(p => lowerTranscript.includes(p));
  
  return hasIdentityQuestion && (hasNameMention || hasConfirmation);
}

/**
 * Detect if consent was obtained
 */
function detectConsent(transcript: string): boolean {
  const lowerTranscript = transcript.toLowerCase();
  
  const consentPatterns = [
    "2 minute", "do minute", "दो मिनट", "2-3 minute",
    "health check", "sehat", "सेहत", "janch", "जांच",
  ];
  
  const hasConsentQuestion = consentPatterns.some(p => lowerTranscript.includes(p));
  const hasConfirmation = yesPatterns.some(p => lowerTranscript.includes(p));
  
  return hasConsentQuestion && hasConfirmation;
}

/**
 * Detect respondent type (patient vs caregiver) from transcript
 */
function detectRespondent(transcript: string, patientName: string): {
  respondentType: "patient" | "caregiver" | "unknown";
  respondentRelation: string | null;
} {
  const lowerTranscript = transcript.toLowerCase();
  const firstName = patientName.split(" ")[0].toLowerCase();
  
  // Relationship patterns (Hindi + English)
  const relationPatterns: Record<string, string[]> = {
    "spouse": ["wife", "husband", "pati", "patni", "पति", "पत्नी", "biwi", "बीवी"],
    "son": ["son", "beta", "बेटा", "ladka", "लड़का"],
    "daughter": ["daughter", "beti", "बेटी", "ladki", "लड़की"],
    "daughter_in_law": ["bahu", "बहू", "daughter-in-law", "daughter in law"],
    "son_in_law": ["damaad", "दामाद", "son-in-law", "son in law"],
    "parent": ["father", "mother", "papa", "mummy", "maa", "पापा", "माँ", "पिताजी", "माता"],
    "sibling": ["brother", "sister", "bhai", "behen", "भाई", "बहन"],
    "other": ["relative", "caregiver", "family", "rishtedar", "रिश्तेदार", "guardian", "attendant"],
  };
  
  // Check if patient answered directly
  const patientConfirmPatterns = [
    `${firstName}`, "haan main", "yes i am", "ji main", "speaking",
    "bol raha", "bol rahi", "बोल रहा", "बोल रही", "main hi", "मैं ही",
    "yes speaking", "haan ji", "हां जी"
  ];
  
  // Check for caregiver indicators first (before patient confirmation)
  // Look for phrases like "main unki beti hoon" or "I am his daughter"
  const caregiverPhrases = [
    "unki", "unka", "unke", "उनकी", "उनका", "उनके",
    "his", "her", "their", "patient ka", "patient ki",
    "main hoon", "i am", "मैं हूं", "मैं हूँ"
  ];
  
  const hasCaregiverPhrase = caregiverPhrases.some(p => lowerTranscript.includes(p));
  
  // Check for relationship mentions
  for (const [relation, patterns] of Object.entries(relationPatterns)) {
    if (patterns.some(p => lowerTranscript.includes(p))) {
      // If they mention a relationship AND caregiver phrases, they're a caregiver
      if (hasCaregiverPhrase) {
        return { respondentType: "caregiver", respondentRelation: relation };
      }
      // If they just mention a relationship early in transcript, likely caregiver
      const firstMentionIndex = patterns.reduce((min, p) => {
        const idx = lowerTranscript.indexOf(p);
        return idx >= 0 && idx < min ? idx : min;
      }, Infinity);
      
      if (firstMentionIndex < 200) { // Within first ~200 chars (early in conversation)
        return { respondentType: "caregiver", respondentRelation: relation };
      }
    }
  }
  
  // Check if patient confirmed their own identity
  if (patientConfirmPatterns.some(p => lowerTranscript.includes(p))) {
    return { respondentType: "patient", respondentRelation: null };
  }
  
  return { respondentType: "unknown", respondentRelation: null };
}

async function analyzeTranscript(
  transcript: string, 
  patient: any, 
  safetyResponses: Record<string, string>,
  supabase: any
) {
  const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
  
  const redFlagSymptoms = patient.red_flag_symptoms || [];
  
  const prompt = `Analyze this post-discharge patient call transcript and extract:
1. Did the patient take their medicines? (true/false/null if not mentioned)
2. If not taking medicines, what is the reason? (cost/confusion/side_effects/forgot/null)
3. Any symptoms reported, especially these red flags: ${redFlagSymptoms.join(", ")}
4. Does the patient need hospital help? (true/false)
5. Risk level: "stable", "nurse_followup", or "urgent"
6. Reason for risk assessment
7. Overall sentiment: "positive", "neutral", "negative", "anxious"
8. Brief summary (1-2 sentences)

Safety check responses already detected: ${JSON.stringify(safetyResponses)}

Patient context:
- Name: ${patient.patient_name}
- Diagnosis: ${patient.diagnosis || "Not specified"}
- Discharge date: ${patient.discharge_date}
- Prescribed medicines: ${JSON.stringify(patient.medicine_list)}

Transcript:
${transcript}

Respond in JSON format:
{
  "medicines_taken": boolean | null,
  "medicine_issue_reason": "cost" | "confusion" | "side_effects" | "forgot" | null,
  "symptoms_reported": ["symptom1", "symptom2"],
  "needs_hospital_help": boolean,
  "risk_level": "stable" | "nurse_followup" | "urgent",
  "risk_reason": "string",
  "sentiment": "positive" | "neutral" | "negative" | "anxious",
  "ai_summary": "string"
}`;

  try {
    const response = await fetch("https://api.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${lovableApiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      throw new Error(`AI request failed: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (content) {
      return JSON.parse(content);
    }
  } catch (e) {
    console.error("AI analysis error:", e);
  }

  // Fallback analysis using keyword detection
  const lowerTranscript = transcript.toLowerCase();
  
  const medicinesTaken = lowerTranscript.includes("le raha") || 
    lowerTranscript.includes("taking medicine") || 
    lowerTranscript.includes("haan") && lowerTranscript.includes("dawa");
  
  const needsHelp = lowerTranscript.includes("help") || 
    lowerTranscript.includes("madad") || 
    lowerTranscript.includes("emergency") ||
    lowerTranscript.includes("hospital");
  
  const symptomsFound = redFlagSymptoms.filter((s: string) => 
    lowerTranscript.includes(s.toLowerCase())
  );

  // Check for medicine non-adherence reasons
  let medicineIssueReason = null;
  if (!medicinesTaken) {
    if (lowerTranscript.includes("cost") || lowerTranscript.includes("paisa") || lowerTranscript.includes("mahanga")) {
      medicineIssueReason = "cost";
    } else if (lowerTranscript.includes("confus") || lowerTranscript.includes("samajh")) {
      medicineIssueReason = "confusion";
    } else if (lowerTranscript.includes("side effect") || lowerTranscript.includes("problem")) {
      medicineIssueReason = "side_effects";
    } else if (lowerTranscript.includes("forgot") || lowerTranscript.includes("bhool")) {
      medicineIssueReason = "forgot";
    }
  }

  let riskLevel = "stable";
  let riskReason = null;

  if (needsHelp || symptomsFound.length > 0) {
    riskLevel = symptomsFound.length > 0 ? "urgent" : "nurse_followup";
    riskReason = needsHelp 
      ? "Patient requested hospital help" 
      : `Red flag symptoms detected: ${symptomsFound.join(", ")}`;
  } else if (!medicinesTaken) {
    riskLevel = "nurse_followup";
    riskReason = `Patient may not be taking medicines as prescribed${medicineIssueReason ? ` (reason: ${medicineIssueReason})` : ""}`;
  }

  return {
    medicines_taken: medicinesTaken,
    medicine_issue_reason: medicineIssueReason,
    symptoms_reported: symptomsFound,
    needs_hospital_help: needsHelp,
    risk_level: riskLevel,
    risk_reason: riskReason,
    sentiment: "neutral",
    ai_summary: `Call completed. Medicine adherence: ${medicinesTaken ? "Yes" : "Unclear"}. Symptoms: ${symptomsFound.length > 0 ? symptomsFound.join(", ") : "None reported"}.`,
  };
}
