import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    console.log("Vapi webhook received:", JSON.stringify(payload, null, 2));

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Handle different Vapi webhook events
    const { message } = payload;
    
    if (!message) {
      return new Response(JSON.stringify({ success: true, message: "No message to process" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const messageType = message.type;

    // Handle end-of-call report
    if (messageType === "end-of-call-report") {
      const { call, transcript, summary, recordingUrl, endedReason } = message;
      
      // Extract elder ID from call metadata
      const elderId = call?.assistantOverrides?.metadata?.elderId;
      
      if (!elderId) {
        console.log("No elder ID found in call metadata");
        return new Response(JSON.stringify({ success: true, message: "No elder ID" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

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
                  content: `You are an AI health analyst. Analyze this elder care check-in call transcript and extract:
1. Overall sentiment (positive/neutral/negative)
2. Well-being score (1-10)
3. Whether they confirmed taking their medicines (true/false)
4. Any symptoms or health concerns mentioned (list)
5. Whether this requires an emergency alert (true/false) - flag if they mention severe symptoms like chest pain, difficulty breathing, falls, etc.
6. If alert triggered, explain why

Respond ONLY in valid JSON format:
{
  "sentiment": "positive|neutral|negative",
  "wellBeingScore": 1-10,
  "medicinesTaken": true|false,
  "symptomsReported": ["symptom1", "symptom2"],
  "alertTriggered": true|false,
  "alertReason": "reason or null"
}`,
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
            if (content) {
              // Parse JSON from AI response
              const jsonMatch = content.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                analysis = JSON.parse(jsonMatch[0]);
              }
            }
          }
        } catch (aiError) {
          console.error("AI analysis error:", aiError);
        }
      }

      // Save check-in to database
      const { data: checkIn, error: checkInError } = await supabase
        .from("check_ins")
        .insert({
          elder_id: elderId,
          check_in_type: "voice",
          status: "completed",
          sentiment: analysis.sentiment,
          well_being_score: analysis.wellBeingScore,
          medicines_taken: analysis.medicinesTaken,
          symptoms_reported: analysis.symptomsReported,
          conversation_summary: summary || transcript?.substring(0, 500),
          alert_triggered: analysis.alertTriggered,
          alert_reason: analysis.alertReason,
        })
        .select()
        .single();

      if (checkInError) {
        console.error("Error saving check-in:", checkInError);
      } else {
        console.log("Check-in saved:", checkIn.id);

        // If alert triggered, create alert record
        if (analysis.alertTriggered) {
          const { error: alertError } = await supabase.from("alerts").insert({
            elder_id: elderId,
            title: "Health Concern Detected",
            description: analysis.alertReason || "AI detected a potential health concern during the call",
            severity: "high",
            alert_type: "health",
          });

          if (alertError) {
            console.error("Error creating alert:", alertError);
          }
        }

        // Save conversation logs
        if (transcript) {
          // Parse transcript into messages (simplified)
          const lines = transcript.split("\n").filter((l: string) => l.trim());
          for (const line of lines) {
            const isAI = line.toLowerCase().startsWith("assistant:") || line.toLowerCase().startsWith("ai:");
            const role = isAI ? "assistant" : "user";
            const message = line.replace(/^(assistant|ai|user|elder):\s*/i, "");
            
            if (message.trim()) {
              await supabase.from("conversation_logs").insert({
                check_in_id: checkIn.id,
                role,
                message: message.trim(),
              });
            }
          }
        }
      }

      return new Response(
        JSON.stringify({ success: true, checkInId: checkIn?.id, analysis }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle other webhook events
    return new Response(JSON.stringify({ success: true, event: messageType }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Webhook error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
