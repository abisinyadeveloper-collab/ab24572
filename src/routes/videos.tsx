import { createFileRoute } from "@tanstack/react-router";
import { GhostWorkspace } from "@/components/ghost-workspace";
export const Route = createFileRoute("/videos")({ head: () => ({ meta: [
  { title: "Ghost Videos — Bring ideas to life" }, { name: "description", content: "Generate videos with sound and keep your creations in your private Ghost library." },
  { property: "og:title", content: "Ghost Videos — Bring ideas to life" }, { property: "og:description", content: "Create and save AI videos with Ghost." },
  { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
] }), component: () => <GhostWorkspace initialView="video" /> });