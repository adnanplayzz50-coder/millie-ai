import { createFileRoute } from "@tanstack/react-router";
import { ChatView } from "@/components/chat/ChatView";

export const Route = createFileRoute("/_app/chat/$id")({
  head: () => ({
    meta: [
      { title: "Chat — Millie AI" },
      { name: "description", content: "Your conversation with Millie." },
      { property: "og:title", content: "Chat — Millie AI" },
      { property: "og:description", content: "Your conversation with Millie." },
    ],
  }),
  component: ChatPage,
});

function ChatPage() {
  const { id } = Route.useParams();
  return <ChatView conversationId={id} />;
}
