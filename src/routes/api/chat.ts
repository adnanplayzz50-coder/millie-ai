import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { buildSystemPrompt, needsWebSearch, selectRelevantFacts } from "@/lib/ai-prompt";

type Body = {
  mode: "chat" | "code";
  messages: { role: "user" | "assistant"; content: string }[];
  images?: string[];
  files?: { name: string; text: string }[];
  webSearch?: boolean;
  projectId?: string | null;
};

const json = (o: unknown, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { "content-type": "application/json" } });

const missingKey = (k: string) =>
  json({ error: `${k} is not set. Add it in your project's Secrets (Project Settings → Secrets) and try again.` }, 400);

async function* sse(res: Response) {
  const reader = res.body!.getReader();
  const dec = new TextDecoder();
  let buf = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i;
    while ((i = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, i).trim();
      buf = buf.slice(i + 1);
      if (line.startsWith("data:")) {
        const d = line.slice(5).trim();
        if (d && d !== "[DONE]") {
          try {
            yield JSON.parse(d);
          } catch {
            /* partial */
          }
        }
      }
    }
  }
}

async function providerError(res: Response, name: string) {
  const t = await res.text().catch(() => "");
  console.error(name, res.status, t.slice(0, 500));
  if (res.status === 401 || res.status === 403)
    return `${name} rejected the API key. Check the key in your project's Secrets.`;
  if (res.status === 429) return `${name} rate limit reached (free tier). Please wait a moment and try again.`;
  return `${name} request failed (${res.status}). Please try again.`;
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
        if (!token) return json({ error: "Not signed in" }, 401);
        const supabase = createClient<Database>(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
          auth: { persistSession: false },
          global: { headers: { Authorization: `Bearer ${token}` } },
        });
        const { data: u } = await supabase.auth.getUser(token);
        if (!u.user) return json({ error: "Not signed in" }, 401);

        const body = (await request.json()) as Body;
        const history = (body.messages ?? []).slice(-20);
        const last = history[history.length - 1]?.content ?? "";
        const images = (body.images ?? []).slice(0, 6);
        const useSearch = !!body.webSearch || (images.length === 0 && needsWebSearch(last));
        const useGemini = images.length > 0 || useSearch;

        const groqKey = process.env.GROQ_API_KEY;
        const geminiKey = process.env.GEMINI_API_KEY;
        if (useGemini && !geminiKey) return missingKey("GEMINI_API_KEY");
        if (!useGemini && !groqKey) return missingKey("GROQ_API_KEY");

        const [{ data: profile }, { data: facts }, project] = await Promise.all([
          supabase.from("profiles").select("*").eq("id", u.user.id).maybeSingle(),
          supabase.from("memory_facts").select("fact"),
          body.projectId
            ? Promise.all([
                supabase.from("projects").select("*").eq("id", body.projectId).maybeSingle(),
                supabase.from("project_files").select("path, content").eq("project_id", body.projectId),
              ])
            : Promise.resolve(null),
        ]);

        const system = buildSystemPrompt({
          mode: body.mode === "code" ? "code" : "chat",
          name: profile?.display_name,
          hobbies: profile?.hobbies,
          interests: profile?.interests,
          aiUses: profile?.ai_uses,
          facts: selectRelevantFacts(last, (facts ?? []).map((f) => f.fact)),
          project: project?.[0].data
            ? { name: project[0].data.name, instructions: project[0].data.instructions, files: project[1].data ?? [] }
            : null,
        });

        // Attach text files to the last user message.
        const fileCtx = (body.files ?? [])
          .map((f) => `--- ${f.name} ---\n${f.text.slice(0, 40_000)}`)
          .join("\n\n");
        const msgs = history.map((m, i) =>
          i === history.length - 1 && fileCtx ? { ...m, content: `${m.content}\n\nAttached files:\n${fileCtx}` } : m,
        );

        const enc = new TextEncoder();
        let upstream: Response;
        if (useGemini) {
          const contents = msgs.map((m, i) => {
            const parts: Record<string, unknown>[] = [{ text: m.content || " " }];
            if (i === msgs.length - 1)
              for (const img of images) {
                const match = /^data:(.+?);base64,(.*)$/.exec(img);
                if (match) parts.push({ inline_data: { mime_type: match[1], data: match[2] } });
              }
            return { role: m.role === "assistant" ? "model" : "user", parts };
          });
          upstream = await fetch(
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:streamGenerateContent?alt=sse",
            {
              method: "POST",
              headers: { "content-type": "application/json", "x-goog-api-key": geminiKey! },
              body: JSON.stringify({
                systemInstruction: { parts: [{ text: system }] },
                contents,
                ...(useSearch ? { tools: [{ google_search: {} }] } : {}),
              }),
            },
          );
          if (!upstream.ok) return json({ error: await providerError(upstream, "Gemini") }, 502);
        } else {
          upstream = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { "content-type": "application/json", authorization: `Bearer ${groqKey}` },
            body: JSON.stringify({
              model: "llama-3.3-70b-versatile",
              stream: true,
              messages: [{ role: "system", content: system }, ...msgs],
            }),
          });
          if (!upstream.ok) return json({ error: await providerError(upstream, "Groq") }, 502);
        }

        const stream = new ReadableStream({
          async start(controller) {
            const send = (o: unknown) => controller.enqueue(enc.encode(JSON.stringify(o) + "\n"));
            send({ t: "meta", v: { provider: useGemini ? "gemini" : "groq", search: useSearch } });
            const sources = new Map<string, string>();
            try {
              for await (const ev of sse(upstream)) {
                if (useGemini) {
                  const cand = ev.candidates?.[0];
                  const text = (cand?.content?.parts ?? [])
                    .map((p: { text?: string }) => p.text ?? "")
                    .join("");
                  if (text) send({ t: "d", v: text });
                  for (const ch of cand?.groundingMetadata?.groundingChunks ?? [])
                    if (ch.web?.uri) sources.set(ch.web.uri, ch.web.title ?? ch.web.uri);
                } else {
                  const d = ev.choices?.[0]?.delta?.content;
                  if (d) send({ t: "d", v: d });
                }
              }
              if (sources.size)
                send({ t: "sources", v: [...sources].map(([url, title]) => ({ url, title })) });
            } catch (e) {
              console.error(e);
              send({ t: "error", v: "The response was interrupted. Please try again." });
            }
            controller.close();
          },
        });
        return new Response(stream, {
          headers: { "content-type": "application/x-ndjson", "cache-control": "no-store" },
        });
      },
    },
  },
});
