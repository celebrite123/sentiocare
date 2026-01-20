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

const allowedOrigins = [
  "https://sentiocare.lovable.app",
];

const getCorsHeaders = (origin: string | null) => {
  // Allow production domain and all Lovable preview domains
  const isAllowed = origin && (
    allowedOrigins.includes(origin) ||
    origin.endsWith(".lovable.app") // Allow all Lovable preview domains
  );
  return {
    "Access-Control-Allow-Origin": isAllowed ? origin : allowedOrigins[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Credentials": "true",
  };
};

serve(async (req) => {
  const origin = req.headers.get("Origin");
  const corsHeaders = getCorsHeaders(origin);

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

    // IDEMPOTENCY CHECK: Prevent duplicate payment processing
    const { data: existingPayment } = await supabase
      .from("payment_history")
      .select("id")
      .eq("razorpay_payment_id", razorpay_payment_id)
      .single();

    if (existingPayment) {
      console.log(`Payment ${razorpay_payment_id} already processed, returning success`);
      return new Response(
        JSON.stringify({
          success: true,
          message: "Payment already processed",
          plan: plan_id,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
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

    // Payment verified, calculate expiry date (1 month from now)
    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + 1);

    // Update subscription
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        subscription_tier: plan_id,
        subscription_status: "active",
        trial_ends_at: null, // Clear trial since user paid
        subscription_expires_at: expiryDate.toISOString(),
        last_payment_at: new Date().toISOString(),
        auto_renewal_enabled: true, // Enable auto-renewal by default
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

    // Record payment history
    await supabase.from("payment_history").insert({
      user_id: user.id,
      razorpay_payment_id,
      razorpay_order_id,
      amount: plan_id === "premium" ? 69900 : 29900,
      plan_id,
      status: "success",
      is_auto_renewal: false,
    });

    // Log the payment (without PII)
    console.log(`Payment successful: plan=${plan_id}, payment_id=${razorpay_payment_id}`);

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
      headers: { ...getCorsHeaders(req.headers.get("Origin")), "Content-Type": "application/json" },
    });
  }
});