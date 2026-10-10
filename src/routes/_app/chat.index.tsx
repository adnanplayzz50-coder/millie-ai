import { createFileRoute } from "@tanstack/react-router";
import { ChatView } from "@/components/chat/ChatView";

export const Route = createFileRoute("/_app/chat/")({
  validateSearch: (s: Record<string, unknown>): { project?: string } => typeof s['project'] === "string" ? { project: s['project'] } : {},
  head: () => ({
    meta: [
      { title: "New chat — Millie AI" },
      { name: "description", content: "Start a new conversation with Millie." },
      { property: "og:title", content: "New chat — Millie AI" },
      { property: "og:description", content: "Start a new conversation with Millie." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NewChat,
});

function NewChat() {
  const { project } = Route.useSearch();
  return <ChatView key={`new-${project ?? ""}`} conversationId={null} projectId={project ?? null} />;
}
