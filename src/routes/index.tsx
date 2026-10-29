import { createFileRoute } from "@tanstack/react-router";
import { GhostWorkspace } from "@/components/ghost-workspace";
export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ABISINYA GHOST — Your intelligence workspace" },
      {
        name: "description",
        content:
          "Think, build, and solve with Ghost: GPT-6 Astra and Claude Fable 5.1 in one private workspace.",
      },
      { property: "og:title", content: "ABISINYA GHOST — Your intelligence workspace" },
      {
        property: "og:description",
        content:
          "A two-model assistant for coding, planning, creative work, and defensive analysis.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: GhostWorkspace,
});
