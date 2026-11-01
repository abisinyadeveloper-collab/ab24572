import { createFileRoute } from "@tanstack/react-router";
import { GhostWorkspace } from "@/components/ghost-workspace";
export const Route = createFileRoute("/music")({ staticData: { sitemap: true }, head: () => ({ meta: [
  { title: "Ghost Music — Create songs and beats" }, { name: "description", content: "Generate Ethio-jazz, Tizita, Afrobeats and more with Ghost, saved in your private music library." },
  { property: "og:title", content: "Ghost Music — Create songs and beats" }, { property: "og:description", content: "Make original tracks with vocals or instrumentals using Ghost." },
  { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
] }), component: () => <GhostWorkspace initialView="music" /> });
