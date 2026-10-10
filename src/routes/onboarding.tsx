import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { LogoMark } from "@/components/Logo";
import { toast } from "sonner";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Welcome — Millie AI" },
      { name: "description", content: "Tell Millie a little about yourself (optional)." },
      { property: "og:title", content: "Welcome — Millie AI" },
      { property: "og:description", content: "Tell Millie a little about yourself (optional)." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Onboarding,
});

const STEPS = [
  { key: "hobbies", q: "What do you enjoy doing?", ph: "e.g. hiking, baking, chess, indie games" },
  { key: "interests", q: "What topics are you curious about?", ph: "e.g. space, design, history, startups" },
  { key: "ai_uses", q: "What will you use Millie for?", ph: "e.g. coding help, writing, studying, planning" },
] as const;

function Onboarding() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [user, loading, navigate]);

  const finish = async (save: boolean) => {
    if (user) {
      const { error } = await supabase
        .from("profiles")
        .update({ ...(save ? answers : {}), onboarded: true })
        .eq("id", user.id);
      if (error) { toast.error("Could not save your answers. Please try again."); return; }
    }
    navigate({ to: "/chat" });
  };

  const s = STEPS[step];
  if (!s) return null;
  return (
    <div className="grid min-h-dvh place-items-center px-4">
      <div className="w-full max-w-lg">
        <div className="mb-8 flex items-center justify-between">
          <LogoMark className="size-10" />
          <Button variant="ghost" onClick={() => finish(false)}>
            Skip
          </Button>
        </div>
        <div className="mb-3 flex gap-1.5">
          {STEPS.map((_, i) => (
            <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= step ? "bg-primary" : "bg-muted"}`} />
          ))}
        </div>
        <p className="text-sm text-muted-foreground">Optional · helps Millie personalize replies</p>
        <h1 className="mt-2 font-reading text-3xl font-medium tracking-tight">{s.q}</h1>
        <Textarea
          key={s.key}
          autoFocus
          rows={3}
          className="mt-6 text-base"
          placeholder={s.ph}
          value={answers[s.key] ?? ""}
          onChange={(e) => setAnswers({ ...answers, [s.key]: e.target.value })}
        />
        <div className="mt-6 flex justify-between">
          <Button variant="ghost" disabled={step === 0} onClick={() => setStep(step - 1)}>
            Back
          </Button>
          {step < STEPS.length - 1 ? (
            <Button onClick={() => setStep(step + 1)}>Next</Button>
          ) : (
            <Button variant="hero" onClick={() => finish(true)}>
              Start chatting
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
