import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
      execution_id,
      call_id,
      status,
      transcript,
      user_data,
      duration,
      recording_url,
    } = payload;

    // Get patient info from user_data passed during call initiation
    const patientId = user_data?.patient_id;
    const organizationId = user_data?.organization_id;
    const callType = user_data?.call_type || "health_check";
    const dayNumber = user_data?.day_number || 1;

    if (!patientId || !organizationId) {
      console.error("Missing patient_id or organization_id in user_data");
      return new Response(
        JSON.stringify({ error: "Missing patient context" }),
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

    const wasAnswered = status === "completed" && transcript && transcript.length > 50;

    // Analyze transcript with AI if call was answered
    let analysis = {
      medicines_taken: null as boolean | null,
      symptoms_reported: [] as string[],
      needs_hospital_help: false,
      risk_level: "stable" as string,
      risk_reason: null as string | null,
      sentiment: "neutral" as string,
      ai_summary: null as string | null,
    };

    if (wasAnswered && transcript) {
      try {
        analysis = await analyzeTranscript(transcript, patient, supabase);
      } catch (e) {
        console.error("AI analysis failed:", e);
      }
    }

    // Create patient checkin record
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
        needs_hospital_help: analysis.needs_hospital_help,
        risk_level: analysis.risk_level,
        risk_reason: analysis.risk_reason,
        sentiment: analysis.sentiment,
        ai_summary: analysis.ai_summary,
        call_id: execution_id || call_id,
        call_duration_seconds: duration || null,
        recording_url: recording_url || null,
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
    if (analysis.risk_level === "urgent" || analysis.needs_hospital_help) {
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

    // Create alert if risk detected
    if (analysis.risk_level === "urgent" || analysis.risk_level === "nurse_followup") {
      const severity = analysis.risk_level === "urgent" ? "critical" : "medium";
      const alertType = analysis.needs_hospital_help ? "help_request" : "symptom_detected";

      const { error: alertError } = await supabase
        .from("b2b_alerts")
        .insert({
          organization_id: organizationId,
          patient_id: patientId,
          alert_type: alertType,
          severity: severity,
          title: analysis.risk_level === "urgent" 
            ? `URGENT: ${patient.patient_name} needs attention`
            : `Follow-up needed: ${patient.patient_name}`,
          description: analysis.risk_reason || analysis.ai_summary || "Review required based on voice call",
          sla_deadline: new Date(Date.now() + (severity === "critical" ? 2 : 24) * 60 * 60 * 1000).toISOString(),
        });

      if (alertError) {
        console.error("Failed to create alert:", alertError);
      }

      // Send notification for critical alerts
      if (severity === "critical" && patient.organizations?.escalation_phone) {
        try {
          await supabase.functions.invoke("send-b2b-alert-notification", {
            body: {
              organization_id: organizationId,
              patient_id: patientId,
              alert_type: alertType,
              severity: severity,
              message: analysis.risk_reason || "Urgent attention required",
            },
          });
        } catch (e) {
          console.error("Failed to send notification:", e);
        }
      }
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

    console.log(`B2B call processed for patient ${patientId}: ${analysis.risk_level}`);

    return new Response(
      JSON.stringify({ success: true, risk_level: analysis.risk_level }),
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

async function analyzeTranscript(transcript: string, patient: any, supabase: any) {
  const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
  
  const redFlagSymptoms = patient.red_flag_symptoms || [];
  
  const prompt = `Analyze this post-discharge patient call transcript and extract:
1. Did the patient take their medicines? (true/false/null if not mentioned)
2. Any symptoms reported, especially these red flags: ${redFlagSymptoms.join(", ")}
3. Does the patient need hospital help? (true/false)
4. Risk level: "stable", "nurse_followup", or "urgent"
5. Reason for risk assessment
6. Overall sentiment: "positive", "neutral", "negative", "anxious"
7. Brief summary (1-2 sentences)

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

  let riskLevel = "stable";
  let riskReason = null;

  if (needsHelp || symptomsFound.length > 0) {
    riskLevel = symptomsFound.length > 0 ? "urgent" : "nurse_followup";
    riskReason = needsHelp 
      ? "Patient requested hospital help" 
      : `Red flag symptoms detected: ${symptomsFound.join(", ")}`;
  } else if (!medicinesTaken) {
    riskLevel = "nurse_followup";
    riskReason = "Patient may not be taking medicines as prescribed";
  }

  return {
    medicines_taken: medicinesTaken,
    symptoms_reported: symptomsFound,
    needs_hospital_help: needsHelp,
    risk_level: riskLevel,
    risk_reason: riskReason,
    sentiment: "neutral",
    ai_summary: `Call completed. Medicine adherence: ${medicinesTaken ? "Yes" : "Unclear"}. Symptoms: ${symptomsFound.length > 0 ? symptomsFound.join(", ") : "None reported"}.`,
  };
}
