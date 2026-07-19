// Ambient types for MCP tool files that execute inside the Supabase Edge Function
// (Deno) runtime but are typechecked by Vite / tsgo in this project.
declare const process: {
  env: Record<string, string | undefined>;
};
