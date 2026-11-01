import { createFileRoute } from "@tanstack/react-router";
import { handleTelegramWebhook } from "@/lib/telegram-bot.server";

export const Route = createFileRoute("/api/public/telegram/webhook")({
  staticData: { sitemap: false },
  server: { handlers: { POST: ({ request }) => handleTelegramWebhook(request) } },
});
