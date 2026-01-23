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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const twilioSid = Deno.env.get("TWILIO_ACCOUNT_SID")!;
    const twilioToken = Deno.env.get("TWILIO_AUTH_TOKEN")!;
    const twilioWhatsAppNumber = Deno.env.get("TWILIO_WHATSAPP_NUMBER")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;

    // Validate Twilio signature for security
    const twilioSignature = req.headers.get("x-twilio-signature");
    // In production, validate signature here

    const formData = await req.formData();
    const from = formData.get("From")?.toString() || "";
    const body = formData.get("Body")?.toString() || "";
    const messageSid = formData.get("MessageSid")?.toString() || "";

    // Extract phone number
    const phoneNumber = from.replace("whatsapp:", "").replace("+91", "").replace("+", "");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find patient by phone number
    const { data: patient, error: patientError } = await supabase
      .from("discharged_patients")
      .select(`
        *,
        organizations (
          name,
          hospital_contact_number
        )
      `)
      .or(`mobile_number.ilike.%${phoneNumber},mobile_number.ilike.%${phoneNumber.slice(-10)}`)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (patientError || !patient) {
      console.log("Patient not found for phone:", phoneNumber);
      return new Response("OK", { status: 200 });
    }

    // Log incoming message
    await supabase.from("patient_communications").insert({
      patient_id: patient.id,
      organization_id: patient.organization_id,
      direction: "inbound",
      channel: "whatsapp",
      content: body,
      message_sid: messageSid,
      status: "received",
    });

    // Check for HELP request
    const upperBody = body.toUpperCase().trim();
    if (upperBody === "HELP" || upperBody.includes("HELP ME") || upperBody.includes("EMERGENCY")) {
      await handleHelpRequest(supabase, patient, body, twilioSid, twilioToken, twilioWhatsAppNumber, from);
      return new Response("OK", { status: 200 });
    }

    // Analyze response with AI
    const analysis = await analyzePatientResponse(lovableApiKey, patient, body);

    // Update patient based on analysis
    await updatePatientRisk(supabase, patient, analysis);

    // Create checkin record
    await supabase.from("patient_checkins").insert({
      patient_id: patient.id,
      organization_id: patient.organization_id,
      checkin_type: "discharge_48hr",
      method: "whatsapp",
      medicines_taken: analysis.medicinesTaken,
      danger_symptoms_reported: analysis.symptoms,
      needs_hospital_help: analysis.needsHelp,
      patient_response: body,
      risk_level: analysis.riskLevel,
      risk_reason: analysis.riskReason,
      sentiment: analysis.sentiment,
      ai_summary: analysis.summary,
      answered: true,
    });

    // Mark 48hr check as completed
    if (!patient.check_48hr_completed) {
      await supabase
        .from("discharged_patients")
        .update({ check_48hr_completed: true })
        .eq("id", patient.id);
    }

    // Send response based on risk level
    await sendFollowUpMessage(
      patient,
      analysis,
      twilioSid,
      twilioToken,
      twilioWhatsAppNumber,
      from
    );

    // Create alert if needed
    if (analysis.riskLevel === "urgent" || analysis.riskLevel === "nurse_followup") {
      await createPatientAlert(supabase, patient, analysis);
    }

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("B2B WhatsApp webhook error:", error);
    return new Response("OK", { status: 200 });
  }
});

async function analyzePatientResponse(
  apiKey: string,
  patient: any,
  message: string
): Promise<{
  medicinesTaken: boolean | null;
  symptoms: string[];
  needsHelp: boolean;
  riskLevel: string;
  riskReason: string;
  sentiment: string;
  summary: string;
}> {
  const redFlags = patient.red_flag_symptoms || [
    "fever", "bleeding", "difficulty breathing", "chest pain", "severe pain"
  ];

  const prompt = `You are a healthcare AI analyzing a post-discharge patient's WhatsApp response.

Patient: ${patient.patient_name}
Discharge Date: ${patient.discharge_date}
Red Flag Symptoms to Watch: ${redFlags.join(", ")}

Patient's Message: "${message}"

Analyze and respond with JSON only:
{
  "medicinesTaken": true/false/null (null if not mentioned),
  "symptoms": ["list", "of", "symptoms"] (empty if none),
  "needsHelp": true/false,
  "riskLevel": "stable" or "nurse_followup" or "urgent",
  "riskReason": "brief reason for risk classification",
  "sentiment": "positive" or "neutral" or "negative",
  "summary": "one sentence summary of patient's condition"
}

Risk Classification Rules:
- URGENT: Any red flag symptoms, severe distress, explicit emergency
- NURSE_FOLLOWUP: Missed medicines, mild symptoms, confusion, negative sentiment
- STABLE: Taking medicines, no symptoms, positive/neutral response`;

  try {
    const response = await fetch("https://api.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      throw new Error(`AI API error: ${response.status}`);
    }

    const result = await response.json();
    const content = result.choices[0]?.message?.content || "{}";
    return JSON.parse(content);
  } catch (error) {
    console.error("AI analysis error:", error);
    // Default to nurse follow-up on error
    return {
      medicinesTaken: null,
      symptoms: [],
      needsHelp: false,
      riskLevel: "nurse_followup",
      riskReason: "Unable to analyze response - needs manual review",
      sentiment: "neutral",
      summary: message.substring(0, 100),
    };
  }
}

