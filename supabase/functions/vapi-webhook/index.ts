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
    console.log("Vapi webhook received:", JSON.stringify(payload, null, 2));

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Vapi sends different event types
    const messageType = payload.message?.type;
    
    // Only process end-of-call-report
    if (messageType !== "end-of-call-report") {
      console.log(`Received event type: ${messageType}, ignoring...`);
      return new Response(JSON.stringify({ success: true, message: `Ignored event: ${messageType}` }), {
        headers: responseHeaders,
      });
    }

    console.log("Processing end-of-call-report...");

    // Extract data from Vapi's payload structure
    const call = payload.message?.call;
    const artifact = payload.message?.artifact;
    const endedReason = payload.message?.endedReason;

    // Get elder_id from variableValues
    const variableValues = call?.assistantOverrides?.variableValues || {};
    const elderId = variableValues.elder_id;
    
    console.log("Extracted elder_id:", elderId);
    console.log("Variable values:", JSON.stringify(variableValues, null, 2));
    
    if (!elderId) {
      console.error("No elder ID found in payload");
      return new Response(JSON.stringify({ 
        success: false, 
        message: "No elder ID found in webhook payload"
      }), {
        headers: responseHeaders,
      });
    }

    // Extract transcript and recording from artifact
    const transcript = artifact?.transcript || "";
    const recordingUrl = artifact?.recordingUrl || null;
    const callDuration = call?.endedAt && call?.startedAt 
      ? Math.round((new Date(call.endedAt).getTime() - new Date(call.startedAt).getTime()) / 1000)
      : null;

    console.log("Transcript:", transcript?.substring(0, 200));
    console.log("Recording URL:", recordingUrl);
    console.log("Call duration:", callDuration);

    // Determine call status
    const isCompleted = endedReason === "hangup" || endedReason === "customer-ended-call" || endedReason === "assistant-ended-call";

    // Use Lovable AI to analyze the conversation
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    let analysis = {
      sentiment: "neutral",
      wellBeingScore: 7,
      medicinesTaken: true,
      symptomsReported: [] as string[],
      alertTriggered: false,
      alertReason: null as string | null,
      alertSeverity: "low" as string,
    };

    if (lovableApiKey && transcript) {
      try {
        console.log("Analyzing transcript with AI...");
        
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
2. wellBeingScore: 1-10
3. medicinesTaken: true | false
4. symptomsReported: Array of symptoms mentioned
5. alertTriggered: true if concerning conditions
6. alertSeverity: "low" | "medium" | "high" | "critical"
7. alertReason: Clear explanation if alert triggered, null otherwise

Respond ONLY in valid JSON format:
{
  "sentiment": "positive|neutral|negative",
  "wellBeingScore": 1-10,
  "medicinesTaken": true|false,
  "symptomsReported": ["symptom1", "symptom2"],
  "alertTriggered": true|false,
  "alertSeverity": "low|medium|high|critical",
  "alertReason": "reason or null"
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
          console.log("AI analysis response:", content);
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
    } else {
      console.log("Skipping AI analysis - no API key or transcript");
    }

    // Post-analysis validation
    if (!analysis.alertTriggered) {
      if (analysis.wellBeingScore <= 3) {
        analysis.alertTriggered = true;
        analysis.alertReason = `Low well-being score (${analysis.wellBeingScore}/10) reported during call`;
        analysis.alertSeverity = "high";
      } else if (analysis.medicinesTaken === false) {
        analysis.alertTriggered = true;
        analysis.alertReason = "Medicines not taken as scheduled";
        analysis.alertSeverity = "medium";
      } else if (analysis.sentiment === "negative") {
        analysis.alertTriggered = true;
        analysis.alertReason = "Negative sentiment detected during check-in - possible distress";
        analysis.alertSeverity = "medium";
      }
    }

    // Save check-in to database
    console.log("Saving check-in for elder:", elderId);
    const { data: checkIn, error: checkInError } = await supabase
      .from("check_ins")
      .insert({
        elder_id: elderId,
        check_in_type: "voice",
        status: isCompleted ? "completed" : "failed",
        sentiment: analysis.sentiment,
        well_being_score: analysis.wellBeingScore,
        medicines_taken: analysis.medicinesTaken,
        symptoms_reported: analysis.symptomsReported,
        conversation_summary: transcript?.substring(0, 500) || `Call ended: ${endedReason}`,
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
      
      const { error: alertError } = await supabase.from("alerts").insert({
        elder_id: elderId,
        title: analysis.wellBeingScore <= 3 
          ? "Low Well-being Detected" 
          : analysis.medicinesTaken === false 
            ? "Medication Not Taken"
            : "Health Concern Detected",
        description: analysis.alertReason || "AI detected a potential health concern during the call",
        severity: analysis.alertSeverity || "medium",
        alert_type: "health",
      });

      if (alertError) {
        console.error("Error creating alert:", alertError);
      } else {
        console.log("Alert created successfully");
      }
    }

    // Save conversation logs from Vapi's messages array
    const messages = artifact?.messages || [];
    if (messages.length > 0) {
      console.log("Saving conversation logs from messages array...");
      for (const msg of messages) {
        if (msg.message?.trim()) {
          await supabase.from("conversation_logs").insert({
            check_in_id: checkIn.id,
            role: msg.role === "bot" || msg.role === "assistant" ? "assistant" : "user",
            message: msg.message.trim(),
          });
        }
      }
      console.log("Conversation logs saved");
    } else if (transcript) {
      // Fallback: parse transcript into messages
      console.log("Saving conversation logs from transcript...");
      const lines = transcript.split("\n").filter((l: string) => l.trim());
      for (const line of lines) {
        const isAI = line.toLowerCase().startsWith("assistant:") || 
                     line.toLowerCase().startsWith("ai:") || 
                     line.toLowerCase().startsWith("bot:");
        const role = isAI ? "assistant" : "user";
        const message = line.replace(/^(assistant|ai|bot|user):\s*/i, "");
        
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
        callDuration,
        endedReason
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
