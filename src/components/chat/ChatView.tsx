import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { AlertCircle, Download, ExternalLink, Globe, Menu, Square, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LogoMark } from "@/components/Logo";
import { Markdown } from "./Markdown";
import { Composer } from "./Composer";
import { type ChatMessage, loadMessages, sendMessage, toMarkdown, useChatStore } from "@/lib/chat-store";
import { useUI, type Mode } from "@/lib/ui-store";
import { useSettings } from "@/lib/settings";
import { speak, stopSpeaking } from "@/lib/speech";
import { cn } from "@/lib/utils";

const STARTERS: Record<Mode, { title: string; prompt: string }[]> = {
  chat: [
    { title: "Plan my week", prompt: "Help me plan a balanced week with time for work, rest and my hobbies." },
    { title: "Explain simply", prompt: "Explain how large language models work, like I'm curious but not technical." },
    { title: "What's new today?", prompt: "What are the top tech news headlines today?" },
    { title: "Write with me", prompt: "Help me write a warm, short thank-you note to a friend." },
  ],
  code: [
    { title: "Debounce in JS", prompt: "Write a debounce function in JavaScript with a small runnable demo using console.log." },
    { title: "Review my code", prompt: "Review this code for bugs and performance issues:\n\n" },
    { title: "Regex helper", prompt: "Write and explain a regex that validates email addresses, with JS test cases." },
    { title: "SQL query", prompt: "Write a SQL query that returns the top 5 customers by total order value." },
  ],
};

