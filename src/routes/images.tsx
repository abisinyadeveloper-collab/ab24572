import { createFileRoute } from "@tanstack/react-router";
import { GhostWorkspace } from "@/components/ghost-workspace";
export const Route = createFileRoute("/images")({ head: () => ({ meta: [
  { title: "Ghost Images — Create and edit" }, { name: "description", content: "Create high-quality images, edit your photos, and save them privately with Ghost." },
  { property: "og:title", content: "Ghost Images — Create and edit" }, { property: "og:description", content: "Your private image creation and editing studio." },
  { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
] }), component: () => <GhostWorkspace initialView="image" /> });