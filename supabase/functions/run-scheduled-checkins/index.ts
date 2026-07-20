import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Convert UTC date to IST date string (YYYY-MM-DD) for accurate day comparison
function getISTDateString(date: Date): string {
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(date.getTime() + IST_OFFSET_MS);
  return istDate.toISOString().split('T')[0];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Running scheduled check-ins processor...");

    const now = new Date();
    
    // Convert current UTC time to IST (UTC+5:30)
    const IST_OFFSET_HOURS = 5;
    const IST_OFFSET_MINUTES = 30;
    
    let istHours = now.getUTCHours() + IST_OFFSET_HOURS;
    let istMinutes = now.getUTCMinutes() + IST_OFFSET_MINUTES;
    
    if (istMinutes >= 60) {
      istMinutes -= 60;
      istHours += 1;
    }
    
    if (istHours >= 24) {
      istHours -= 24;
    }
    
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

    const currentTotalMinutes = currentHour * 60 + currentMinute;
    const nowISTDate = getISTDateString(now);

    // ============ SEPARATE EXACT vs CATCH-UP SCHEDULES ============
    const exactSchedules: typeof schedules = [];
    const catchUpSchedules: typeof schedules = [];

    for (const schedule of schedules || []) {
      const [scheduleHour, scheduleMinute] = schedule.time_of_day.split(":").map(Number);
      const scheduleTotalMinutes = scheduleHour * 60 + scheduleMinute;
      const timeDiff = Math.abs(currentTotalMinutes - scheduleTotalMinutes);
      const isTimeMatch = timeDiff <= 8 || timeDiff >= (24 * 60 - 8);

      const daysArray = schedule.days_of_week || [0, 1, 2, 3, 4, 5, 6];
      const isDayMatch = daysArray.includes(currentDay);

      const lastRun = schedule.last_run_at ? new Date(schedule.last_run_at) : null;
      const lastRunISTDate = lastRun ? getISTDateString(lastRun) : null;
      const alreadyRunToday = lastRunISTDate !== null && lastRunISTDate === nowISTDate;

      if (alreadyRunToday) {
        console.log(`Schedule ${schedule.id}: SKIP (already ran today ${lastRunISTDate})`);
        continue;
      }

      if (!isDayMatch) {
        continue;
      }

      if (isTimeMatch) {
        exactSchedules.push(schedule);
      } else {
        const scheduledTimePassed = currentTotalMinutes > scheduleTotalMinutes + 8;
        if (scheduledTimePassed) {
          catchUpSchedules.push(schedule);
        }
      }
    }

    console.log(`Exact-time schedules: ${exactSchedules.length}, Catch-up schedules: ${catchUpSchedules.length}`);

    // Process exact-time first, then catch-ups (capped at 3 per run to avoid starvation)
    const CATCHUP_CAP = 3;
    const toProcess = [
      ...exactSchedules.map(s => ({ schedule: s, triggerType: 'exact' as const })),
      ...catchUpSchedules.slice(0, CATCHUP_CAP).map(s => ({ schedule: s, triggerType: 'catchup' as const })),
    ];

    const results: any[] = [];

    for (const { schedule, triggerType } of toProcess) {
      const elder = schedule.elders;
      const checkInMethod = elder?.check_in_method || "whatsapp";

      console.log(`▶ Schedule ${schedule.id} [${triggerType}]: elder=${elder?.id}, method=${checkInMethod}, time=${schedule.time_of_day}`);
        
      // ============ CHECK FOR PENDING RETRIES ============
      const { data: pendingRetries } = await supabase
        .from("call_attempts")
        .select("id, status, next_retry_at, created_at")
        .eq("elder_id", schedule.elder_id)
        .in("status", ["initiated", "no_answer"])
        .order("created_at", { ascending: false })
        .limit(1);
      
      if (pendingRetries && pendingRetries.length > 0) {
        const pending = pendingRetries[0];
        console.log(`  SKIP: pending retry (status=${pending.status})`);
        results.push({
          schedule_id: schedule.id,
          elder_id: schedule.elder_id,
          status: "skipped_pending_retry",
          trigger_type: triggerType,
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

      if (status === "trial" && trialEndsAt && trialEndsAt <= now) {
        console.log(`  ⚠️ TRIAL EXPIRED for elder ${elder?.id} (expired ${trialEndsAt.toISOString()}). Voice calls blocked.`);
      }

      // Determine what type of check-in to run
      let shouldRunVoice = false;
      let shouldRunWhatsApp = false;

      if (checkInMethod === "voice" && canUseVoice) {
        shouldRunVoice = true;
      } else if (checkInMethod === "whatsapp") {
        shouldRunWhatsApp = true;
      } else if (checkInMethod === "both") {
        if (canUseVoice) shouldRunVoice = true;
        shouldRunWhatsApp = true;
      } else if (checkInMethod === "voice" && !canUseVoice) {
        if (elder?.whatsapp_number) {
          shouldRunWhatsApp = true;
          console.log(`  Falling back to WhatsApp (voice requires Premium)`);
        } else {
          console.log(`  SKIP: voice requires Premium, no WhatsApp configured`);
          // Update last_run_at to prevent infinite catch-up loop for unconfigured elders
          await supabase
            .from("check_in_schedules")
            .update({ last_run_at: now.toISOString() })
            .eq("id", schedule.id);
          results.push({
            schedule_id: schedule.id,
            elder_id: schedule.elder_id,
            status: "skipped_no_channel",
            trigger_type: triggerType,
          });
          continue;
        }
      }

      let voiceSuccess = false;
      let whatsappSuccess = false;

      try {
        // ============ FETCH MEDICINES & MONITORING CONFIG ============
        let elderMedicines: any[] = [];
        let monitoringConfig: any = { topics: [], custom_questions: [] };
        
        if (shouldRunVoice) {
          const { data: meds } = await supabase
            .from("medicines")
            .select("name, dosage, timing, purpose")
            .eq("elder_id", schedule.elder_id)
            .eq("active", true);
          elderMedicines = meds || [];
          monitoringConfig = elder?.monitoring_config || { topics: [], custom_questions: [] };
        }

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
            const callsByDate: Record<string, string[]> = {};
            for (const call of recentCalls) {
              const dateStr = getISTDateString(new Date(call.created_at));
              if (!callsByDate[dateStr]) callsByDate[dateStr] = [];
              callsByDate[dateStr].push(call.status);
            }
            
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
              console.log(`  CHRONIC FAILURE: unreachable for ${consecutiveFailDays} days`);
              
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
                console.log(`  Chronic unreachable alert created`);
              }
            }
          }
        }

        // Run voice call if applicable
        if (shouldRunVoice) {
          console.log(`  Initiating voice call...`);
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
          
          if (voiceResponse.ok && voiceResult.success) {
            voiceSuccess = true;
            console.log(`  ✅ Voice call initiated. Execution ID: ${voiceResult.execution_id || voiceResult.callId}`);
          } else {
            console.error(`  ❌ Voice FAILED: ${voiceResult.error || JSON.stringify(voiceResult)}`);
            
            // Voice-only retry policy: do NOT fall back to WhatsApp for premium voice users
            // Let the retry system (process-call-retries) handle failed voice calls
            console.log(`  Voice failed — will be retried by process-call-retries (no WhatsApp fallback for premium voice users)`);
          }
        }

        // Run WhatsApp check-in if applicable (original schedule, not fallback)
        if (shouldRunWhatsApp && elder?.whatsapp_number) {
          console.log(`  Initiating WhatsApp check-in...`);
          const whatsappResponse = await fetch(`${supabaseUrl}/functions/v1/send-whatsapp-checkin`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({ elderId: schedule.elder_id }),
          });
          const whatsappResult = await whatsappResponse.json();
          
          if (whatsappResponse.ok && whatsappResult.success) {
            whatsappSuccess = true;
            console.log(`  ✅ WhatsApp sent. SID: ${whatsappResult.messageSid}`);
          } else {
            console.error(`  ❌ WhatsApp FAILED: ${whatsappResult.error || JSON.stringify(whatsappResult)}`);
          }
        }

        if (voiceSuccess || whatsappSuccess) {
          await supabase
            .from("check_in_schedules")
            .update({ last_run_at: now.toISOString() })
            .eq("id", schedule.id);
          
          results.push({
            schedule_id: schedule.id,
            elder_id: schedule.elder_id,
            status: "completed",
            trigger_type: triggerType,
            voice_success: voiceSuccess,
            whatsapp_success: whatsappSuccess,
          });
          console.log(`  ✅ COMPLETED [${triggerType}]`);
        } else if (shouldRunVoice || shouldRunWhatsApp) {
          // All methods failed — update last_run_at anyway to prevent infinite catch-up loop
          await supabase
            .from("check_in_schedules")
            .update({ last_run_at: now.toISOString() })
            .eq("id", schedule.id);
          
          console.error(`  ❌ ALL METHODS FAILED [${triggerType}] — marking as attempted to prevent retry storm`);
          results.push({
            schedule_id: schedule.id,
            elder_id: schedule.elder_id,
            status: "all_methods_failed",
            trigger_type: triggerType,
            error: "All check-in methods failed to initiate",
          });
        }

      } catch (error) {
        console.error(`  Error for schedule ${schedule.id}:`, error);
        // Update last_run_at even on exception to prevent infinite catch-up
        await supabase
          .from("check_in_schedules")
          .update({ last_run_at: now.toISOString() })
          .eq("id", schedule.id);
        
        const message = error instanceof Error ? error.message : "Unknown error";
        results.push({
          schedule_id: schedule.id,
          elder_id: schedule.elder_id,
          status: "error",
          trigger_type: triggerType,
          error: message,
        });
      }
    }

    console.log(`Processed ${results.length} check-ins (${exactSchedules.length} exact, ${Math.min(catchUpSchedules.length, CATCHUP_CAP)} catch-up)`);

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
