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
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Starting cleanup of old call_attempts records...");

    // ONLY clean up old call_attempts records (older than 30 days) to prevent table bloat
    // RECORDINGS ARE NOW KEPT FOREVER - they are hosted on Bolna's S3, not our storage
    const callAttemptsCutoff = new Date();
    callAttemptsCutoff.setDate(callAttemptsCutoff.getDate() - 30);
    
    const { data: deletedAttempts, error: deleteError } = await supabase
      .from("call_attempts")
      .delete()
      .lt("created_at", callAttemptsCutoff.toISOString())
      .select("id");

    if (deleteError) {
      console.error("Error cleaning call_attempts:", deleteError);
      throw deleteError;
    }

    const attemptsCleared = deletedAttempts?.length || 0;
    console.log(`Cleaned up ${attemptsCleared} old call_attempts records`);

    return new Response(
      JSON.stringify({
        success: true,
        callAttemptsCleared: attemptsCleared,
        message: `Cleaned up ${attemptsCleared} old call attempts. Recording URLs are now kept permanently.`,
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
