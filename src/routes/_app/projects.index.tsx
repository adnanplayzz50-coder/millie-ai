import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { FolderKanban, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageShell } from "@/components/PageShell";

export const Route = createFileRoute("/_app/projects/")({
  head: () => ({
    meta: [
      { title: "Projects — Millie AI" },
      { name: "description", content: "Organize chats with shared instructions and knowledge files." },
      { property: "og:title", content: "Projects — Millie AI" },
      { property: "og:description", content: "Organize chats with shared instructions and knowledge files." },
    ],
  }),
  component: Projects,
});

function Projects() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<{ id: string; name: string; description: string }[]>([]);
  const [name, setName] = useState("");
  useEffect(() => {
    supabase.from("projects").select("id,name,description").order("created_at", { ascending: false }).then(({ data }) => setItems(data ?? []));
  }, []);
  return (
    <PageShell title="Projects" subtitle="Chats inside a project share its instructions and knowledge files.">
      <form
        className="mb-6 flex gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!name.trim()) return;
          const { data } = await supabase.from("projects").insert({ name: name.trim(), user_id: user!.id }).select("id").single();
          if (data) navigate({ to: "/projects/$id", params: { id: data.id } });
        }}
      >
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="New project name" />
        <Button type="submit"><Plus /> Create</Button>
      </form>
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((p) => (
          <Link key={p.id} to="/projects/$id" params={{ id: p.id }} className="rounded-2xl border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-glow">
            <FolderKanban className="mb-3 size-5 text-primary" />
            <div className="font-medium">{p.name}</div>
            <div className="mt-1 line-clamp-2 text-sm text-muted-foreground">{p.description || "No description"}</div>
          </Link>
        ))}
      </div>
      {!items.length && <p className="py-10 text-center text-sm text-muted-foreground">No projects yet.</p>}
    </PageShell>
  );
}
