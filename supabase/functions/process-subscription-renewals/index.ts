import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// This function is called by cron job, no CORS needed for browser access
const corsHeaders = {
  "Access-Control-Allow-Origin": "https://sentiocare.lovable.app",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    const razorpayKeyId = Deno.env.get("RAZORPAY_KEY_ID")!;
    const razorpayKeySecret = Deno.env.get("RAZORPAY_KEY_SECRET")!;

    const now = new Date();

    // Find subscriptions that need auto-renewal (expired today or in past, with auto_renewal_enabled)
    const { data: expiredSubscriptions, error: fetchError } = await supabase
      .from("profiles")
      .select("id, user_id, full_name, subscription_tier, subscription_expires_at, auto_renewal_enabled")
      .eq("auto_renewal_enabled", true)
      .eq("subscription_status", "active")
      .lte("subscription_expires_at", now.toISOString())
      .not("subscription_expires_at", "is", null);

    if (fetchError) {
      console.error("Error fetching expired subscriptions:", fetchError);
      throw fetchError;
    }

    console.log(`Found ${expiredSubscriptions?.length || 0} subscriptions to renew`);

    const results = [];

    for (const profile of expiredSubscriptions || []) {
      try {
        // Get user's default payment method
        const { data: paymentMethod, error: pmError } = await supabase
          .from("payment_methods")
          .select("razorpay_token_id, card_last4")
          .eq("user_id", profile.user_id)
          .eq("is_default", true)
          .single();

        if (pmError || !paymentMethod) {
          console.log(`No saved payment method for user ${profile.user_id}, skipping auto-renewal`);
          // Mark subscription as expired
          await supabase
            .from("profiles")
            .update({ subscription_status: "expired" })
            .eq("user_id", profile.user_id);
          continue;
        }

        // Get user email
        const { data: userData } = await supabase.auth.admin.getUserById(profile.user_id);
        const userEmail = userData?.user?.email || "";

        // Determine amount based on tier
        const pricing = {
          basic: 29900, // ₹299 in paise
          premium: 69900, // ₹699 in paise
        };
        const amount = pricing[profile.subscription_tier as keyof typeof pricing] || pricing.basic;

        // Create order for recurring payment
        const orderResponse = await fetch("https://api.razorpay.com/v1/orders", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Basic ${btoa(`${razorpayKeyId}:${razorpayKeySecret}`)}`,
          },
          body: JSON.stringify({
            amount,
            currency: "INR",
            receipt: `renewal_${profile.user_id.slice(0, 8)}_${Date.now()}`,
            notes: {
              user_id: profile.user_id,
              plan_id: profile.subscription_tier,
              type: "auto_renewal",
            },
          }),
        });

        if (!orderResponse.ok) {
          console.error(`Failed to create order for user ${profile.user_id}`);
          continue;
        }

        const order = await orderResponse.json();

        // Create recurring payment using saved token
        const paymentResponse = await fetch("https://api.razorpay.com/v1/payments/create/recurring", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Basic ${btoa(`${razorpayKeyId}:${razorpayKeySecret}`)}`,
          },
          body: JSON.stringify({
            email: userEmail,
            contact: "",
            amount,
            currency: "INR",
            order_id: order.id,
            token: paymentMethod.razorpay_token_id,
            recurring: "1",
            description: `Sentio ${profile.subscription_tier} plan renewal`,
            notes: {
              user_id: profile.user_id,
              plan_id: profile.subscription_tier,
            },
          }),
        });

        if (paymentResponse.ok) {
          const payment = await paymentResponse.json();

          // Calculate new expiry date (1 month from now)
          const newExpiry = new Date();
          newExpiry.setMonth(newExpiry.getMonth() + 1);

          // Update subscription
          await supabase
            .from("profiles")
            .update({
              subscription_expires_at: newExpiry.toISOString(),
              last_payment_at: now.toISOString(),
              updated_at: now.toISOString(),
            })
            .eq("user_id", profile.user_id);

          // Record payment
          await supabase.from("payment_history").insert({
            user_id: profile.user_id,
            razorpay_payment_id: payment.razorpay_payment_id,
            razorpay_order_id: order.id,
            amount,
            plan_id: profile.subscription_tier,
            is_auto_renewal: true,
            status: "success",
          });

          results.push({ user_id: profile.user_id, status: "renewed" });
          console.log(`Auto-renewed subscription for user ${profile.user_id}`);
        } else {
          const errorText = await paymentResponse.text();
          console.error(`Payment failed for user ${profile.user_id}:`, errorText);

          // Mark as expired if payment fails
          await supabase
            .from("profiles")
            .update({ subscription_status: "expired" })
            .eq("user_id", profile.user_id);

          results.push({ user_id: profile.user_id, status: "failed" });
        }
      } catch (error) {
        console.error(`Error processing renewal for user ${profile.user_id}:`, error);
        results.push({ user_id: profile.user_id, status: "error", error: String(error) });
      }
    }

    return new Response(
      JSON.stringify({ processed: results.length, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error processing renewals:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
