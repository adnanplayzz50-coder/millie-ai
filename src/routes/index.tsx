import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { LogoMark } from "@/components/Logo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Millie AI — your thoughtful AI companion" },
      { name: "description", content: "Millie AI: a sleek AI chat and coding assistant with memory, projects, web search and voice." },
      { property: "og:title", content: "Millie AI" },
      { property: "og:description", content: "A sleek AI chat and coding assistant with memory, projects, web search and voice." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

function Index() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (!loading) navigate({ to: user ? "/chat" : "/login", replace: true });
  }, [user, loading, navigate]);
  return (
    <div className="grid min-h-dvh place-items-center">
      <LogoMark className="size-12 animate-pulse" />
    </div>
  );
}
