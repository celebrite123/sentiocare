import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
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

    const urlParams = new URL(req.url);
    const checkInId = urlParams.searchParams.get('checkInId');
    const directUrl = urlParams.searchParams.get('url');
    const patientCheckinId = urlParams.searchParams.get('patientCheckinId');

    let recordingUrl: string | null = null;

    // Option 1: B2C - Get recording from check_ins table
    if (checkInId) {
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

      recordingUrl = checkIn.recording_url;
    }
    // Option 2: B2B - Get recording from patient_checkins table
    else if (patientCheckinId) {
      const { data: checkin, error: checkinError } = await supabaseAuth
        .from("patient_checkins")
        .select("recording_url, organization_id")
        .eq("id", patientCheckinId)
        .single();

      if (checkinError || !checkin) {
        console.error("Patient checkin not found or access denied:", checkinError);
        return new Response(
          JSON.stringify({ error: 'Recording not found or access denied' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      recordingUrl = checkin.recording_url;
    }
    // Option 3: Direct URL (for backward compatibility with B2B)
    // Security: Verify the user has access to SOME patient checkin with this URL
    else if (directUrl) {
      // Validate the URL is a Bolna S3 recording URL
      if (!directUrl.includes('bolna-recordings') && !directUrl.includes('s3.') && !directUrl.includes('amazonaws.com')) {
        console.error("Invalid recording URL domain:", directUrl);
        return new Response(
          JSON.stringify({ error: 'Invalid recording URL' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verify user has access to a checkin with this recording URL
      // This prevents URL guessing attacks
      const { data: checkin, error: checkinError } = await supabaseAuth
        .from("patient_checkins")
        .select("id, organization_id")
        .eq("recording_url", directUrl)
        .single();

      if (checkinError || !checkin) {
        console.error("No access to this recording URL:", checkinError);
        return new Response(
          JSON.stringify({ error: 'Recording not found or access denied' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      recordingUrl = directUrl;
    }
    else {
      return new Response(
        JSON.stringify({ error: 'checkInId, patientCheckinId, or url is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!recordingUrl) {
      return new Response(
        JSON.stringify({ error: 'No recording available for this check-in' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch the audio from S3
    console.log("Proxying recording:", recordingUrl);
    
    const audioResponse = await fetch(recordingUrl);
    
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