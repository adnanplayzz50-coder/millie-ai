import { useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Attachment } from "./attachments";
import { extractMemory } from "./account.functions";

export type Source = { title: string; url: string };
export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: Source[] | null;
  attachments?: { kind: string; name: string; dataUrl?: string }[] | null;
  streaming?: boolean;
  error?: string;
  searched?: boolean;
};
export type Conversation = {
  id: string;
  title: string;
  mode: string;
  pinned: boolean;
  project_id: string | null;
  updated_at: string;
};

type State = {
  conversations: Conversation[];
  messages: Record<string, ChatMessage[]>;
  loaded: Record<string, boolean>;
};

let state: State = { conversations: [], messages: {}, loaded: {} };
const subs = new Set<() => void>();
const set = (fn: (s: State) => State) => {
  state = fn(state);
  subs.forEach((s) => s());
};
const subscribe = (cb: () => void) => {
  subs.add(cb);
  return () => subs.delete(cb);
};
export function useChatStore<T>(sel: (s: State) => T): T {
  return useSyncExternalStore(subscribe, () => sel(state), () => sel(state));
}

export async function loadConversations() {
  const { data } = await supabase
    .from("conversations")
    .select("id,title,mode,pinned,project_id,updated_at")
    .order("updated_at", { ascending: false });
  set((s) => ({ ...s, conversations: (data ?? []) as Conversation[] }));
}

export async function loadMessages(id: string, force = false) {
  if (state.loaded[id] && !force) return;
  const { data } = await supabase
    .from("messages")
    .select("id,role,content,sources,attachments")
    .eq("conversation_id", id)
    .order("created_at");
  set((s) => ({
    ...s,
    loaded: { ...s.loaded, [id]: true },
    messages: { ...s.messages, [id]: (data ?? []) as unknown as ChatMessage[] },
  }));
}

export async function updateConversation(id: string, patch: Partial<Conversation>) {
  set((s) => ({ ...s, conversations: s.conversations.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
  await supabase.from("conversations").update(patch).eq("id", id);
}

export async function deleteConversation(id: string) {
  set((s) => ({ ...s, conversations: s.conversations.filter((c) => c.id !== id) }));
  await supabase.from("conversations").delete().eq("id", id);
}

const patchMsg = (cid: string, mid: string, p: Partial<ChatMessage>) =>
  set((s) => ({
    ...s,
    messages: { ...s.messages, [cid]: (s.messages[cid] ?? []).map((m) => (m.id === mid ? { ...m, ...p } : m)) },
  }));

export type SendArgs = {
  conversationId: string | null;
  mode: "chat" | "code";
  projectId?: string | null;
  text: string;
  attachments: Attachment[];
  webSearch: boolean;
  onCreated?: (id: string) => void;
  onDone?: (reply: string) => void;
};

export async function sendMessage(a: SendArgs) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Not signed in");
  let cid = a.conversationId;
  if (!cid) {
    const title = (a.text || a.attachments[0]?.name || "New chat").replace(/\s+/g, " ").slice(0, 60);
    const { data, error } = await supabase
      .from("conversations")
      .insert({ title, mode: a.mode, project_id: a.projectId ?? null, user_id: u.user.id })
      .select("id,title,mode,pinned,project_id,updated_at")
      .single();
    if (error || !data) throw new Error("Could not create conversation");
    cid = data.id;
    set((s) => ({
      ...s,
      conversations: [data as Conversation, ...s.conversations],
      loaded: { ...s.loaded, [data.id]: true },
      messages: { ...s.messages, [data.id]: [] },
    }));
    a.onCreated?.(cid);
  }
  const history = (state.messages[cid] ?? []).filter((m) => !m.error);
  const attMeta = a.attachments.map((x) => ({
    kind: x.kind,
    name: x.name,
    dataUrl: x.kind === "image" && x.dataUrl && x.dataUrl.length < 400_000 ? x.dataUrl : undefined,
  }));
  const userMsg: ChatMessage = { id: crypto.randomUUID(), role: "user", content: a.text, attachments: attMeta };
  const asstId = crypto.randomUUID();
  set((s) => ({
    ...s,
    messages: {
      ...s.messages,
      [cid!]: [...history, userMsg, { id: asstId, role: "assistant", content: "", streaming: true }],
    },
  }));
  await supabase.from("messages").insert({
    id: userMsg.id,
    conversation_id: cid,
    user_id: u.user.id,
    role: "user",
    content: a.text,
    attachments: attMeta,
  });

  const { data: sess } = await supabase.auth.getSession();
  let reply = "";
  let sources: Source[] | null = null;
  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${sess.session?.access_token}` },
      body: JSON.stringify({
        mode: a.mode,
        projectId: a.projectId,
        webSearch: a.webSearch,
        messages: [...history, userMsg].map((m) => ({
          role: m.role,
          content:
            m.content ||
            (m.attachments?.length ? `(attached: ${m.attachments.map((x) => x.name).join(", ")})` : " "),
        })),
        images: a.attachments.filter((x) => x.kind === "image").map((x) => x.dataUrl),
        files: a.attachments.filter((x) => x.kind === "file").map((x) => ({ name: x.name, text: x.text })),
      }),
    });
    if (!res.ok || !res.body) {
      const j = await res.json().catch(() => ({}));
      throw new Error(j.error ?? "Something went wrong. Please try again.");
    }
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "";
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let i;
      while ((i = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, i);
        buf = buf.slice(i + 1);
        if (!line) continue;
        const ev = JSON.parse(line);
        if (ev.t === "d") {
          reply += ev.v;
          patchMsg(cid, asstId, { content: reply });
        } else if (ev.t === "sources") {
          sources = ev.v;
          patchMsg(cid, asstId, { sources });
        } else if (ev.t === "meta") patchMsg(cid, asstId, { searched: ev.v.search });
        else if (ev.t === "error") throw new Error(ev.v);
      }
    }
    patchMsg(cid, asstId, { streaming: false });
    await supabase.from("messages").insert({
      id: asstId,
      conversation_id: cid,
      user_id: u.user.id,
      role: "assistant",
      content: reply,
      sources,
    });
    await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", cid);
    void loadConversations();
    a.onDone?.(reply);
    extractMemory({ data: { conversationId: cid } }).catch(() => {});
  } catch (e) {
    patchMsg(cid, asstId, { streaming: false, error: (e as Error).message, content: reply });
  }
  return cid;
}

export function toMarkdown(title: string, msgs: ChatMessage[]) {
  return (
    `# ${title}\n\n` +
    msgs
      .map((m) => {
        let s = `## ${m.role === "user" ? "You" : "Millie"}\n\n${m.content}`;
        if (m.sources?.length) s += `\n\n**Sources**\n${m.sources.map((x) => `- [${x.title}](${x.url})`).join("\n")}`;
        return s;
      })
      .join("\n\n---\n\n")
  );
}
