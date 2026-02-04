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
    const bolnaApiKey = Deno.env.get("BOLNA_API_KEY")!;
    const globalAgentId = Deno.env.get("BOLNA_AGENT_ID");
    const globalAgentIdHindi = Deno.env.get("BOLNA_AGENT_ID_HINDI");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check for manual trigger with specific patient_id
    let body: { patient_id?: string; manual_trigger?: boolean } = {};
    try {
      if (req.method === "POST") {
        body = await req.json();
      }
    } catch {
      // No body or invalid JSON - proceed with scheduled calls
    }

    const isManualTrigger = body.manual_trigger === true && body.patient_id;
    
    console.log(isManualTrigger 
      ? `Manual call trigger for patient: ${body.patient_id}` 
      : "Running scheduled B2B calls processor...");

    // Get patients with calls due now or in the past
    const now = new Date().toISOString();
    
    let query = supabase
      .from("discharged_patients")
      .select(`
        *,
        organizations (
          id,
          name,
          voice_enabled,
          bolna_agent_id,
          bolna_agent_id_hindi,
          hospital_contact_number,
          escalation_phone,
          on_call_clinician_phone,
          duty_nurse_phone,
          default_language,
          calls_used_this_month,
          monthly_call_limit
        )
      `)
      .eq("status", "active")
      .eq("consent_given", true);

    if (isManualTrigger) {
      // For manual trigger, fetch specific patient regardless of next_call_due
      query = query.eq("id", body.patient_id);
    } else {
      // For scheduled runs, only get patients with due calls
      query = query.lte("next_call_due", now).not("next_call_due", "is", null).limit(50);
    }
    
    const { data: patients, error: fetchError } = await query;

    if (fetchError) {
      console.error("Error fetching patients:", fetchError);
      throw fetchError;
    }

    console.log(`Found ${patients?.length || 0} patients to process`);

    let processed = 0;
    let skipped = 0;

    // Get today's date for daily limit check (IST timezone)
    const nowIST = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
    const todayIST = nowIST.toISOString().split('T')[0]; // YYYY-MM-DD in IST

    for (const patient of patients || []) {
      const org = patient.organizations;

      // Skip if voice disabled or limits exceeded
      if (!org?.voice_enabled) {
        console.log(`Skipping ${patient.id}: Voice disabled for org`);
        skipped++;
        continue;
      }

      if ((org.calls_used_this_month || 0) >= (org.monthly_call_limit || 1000)) {
        console.log(`Skipping ${patient.id}: Call limit reached for org ${org.id}`);
        skipped++;
        continue;
      }

      // CRITICAL FIX 1: Daily call limit - max 1 call per patient per day
      if (patient.last_call_date && !isManualTrigger) {
        const lastCallIST = new Date(new Date(patient.last_call_date).getTime() + 5.5 * 60 * 60 * 1000);
        const lastCallDay = lastCallIST.toISOString().split('T')[0];
        if (lastCallDay === todayIST) {
          console.log(`Skipping ${patient.id}: Already called today (${lastCallDay})`);
          skipped++;
          continue;
        }
      }

      // Determine which day we're calling for
      const schedule = patient.call_schedule || [];
      
      // CRITICAL FIX 2: Skip if there's an in-progress call (unless manual trigger)
      const inProgressCall = schedule.find((item: any) => item.status === 'in_progress');
      if (inProgressCall && !isManualTrigger) {
        console.log(`Skipping ${patient.id}: Call in progress for day ${inProgressCall.day}`);
        skipped++;
        continue;
      }

      // Find next call that's not completed and not in-progress
      const nextCall = schedule.find((item: any) => !item.completed && item.status !== 'in_progress');
      
      // For manual triggers, allow ad-hoc calls even if schedule is complete
      let dayNumber: number;
      let callType: string;

      if (!nextCall) {
        if (isManualTrigger) {
          // Manual trigger with no pending calls - create ad-hoc call
          const completedDays = schedule.filter((s: any) => s.completed).map((s: any) => s.day);
          const lastCompletedDay = Math.max(...completedDays, 0);
          dayNumber = lastCompletedDay > 0 ? lastCompletedDay : 0;
          callType = "manual_followup";
          console.log(`Manual trigger for ${patient.id}: ad-hoc call (last completed: day ${dayNumber})`);
        } else {
          console.log(`Skipping ${patient.id}: No pending calls in schedule`);
          skipped++;
          continue;
        }
      } else {
        dayNumber = nextCall.day;
        callType = dayNumber === 1 ? "day_1_check" : dayNumber === 3 ? "day_3_check" : "day_7_check";
      }

      // Determine agent to use
      const language = patient.language || org.default_language || "hindi";
      let agentId = language === "hindi" 
        ? (org.bolna_agent_id_hindi || globalAgentIdHindi || globalAgentId)
        : (org.bolna_agent_id || globalAgentId);

      if (!agentId) {
        console.error(`No agent ID available for patient ${patient.id}`);
        skipped++;
        continue;
      }

      // Format phone number
      let phoneNumber = patient.mobile_number.replace(/\D/g, "");
      if (phoneNumber.length === 10) {
        phoneNumber = "+91" + phoneNumber;
      } else if (!phoneNumber.startsWith("+")) {
        phoneNumber = "+" + phoneNumber;
      }

      // Build context for voice agent
      const medicines = Array.isArray(patient.medicine_list)
        ? patient.medicine_list.map((m: any) => m.name || m).join(", ")
        : patient.medicine_list || "Not specified";

      const redFlagSymptoms = Array.isArray(patient.red_flag_symptoms)
        ? patient.red_flag_symptoms.join(", ")
        : patient.red_flag_symptoms || "fever, severe pain, bleeding";

      const greeting = language === "hindi"
        ? callType === "manual_followup"
          ? `नमस्ते ${patient.patient_name.split(" ")[0]} जी, मैं ${org.name} से बोल रहा हूं। आपकी तबीयत की जांच के लिए कॉल किया है।`
          : `नमस्ते ${patient.patient_name.split(" ")[0]} जी, मैं ${org.name} से बोल रहा हूं।`
        : callType === "manual_followup"
          ? `Hello ${patient.patient_name.split(" ")[0]}, I'm calling from ${org.name} to check on your health.`
          : `Hello ${patient.patient_name.split(" ")[0]}, I'm calling from ${org.name}.`;

      // Make Bolna API call
      try {
        const bolnaResponse = await fetch("https://api.bolna.ai/call", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${bolnaApiKey}`,
          },
          body: JSON.stringify({
            agent_id: agentId,
            recipient_phone_number: phoneNumber,
            user_data: {
              patient_id: patient.id,
              organization_id: org.id,
              patient_name: patient.patient_name,
              hospital_name: org.name,
              greeting: greeting,
              day_number: dayNumber,
              call_type: callType,
              discharge_date: patient.discharge_date,
              diagnosis: patient.diagnosis || "Not specified",
              medicines: medicines,
              red_flag_symptoms: redFlagSymptoms,
              follow_up_date: patient.follow_up_date || "Not scheduled",
              // Caregiver context
              caregiver_name: patient.caregiver_name || null,
              caregiver_relation: patient.caregiver_relation || null,
              has_registered_caregiver: !!patient.caregiver_name,
              hospital_contact: org.hospital_contact_number || "hospital helpline",
              language: language,
              // Call transfer configuration
              transfer_phone_red: org.on_call_clinician_phone || org.escalation_phone || null,
              transfer_phone_yellow: org.duty_nurse_phone || org.escalation_phone || null,
              enable_transfer: !!(org.on_call_clinician_phone || org.duty_nurse_phone || org.escalation_phone),
            },
          }),
        });

        if (!bolnaResponse.ok) {
          const errorText = await bolnaResponse.text();
          console.error(`Bolna call failed for ${patient.id}:`, errorText);
          
          // Fallback to WhatsApp
          await sendWhatsAppFallback(supabase, patient, org, callType, dayNumber);
          processed++;
          continue;
        }

        const bolnaData = await bolnaResponse.json();
        const executionId = bolnaData.execution_id || bolnaData.call_id || bolnaData.id;
        console.log(`Call initiated for ${patient.id}: ${executionId}`);
        
        // Store execution_id → patient mapping for webhook lookup
        if (executionId) {
          const { error: pendingError } = await supabase.from("b2b_pending_calls").insert({
            execution_id: executionId,
            patient_id: patient.id,
            organization_id: org.id,
            call_type: callType,
            day_number: dayNumber,
          });
          if (pendingError) {
            console.error(`Failed to store pending call mapping: ${pendingError.message}`);
          } else {
            console.log(`Stored pending call mapping: ${executionId} → ${patient.id}`);
          }
        }
        
        // Mark this day as in-progress and calculate next call date
        if (callType !== "manual_followup") {
          await updatePatientCallSchedule(supabase, patient, org, dayNumber, "voice");
        } else {
          // For ad-hoc calls, only update last_call_date
          await supabase
            .from("discharged_patients")
            .update({ last_call_date: new Date().toISOString() })
            .eq("id", patient.id);
            
          // Still increment call count
          await supabase
            .from("organizations")
            .update({ calls_used_this_month: (org.calls_used_this_month || 0) + 1 })
            .eq("id", org.id);
        }
        processed++;

      } catch (callError: any) {
        console.error(`Error calling patient ${patient.id}:`, callError);
        
        // Fallback to WhatsApp on error
        await sendWhatsAppFallback(supabase, patient, org, callType, dayNumber);
        await updatePatientCallSchedule(supabase, patient, org, dayNumber, "whatsapp");
        processed++;
      }
    }

    console.log(`Processed: ${processed}, Skipped: ${skipped}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed, 
        skipped,
        total: patients?.length || 0 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Scheduler error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function updatePatientCallSchedule(
  supabase: any,
  patient: any,
  org: any,
  dayNumber: number,
  method: string
) {
  const schedule = patient.call_schedule || [];
  
  // CRITICAL FIX 3: Mark as "in_progress" instead of "completed"
  // The webhook will mark it as completed when the call finishes
  const updatedSchedule = schedule.map((item: any) => {
    if (item.day === dayNumber) {
      return { 
        ...item, 
        status: 'in_progress',  // Not completed yet - webhook will set completed: true
        method: method,
        initiated_at: new Date().toISOString() 
      };
    }
    return item;
  });
  
  // Update patient record - only update last_call_date, NOT next_call_due
  // next_call_due will be recalculated by webhook after call completes
  await supabase
    .from("discharged_patients")
    .update({
      call_schedule: updatedSchedule,
      last_call_date: new Date().toISOString(),
      // DON'T update next_call_due here - wait for webhook
    })
    .eq("id", patient.id);
  
  // Increment call count for org if voice call
  if (method === "voice") {
    await supabase
      .from("organizations")
      .update({ calls_used_this_month: (org.calls_used_this_month || 0) + 1 })
      .eq("id", org.id);
  }
}

async function sendWhatsAppFallback(
  supabase: any, 
  patient: any, 
  org: any, 
  callType: string,
  dayNumber: number
) {
  const twilioSid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const twilioToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  const twilioNumber = Deno.env.get("TWILIO_WHATSAPP_NUMBER");

  if (!twilioSid || !twilioToken || !twilioNumber) {
    console.error("Twilio credentials not configured");
    return;
  }

  let phoneNumber = patient.mobile_number.replace(/\D/g, "");
  if (phoneNumber.length === 10) {
    phoneNumber = "91" + phoneNumber;
  }

  const language = patient.language || org.default_language || "hindi";
  const message = language === "hindi"
    ? `🏥 ${org.name}\n\nनमस्ते ${patient.patient_name} जी,\n\nयह आपके स्वास्थ्य की जांच के लिए Day ${dayNumber} का मैसेज है।\n\n1️⃣ क्या आप दवाइयाँ ले रहे हैं?\n2️⃣ कैसा महसूस हो रहा है?\n\nकृपया "हाँ" या "नहीं" लिखकर जवाब दें।\n\nकोई समस्या हो तो "मदद" लिखें।`
    : `🏥 ${org.name}\n\nHello ${patient.patient_name},\n\nThis is your Day ${dayNumber} health check.\n\n1️⃣ Are you taking your medicines?\n2️⃣ How are you feeling?\n\nPlease reply with "Yes" or "No".\n\nType "Help" if you need assistance.`;

  try {
    const formData = new URLSearchParams();
    formData.append("To", `whatsapp:+${phoneNumber}`);
    formData.append("From", `whatsapp:${twilioNumber}`);
    formData.append("Body", message);

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Authorization": `Basic ${btoa(`${twilioSid}:${twilioToken}`)}`,
        },
        body: formData.toString(),
      }
    );

    if (response.ok) {
      const data = await response.json();
      
      // Log the WhatsApp check-in
      await supabase.from("patient_checkins").insert({
        patient_id: patient.id,
        organization_id: org.id,
        checkin_type: callType,
        method: "whatsapp",
        answered: null,
        message_sid: data.sid,
      });

      // Update patient schedule
      const schedule = patient.call_schedule || [];
      const updatedSchedule = schedule.map((item: any) => {
        if (item.day === dayNumber) {
          return { ...item, method: "whatsapp", sent_at: new Date().toISOString() };
        }
        return item;
      });

      await supabase
        .from("discharged_patients")
        .update({ 
          call_schedule: updatedSchedule,
          check_48hr_method: "whatsapp",
        })
        .eq("id", patient.id);

      // Increment SMS count
      await supabase
        .from("organizations")
        .update({ sms_used_this_month: (org.sms_used_this_month || 0) + 1 })
        .eq("id", org.id);

      console.log(`WhatsApp fallback sent for ${patient.id}`);
    }
  } catch (e) {
    console.error("WhatsApp fallback failed:", e);
  }
}
