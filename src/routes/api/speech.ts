import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/api/speech")({ staticData: { sitemap: false }, server: { handlers: { POST: async ({ request }) => { const { handleGhostSpeech } = await import("@/lib/ghost-audio.server"); return handleGhostSpeech(request); } } } });
