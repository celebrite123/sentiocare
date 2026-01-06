import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type SubscriptionTier = "basic" | "premium";
export type SubscriptionStatus = "trial" | "active" | "expired";

interface SubscriptionState {
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  trialEndsAt: Date | null;
  loading: boolean;
  canUseVoice: boolean;
  canUseWhatsApp: boolean;
  isTrialActive: boolean;
  trialDaysLeft: number;
}

export const useSubscription = () => {
  const { user } = useAuth();
  const [state, setState] = useState<SubscriptionState>({
    tier: "basic",
    status: "trial",
    trialEndsAt: null,
    loading: true,
    canUseVoice: false,
    canUseWhatsApp: true,
    isTrialActive: false,
    trialDaysLeft: 0,
  });

  useEffect(() => {
    if (user) {
      loadSubscription();
    } else {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [user]);

  const loadSubscription = async () => {
    try {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("subscription_tier, subscription_status, trial_ends_at")
        .eq("user_id", user!.id)
        .single();

      if (error) {
        console.error("Error loading subscription:", error);
        setState(prev => ({ ...prev, loading: false }));
        return;
      }

      const tier = (profile?.subscription_tier as SubscriptionTier) || "basic";
      const status = (profile?.subscription_status as SubscriptionStatus) || "trial";
      const trialEndsAt = profile?.trial_ends_at ? new Date(profile.trial_ends_at) : null;
      
      // Calculate trial days left
      const now = new Date();
      const trialDaysLeft = trialEndsAt 
        ? Math.max(0, Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
        : 0;
      
      const isTrialActive = status === "trial" && trialDaysLeft > 0;
      
      // During trial, all features are available
      // After trial, features depend on tier
      const isPremiumOrTrial = tier === "premium" || isTrialActive;
      
      setState({
        tier,
        status,
        trialEndsAt,
        loading: false,
        canUseVoice: isPremiumOrTrial,
        canUseWhatsApp: true, // All tiers get WhatsApp
        isTrialActive,
        trialDaysLeft,
      });
    } catch (error) {
      console.error("Error loading subscription:", error);
      setState(prev => ({ ...prev, loading: false }));
    }
  };

  const updateTier = async (newTier: SubscriptionTier) => {
    if (!user) return false;
    
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ 
          subscription_tier: newTier,
          subscription_status: "active"
        })
        .eq("user_id", user.id);

      if (error) throw error;
      
      await loadSubscription();
      return true;
    } catch (error) {
      console.error("Error updating tier:", error);
      return false;
    }
  };

  return { ...state, updateTier, refetch: loadSubscription };
};
