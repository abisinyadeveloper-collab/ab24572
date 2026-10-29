import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listChats from "./tools/list-chats";
import readChat from "./tools/read-chat";
import { listMemories, addMemory } from "./tools/memories";

const projectRef = import.meta.env["VITE_SUPABASE_PROJECT_ID"] ?? "project-ref-unset";

export default defineMcp({
  name: "screenshot-exact-match",
  title: "Screenshot Exact Match",
  version: "0.1.0",
  instructions: "Tools for your Ghost account: browse and read your saved chats, and view or add long-term memories.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listChats, readChat, listMemories, addMemory],
});
