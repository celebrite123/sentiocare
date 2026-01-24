import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface StaffMember {
  name: string;
  email: string;
  phone?: string;
  role: "admin" | "staff" | "nurse";
  can_upload_patients?: boolean;
  can_view_reports?: boolean;
  can_manage_staff?: boolean;
}

interface CreateStaffRequest {
  organization_id: string;
  staff: StaffMember;
  temporary_password: string;
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

    // Create admin client for user creation
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Create regular client to verify caller is admin
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
        JSON.stringify({ error: "Only platform admins can create staff members" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: CreateStaffRequest = await req.json();
    const { organization_id, staff, temporary_password } = body;

    if (!organization_id || !staff || !temporary_password) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate email
    if (!staff.email || !staff.email.includes("@")) {
      return new Response(
        JSON.stringify({ error: "Invalid email address" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate password
    if (temporary_password.length < 8) {
      return new Response(
        JSON.stringify({ error: "Password must be at least 8 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if organization exists
    const { data: org, error: orgError } = await supabaseAdmin
      .from("organizations")
      .select("id, name")
      .eq("id", organization_id)
      .single();

    if (orgError || !org) {
      return new Response(
        JSON.stringify({ error: "Organization not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user with email already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === staff.email);

    let userId: string;

    if (existingUser) {
      // Check if already a member of this organization
      const { data: existingMember } = await supabaseAdmin
        .from("organization_members")
        .select("id")
        .eq("organization_id", organization_id)
        .eq("user_id", existingUser.id)
        .single();

      if (existingMember) {
        return new Response(
          JSON.stringify({ error: "User is already a member of this organization" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      userId = existingUser.id;
    } else {
      // Create new auth user
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: staff.email,
        password: temporary_password,
        email_confirm: true,
        user_metadata: {
          full_name: staff.name,
          organization_id: organization_id,
        },
      });

      if (createError) {
        console.error("Error creating user:", createError);
        return new Response(
          JSON.stringify({ error: `Failed to create user: ${createError.message}` }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      userId = newUser.user.id;
    }

    // Add user to organization_members
    const { data: member, error: memberError } = await supabaseAdmin
      .from("organization_members")
      .insert({
        organization_id,
        user_id: userId,
        name: staff.name,
        email: staff.email,
        phone: staff.phone || null,
        role: staff.role,
        can_upload_patients: staff.can_upload_patients ?? true,
        can_view_reports: staff.can_view_reports ?? true,
        can_manage_staff: staff.can_manage_staff ?? (staff.role === "admin"),
      })
      .select()
      .single();

    if (memberError) {
      console.error("Error adding member:", memberError);
      return new Response(
        JSON.stringify({ error: `Failed to add member: ${memberError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Staff member created successfully",
        member: {
          id: member.id,
          user_id: userId,
          name: staff.name,
          email: staff.email,
          role: staff.role,
        },
        credentials: {
          email: staff.email,
          temporary_password: temporary_password,
          login_url: `${req.headers.get("origin")}/b2b/login`,
        },
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