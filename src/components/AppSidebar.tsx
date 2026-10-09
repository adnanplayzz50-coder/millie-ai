import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { Brain, FolderKanban, MoreHorizontal, Pencil, Pin, PinOff, Plus, Search, SlidersHorizontal, Trash2, MicOff, Command } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Logo } from "@/components/Logo";
import { type Conversation, deleteConversation, loadConversations, updateConversation, useChatStore } from "@/lib/chat-store";
import { useUI } from "@/lib/ui-store";
import { useSettings } from "@/lib/settings";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

function WakeIndicator() {
  const { wake } = useUI();
  const { update } = useSettings();
  if (wake === "off") return null;
  const label = wake === "capturing" ? "Listening…" : wake === "thinking" ? "Thinking…" : "Hey Millie";
  return (
    <div className="flex items-center gap-1.5 rounded-full border border-primary/30 bg-accent px-2 py-0.5 text-[11px] text-accent-foreground">
      <span className={cn("size-1.5 rounded-full bg-primary", wake === "capturing" ? "animate-ping" : "animate-pulse")} />
      {label}
      <button onClick={() => update({ wake_word: false })} aria-label="Turn off wake word" title="Turn off wake word">
        <MicOff className="size-3" />
      </button>
    </div>
  );
}

function ConvItem({ c, active }: { c: Conversation; active: boolean }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(c.title);
  const navigate = useNavigate();
  const ui = useUI();
  if (editing)
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void updateConversation(c.id, { title: title.trim() || c.title });
          setEditing(false);
        }}
      >
        <Input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} onBlur={() => setEditing(false)} className="h-8 text-sm" />
      </form>
    );
  return (
    <div className={cn("group flex items-center rounded-lg pr-1 transition-colors hover:bg-accent/70", active && "bg-accent text-accent-foreground")}>
      <Link
        to="/chat/$id"
        params={{ id: c.id }}
        onClick={() => ui.setMobileNav(false)}
        className="flex min-w-0 flex-1 items-center gap-2 px-2.5 py-1.5 text-sm"
      >
        {c.mode === "code" && <span className="font-mono text-[10px] text-primary">{"</>"}</span>}
        <span className="truncate">{c.title}</span>
      </Link>
      <DropdownMenu>
        <DropdownMenuTrigger className="rounded p-1 opacity-0 hover:bg-background/60 group-hover:opacity-100 data-[state=open]:opacity-100" aria-label="Chat options">
          <MoreHorizontal className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => updateConversation(c.id, { pinned: !c.pinned })}>
            {c.pinned ? <PinOff /> : <Pin />} {c.pinned ? "Unpin" : "Pin"}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setEditing(true)}>
            <Pencil /> Rename
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-destructive"
            onClick={async () => {
              await deleteConversation(c.id);
              if (active) navigate({ to: "/chat" });
            }}
          >
            <Trash2 /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function SidebarBody() {
  const ui = useUI();
  const { user } = useAuth();
  const params = useParams({ strict: false }) as { id?: string };
  const convs = useChatStore((s) => s.conversations);
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"chats" | "projects">("chats");
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [profile, setProfile] = useState<{ display_name: string | null; avatar_url: string | null } | null>(null);

  useEffect(() => {
    void loadConversations();
  }, []);
  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("display_name, avatar_url").eq("id", user.id).maybeSingle().then(({ data }) => setProfile(data));
  }, [user]);
  useEffect(() => {
    if (tab === "projects") supabase.from("projects").select("id,name").order("created_at", { ascending: false }).then(({ data }) => setProjects(data ?? []));
  }, [tab]);

  const filtered = useMemo(() => convs.filter((c) => c.title.toLowerCase().includes(q.toLowerCase())), [convs, q]);
  const pinned = filtered.filter((c) => c.pinned);
  const rest = filtered.filter((c) => !c.pinned);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 px-4 pt-4 pb-3">
        <Link to="/chat" onClick={() => ui.setMobileNav(false)}>
          <Logo />
        </Link>
        <WakeIndicator />
      </div>
      <div className="space-y-2 px-3">
        <Button asChild variant="hero" className="w-full justify-start">
          <Link to="/chat" onClick={() => ui.setMobileNav(false)}>
            <Plus /> New chat
          </Link>
        </Button>
        <div className="grid grid-cols-2 rounded-lg border border-border p-0.5 text-sm">
          {(["chats", "projects"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={cn("rounded-md py-1 capitalize transition-colors", tab === t ? "bg-background shadow-sm" : "text-muted-foreground")}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 flex-1 overflow-y-auto px-3">
        {tab === "chats" ? (
          <>
            <div className="relative mb-2">
              <Search className="absolute top-2.5 left-2.5 size-3.5 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search chats" className="h-8 border-transparent bg-background/50 pl-8 text-sm" />
            </div>
            {pinned.length > 0 && <GroupLabel>Pinned</GroupLabel>}
            {pinned.map((c) => <ConvItem key={c.id} c={c} active={params.id === c.id} />)}
            {rest.length > 0 && <GroupLabel>Recent</GroupLabel>}
            {rest.map((c) => <ConvItem key={c.id} c={c} active={params.id === c.id} />)}
            {!filtered.length && <p className="px-2 py-6 text-center text-xs text-muted-foreground">No chats yet</p>}
          </>
        ) : (
          <>
            <Button asChild variant="ghost" size="sm" className="mb-1 w-full justify-start">
              <Link to="/projects" onClick={() => ui.setMobileNav(false)}>
                <FolderKanban /> All projects
              </Link>
            </Button>
            {projects.map((p) => (
              <Link
                key={p.id}
                to="/projects/$id"
                params={{ id: p.id }}
                onClick={() => ui.setMobileNav(false)}
                className="block truncate rounded-lg px-2.5 py-1.5 text-sm hover:bg-accent/70"
                activeProps={{ className: "bg-accent" }}
              >
                {p.name}
              </Link>
            ))}
          </>
        )}
      </div>

      <div className="space-y-1 border-t border-border p-3">
        <button onClick={() => ui.setPaletteOpen(true)} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm text-muted-foreground hover:bg-accent/70">
          <Command className="size-4" /> Command palette <kbd className="ml-auto font-mono text-[10px]">Ctrl K</kbd>
        </button>
        <Link to="/memory" onClick={() => ui.setMobileNav(false)} className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm text-muted-foreground hover:bg-accent/70">
          <Brain className="size-4" /> Memory
        </Link>
        <div className="flex items-center gap-2 pt-1">
          <Link to="/account" onClick={() => ui.setMobileNav(false)} className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-1.5 py-1 hover:bg-accent/70">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="size-7 rounded-full object-cover" />
            ) : (
              <span className="grid size-7 place-items-center rounded-full bg-primary text-xs text-primary-foreground">
                {(profile?.display_name ?? user?.email ?? "?")[0]?.toUpperCase()}
              </span>
            )}
            <span className="truncate text-sm">{profile?.display_name ?? user?.email}</span>
          </Link>
          <Button variant="soft" size="sm" onClick={() => ui.setCustomizeOpen(true)}>
            <SlidersHorizontal /> Customize
          </Button>
        </div>
      </div>
    </div>
  );
}

function GroupLabel({ children }: { children: React.ReactNode }) {
  return <div className="px-2.5 pt-3 pb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{children}</div>;
}

export function AppSidebar() {
  const ui = useUI();
  return (
    <>
      <aside className="glass hidden h-dvh w-72 shrink-0 border-r border-border md:block">
        <SidebarBody />
      </aside>
      <Sheet open={ui.mobileNav} onOpenChange={ui.setMobileNav}>
        <SheetContent side="left" className="glass w-[85vw] max-w-xs p-0">
          <SidebarBody />
        </SheetContent>
      </Sheet>
    </>
  );
}