function MessageView({ m, mode }: { m: ChatMessage; mode: Mode }) {
  if (m.role === "user") {
    return (
      <div className="flex flex-col items-end gap-2">
        {!!m.attachments?.length && (
          <div className="flex flex-wrap justify-end gap-2">
            {m.attachments.map((a, i) =>
              a.dataUrl ? (
                <img key={i} src={a.dataUrl} alt={a.name} className="max-h-40 rounded-xl border border-border" />
              ) : (
                <span key={i} className="rounded-lg border border-border bg-muted px-2 py-1 text-xs">
                  {a.name}
                </span>
              ),
            )}
          </div>
        )}
        {m.content && (
          <div className={cn("max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-bubble px-4 py-2.5 text-bubble-foreground", mode === "code" && "font-mono text-sm")}>
            {m.content}
          </div>
        )}
      </div>
    );
  }
  return (
    <div className="group flex gap-3">
      <LogoMark className="mt-1 size-6 shrink-0" />
      <div className="min-w-0 flex-1">
        {m.searched && m.streaming && !m.content && (
          <div className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Globe className="size-3.5 animate-spin" /> Searching the web…
          </div>
        )}
        <div className={cn("prose-millie", m.streaming && "caret")}>
          <Markdown content={m.content} />
        </div>
        {m.error && (
          <div className="mt-2 flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            <AlertCircle className="mt-0.5 size-4 shrink-0" /> {m.error}
          </div>
        )}
        {!!m.sources?.length && (
          <div className="mt-3 rounded-xl border border-border p-3">
            <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Sources</div>
            <ol className="space-y-1 text-sm">
              {m.sources.map((s, i) => (
                <li key={s.url} className="flex gap-2">
                  <span className="text-muted-foreground">{i + 1}.</span>
                  <a href={s.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                    {s.title} <ExternalLink className="size-3" />
                  </a>
                </li>
              ))}
            </ol>
          </div>
        )}
        {!m.streaming && m.content && (
          <div className="mt-1 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <Button variant="toolbar" size="iconSm" onClick={() => speak(m.content)} aria-label="Read aloud">
              <Volume2 />
            </Button>
            <Button variant="toolbar" size="iconSm" onClick={stopSpeaking} aria-label="Stop reading">
              <Square />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export function ChatView({ conversationId, projectId = null }: { conversationId: string | null; projectId?: string | null }) {
  const navigate = useNavigate();
  const ui = useUI();
  const { settings } = useSettings();
  const conv = useChatStore((s) => s.conversations.find((c) => c.id === conversationId));
  const messages = useChatStore((s) => (conversationId ? s.messages[conversationId] : undefined)) ?? [];
  const mode: Mode = (conv?.mode as Mode) ?? ui.mode;
  const effectiveProject = conv?.project_id ?? projectId;
  const busy = messages.some((m) => m.streaming);
  const [starter, setStarter] = useState<string>();
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (conversationId) void loadMessages(conversationId);
  }, [conversationId]);

  useEffect(() => {
    ui.current.current = { id: conversationId, mode, projectId: effectiveProject };
  }, [conversationId, mode, effectiveProject, ui.current]);

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, messages[messages.length - 1]?.content.length]);

  const send = (text: string, attachments: Parameters<typeof sendMessage>[0]["attachments"], webSearch: boolean) => {
    void sendMessage({
      conversationId,
      mode,
      projectId: effectiveProject,
      text,
      attachments,
      webSearch,
      onCreated: (id) => navigate({ to: "/chat/$id", params: { id } }),
      onDone: (r) => settings.read_aloud && speak(r),
    });
  };

  const exportMd = () => {
    const blob = new Blob([toMarkdown(conv?.title ?? "Conversation", messages)], { type: "text/markdown" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${(conv?.title ?? "conversation").replace(/[^\w-]+/g, "-").slice(0, 50)}.md`;
    a.click();
  };

  return (
    <div data-mode={mode} className="flex h-dvh min-w-0 flex-1 flex-col">
      <header className="flex h-14 items-center gap-2 border-b border-border px-3 sm:px-5">
        <Button variant="toolbar" size="iconSm" className="md:hidden" onClick={() => ui.setMobileNav(true)} aria-label="Open menu">
          <Menu />
        </Button>
        <div className="flex rounded-lg border border-border p-0.5 text-sm">
          {(["chat", "code"] as const).map((m) => (
            <button
              key={m}
              disabled={!!conversationId}
              onClick={() => ui.setMode(m)}
              className={cn(
                "rounded-md px-3 py-1 transition-colors disabled:cursor-default",
                mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                m === "code" && "font-mono",
              )}
            >
              {m === "chat" ? "Chat" : "C0DE"}
            </button>
          ))}
        </div>
        <div className="min-w-0 flex-1 truncate px-2 text-sm text-muted-foreground">{conv?.title}</div>
        {conversationId && messages.length > 0 && (
          <Button variant="toolbar" size="sm" onClick={exportMd}>
            <Download /> <span className="hidden sm:inline">Export</span>
          </Button>
        )}
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
          {messages.length === 0 ? (
            <div className="flex min-h-[55vh] flex-col items-center justify-center text-center">
              <LogoMark className="mb-5 size-14" />
              <h1 className={cn("text-3xl font-medium tracking-tight sm:text-4xl", mode === "code" ? "font-mono" : "font-reading")}>
                {mode === "code" ? "> what are we building?" : "How can I help today?"}
              </h1>
              <div className="mt-10 grid w-full gap-3 sm:grid-cols-2">
                {STARTERS[mode].map((s) => (
                  <button
                    key={s.title}
                    onClick={() => setStarter(s.prompt + "\u200b".repeat(Math.random() * 3))}
                    className="rounded-xl border border-border bg-card p-4 text-left transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-glow"
                  >
                    <div className={cn("text-sm font-medium", mode === "code" && "font-mono text-primary")}>{s.title}</div>
                    <div className="mt-1 line-clamp-2 text-sm text-muted-foreground">{s.prompt}</div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              {messages.map((m) => (
                <MessageView key={m.id} m={m} mode={mode} />
              ))}
            </div>
          )}
          <div ref={end} />
        </div>
      </div>

      <div className="mx-auto w-full max-w-3xl px-3 pb-3 sm:px-6">
        <Composer mode={mode} disabled={busy} onSend={send} initialText={starter?.replace(/\u200b/g, "")} />
        <p className="mt-2 text-center text-[11px] text-muted-foreground">
          Screenshots are captured only when you click — never in the background. Millie can make mistakes.
        </p>
      </div>
    </div>
  );
}