async function updatePatientRisk(supabase: any, patient: any, analysis: any) {
  await supabase
    .from("discharged_patients")
    .update({
      risk_status: analysis.riskLevel,
      risk_reason: analysis.riskReason,
      risk_updated_at: new Date().toISOString(),
    })
    .eq("id", patient.id);
}

async function handleHelpRequest(
  supabase: any,
  patient: any,
  message: string,
  twilioSid: string,
  twilioToken: string,
  twilioWhatsAppNumber: string,
  to: string
) {
  // Update patient status
  await supabase
    .from("discharged_patients")
    .update({
      help_requested: true,
      help_request_at: new Date().toISOString(),
      help_request_message: message,
      risk_status: "urgent",
      risk_reason: "Patient requested help",
      risk_updated_at: new Date().toISOString(),
    })
    .eq("id", patient.id);

  // Create urgent alert
  await supabase.from("b2b_alerts").insert({
    organization_id: patient.organization_id,
    patient_id: patient.id,
    alert_type: "help_request",
    severity: "critical",
    title: `HELP Request from ${patient.patient_name}`,
    description: `Patient sent: "${message}"`,
    resolved: false,
  });

  // Send acknowledgment
  const hospitalContact = patient.organizations?.hospital_contact_number || "our helpline";
  const responseMessage = `We received your help request. A hospital staff member will call you shortly.

In case of emergency, please call ${hospitalContact} or go to the nearest hospital.

Stay safe! 🙏`;

  const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`;
  const twilioAuth = btoa(`${twilioSid}:${twilioToken}`);

  await fetch(twilioUrl, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${twilioAuth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      From: `whatsapp:${twilioWhatsAppNumber}`,
      To: to,
      Body: responseMessage,
    }),
  });
}

async function sendFollowUpMessage(
  patient: any,
  analysis: any,
  twilioSid: string,
  twilioToken: string,
  twilioWhatsAppNumber: string,
  to: string
) {
  let message: string;

  if (analysis.riskLevel === "stable") {
    message = `Thank you for your response, ${patient.patient_name}! 

We're glad you're doing well. Keep taking your medicines as prescribed.

If you need any help, just reply *HELP*.

Take care! 🙏`;
  } else if (analysis.riskLevel === "nurse_followup") {
    message = `Thank you for your response, ${patient.patient_name}.

A nurse from ${patient.organizations?.name || "the hospital"} will call you soon to check on you.

If your condition worsens, reply *HELP* immediately.`;
  } else {
    message = `Thank you for letting us know, ${patient.patient_name}.

A medical staff member will contact you very soon.

If this is an emergency, please call ${patient.organizations?.hospital_contact_number || "emergency services"} immediately.`;
  }

  const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`;
  const twilioAuth = btoa(`${twilioSid}:${twilioToken}`);

  await fetch(twilioUrl, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${twilioAuth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      From: `whatsapp:${twilioWhatsAppNumber}`,
      To: to,
      Body: message,
    }),
  });
}

async function createPatientAlert(supabase: any, patient: any, analysis: any) {
  const severity = analysis.riskLevel === "urgent" ? "critical" : "warning";
  const alertType = analysis.symptoms.length > 0 ? "symptom_reported" : "needs_followup";

  await supabase.from("b2b_alerts").insert({
    organization_id: patient.organization_id,
    patient_id: patient.id,
    alert_type: alertType,
    severity,
    title: analysis.riskLevel === "urgent" 
      ? `Urgent: ${patient.patient_name} needs attention`
      : `Follow-up needed: ${patient.patient_name}`,
    description: analysis.riskReason,
    resolved: false,
  });
}
