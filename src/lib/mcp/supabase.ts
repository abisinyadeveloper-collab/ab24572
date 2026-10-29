import { createClient } from "@supabase/supabase-js";
import type { ToolContext } from "@lovable.dev/mcp-js";
import type { Database } from "@/integrations/supabase/types";

function supabaseProjectUrl() {
  const url = process.env['SUPABASE_URL'] ?? import.meta.env['VITE_SUPABASE_URL'];
  if (!url) throw new Error("Backend URL is not configured");
  return url;
}
function supabasePublishableKey() {
  const key = process.env['SUPABASE_PUBLISHABLE_KEY'] ?? import.meta.env['VITE_SUPABASE_PUBLISHABLE_KEY'];
  if (!key) throw new Error("Backend key is not configured");
  return key;
}

export function supabaseForUser(ctx: ToolContext) {
  const token = ctx.getToken();
  if (!token) throw new Error("supabaseForUser requires a verified OAuth token");
  return createClient<Database>(supabaseProjectUrl(), supabasePublishableKey(), {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
