import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

type Part = { type?: string; text?: string };
type Msg = { role?: string; parts?: Part[] };

export default defineTool({
  name: "read_chat",
  title: "Read chat",
  description: "Read the text messages of one of your Ghost conversations by ID.",
  inputSchema: { id: z.string().uuid().describe("Chat ID from list_chats.") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ id }, ctx) => {
    const { data, error } = await supabaseForUser(ctx).from("ghost_threads").select("title,messages").eq("id", id).maybeSingle();
    if (error) throw new ToolError("Could not load chat.");
    if (!data) throw new ToolError("Chat not found.");
    const msgs = (Array.isArray(data.messages) ? (data.messages as Msg[]) : []).map((m) => ({
      role: String(m.role ?? ""),
      text: (m.parts ?? []).filter((p) => p.type === "text").map((p) => p.text ?? "").join("\n"),
    })).filter((m) => m.text);
    return {
      content: [{ type: "text", text: `# ${data.title}\n\n` + msgs.map((m) => `${m.role}: ${m.text}`).join("\n\n") }],
      structuredContent: { title: data.title, messages: msgs },
    };
  },
});
