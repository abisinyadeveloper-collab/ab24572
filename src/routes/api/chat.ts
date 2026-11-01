import { createFileRoute } from "@tanstack/react-router";
import { handleGhostChat } from "@/lib/ghost-chat.server";
export const Route = createFileRoute("/api/chat")({
  staticData: { sitemap: false },
  server: { handlers: { POST: ({ request }) => handleGhostChat(request) } },
});
