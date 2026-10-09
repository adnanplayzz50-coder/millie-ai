const STOP = new Set(
  "about above after again also another because been before being below between both could does doing during each from further have having here hers herself himself into itself just more most myself only other ought ours ourselves over same should some such than that their theirs them themselves then there these they this those through under until very what when where which while whom with would your yours yourself yourselves please thanks want need help tell make like know think".split(
    " ",
  ),
);

function words(s: string) {
  return (s.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter((w) => w.length > 3 && !STOP.has(w));
}

/** Returns only the facts that share meaningful words with the message (max 6). */
export function selectRelevantFacts(message: string, facts: string[], limit = 6): string[] {
  const msg = words(message).map((w) => w.slice(0, 5));
  if (!msg.length) return [];
  const set = new Set(msg);
  return facts
    .map((f) => ({ f, score: words(f).filter((w) => set.has(w.slice(0, 5))).length }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.f);
}

const CURRENT =
  /\b(news|latest|today|tonight|yesterday|this week|right now|currently|current|price|prices|stock|stocks|score|scores|weather|headlines?|breaking|recent|trending)\b/i;

export function needsWebSearch(message: string) {
  return CURRENT.test(message);
}

export type PromptCtx = {
  mode: "chat" | "code";
  name?: string | null;
  hobbies?: string | null;
  interests?: string | null;
  aiUses?: string | null;
  facts: string[];
  project?: { name: string; instructions: string; files: { path: string; content: string }[] } | null;
};

export function buildSystemPrompt(c: PromptCtx) {
  const parts: string[] = [];
  if (c.mode === "code") {
    parts.push(
      "You are Millie in C0DE mode: a precise, senior software engineering assistant (like Copilot/Codex). Prefer working code over prose. Always use fenced code blocks with a language tag. Explain briefly, point out edge cases, and keep JavaScript examples runnable in a browser when possible (use console.log for output).",
    );
  } else {
    parts.push(
      "You are Millie, a warm, thoughtful and concise AI assistant. Write in clear, well-structured Markdown. Be helpful and honest; say when you are unsure.",
    );
  }
  const about = [
    c.name && `Name: ${c.name}`,
    c.hobbies && `Hobbies: ${c.hobbies}`,
    c.interests && `Interests: ${c.interests}`,
    c.aiUses && `Uses AI for: ${c.aiUses}`,
  ].filter(Boolean);
  if (about.length)
    parts.push(`About the user (use lightly for personalization, don't mention unprompted):\n${about.join("\n")}`);
  if (c.facts.length) parts.push(`Things you remember about the user that may be relevant:\n- ${c.facts.join("\n- ")}`);
  if (c.project) {
    parts.push(`You are working inside the project "${c.project.name}".`);
    if (c.project.instructions) parts.push(`Project instructions:\n${c.project.instructions}`);
    let budget = 60_000;
    const files = c.project.files
      .map((f) => {
        const body = f.content.slice(0, Math.max(0, budget));
        budget -= body.length;
        return body ? `--- ${f.path} ---\n${body}` : "";
      })
      .filter(Boolean);
    if (files.length) parts.push(`Project knowledge files:\n${files.join("\n\n")}`);
  }
  return parts.join("\n\n");
}
