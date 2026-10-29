import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export const listMemories = defineTool({
  name: "list_memories",
  title: "List memories",
  description: "List the facts Ghost remembers about you.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    const { data, error } = await supabaseForUser(ctx).from("ghost_memories").select("id,fact,created_at").order("created_at", { ascending: false }).limit(100);
    if (error) throw new ToolError("Could not load memories.");
    const memories = (data ?? []).map((m) => ({ id: m.id, fact: m.fact, created_at: m.created_at }));
    return {
      content: [{ type: "text", text: memories.length ? memories.map((m) => `- ${m.fact}`).join("\n") : "No memories saved." }],
      structuredContent: { memories },
    };
  },
});

export const addMemory = defineTool({
  name: "add_memory",
  title: "Add memory",
  description: "Save a fact about you that Ghost should remember across chats.",
  inputSchema: { fact: z.string().trim().min(1).max(500).describe("The fact to remember.") },
  annotations: { readOnlyHint: false, idempotentHint: false, openWorldHint: false },
  handler: async ({ fact }, ctx) => {
    const userId = ctx.getUserId();
    if (!userId) throw new ToolError("Not signed in.");
    const { error } = await supabaseForUser(ctx).from("ghost_memories").insert({ user_id: userId, fact });
    if (error) throw new ToolError("Could not save memory.");
    return { content: [{ type: "text", text: `Remembered: ${fact}` }] };
  },
});
