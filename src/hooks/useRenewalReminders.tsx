import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface RenewalReminder {
  daysUntilExpiry: number;
  expiryDate: Date | null;
  autoRenewalEnabled: boolean;
  hasPaymentMethod: boolean;
  showReminder: boolean;
}

export const useRenewalReminders = () => {
  const { user } = useAuth();
  const [reminder, setReminder] = useState<RenewalReminder>({
    daysUntilExpiry: 999,
    expiryDate: null,
    autoRenewalEnabled: true,
    hasPaymentMethod: false,
    showReminder: false,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      checkRenewalStatus();
    } else {
      setLoading(false);
    }
  }, [user]);

  const checkRenewalStatus = async () => {
    try {
      // Get profile with subscription info
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("subscription_expires_at, auto_renewal_enabled, subscription_status")
        .eq("user_id", user!.id)
        .single();

      if (profileError || !profile) {
        setLoading(false);
        return;
      }

      // Check if user has a saved payment method
      const { count: paymentMethodCount } = await supabase
        .from("payment_methods")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user!.id);

      const hasPaymentMethod = (paymentMethodCount || 0) > 0;

      if (!profile.subscription_expires_at || profile.subscription_status !== "active") {
        setReminder({
          daysUntilExpiry: 999,
          expiryDate: null,
          autoRenewalEnabled: profile.auto_renewal_enabled ?? true,
          hasPaymentMethod,
          showReminder: false,
        });
        setLoading(false);
        return;
      }

      const expiryDate = new Date(profile.subscription_expires_at);
      const now = new Date();
      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      // Show reminder if:
      // - 3 days or less until expiry
      // - AND (auto-renewal is disabled OR no payment method)
      const shouldShow = daysUntilExpiry <= 3 && 
        (!profile.auto_renewal_enabled || !hasPaymentMethod);

      setReminder({
        daysUntilExpiry,
        expiryDate,
        autoRenewalEnabled: profile.auto_renewal_enabled ?? true,
        hasPaymentMethod,
        showReminder: shouldShow,
      });
    } catch (error) {
      console.error("Error checking renewal status:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleAutoRenewal = async (enabled: boolean) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ auto_renewal_enabled: enabled })
        .eq("user_id", user.id);

      if (error) throw error;

      setReminder(prev => ({ ...prev, autoRenewalEnabled: enabled }));
      return true;
    } catch (error) {
      console.error("Error toggling auto-renewal:", error);
      return false;
    }
  };

  return { ...reminder, loading, toggleAutoRenewal, refetch: checkRenewalStatus };
};
