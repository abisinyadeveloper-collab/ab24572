import { createFileRoute } from "@tanstack/react-router";
import { GhostWorkspace } from "@/components/ghost-workspace";
export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Ghost — Chat, create, and explore" },
      {
        name: "description",
        content:
          "Your personal Ghost assistant for private conversations, image creation and editing, video generation, and multilingual live voice.",
      },
      { property: "og:title", content: "Ghost — Chat, create, and explore" },
      {
        property: "og:description",
        content:
          "Private AI chat, creative images and videos, and live voice with Ghost.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: GhostWorkspace,
});
