import { createFileRoute } from "@tanstack/react-router";
import { GhostWorkspace } from "@/components/ghost-workspace";
export const Route = createFileRoute("/chat/$threadId")({
  head: () => ({
    meta: [
      { title: "Conversation — ABISINYA GHOST" },
      { name: "description", content: "Your private conversation with the Ghost assistant." },
      { property: "og:title", content: "Conversation — ABISINYA GHOST" },
      { property: "og:description", content: "Continue your private Ghost conversation." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Thread,
});
function Thread() {
  const { threadId } = Route.useParams();
  return <GhostWorkspace key={threadId} threadId={threadId} />;
}
