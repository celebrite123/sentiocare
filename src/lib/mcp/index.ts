import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listEldersTool from "./tools/list-elders";
import getElderDetailsTool from "./tools/get-elder-details";
import listRecentCheckinsTool from "./tools/list-recent-checkins";
import listAlertsTool from "./tools/list-alerts";

// Direct Supabase issuer (never the .lovable.cloud proxy).
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "sentio-mcp",
  title: "Sentio AI",
  version: "0.1.0",
  instructions:
    "Sentio AI monitors elderly patients through voice and WhatsApp check-ins. Use list_elders to find elders the signed-in user cares for, then get_elder_details for a profile, list_recent_checkins for recent AI conversations, and list_alerts for outstanding health/emergency alerts.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listEldersTool, getElderDetailsTool, listRecentCheckinsTool, listAlertsTool],
});
