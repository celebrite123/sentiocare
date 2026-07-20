import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simulated conversation scenarios
const conversationScenarios = [
  {
    name: "positive_healthy",
    transcript: `Assistant: Hello! This is your daily health check-in from Sentio AI. How are you feeling today?
User: Oh hello! I'm feeling quite good today, thank you for asking.
Assistant: That's wonderful to hear! Did you take your morning medicines today?
User: Yes, I took all of them right after breakfast. I never miss them.
Assistant: Excellent! Are you experiencing any pain or discomfort anywhere?
User: No, not really. Just a little stiff in the morning but that's normal for my age.
Assistant: That's understandable. On a scale of 1 to 10, how would you rate your overall well-being today?
User: I'd say about 8. I slept well last night and had a nice breakfast.
Assistant: That's great! Is there anything else you'd like to share or any concerns?
User: No, everything is fine. My daughter is visiting this weekend so I'm looking forward to that.
Assistant: How lovely! Enjoy your time with your daughter. Take care and we'll check in again tomorrow!`,
    expectedAnalysis: {
      sentiment: "positive",
      wellBeingScore: 8,
      medicinesTaken: true,
      symptomsReported: ["mild morning stiffness"],
      alertTriggered: false,
      alertReason: null,
    }
  },
  {
    name: "neutral_minor_concerns",
    transcript: `Assistant: Hello! This is your daily health check-in from Sentio AI. How are you feeling today?
User: Hello. I'm okay, I suppose. Not my best day.
Assistant: I'm sorry to hear that. Can you tell me more about how you're feeling?
User: I didn't sleep very well last night. Kept waking up.
Assistant: I understand. Did you manage to take your medicines today?
User: Yes, I took them but I almost forgot the evening one yesterday.
Assistant: It's good you remembered. Are you experiencing any physical discomfort?
User: My knees are bothering me a bit more than usual. The weather has been changing.
Assistant: Joint pain can definitely be affected by weather changes. On a scale of 1 to 10, how would you rate your overall well-being?
User: Maybe a 6 today. I hope tomorrow will be better.
Assistant: I hope so too. Make sure to rest well tonight. Is there anything else concerning you?
User: No, that's all. Thank you for checking in.`,
    expectedAnalysis: {
      sentiment: "neutral",
      wellBeingScore: 6,
      medicinesTaken: true,
      symptomsReported: ["poor sleep", "knee pain"],
      alertTriggered: false,
      alertReason: null,
    }
  },
  {
    name: "concerning_symptoms",
    transcript: `Assistant: Hello! This is your daily health check-in from Sentio AI. How are you feeling today?
User: Not so good today. I've been feeling quite weak.
Assistant: I'm sorry to hear that. Can you describe what kind of weakness you're experiencing?
User: I feel dizzy when I stand up and I had some chest tightness this morning.
Assistant: That sounds concerning. Have you taken your medicines today?
User: I took some of them but I couldn't find my blood pressure medicine.
Assistant: It's important to take your blood pressure medication. Is the chest tightness still there?
User: It comes and goes. It's not severe but it's worrying me.
Assistant: I understand your concern. On a scale of 1 to 10, how would you rate your well-being?
User: Maybe a 4. I don't feel right today.
Assistant: Thank you for sharing this. I'm going to make sure your family is notified about these symptoms. Please rest and if the chest tightness gets worse, please call for help immediately.
User: Okay, thank you. I will.`,
    expectedAnalysis: {
      sentiment: "negative",
      wellBeingScore: 4,
      medicinesTaken: false,
      symptomsReported: ["dizziness", "chest tightness", "weakness"],
      alertTriggered: true,
      alertReason: "Elder reported chest tightness and dizziness. Missed blood pressure medication.",
    }
  },
  {
    name: "missed_medicines",
    transcript: `Assistant: Hello! This is your daily health check-in from Sentio AI. How are you feeling today?
User: Hello dear. I'm feeling alright, just a bit tired.
Assistant: Being tired is understandable. Did you take your medicines today?
User: Oh... I think I forgot my morning pills. I got distracted watching TV.
Assistant: That's okay, it happens. Can you take them now?
User: Yes, let me go get them. One moment... okay, I have them now.
Assistant: Perfect. Are you experiencing any other symptoms or discomfort?
User: No, just the usual aches. Nothing new.
Assistant: Good to hear. On a scale of 1 to 10, how would you rate your overall well-being?
User: I'd say about 7. I feel fine otherwise.
Assistant: That's good. Please try to set an alarm for your morning medicines so you don't forget.
User: That's a good idea. I'll ask my grandson to help me set it up.`,
    expectedAnalysis: {
      sentiment: "neutral",
      wellBeingScore: 7,
      medicinesTaken: false,
      symptomsReported: ["tiredness", "general aches"],
      alertTriggered: false,
      alertReason: null,
    }
  }
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // SECURITY: Service-role only endpoint (internal cron/webhook use)
    const _authHeader = req.headers.get('Authorization') || '';
    const _token = _authHeader.replace('Bearer ', '').trim();
    const _srk = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    if (!_token || !_srk || _token !== _srk) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const { elderId, elderName, scenario } = await req.json();
    
    console.log(`Starting simulated check-in for elder: ${elderId}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Select scenario (random if not specified)
    let selectedScenario;
    if (scenario && conversationScenarios.find(s => s.name === scenario)) {
      selectedScenario = conversationScenarios.find(s => s.name === scenario)!;
    } else {
      selectedScenario = conversationScenarios[Math.floor(Math.random() * conversationScenarios.length)];
    }

    console.log(`Using scenario: ${selectedScenario.name}`);

    // Personalize the transcript
    const personalizedTranscript = selectedScenario.transcript
      .replace(/User:/g, `${elderName}:`);

    // Use AI to analyze (or use expected analysis for faster simulation)
    let analysis = selectedScenario.expectedAnalysis;
    
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (lovableApiKey) {
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
                content: `Analyze this simulated call transcript:\n\n${personalizedTranscript}`,
              },
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
              console.log("AI analysis result:", analysis);
            }
          }
        }
      } catch (aiError) {
        console.error("AI analysis error, using expected analysis:", aiError);
      }
    }

    // Save check-in to database
    const { data: checkIn, error: checkInError } = await supabase
      .from("check_ins")
      .insert({
        elder_id: elderId,
        check_in_type: "simulation",
        status: "completed",
        sentiment: analysis.sentiment,
        well_being_score: analysis.wellBeingScore,
        medicines_taken: analysis.medicinesTaken,
        symptoms_reported: analysis.symptomsReported,
        conversation_summary: `[SIMULATED] ${personalizedTranscript.substring(0, 400)}...`,
        alert_triggered: analysis.alertTriggered,
        alert_reason: analysis.alertReason,
      })
      .select()
      .single();

    if (checkInError) {
      console.error("Error saving check-in:", checkInError);
      throw checkInError;
    }

    console.log("Simulated check-in saved:", checkIn.id);

    // If alert triggered, create alert record
    if (analysis.alertTriggered) {
      const { error: alertError } = await supabase.from("alerts").insert({
        elder_id: elderId,
        title: "[SIMULATION] Health Concern Detected",
        description: analysis.alertReason || "AI detected a potential health concern during the simulated call",
        severity: "high",
        alert_type: "health",
      });

      if (alertError) {
        console.error("Error creating alert:", alertError);
      }
    }

    // Save conversation logs
    const lines = personalizedTranscript.split("\n").filter((l: string) => l.trim());
    for (const line of lines) {
      const isAI = line.toLowerCase().startsWith("assistant:");
      const role = isAI ? "assistant" : "user";
      const message = line.replace(/^(assistant|ai|user|[^:]+):\s*/i, "");
      
      if (message.trim()) {
        await supabase.from("conversation_logs").insert({
          check_in_id: checkIn.id,
          role,
          message: message.trim(),
        });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        checkInId: checkIn.id,
        scenario: selectedScenario.name,
        analysis,
        message: "Simulated check-in completed successfully"
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error in simulation:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
