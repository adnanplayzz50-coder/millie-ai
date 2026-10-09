import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { FileText, FolderOpen, MessageSquare, Plus, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { PageShell, Panel } from "@/components/PageShell";
import { filesToAttachments } from "@/lib/attachments";
import { loadConversations, useChatStore } from "@/lib/chat-store";

export const Route = createFileRoute("/_app/projects/$id")({
  head: () => ({
    meta: [
      { title: "Project — Millie AI" },
      { name: "description", content: "Project instructions, knowledge files and chats." },
      { property: "og:title", content: "Project — Millie AI" },
      { property: "og:description", content: "Project instructions, knowledge files and chats." },
    ],
  }),
  component: ProjectPage,
});

function ProjectPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [p, setP] = useState({ name: "", description: "", instructions: "" });
  const [files, setFiles] = useState<{ id: string; path: string }[]>([]);
  const chats = useChatStore((s) => s.conversations.filter((c) => c.project_id === id));
  const fileIn = useRef<HTMLInputElement>(null);
  const dirIn = useRef<HTMLInputElement>(null);

  const loadFiles = () => supabase.from("project_files").select("id,path").eq("project_id", id).order("path").then(({ data }) => setFiles(data ?? []));
  useEffect(() => {
    supabase.from("projects").select("name,description,instructions").eq("id", id).maybeSingle().then(({ data }) => data && setP(data));
    void loadFiles();
    void loadConversations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const save = async () => {
    const { error } = await supabase.from("projects").update(p).eq("id", id);
    if (error) toast.error("Could not save");
    else toast.success("Project saved");
  };

  const upload = async (list: File[]) => {
    const { items, skipped } = await filesToAttachments(list);
    const text = items.filter((i) => i.kind === "file");
    if (text.length)
      await supabase.from("project_files").insert(text.map((t) => ({ project_id: id, user_id: user!.id, path: t.name, content: t.text ?? "" })));
    toast.success(`Added ${text.length} file(s)${skipped + (items.length - text.length) ? `, skipped ${skipped + items.length - text.length}` : ""}`);
    void loadFiles();
  };

  return (
    <PageShell
      title={p.name || "Project"}
      subtitle={p.description}
      actions={
        <Button asChild variant="hero">
          <Link to="/chat" search={{ project: id }}>
            <Plus /> New chat
          </Link>
        </Button>
      }
    >
      <div className="space-y-5">
        <Panel title="Details">
          <div className="space-y-3">
            <Input value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} placeholder="Name" />
            <Input value={p.description} onChange={(e) => setP({ ...p, description: e.target.value })} placeholder="Description" />
            <Textarea rows={5} value={p.instructions} onChange={(e) => setP({ ...p, instructions: e.target.value })} placeholder="Custom instructions for every chat in this project…" />
            <div className="flex justify-between">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" className="text-destructive"><Trash2 /> Delete project</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this project and its files?</AlertDialogTitle>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={async () => {
                        await supabase.from("projects").delete().eq("id", id);
                        navigate({ to: "/projects" });
                      }}
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button onClick={save}>Save</Button>
            </div>
          </div>
        </Panel>

        <Panel title="Knowledge">
          <div className="mb-3 flex gap-2">
            <Button variant="outline" size="sm" onClick={() => fileIn.current?.click()}><Upload /> Add files</Button>
            <Button variant="outline" size="sm" onClick={() => dirIn.current?.click()}><FolderOpen /> Add folder</Button>
          </div>
          <ul className="max-h-72 space-y-1 overflow-y-auto">
            {files.map((f) => (
              <li key={f.id} className="flex items-center gap-2 rounded-lg px-2 py-1 text-sm hover:bg-muted">
                <FileText className="size-3.5 text-primary" />
                <span className="flex-1 truncate font-mono text-xs">{f.path}</span>
                <button
                  aria-label="Remove file"
                  onClick={async () => {
                    await supabase.from("project_files").delete().eq("id", f.id);
                    setFiles((x) => x.filter((y) => y.id !== f.id));
                  }}
                >
                  <Trash2 className="size-3.5 text-muted-foreground hover:text-destructive" />
                </button>
              </li>
            ))}
            {!files.length && <li className="text-sm text-muted-foreground">No files yet. Text and code files only.</li>}
          </ul>
          <input ref={fileIn} type="file" multiple hidden onChange={(e) => { void upload([...(e.target.files ?? [])]); e.target.value = ""; }} />
          <input ref={(el) => { dirIn.current = el; el?.setAttribute("webkitdirectory", ""); }} type="file" multiple hidden onChange={(e) => { void upload([...(e.target.files ?? [])]); e.target.value = ""; }} />
        </Panel>

        <Panel title="Chats">
          <ul className="space-y-1">
            {chats.map((c) => (
              <li key={c.id}>
                <Link to="/chat/$id" params={{ id: c.id }} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-muted">
                  <MessageSquare className="size-3.5 text-primary" /> {c.title}
                </Link>
              </li>
            ))}
            {!chats.length && <li className="text-sm text-muted-foreground">No chats in this project yet.</li>}
          </ul>
        </Panel>
      </div>
    </PageShell>
  );
}
