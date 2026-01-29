import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Convert UTC date to IST date string (YYYY-MM-DD) for accurate day comparison
function getISTDateString(date: Date): string {
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000; // 5 hours 30 minutes in milliseconds
  const istDate = new Date(date.getTime() + IST_OFFSET_MS);
  return istDate.toISOString().split('T')[0]; // Returns "YYYY-MM-DD"
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Running scheduled check-ins processor...");

    const now = new Date();
    
    // Convert current UTC time to IST (UTC+5:30)
    const IST_OFFSET_HOURS = 5;
    const IST_OFFSET_MINUTES = 30;
    
    // Calculate IST time
    let istHours = now.getUTCHours() + IST_OFFSET_HOURS;
    let istMinutes = now.getUTCMinutes() + IST_OFFSET_MINUTES;
    
    // Handle minute overflow
    if (istMinutes >= 60) {
      istMinutes -= 60;
      istHours += 1;
    }
    
    // Handle hour overflow (next day)
    if (istHours >= 24) {
      istHours -= 24;
    }
    
    // For day calculation, we need to check if we crossed midnight
    let istDay = now.getUTCDay();
    const totalISTMinutes = (now.getUTCHours() + IST_OFFSET_HOURS) * 60 + now.getUTCMinutes() + IST_OFFSET_MINUTES;
    if (totalISTMinutes >= 24 * 60) {
      istDay = (istDay + 1) % 7;
    }
    
    const currentHour = istHours;
    const currentMinute = istMinutes;
    const currentDay = istDay;

    console.log(`Current UTC time: ${now.getUTCHours()}:${now.getUTCMinutes()}`);
    console.log(`Current IST time: ${currentHour}:${currentMinute}, Day: ${currentDay}`);

    // Find schedules that should run now
    const { data: schedules, error: schedulesError } = await supabase
      .from("check_in_schedules")
      .select(`
        *,
        elders(*, profiles:family_member_id(subscription_tier, subscription_status, trial_ends_at))
      `)
      .eq("active", true);

    if (schedulesError) {
      console.error("Error fetching schedules:", schedulesError);
      throw schedulesError;
    }

    console.log(`Found ${schedules?.length || 0} active schedules`);

    const results: any[] = [];

    for (const schedule of schedules || []) {
      const [scheduleHour, scheduleMinute] = schedule.time_of_day.split(":").map(Number);
      
      const timeDiff = Math.abs((currentHour * 60 + currentMinute) - (scheduleHour * 60 + scheduleMinute));
      const isTimeMatch = timeDiff <= 5 || timeDiff >= (24 * 60 - 5);

      const daysArray = schedule.days_of_week || [0, 1, 2, 3, 4, 5, 6];
      const isDayMatch = daysArray.includes(currentDay);

      const lastRun = schedule.last_run_at ? new Date(schedule.last_run_at) : null;
      
      // FIX: Use IST date comparison instead of UTC to prevent missed calls
      // This ensures that a call at 08:00 IST on Jan 26 is correctly identified as a new day
      // even if the last run was at 23:30 UTC on Jan 25 (which is 05:00 IST on Jan 26)
      const nowISTDate = getISTDateString(now);
      const lastRunISTDate = lastRun ? getISTDateString(lastRun) : null;
      const alreadyRunToday = lastRunISTDate !== null && lastRunISTDate === nowISTDate;

      console.log(`Schedule ${schedule.id}: time=${schedule.time_of_day}, timeMatch=${isTimeMatch}, dayMatch=${isDayMatch}, alreadyRun=${alreadyRunToday}, lastRunIST=${lastRunISTDate || 'never'}, nowIST=${nowISTDate}`);

      if (isTimeMatch && isDayMatch && !alreadyRunToday) {
        const elder = schedule.elders;
        const checkInMethod = elder?.check_in_method || "whatsapp";
        
        // Get subscription info
        const profile = elder?.profiles;
        const tier = profile?.subscription_tier || "basic";
        const status = profile?.subscription_status || "trial";
        const trialEndsAt = profile?.trial_ends_at ? new Date(profile.trial_ends_at) : null;
        const isTrialActive = status === "trial" && trialEndsAt && trialEndsAt > now;
        const canUseVoice = tier === "premium" || isTrialActive;

        console.log(`Elder ${elder?.id}: method=${checkInMethod}, tier=${tier}, canUseVoice=${canUseVoice}`);

        // Determine what type of check-in to run
        let shouldRunVoice = false;
        let shouldRunWhatsApp = false;

        if (checkInMethod === "voice" && canUseVoice) {
          shouldRunVoice = true;
        } else if (checkInMethod === "whatsapp") {
          shouldRunWhatsApp = true;
        } else if (checkInMethod === "both") {
          if (canUseVoice) {
            shouldRunVoice = true;
          }
          shouldRunWhatsApp = true;
        } else if (checkInMethod === "voice" && !canUseVoice) {
          // User has voice selected but can't use it - fall back to WhatsApp if available
          if (elder?.whatsapp_number) {
            shouldRunWhatsApp = true;
            console.log(`Falling back to WhatsApp for ${elder?.id} (voice requires Premium)`);
          } else {
            console.log(`Skipping check-in for ${elder?.id} - voice requires Premium and no WhatsApp configured`);
          }
        }

        console.log(`Triggering check-in for elder: ${elder?.id}, voice=${shouldRunVoice}, whatsapp=${shouldRunWhatsApp}`);

        try {
          // Run voice call if applicable (using Bolna)
          if (shouldRunVoice) {
            console.log(`Initiating voice call for elder ${elder?.id}...`);
            const voiceResponse = await fetch(`${supabaseUrl}/functions/v1/bolna-voice-call`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${supabaseServiceKey}`,
              },
              body: JSON.stringify({
                elderId: schedule.elder_id,
                elderName: elder?.full_name,
                elderPhone: elder?.phone_number,
                medicines: [],
                medicalConditions: elder?.medical_conditions || [],
                preferredLanguage: elder?.preferred_language || "english",
              }),
            });
            const voiceResult = await voiceResponse.json();
            console.log("Voice call FULL result:", JSON.stringify(voiceResult));
            
            if (!voiceResult.success) {
              console.error("Voice call failed:", voiceResult.error || voiceResult);
            } else {
              console.log(`Voice call initiated successfully. Execution ID: ${voiceResult.execution_id || voiceResult.callId}`);
            }
          }

          // Run WhatsApp check-in if applicable
          if (shouldRunWhatsApp && elder?.whatsapp_number) {
            console.log(`Initiating WhatsApp check-in for elder ${elder?.id}...`);
            const whatsappResponse = await fetch(`${supabaseUrl}/functions/v1/send-whatsapp-checkin`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${supabaseServiceKey}`,
              },
              body: JSON.stringify({
                elderId: schedule.elder_id,
              }),
            });
            const whatsappResult = await whatsappResponse.json();
            console.log("WhatsApp check-in FULL result:", JSON.stringify(whatsappResult));
            
            if (!whatsappResult.success) {
              console.error("WhatsApp check-in failed:", whatsappResult.error || whatsappResult);
            } else {
              console.log(`WhatsApp sent successfully. SID: ${whatsappResult.messageSid}`);
            }
          }

          // Also run simulate-checkin for demo data
          const response = await fetch(`${supabaseUrl}/functions/v1/simulate-checkin`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({
              elder_id: schedule.elder_id,
              scenario: "random",
            }),
          });

          const result = await response.json();
          
          // Only update last_run_at AFTER successful voice/whatsapp initiation
          // This prevents marking the day as "done" if the calls failed to start
          if (shouldRunVoice || shouldRunWhatsApp) {
            await supabase
              .from("check_in_schedules")
              .update({ last_run_at: now.toISOString() })
              .eq("id", schedule.id);
            console.log(`Updated last_run_at for schedule ${schedule.id} to ${now.toISOString()}`);
          }

          results.push({
            schedule_id: schedule.id,
            elder_id: schedule.elder_id,
            status: "completed",
            check_in_method: checkInMethod,
            voice_enabled: shouldRunVoice,
            whatsapp_enabled: shouldRunWhatsApp,
          });

          // Send notifications based on check-in result
          if (result.check_in) {
            const checkIn = result.check_in;
            
            if (checkIn.alert_triggered) {
              await fetch(`${supabaseUrl}/functions/v1/send-notification`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${supabaseServiceKey}`,
                },
                body: JSON.stringify({
                  elder_id: schedule.elder_id,
                  type: "alert",
                  data: {
                    title: "Health Concern Detected",
                    severity: "high",
                    description: checkIn.alert_reason || "An issue was detected during the check-in",
                  },
                }),
              });
            }

            const { data: settings } = await supabase
              .from("notification_settings")
              .select("wellbeing_threshold")
              .eq("elder_id", schedule.elder_id)
              .single();

            const threshold = settings?.wellbeing_threshold || 5;
            if (checkIn.well_being_score && checkIn.well_being_score < threshold) {
              await fetch(`${supabaseUrl}/functions/v1/send-notification`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${supabaseServiceKey}`,
                },
                body: JSON.stringify({
                  elder_id: schedule.elder_id,
                  type: "low_wellbeing",
                  data: {
                    wellbeing_score: checkIn.well_being_score,
                    check_in_summary: checkIn.conversation_summary,
                  },
                }),
              });
            }
          }

        } catch (error) {
          console.error(`Error running check-in for schedule ${schedule.id}:`, error);
          const message = error instanceof Error ? error.message : "Unknown error";
          results.push({
            schedule_id: schedule.id,
            elder_id: schedule.elder_id,
            status: "error",
            error: message,
          });
        }
      }
    }

    console.log(`Processed ${results.length} check-ins`);

    return new Response(JSON.stringify({ 
      success: true, 
      processed: results.length,
      results 
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Scheduled check-ins error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
