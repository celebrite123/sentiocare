import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RECORDING_RETENTION_DAYS = 7;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Starting cleanup of old recordings...");

    // Calculate cutoff date (7 days ago)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - RECORDING_RETENTION_DAYS);
    const cutoffISO = cutoffDate.toISOString();

    console.log(`Cleaning recordings older than: ${cutoffISO}`);

    // Find check-ins with recordings older than 7 days
    const { data: oldRecordings, error: fetchError } = await supabase
      .from("check_ins")
      .select("id, created_at")
      .not("recording_url", "is", null)
      .lt("created_at", cutoffISO);

    if (fetchError) {
      console.error("Error fetching old recordings:", fetchError);
      throw fetchError;
    }

    const recordingCount = oldRecordings?.length || 0;
    console.log(`Found ${recordingCount} recordings to clean up`);

    if (recordingCount > 0) {
      // Clear recording URLs (the actual recordings are on Bolna's S3, we just remove the reference)
      // Transcripts in conversation_logs and conversation_summary remain intact
      const { error: updateError } = await supabase
        .from("check_ins")
        .update({ recording_url: null })
        .lt("created_at", cutoffISO)
        .not("recording_url", "is", null);

      if (updateError) {
        console.error("Error clearing recording URLs:", updateError);
        throw updateError;
      }

      console.log(`Successfully cleared ${recordingCount} recording URLs`);
    }

    // Also clean up old call_attempts records (older than 30 days) to prevent table bloat
    const callAttemptsCutoff = new Date();
    callAttemptsCutoff.setDate(callAttemptsCutoff.getDate() - 30);
    
    const { data: deletedAttempts, error: deleteError } = await supabase
      .from("call_attempts")
      .delete()
      .lt("created_at", callAttemptsCutoff.toISOString())
      .select("id");

    if (deleteError) {
      console.error("Error cleaning call_attempts:", deleteError);
      // Don't throw - this is optional cleanup
    } else {
      console.log(`Cleaned up ${deletedAttempts?.length || 0} old call_attempts records`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        recordingsCleared: recordingCount,
        callAttemptsCleared: deletedAttempts?.length || 0,
        message: `Cleaned up ${recordingCount} recording references and ${deletedAttempts?.length || 0} old call attempts`,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("Cleanup error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
