import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Webhook endpoints don't need CORS headers as they're server-to-server
// Only include minimal headers for response content type
const responseHeaders = {
  "Content-Type": "application/json",
};

serve(async (req) => {
  // Webhooks are server-to-server - no CORS preflight needed
  // If we receive an OPTIONS request, just return 200
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200 });
  }

  try {
    const payload = await req.json();
    console.log("Bolna webhook received:", JSON.stringify(payload, null, 2));

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Extract call data from Bolna webhook
    // Bolna sends different payload structures - handle multiple formats
    const { 
      call_id,
      status,
      transcript,
      duration,
      hangup_reason,
      call_analysis,
      // Bolna's actual structure
      context_details,
      telephony_data,
      conversation_duration,
    } = payload;

    // Also check for user_data directly (for backwards compatibility)
    const user_data = payload.user_data;

    // Check if this is an end-of-call event
    const isCallEnded = status === 'completed' || status === 'ended' || status === 'failed';
    
    if (!isCallEnded) {
      console.log(`Call status update: ${status} for call ${call_id}`);
      return new Response(JSON.stringify({ success: true, status }), {
        headers: responseHeaders,
      });
    }

    // Extract elder ID from multiple possible locations in Bolna's payload
    // Priority: context_details.recipient_data > user_data > direct payload
    const elderId = 
      context_details?.recipient_data?.elder_id ||
      context_details?.user_data?.elder_id ||
      user_data?.elder_id ||
      payload.elder_id;
    
    console.log("Extracted elder_id:", elderId);
    console.log("context_details:", JSON.stringify(context_details, null, 2));
    console.log("user_data:", JSON.stringify(user_data, null, 2));
    
    if (!elderId) {
      console.error("No elder ID found in payload. Available keys:", Object.keys(payload));
      return new Response(JSON.stringify({ 
        success: false, 
        message: "No elder ID found in webhook payload",
        availableKeys: Object.keys(payload)
      }), {
        headers: responseHeaders,
      });
    }

    // Extract recording URL from telephony_data or direct payload
    const recordingUrl = telephony_data?.recording_url || payload.recording_url || null;
    console.log("Recording URL:", recordingUrl);
    
    // Extract duration from multiple sources
    const callDuration = conversation_duration || duration;

    // Use Lovable AI to analyze the conversation
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    let analysis = {
      sentiment: "neutral",
      wellBeingScore: 7,
      medicinesTaken: true,
      symptomsReported: [] as string[],
      alertTriggered: false,
      alertReason: null as string | null,
    };

    if (lovableApiKey && transcript) {
      try {
        console.log("Analyzing transcript with AI...");
        
        // Enhanced analysis prompt with emergency and mental health detection
        const analysisPrompt = `You are an AI health analyst for Sentio, an elder care check-in system. Analyze this call transcript carefully.

EMERGENCY KEYWORDS TO CHECK (CRITICAL - requires immediate escalation):
Physical Emergencies:
- Chest pain, heart pain, heart attack symptoms
- Difficulty breathing, can't breathe, shortness of breath
- Fainting, collapse, fell down, fall
- Heavy bleeding, blood
- Sudden confusion, can't speak properly, speech difficulty
- Severe weakness on one side, stroke symptoms
- Severe pain (rating 7+)

Mental Health Concerns (CRITICAL - requires careful handling):
- "I want to die", "don't want to live", "want to end it"
- Self-harm mentions
- Abuse or fear of someone
- Extreme loneliness or hopelessness

ANALYSIS REQUIRED - Extract ALL of the following:

1. sentiment: "positive" | "neutral" | "negative"
   - positive: happy, content, feeling good
   - neutral: okay, fine, normal
   - negative: sad, unwell, distressed, in pain

2. wellBeingScore: 1-10
   - 1-3: Very poor health, severe distress, emergency symptoms
   - 4-5: Unwell, concerning symptoms, needs attention
   - 6-7: Moderate, some minor issues
   - 8-10: Good to excellent health

3. medicinesTaken: true | false
   - true: Explicitly confirmed taking medicines
   - false: Said no, uncertain, didn't mention, or couldn't confirm

4. symptomsReported: Array of symptoms mentioned
   - Include any physical complaints, pain, discomfort
   - Include emotional symptoms like sadness, anxiety

5. alertTriggered: true if ANY of these conditions:
   - Any emergency keywords detected (physical or mental)
   - Well-being score is 3 or below
   - Medicines explicitly not taken
   - Negative sentiment with concerning content
   - Pain severity 7 or higher mentioned

6. alertSeverity: "low" | "medium" | "high" | "critical"
   - critical: Emergency keywords, immediate danger
   - high: Low well-being (1-3), multiple symptoms, missed medicines
   - medium: Moderate concerns, negative sentiment
   - low: Minor issues, just noting for follow-up

7. alertReason: Clear explanation if alert triggered, null otherwise

8. emergencyDetected: true if any life-threatening symptoms mentioned (chest pain, breathing, fainting, etc.)

9. mentalHealthConcern: true if any self-harm, suicidal thoughts, or abuse mentioned

10. conversationQuality: "good" | "partial" | "poor"
    - good: Full conversation completed, all questions answered
    - partial: Some responses, incomplete
    - poor: Minimal or no meaningful exchange

Respond ONLY in valid JSON format:
{
  "sentiment": "positive|neutral|negative",
  "wellBeingScore": 1-10,
  "medicinesTaken": true|false,
  "symptomsReported": ["symptom1", "symptom2"],
  "alertTriggered": true|false,
  "alertSeverity": "low|medium|high|critical",
  "alertReason": "reason or null",
  "emergencyDetected": true|false,
  "mentalHealthConcern": true|false,
  "conversationQuality": "good|partial|poor"
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
              {
                role: "system",
                content: analysisPrompt,
              },
              {
                role: "user",
                content: `Analyze this call transcript:\n\n${transcript}`,
              },
            ],
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const content = aiData.choices?.[0]?.message?.content;
          console.log("AI analysis response:", content);
          if (content) {
            // Parse JSON from AI response
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
    } else {
      console.log("Skipping AI analysis - no API key or transcript");
    }

    // Post-analysis validation: Ensure alerts are triggered for concerning situations
    // even if the AI didn't flag them
    if (!analysis.alertTriggered) {
      if (analysis.wellBeingScore <= 3) {
        analysis.alertTriggered = true;
        analysis.alertReason = `Low well-being score (${analysis.wellBeingScore}/10) reported during call`;
      } else if (analysis.medicinesTaken === false) {
        analysis.alertTriggered = true;
        analysis.alertReason = "Medicines not taken as scheduled";
      } else if (analysis.sentiment === "negative") {
        analysis.alertTriggered = true;
        analysis.alertReason = "Negative sentiment detected during check-in - possible distress";
      }
    }

    // If Bolna provides its own analysis, merge it
    if (call_analysis) {
      console.log("Bolna call analysis:", call_analysis);
    }

    // Save check-in to database with recording URL
    console.log("Saving check-in for elder:", elderId);
    const { data: checkIn, error: checkInError } = await supabase
      .from("check_ins")
      .insert({
        elder_id: elderId,
        check_in_type: "voice",
        status: status === 'completed' ? "completed" : "failed",
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
      return new Response(JSON.stringify({ 
        success: false, 
        error: checkInError.message 
      }), {
        status: 500,
        headers: responseHeaders,
      });
    }
    
    console.log("Check-in saved successfully:", checkIn.id);

    // If alert triggered, create alert record
    if (analysis.alertTriggered) {
      console.log("Creating alert for elder:", elderId, "Reason:", analysis.alertReason);
      
      // Determine severity based on the issue
      let severity = "medium";
      if (analysis.wellBeingScore <= 2 || analysis.symptomsReported.length > 2) {
        severity = "high";
      }
      
      const { error: alertError } = await supabase.from("alerts").insert({
        elder_id: elderId,
        title: analysis.wellBeingScore <= 3 
          ? "Low Well-being Detected" 
          : analysis.medicinesTaken === false 
            ? "Medication Not Taken"
            : "Health Concern Detected",
        description: analysis.alertReason || "AI detected a potential health concern during the call",
        severity: severity,
        alert_type: "health",
      });

      if (alertError) {
        console.error("Error creating alert:", alertError);
      } else {
        console.log("Alert created successfully");
      }
    }

    // Save conversation logs
    if (transcript) {
      console.log("Saving conversation logs...");
      // Parse transcript into messages
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
      console.log("Conversation logs saved");
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
