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
  name: "list_alerts",
  title: "List alerts",
  description:
    "List health/emergency alerts for elders the signed-in user has access to. Filter by elder or by unresolved status.",
  inputSchema: {
    elder_id: z.string().uuid().optional().describe("Optional elder UUID to filter by."),
    only_unresolved: z.boolean().default(true).describe("If true, only return alerts that have not been resolved."),
    limit: z.number().int().min(1).max(50).default(20),
  },
  annotations: { readOnlyHint: true, openWorldHint: false },
  handler: async ({ elder_id, only_unresolved, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("alerts")
      .select("id, elder_id, alert_type, severity, message, resolved, created_at")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (elder_id) query = query.eq("elder_id", elder_id);
    if (only_unresolved) query = query.eq("resolved", false);

    const { data, error } = await query;
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { alerts: data ?? [] },
    };
  },
});
