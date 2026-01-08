import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Webhook endpoints don't need CORS headers as they're server-to-server
// Only include minimal headers for response content type
const responseHeaders = {
  "Content-Type": "text/xml",
};

serve(async (req) => {
  // Webhooks are server-to-server - no CORS preflight needed
  // If we receive an OPTIONS request, just return 200
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200 });
  }

  try {
    const formData = await req.formData();
    const from = formData.get('From')?.toString() || '';
    const body = formData.get('Body')?.toString() || '';
    const messageSid = formData.get('MessageSid')?.toString() || '';

    console.log('Incoming WhatsApp message:', { from, body: body.substring(0, 50), messageSid });

    // Extract and normalize phone number (remove whatsapp: prefix and spaces)
    const rawPhone = from.replace('whatsapp:', '').trim();
    // Normalize: remove spaces, dashes, and ensure + prefix
    const phoneNumber = rawPhone.replace(/[\s-]/g, '');
    const phoneWithoutPlus = phoneNumber.replace(/^\+/, '');

    console.log('Normalized phone:', phoneNumber, 'Without plus:', phoneWithoutPlus);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find elder by WhatsApp number or phone number (check multiple formats)
    const { data: elders, error: elderError } = await supabase
      .from('elders')
      .select('id, full_name, preferred_language, medical_conditions, whatsapp_number, phone_number, check_in_method');

    if (elderError) {
      console.error('Error fetching elders:', elderError);
      throw elderError;
    }

    // Find matching elders by checking multiple phone formats
    const matchingElders = elders?.filter(e => {
      const waNum = e.whatsapp_number?.replace(/[\s-]/g, '') || '';
      const phNum = e.phone_number?.replace(/[\s-]/g, '') || '';
      
      // Check exact match or match without + prefix
      return waNum === phoneNumber || 
             waNum === phoneWithoutPlus ||
             waNum.replace(/^\+/, '') === phoneWithoutPlus ||
             phNum === phoneNumber || 
             phNum === phoneWithoutPlus ||
             phNum.replace(/^\+/, '') === phoneWithoutPlus;
    }) || [];

    // Prioritize elders with WhatsApp configured as check-in method
    const elder = matchingElders.sort((a, b) => {
      const aHasWhatsApp = a.check_in_method === 'whatsapp' || a.check_in_method === 'both';
      const bHasWhatsApp = b.check_in_method === 'whatsapp' || b.check_in_method === 'both';
      const aHasWhatsAppNum = !!a.whatsapp_number;
      const bHasWhatsAppNum = !!b.whatsapp_number;
      
      // Prioritize WhatsApp check-in method
      if (aHasWhatsApp && !bHasWhatsApp) return -1;
      if (!aHasWhatsApp && bHasWhatsApp) return 1;
      // Then prioritize having whatsapp_number set
      if (aHasWhatsAppNum && !bHasWhatsAppNum) return -1;
      if (!aHasWhatsAppNum && bHasWhatsAppNum) return 1;
      return 0;
    })[0];

    if (!elder) {
      console.log('Elder not found for number:', phoneNumber);
      return new Response(
        `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`,
        { headers: responseHeaders }
      );
    }

    console.log('Found elder:', {
      id: elder.id,
      name: elder.full_name,
      language: elder.preferred_language,
      checkInMethod: elder.check_in_method
    });

    // Get elder's medicines
    const { data: medicines } = await supabase
      .from('medicines')
      .select('name, dosage, frequency, timing')
      .eq('elder_id', elder.id)
      .eq('active', true);

    // Find or create active conversation
    let { data: conversation } = await supabase
      .from('whatsapp_conversations')
      .select('id')
      .eq('elder_id', elder.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!conversation) {
      const { data: newConv, error: convError } = await supabase
        .from('whatsapp_conversations')
        .insert({ elder_id: elder.id, status: 'active' })
        .select('id')
        .single();

      if (convError) {
        console.error('Error creating conversation:', convError);
        throw convError;
      }
      conversation = newConv;
    }

    // Save incoming message
    await supabase.from('whatsapp_messages').insert({
      conversation_id: conversation.id,
      role: 'user',
      content: body,
      twilio_sid: messageSid,
    });

    // Get conversation history
    const { data: history } = await supabase
      .from('whatsapp_messages')
      .select('role, content')
      .eq('conversation_id', conversation.id)
      .order('created_at', { ascending: true })
      .limit(20);

    // Get previous check-ins for context
    const { data: previousCheckIns } = await supabase
      .from('check_ins')
      .select('symptoms_reported, conversation_summary, well_being_score, created_at')
      .eq('elder_id', elder.id)
      .order('created_at', { ascending: false })
      .limit(5);

    // Build context for AI
    const previousSymptoms = previousCheckIns
      ?.flatMap(c => c.symptoms_reported || [])
      .filter((v, i, a) => a.indexOf(v) === i)
      .slice(0, 5) || [];

    const recentConcerns = previousCheckIns
      ?.filter(c => c.conversation_summary)
      .map(c => c.conversation_summary)
      .slice(0, 3) || [];

    // Call AI chat function
    const aiResponse = await fetch(`${supabaseUrl}/functions/v1/whatsapp-ai-chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({
        elderId: elder.id,
        elderName: elder.full_name,
        userMessage: body,
        conversationHistory: history?.map(h => ({ role: h.role, content: h.content })) || [],
        medicines: medicines || [],
        preferredLanguage: elder.preferred_language || 'english',
        medicalConditions: elder.medical_conditions || [],
        previousSymptoms,
        recentConcerns,
      }),
    });

    const aiData = await aiResponse.json();
    const responseText = aiData.response || "I'm sorry, I couldn't process that. Please try again.";

    // Save AI response
    await supabase.from('whatsapp_messages').insert({
      conversation_id: conversation.id,
      role: 'assistant',
      content: responseText,
    });

    // Handle emergency alerts
    if (aiData.isEmergency) {
      console.log('Emergency detected, creating alert');
      await supabase.from('alerts').insert({
        elder_id: elder.id,
        alert_type: 'emergency',
        severity: 'high',
        title: 'Emergency Detected via WhatsApp',
        description: `Emergency keywords detected in WhatsApp conversation: "${body.substring(0, 100)}"`,
        resolved: false,
      });
    }

    // Analyze and create check-in if AI provides analysis data
    if (aiData.analysis) {
      const analysis = aiData.analysis;
      
      // Post-analysis validation for alerts
      let alertTriggered = analysis.alertTriggered || false;
      let alertReason = analysis.alertReason || null;
      
      if (!alertTriggered) {
        if (analysis.wellBeingScore && analysis.wellBeingScore <= 3) {
          alertTriggered = true;
          alertReason = `Low well-being score (${analysis.wellBeingScore}/10) reported via WhatsApp`;
        } else if (analysis.medicinesTaken === false) {
          alertTriggered = true;
          alertReason = "Medicines not taken as scheduled (reported via WhatsApp)";
        } else if (analysis.sentiment === "negative") {
          alertTriggered = true;
          alertReason = "Negative sentiment detected in WhatsApp conversation";
        }
      }
      
      // Create check-in record
      const { data: checkIn, error: checkInError } = await supabase
        .from('check_ins')
        .insert({
          elder_id: elder.id,
          check_in_type: 'whatsapp',
          status: 'completed',
          sentiment: analysis.sentiment || 'neutral',
          well_being_score: analysis.wellBeingScore || null,
          medicines_taken: analysis.medicinesTaken ?? null,
          symptoms_reported: analysis.symptomsReported || [],
          conversation_summary: body.substring(0, 500),
          alert_triggered: alertTriggered,
          alert_reason: alertReason,
        })
        .select()
        .single();
      
      if (checkInError) {
        console.error('Error creating check-in:', checkInError);
      } else {
        console.log('Check-in created:', checkIn.id);
        
        // Create alert if triggered
        if (alertTriggered) {
          console.log('Creating alert for WhatsApp check-in:', alertReason);
          
          let severity = "medium";
          if (analysis.wellBeingScore && analysis.wellBeingScore <= 2) {
            severity = "high";
          }
          
          await supabase.from('alerts').insert({
            elder_id: elder.id,
            alert_type: 'health',
            severity: severity,
            title: analysis.wellBeingScore <= 3 
              ? "Low Well-being Detected" 
              : analysis.medicinesTaken === false 
                ? "Medication Not Taken"
                : "Health Concern Detected",
            description: alertReason,
            resolved: false,
          });
        }
      }
    }

    // Send response via Twilio
    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID')!;
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN')!;
    const twilioWhatsAppNumber = Deno.env.get('TWILIO_WHATSAPP_NUMBER')!;

    const twilioResponse = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${btoa(`${twilioAccountSid}:${twilioAuthToken}`)}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          From: `whatsapp:${twilioWhatsAppNumber}`,
          To: from,
          Body: responseText,
        }),
      }
    );

    if (!twilioResponse.ok) {
      const error = await twilioResponse.text();
      console.error('Twilio send error:', error);
    }

    // Return empty TwiML (we're sending via API, not reply)
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`,
      { headers: responseHeaders }
    );

  } catch (error) {
    console.error('Error in WhatsApp webhook:', error);
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`,
      { headers: responseHeaders }
    );
  }
});
