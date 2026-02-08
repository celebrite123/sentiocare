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
        
        // ============ CHECK FOR PENDING RETRIES ============
        // CRITICAL: Don't start a new call if there's already a pending retry
        const { data: pendingRetries } = await supabase
          .from("call_attempts")
          .select("id, status, next_retry_at, created_at")
          .eq("elder_id", schedule.elder_id)
          .in("status", ["initiated", "no_answer"])
          .order("created_at", { ascending: false })
          .limit(1);
        
        if (pendingRetries && pendingRetries.length > 0) {
          const pending = pendingRetries[0];
          console.log(`SKIPPING schedule ${schedule.id} - elder ${schedule.elder_id} has pending retry: status=${pending.status}, next_retry_at=${pending.next_retry_at}`);
          results.push({
            schedule_id: schedule.id,
            elder_id: schedule.elder_id,
            status: "skipped_pending_retry",
            pending_call_id: pending.id,
          });
          continue;
        }
        // ============ END PENDING RETRY CHECK ============
        
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

        // Track if calls actually succeeded
        let voiceSuccess = false;
        let whatsappSuccess = false;

        try {
          // ============ FETCH MEDICINES & MONITORING CONFIG ============
          let elderMedicines: any[] = [];
          let monitoringConfig: any = { topics: [], custom_questions: [] };
          
          if (shouldRunVoice) {
            // Fetch active medicines for personalized calls
            const { data: meds } = await supabase
              .from("medicines")
              .select("name, dosage, timing, purpose")
              .eq("elder_id", schedule.elder_id)
              .eq("active", true);
            elderMedicines = meds || [];
            
            // Get monitoring config from elder
            monitoringConfig = elder?.monitoring_config || { topics: [], custom_questions: [] };
            
            console.log(`Fetched ${elderMedicines.length} medicines and ${(monitoringConfig.topics || []).length} monitoring topics for elder ${elder?.id}`);
          }
          // ============ END FETCH MEDICINES ============

          // ============ CHRONIC FAILURE DETECTION ============
          if (shouldRunVoice) {
            const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
            const { data: recentCalls } = await supabase
              .from("call_attempts")
              .select("id, status, created_at")
              .eq("elder_id", schedule.elder_id)
              .gte("created_at", threeDaysAgo.toISOString())
              .order("created_at", { ascending: false });

            if (recentCalls && recentCalls.length > 0) {
              // Group by IST date and check if ALL calls failed each day
              const callsByDate: Record<string, string[]> = {};
              for (const call of recentCalls) {
                const dateStr = getISTDateString(new Date(call.created_at));
                if (!callsByDate[dateStr]) callsByDate[dateStr] = [];
                callsByDate[dateStr].push(call.status);
              }
              
              // Count consecutive days where no call was answered
              const sortedDates = Object.keys(callsByDate).sort().reverse();
              let consecutiveFailDays = 0;
              for (const date of sortedDates) {
                const statuses = callsByDate[date];
                const hasAnswered = statuses.some(s => s === 'answered');
                if (!hasAnswered) {
                  consecutiveFailDays++;
                } else {
                  break;
                }
              }
              
              if (consecutiveFailDays >= 3) {
                console.log(`CHRONIC FAILURE: Elder ${schedule.elder_id} unreachable for ${consecutiveFailDays} consecutive days`);
                
                // Check if we already created this alert recently (avoid duplicates)
                const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                const { data: existingAlert } = await supabase
                  .from("alerts")
                  .select("id")
                  .eq("elder_id", schedule.elder_id)
                  .eq("alert_type", "chronic_unreachable")
                  .gte("created_at", oneDayAgo.toISOString())
                  .limit(1);
                
                if (!existingAlert || existingAlert.length === 0) {
                  await supabase.from("alerts").insert({
                    elder_id: schedule.elder_id,
                    title: "Chronic Unreachable - Needs Immediate Attention",
                    description: `${elder?.full_name} has not answered calls for ${consecutiveFailDays} consecutive days. Please check on them urgently.`,
                    severity: "high",
                    alert_type: "chronic_unreachable",
                  });
                  
                  // Notify caregiver about chronic failure
                  await fetch(`${supabaseUrl}/functions/v1/notify-caregiver`, {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      "Authorization": `Bearer ${supabaseServiceKey}`,
                    },
                    body: JSON.stringify({
                      elderId: schedule.elder_id,
                      alertType: "chronic_unreachable",
                      severity: "high",
                      title: `Unable to reach ${elder?.full_name} for ${consecutiveFailDays} days`,
                      description: `${elder?.full_name} has not answered any check-in calls for ${consecutiveFailDays} consecutive days. Please check on them or verify their phone number.`,
                      initiateCall: false,
                    }),
                  });
                  console.log(`Chronic unreachable alert created for elder ${schedule.elder_id}`);
                }
              }
            }
          }
          // ============ END CHRONIC FAILURE DETECTION ============

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
                medicines: elderMedicines,
                medicalConditions: elder?.medical_conditions || [],
                preferredLanguage: elder?.preferred_language || "english",
                monitoringConfig: monitoringConfig,
              }),
            });
            const voiceResult = await voiceResponse.json();
            console.log("Voice call FULL result:", JSON.stringify(voiceResult));
            
            // CHECK BOTH HTTP STATUS AND RESPONSE SUCCESS
            if (voiceResponse.ok && voiceResult.success) {
              voiceSuccess = true;
              console.log(`Voice call initiated successfully. Execution ID: ${voiceResult.execution_id || voiceResult.callId}`);
            } else {
              console.error("Voice call FAILED:", voiceResult.error || voiceResult);
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
            
            // CHECK BOTH HTTP STATUS AND RESPONSE SUCCESS
            if (whatsappResponse.ok && whatsappResult.success) {
              whatsappSuccess = true;
              console.log(`WhatsApp sent successfully. SID: ${whatsappResult.messageSid}`);
            } else {
              console.error("WhatsApp check-in FAILED:", whatsappResult.error || whatsappResult);
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
          
          // ONLY update last_run_at if at least ONE method succeeded
          // This prevents marking the day as "done" if all calls failed
          if (voiceSuccess || whatsappSuccess) {
            await supabase
              .from("check_in_schedules")
              .update({ last_run_at: now.toISOString() })
              .eq("id", schedule.id);
            console.log(`Updated last_run_at for schedule ${schedule.id} to ${now.toISOString()}`);
            
            results.push({
              schedule_id: schedule.id,
              elder_id: schedule.elder_id,
              status: "completed",
              check_in_method: checkInMethod,
              voice_enabled: shouldRunVoice,
              whatsapp_enabled: shouldRunWhatsApp,
              voice_success: voiceSuccess,
              whatsapp_success: whatsappSuccess,
            });
          } else if (shouldRunVoice || shouldRunWhatsApp) {
            // Calls were attempted but ALL failed - don't update last_run_at so it can retry
            console.error(`All check-in methods FAILED for schedule ${schedule.id} - NOT updating last_run_at`);
            results.push({
              schedule_id: schedule.id,
              elder_id: schedule.elder_id,
              status: "all_methods_failed",
              check_in_method: checkInMethod,
              voice_attempted: shouldRunVoice,
              whatsapp_attempted: shouldRunWhatsApp,
              error: "All check-in methods failed to initiate",
            });
          }

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
