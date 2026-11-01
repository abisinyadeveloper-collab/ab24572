import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/api/music")({ staticData: { sitemap: false }, server: { handlers: { POST: async ({ request }) => { const { handleGhostMusic } = await import("@/lib/ghost-audio.server"); return handleGhostMusic(request); } } } });
