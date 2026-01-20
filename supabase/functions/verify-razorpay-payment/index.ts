import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// HMAC SHA256 signature verification using Web Crypto API
async function verifySignature(message: string, secret: string, signature: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  const computedSignature = Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return computedSignature === signature;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan_id } = await req.json();

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !plan_id) {
      return new Response(JSON.stringify({ error: "Missing payment details" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const razorpayKeySecret = Deno.env.get("RAZORPAY_KEY_SECRET");
    if (!razorpayKeySecret) {
      return new Response(JSON.stringify({ error: "Payment system not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify signature using HMAC SHA256
    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const isValidSignature = await verifySignature(body, razorpayKeySecret, razorpay_signature);

    if (!isValidSignature) {
      console.error("Payment signature verification failed");
      return new Response(JSON.stringify({ error: "Invalid payment signature" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Payment verified, update subscription
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        subscription_tier: plan_id,
        subscription_status: "active",
        trial_ends_at: null, // Clear trial since user paid
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);

    if (updateError) {
      console.error("Failed to update subscription:", updateError);
      return new Response(JSON.stringify({ error: "Failed to update subscription" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Log the payment (optional - for records)
    console.log(`Payment successful: user=${user.id}, plan=${plan_id}, payment_id=${razorpay_payment_id}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Payment verified and subscription activated",
        plan: plan_id,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error verifying payment:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
