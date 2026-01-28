import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type SubscriptionTier = "basic" | "premium";
export type SubscriptionStatus = "trial" | "active" | "expired";

interface SubscriptionState {
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  trialEndsAt: Date | null;
  expiresAt: Date | null;
  loading: boolean;
  canUseVoice: boolean;
  canUseWhatsApp: boolean;
  isTrialActive: boolean;
  isTrialExpired: boolean;
  trialDaysLeft: number;
  elderCount: number;
  maxElders: number;
  canAddElder: boolean;
  isCancelled: boolean;
}

// Cache TTL: 30 seconds - prevents redundant API calls across components
const CACHE_TTL_MS = 30000;

export const useSubscription = () => {
  const { user } = useAuth();
  const [state, setState] = useState<SubscriptionState>({
    tier: "basic",
    status: "trial",
    trialEndsAt: null,
    expiresAt: null,
    loading: true,
    canUseVoice: false,
    canUseWhatsApp: true,
    isTrialActive: false,
    isTrialExpired: false,
    trialDaysLeft: 0,
    elderCount: 0,
    maxElders: 1,
    canAddElder: true,
    isCancelled: false,
  });
  
  const lastFetchedRef = useRef<number>(0);
  const isFetchingRef = useRef<boolean>(false);

  useEffect(() => {
    if (user) {
      // Use cached data if still fresh
      const now = Date.now();
      if (now - lastFetchedRef.current < CACHE_TTL_MS && !state.loading) {
        return; // Data is still fresh, skip fetch
      }
      loadSubscription();
    } else {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [user]);

  const loadSubscription = useCallback(async () => {
    // Prevent concurrent fetches
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("id, subscription_tier, subscription_status, trial_ends_at, subscription_expires_at, cancellation_requested_at")
        .eq("user_id", user!.id)
        .single();

      if (error) {
        // If no profile found (PGRST116), treat as new user in trial - don't show expired
        if (error.code === "PGRST116") {
          setState(prev => ({ 
            ...prev, 
            loading: false,
            status: "trial",
            isTrialActive: true,
            isTrialExpired: false,
            trialDaysLeft: 5,
            canUseVoice: true,
            canUseWhatsApp: true,
          }));
          return;
        }
        console.error("Error loading subscription:", error);
        setState(prev => ({ ...prev, loading: false }));
        return;
      }

      // Count current elders
      let elderCount = 0;
      if (profile) {
        const { count } = await supabase
          .from("elders")
          .select("*", { count: "exact", head: true })
          .eq("family_member_id", profile.id);
        elderCount = count || 0;
      }

      const tier = (profile?.subscription_tier as SubscriptionTier) || "basic";
      const status = (profile?.subscription_status as SubscriptionStatus) || "trial";
      const trialEndsAt = profile?.trial_ends_at ? new Date(profile.trial_ends_at) : null;
      const expiresAt = profile?.subscription_expires_at ? new Date(profile.subscription_expires_at) : null;
      const isCancelled = !!(profile as any)?.cancellation_requested_at;
      
      // Calculate trial days left
      const now = new Date();
      const trialDaysLeft = trialEndsAt 
        ? Math.max(0, Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
        : 0;
      
      const isTrialActive = status === "trial" && trialDaysLeft > 0;
      const isTrialExpired = status === "trial" && trialDaysLeft <= 0;
      
      // During trial, all features are available
      // After trial, features depend on tier
      const isPremiumOrTrial = tier === "premium" || isTrialActive;
      
      // 1 elder per subscription
      const maxElders = 1;
      const canAddElder = elderCount < maxElders;
      
      setState({
        tier,
        status,
        trialEndsAt,
        expiresAt,
        loading: false,
        canUseVoice: isPremiumOrTrial,
        canUseWhatsApp: true, // All tiers get WhatsApp
        isTrialActive,
        isTrialExpired,
        trialDaysLeft,
        elderCount,
        maxElders,
        canAddElder,
        isCancelled,
      });
      lastFetchedRef.current = Date.now(); // Update cache timestamp
    } catch (error) {
      console.error("Error loading subscription:", error);
      setState(prev => ({ ...prev, loading: false }));
    } finally {
      isFetchingRef.current = false;
    }
  }, [user]);

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

  const cancelSubscription = async () => {
    if (!user) return false;
    
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ 
          auto_renewal_enabled: false,
          cancellation_requested_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      if (error) throw error;
      
      await loadSubscription();
      return true;
    } catch (error) {
      console.error("Error cancelling subscription:", error);
      return false;
    }
  };

  return { ...state, updateTier, cancelSubscription, refetch: loadSubscription };
};
