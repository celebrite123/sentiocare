import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useRazorpay as useRazorpayLib, RazorpayOrderOptions } from "react-razorpay";

interface PaymentResult {
  success: boolean;
  plan?: string;
}

export const useRazorpayPayment = () => {
  const { Razorpay, isLoading: razorpayLoading } = useRazorpayLib();
  const [isProcessing, setIsProcessing] = useState(false);

  const initiatePayment = useCallback(
    async (planId: "basic" | "premium"): Promise<PaymentResult> => {
      setIsProcessing(true);

      try {
        // Get auth session
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          toast({
            title: "Not Authenticated",
            description: "Please log in to continue.",
            variant: "destructive",
          });
          return { success: false };
        }

        // Create order on server
        const { data: orderData, error: orderError } = await supabase.functions.invoke(
          "create-razorpay-order",
          {
            body: { plan_id: planId },
          }
        );

        if (orderError || !orderData?.order_id) {
          console.error("Order creation failed:", orderError);
          toast({
            title: "Payment Error",
            description: orderData?.error || "Failed to initiate payment. Please try again.",
            variant: "destructive",
          });
          return { success: false };
        }

        // Open Razorpay checkout
        return new Promise((resolve) => {
          const options: RazorpayOrderOptions = {
            key: orderData.key_id,
            amount: orderData.amount,
            currency: orderData.currency,
            name: "Sentio AI",
            description: `${planId === "premium" ? "Premium" : "Basic"} Plan Subscription`,
            order_id: orderData.order_id,
            prefill: orderData.prefill,
            theme: {
              color: "#3B9C9C", // Brand teal color
            },
            handler: async (response) => {
              // Verify payment on server
              try {
                const { data: verifyData, error: verifyError } = await supabase.functions.invoke(
                  "verify-razorpay-payment",
                  {
                    body: {
                      razorpay_order_id: response.razorpay_order_id,
                      razorpay_payment_id: response.razorpay_payment_id,
                      razorpay_signature: response.razorpay_signature,
                      plan_id: planId,
                    },
                  }
                );

                if (verifyError || !verifyData?.success) {
                  console.error("Payment verification failed:", verifyError);
                  toast({
                    title: "Payment Verification Failed",
                    description: "Please contact support if amount was deducted.",
                    variant: "destructive",
                  });
                  resolve({ success: false });
                  return;
                }

                toast({
                  title: "Payment Successful! 🎉",
                  description: `Your ${planId === "premium" ? "Premium" : "Basic"} plan is now active.`,
                });
                resolve({ success: true, plan: planId });
              } catch (error) {
                console.error("Verification error:", error);
                toast({
                  title: "Payment Error",
                  description: "Please contact support.",
                  variant: "destructive",
                });
                resolve({ success: false });
              } finally {
                setIsProcessing(false);
              }
            },
            modal: {
              ondismiss: () => {
                setIsProcessing(false);
                resolve({ success: false });
              },
            },
          };

          const razorpayInstance = new Razorpay(options);
          razorpayInstance.on("payment.failed", (response: { error: { description: string } }) => {
            console.error("Payment failed:", response.error);
            toast({
              title: "Payment Failed",
              description: response.error.description || "Please try again.",
              variant: "destructive",
            });
            setIsProcessing(false);
            resolve({ success: false });
          });
          razorpayInstance.open();
        });
      } catch (error) {
        console.error("Payment error:", error);
        toast({
          title: "Payment Error",
          description: "Something went wrong. Please try again.",
          variant: "destructive",
        });
        setIsProcessing(false);
        return { success: false };
      }
    },
    [Razorpay]
  );

  return {
    initiatePayment,
    isLoading: razorpayLoading || isProcessing,
  };
};
