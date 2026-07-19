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
  name: "list_recent_checkins",
  title: "List recent check-ins",
  description:
    "List recent AI voice/WhatsApp check-ins for one elder, most recent first. Returns sentiment, well-being score, medicines taken, symptoms and summary.",
  inputSchema: {
    elder_id: z.string().uuid().describe("Elder UUID from list_elders."),
    limit: z.number().int().min(1).max(30).default(10).describe("How many check-ins to return (1-30)."),
  },
  annotations: { readOnlyHint: true, openWorldHint: false },
  handler: async ({ elder_id, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("check_ins")
      .select(
        "id, created_at, check_in_type, sentiment, well_being_score, medicines_taken, symptoms_reported, conversation_summary",
      )
      .eq("elder_id", elder_id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { check_ins: data ?? [] },
    };
  },
});
