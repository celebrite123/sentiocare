import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateOrganizationRequest {
  name: string;
  type: "hospital" | "nursing_home" | "assisted_living" | "home_care" | "other";
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  default_language?: string;
  hospital_contact_number?: string;
  monthly_patient_limit?: number;
  monthly_sms_limit?: number;
  monthly_call_limit?: number;
  voice_enabled?: boolean;
  bolna_agent_id?: string;
  bolna_agent_id_hindi?: string;
  lead_id?: string; // Optional: link to existing B2B lead
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create admin client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Create regular client to verify caller
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: { headers: { Authorization: authHeader } },
        auth: { autoRefreshToken: false, persistSession: false },
      }
    );

    // Verify caller is platform admin
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is platform admin
    const { data: adminRole } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (!adminRole) {
      return new Response(
        JSON.stringify({ error: "Only platform admins can create organizations" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: CreateOrganizationRequest = await req.json();

    if (!body.name || body.name.length < 2) {
      return new Response(
        JSON.stringify({ error: "Organization name is required (min 2 characters)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!body.type) {
      return new Response(
        JSON.stringify({ error: "Organization type is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create the organization
    const { data: org, error: orgError } = await supabaseAdmin
      .from("organizations")
      .insert({
        name: body.name,
        type: body.type,
        contact_email: body.contact_email || null,
        contact_phone: body.contact_phone || null,
        address: body.address || null,
        default_language: body.default_language || "hindi",
        hospital_contact_number: body.hospital_contact_number || null,
        monthly_patient_limit: body.monthly_patient_limit || 500,
        monthly_sms_limit: body.monthly_sms_limit || 5000,
        monthly_call_limit: body.monthly_call_limit || 1000,
        voice_enabled: body.voice_enabled !== false,
        bolna_agent_id: body.bolna_agent_id || null,
        bolna_agent_id_hindi: body.bolna_agent_id_hindi || null,
      })
      .select()
      .single();

    if (orgError) {
      console.error("Error creating organization:", orgError);
      return new Response(
        JSON.stringify({ error: `Failed to create organization: ${orgError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If linked to a lead, update the lead status to converted
    if (body.lead_id) {
      await supabaseAdmin
        .from("b2b_leads")
        .update({ status: "converted" })
        .eq("id", body.lead_id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Organization created successfully",
        organization: org,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});