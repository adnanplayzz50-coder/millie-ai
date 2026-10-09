import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, Pencil, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageShell } from "@/components/PageShell";

export const Route = createFileRoute("/_app/memory")({
  head: () => ({
    meta: [
      { title: "Memory — Millie AI" },
      { name: "description", content: "See and manage what Millie remembers about you." },
      { property: "og:title", content: "Memory — Millie AI" },
      { property: "og:description", content: "See and manage what Millie remembers about you." },
    ],
  }),
  component: Memory,
});

type Fact = { id: string; fact: string };

function Memory() {
  const { user } = useAuth();
  const [facts, setFacts] = useState<Fact[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [newFact, setNewFact] = useState("");

  const load = () =>
    supabase.from("memory_facts").select("id,fact").order("created_at", { ascending: false }).then(({ data }) => setFacts(data ?? []));
  useEffect(() => {
    void load();
  }, []);

  return (
    <PageShell title="Memory" subtitle="Durable facts Millie learns from your chats. Only relevant ones are used for each reply.">
      <form
        className="mb-5 flex gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!newFact.trim()) return;
          await supabase.from("memory_facts").insert({ fact: newFact.trim(), user_id: user!.id });
          setNewFact("");
          void load();
        }}
      >
        <Input value={newFact} onChange={(e) => setNewFact(e.target.value)} placeholder="Add something Millie should remember…" />
        <Button type="submit" variant="outline"><Plus /> Add</Button>
      </form>
      <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
        {facts.map((f) => (
          <li key={f.id} className="flex items-center gap-2 px-4 py-3">
            {editing === f.id ? (
              <form
                className="flex flex-1 gap-2"
                onSubmit={async (e) => {
                  e.preventDefault();
                  await supabase.from("memory_facts").update({ fact: draft }).eq("id", f.id);
                  setEditing(null);
                  void load();
                }}
              >
                <Input autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} />
                <Button size="icon" type="submit" aria-label="Save"><Check /></Button>
              </form>
            ) : (
              <>
                <span className="flex-1 font-reading text-[1.05rem]">{f.fact}</span>
                <Button variant="toolbar" size="iconSm" onClick={() => { setEditing(f.id); setDraft(f.fact); }} aria-label="Edit"><Pencil /></Button>
                <Button
                  variant="toolbar"
                  size="iconSm"
                  aria-label="Delete"
                  onClick={async () => {
                    await supabase.from("memory_facts").delete().eq("id", f.id);
                    setFacts((x) => x.filter((y) => y.id !== f.id));
                  }}
                >
                  <Trash2 />
                </Button>
              </>
            )}
          </li>
        ))}
        {!facts.length && <li className="px-4 py-10 text-center text-sm text-muted-foreground">Nothing remembered yet. Chat a bit and Millie will learn.</li>}
      </ul>
    </PageShell>
  );
}
