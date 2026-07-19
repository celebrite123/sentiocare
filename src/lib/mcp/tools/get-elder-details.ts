declare const process: { env: Record<string, string | undefined> };

import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function supabaseForUser(ctx: ToolContext) {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}

export default defineTool({
  name: "get_elder_details",
  title: "Get elder details",
  description:
    "Get a full profile for one elder: demographics, medical conditions, current medicines, and the most recent check-in summary.",
  inputSchema: {
    elder_id: z.string().uuid().describe("Elder UUID from list_elders."),
  },
  annotations: { readOnlyHint: true, openWorldHint: false },
  handler: async ({ elder_id }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const [elderRes, medsRes, lastCheckInRes] = await Promise.all([
      supabase.from("elders").select("*").eq("id", elder_id).maybeSingle(),
      supabase.from("medicines").select("name, dosage, timing, purpose").eq("elder_id", elder_id),
      supabase
        .from("check_ins")
        .select("created_at, sentiment, well_being_score, medicines_taken, symptoms_reported, conversation_summary")
        .eq("elder_id", elder_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    if (elderRes.error || !elderRes.data) {
      return {
        content: [{ type: "text", text: elderRes.error?.message ?? "Elder not found" }],
        isError: true,
      };
    }

    const payload = {
      elder: elderRes.data,
      medicines: medsRes.data ?? [],
      last_check_in: lastCheckInRes.data ?? null,
    };
    return {
      content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
      structuredContent: payload,
    };
  },
});
