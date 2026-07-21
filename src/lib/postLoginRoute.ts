import type { NavigateFunction } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

// Only allow same-origin relative paths for post-auth redirects.
export const getSafeNextPath = (): string | null => {
  try {
    const raw = new URLSearchParams(window.location.search).get("next");
    if (raw && raw.startsWith("/") && !raw.startsWith("//")) return raw;
  } catch {
    /* ignore */
  }
  return null;
};

/**
 * Determine where a signed-in user should land based on:
 *   - waitlist status
 *   - whether they have any elders yet
 *   - subscription tier
 *
 * Never navigate to /dashboard without an elder selected — go to /elders instead.
 */
export const resolvePostLoginPath = async (userId: string): Promise<string> => {
  const next = getSafeNextPath();
  if (next) return next;

  // 1. Load profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_tier, subscription_status, waitlist_status")
    .eq("user_id", userId)
    .maybeSingle();

  // 2. Waitlisted → status page
  if (!profile || profile.subscription_status === "waitlisted" || profile.waitlist_status === "pending") {
    return "/select-plan";
  }

  // 3. No plan selected yet
  if (!profile.subscription_tier) {
    return "/select-plan";
  }

  // 4. Elder onboarding vs dashboard
  const { count } = await supabase
    .from("elders")
    .select("id", { count: "exact", head: true });

  if (!count || count === 0) return "/elders";
  return "/elders";
};

export const navigatePostLogin = async (userId: string, navigate: NavigateFunction) => {
  const path = await resolvePostLoginPath(userId);
  navigate(path);
};
