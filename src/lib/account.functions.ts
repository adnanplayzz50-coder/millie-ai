import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const extractMemory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { conversationId: string }) => d)
  .handler(async ({ data, context }) => {
    const key = process.env.GROQ_API_KEY;
    if (!key) return { added: 0 };
    const { supabase, userId } = context;
    const [{ data: msgs }, { data: existing }] = await Promise.all([
      supabase
        .from("messages")
        .select("role, content")
        .eq("conversation_id", data.conversationId)
        .order("created_at", { ascending: false })
        .limit(8),
      supabase.from("memory_facts").select("fact"),
    ]);
    if (!msgs?.length) return { added: 0 };
    const transcript = msgs
      .reverse()
      .map((m) => `${m.role}: ${m.content.slice(0, 1500)}`)
      .join("\n");
    const known = (existing ?? []).map((f) => f.fact);
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          response_format: { type: "json_object" },
          temperature: 0.1,
          messages: [
            {
              role: "system",
              content:
                'Extract durable facts about the USER worth remembering long-term (preferences, ongoing projects, routines, goals, important personal context). Ignore one-off questions and anything about the assistant. Each fact is a short third-person sentence without the word "user", e.g. "Prefers TypeScript". Skip facts already known. Reply as json: {"facts": string[]} (max 3, often empty).',
            },
            { role: "user", content: `Already known:\n${known.join("\n") || "(none)"}\n\nConversation:\n${transcript}` },
          ],
        }),
      });
      if (!res.ok) return { added: 0 };
      const out = await res.json();
      const parsed = JSON.parse(out.choices?.[0]?.message?.content ?? "{}") as { facts?: unknown };
      const lower = new Set(known.map((k) => k.toLowerCase()));
      const fresh = (Array.isArray(parsed.facts) ? parsed.facts : [])
        .filter((f): f is string => typeof f === "string" && f.length > 3 && f.length < 200)
        .filter((f) => !lower.has(f.toLowerCase()))
        .slice(0, 3);
      if (fresh.length) await supabase.from("memory_facts").insert(fresh.map((fact) => ({ fact, user_id: userId })));
      return { added: fresh.length };
    } catch (e) {
      console.error("memory", e);
      return { added: 0 };
    }
  });

export const deleteAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    for (const t of ["messages", "conversations", "project_files", "projects", "memory_facts", "user_settings"] as const) {
      await supabase.from(t).delete().eq("user_id", userId);
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw new Error("Could not delete account");
    return { ok: true };
  });
