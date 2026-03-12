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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Verify auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Verify admin role
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (roleError || !roleData) {
      return new Response(JSON.stringify({ error: 'Forbidden - Admin access required' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { action, elderId } = await req.json();

    // LIST: Return all elders with basic info
    if (action === 'list') {
      const { data: elders, error: eldersError } = await supabaseAdmin
        .from('elders')
        .select('id, full_name, phone_number, preferred_language, check_in_method, medical_conditions, age')
        .order('full_name');

      if (eldersError) {
        console.error('Error fetching elders:', eldersError);
        return new Response(JSON.stringify({ error: 'Failed to fetch elders' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({ elders: elders || [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // CALL: Trigger a voice call to a specific elder
    if (action === 'call') {
      if (!elderId) {
        return new Response(JSON.stringify({ error: 'elderId is required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      console.log(`Admin ${user.id} triggering demo call for elder ${elderId}`);

      const [{ data: elder, error: elderError }, { data: medicines, error: medicinesError }] = await Promise.all([
        supabaseAdmin
          .from('elders')
          .select('id, full_name, phone_number, preferred_language, medical_conditions')
          .eq('id', elderId)
          .single(),
        supabaseAdmin
          .from('medicines')
          .select('name, purpose, dosage, timing, frequency, active')
          .eq('elder_id', elderId)
          .eq('active', true),
      ]);

      if (elderError || !elder) {
        console.error('Elder lookup failed:', elderError);
        return new Response(JSON.stringify({ error: 'Elder not found' }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      if (medicinesError) {
        console.error('Medicine lookup failed:', medicinesError);
        return new Response(JSON.stringify({ error: 'Failed to fetch medicines for elder' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Call bolna-voice-call using service role key to bypass ownership checks
      const callResponse = await fetch(`${supabaseUrl}/functions/v1/bolna-voice-call`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({
          elderId: elder.id,
          elderName: elder.full_name,
          elderPhone: elder.phone_number,
          medicines: medicines || [],
          medicalConditions: elder.medical_conditions || [],
          preferredLanguage: elder.preferred_language || 'english',
          isEmergency: false,
        }),
      });

      const callResult = await callResponse.json();

      if (!callResponse.ok || callResult?.success === false || callResult?.error) {
        console.error('Call failed:', callResult);
        return new Response(JSON.stringify({ error: callResult?.error || 'Call failed' }), {
          status: callResponse.ok ? 500 : callResponse.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({ success: true, ...callResult }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action. Use "list" or "call"' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error('Error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
