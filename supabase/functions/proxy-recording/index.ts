import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url = new URL(req.url);
    const checkInId = url.searchParams.get('checkInId');
    
    if (!checkInId) {
      return new Response(
        JSON.stringify({ error: 'checkInId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the recording URL from the check-in (RLS will verify access)
    const { data: checkIn, error: checkInError } = await supabaseAuth
      .from("check_ins")
      .select("recording_url, elder_id")
      .eq("id", checkInId)
      .single();

    if (checkInError || !checkIn) {
      console.error("Check-in not found or access denied:", checkInError);
      return new Response(
        JSON.stringify({ error: 'Recording not found or access denied' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!checkIn.recording_url) {
      return new Response(
        JSON.stringify({ error: 'No recording available for this check-in' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch the audio from S3
    console.log("Proxying recording:", checkIn.recording_url);
    
    const audioResponse = await fetch(checkIn.recording_url);
    
    if (!audioResponse.ok) {
      console.error("Failed to fetch recording:", audioResponse.status, audioResponse.statusText);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch recording' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const audioData = await audioResponse.arrayBuffer();
    const contentType = audioResponse.headers.get('content-type') || 'audio/mpeg';

    return new Response(audioData, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': contentType,
        'Content-Length': audioData.byteLength.toString(),
        'Cache-Control': 'public, max-age=3600',
      },
    });

  } catch (error) {
    console.error('Error proxying recording:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
