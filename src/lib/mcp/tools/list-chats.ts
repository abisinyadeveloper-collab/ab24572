import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_chats",
  title: "List chats",
  description: "List your most recent Ghost conversations with their IDs and titles.",
  inputSchema: { limit: z.number().int().min(1).max(50).optional().describe("How many chats to return (default 20).") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    const { data, error } = await supabaseForUser(ctx)
      .from("ghost_threads").select("id,title,updated_at").order("updated_at", { ascending: false }).limit(limit ?? 20);
    if (error) throw new ToolError("Could not load chats.");
    const chats = (data ?? []).map((t) => ({ id: t.id, title: t.title, updated_at: t.updated_at }));
    return {
      content: [{ type: "text", text: chats.length ? chats.map((c) => `${c.id}: ${c.title}`).join("\n") : "No chats yet." }],
      structuredContent: { chats },
    };
  },
});
