import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LogoMark } from "@/components/Logo";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — Millie AI" },
      { name: "description", content: "Sign in or create your Millie AI account." },
      { property: "og:title", content: "Sign in — Millie AI" },
      { property: "og:description", content: "Sign in or create your Millie AI account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Login,
});

function Login() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && !sent) navigate({ to: "/chat", replace: true });
  }, [user, sent, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    if (mode === "up") {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/onboarding` },
      });
      setBusy(false);
      if (error) return toast.error(error.message);
      if (data.session) navigate({ to: "/onboarding" });
      else setSent(true);
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setBusy(false);
      if (error) return toast.error(error.message);
      navigate({ to: "/chat" });
    }
  };

  return (
    <div className="relative grid min-h-dvh place-items-center overflow-hidden px-4">
      <div className="pointer-events-none absolute -top-40 left-1/2 size-[36rem] -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />
      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <LogoMark className="size-16" />
          <h1 className="mt-4 font-reading text-4xl font-medium tracking-tight">Millie</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "in" ? "Welcome back." : "Create your account to get started."}
          </p>
        </div>
        {sent ? (
          <div className="glass rounded-2xl border border-border p-6 text-center text-sm">
            Check <b>{email}</b> for a confirmation link, then come back and sign in.
            <Button variant="link" onClick={() => { setSent(false); setMode("in"); }}>
              Back to sign in
            </Button>
          </div>
        ) : (
          <form onSubmit={submit} className="glass space-y-3 rounded-2xl border border-border p-6">
            <Input type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            <Input
              type="password"
              required
              minLength={6}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "in" ? "current-password" : "new-password"}
            />
            <Button type="submit" variant="hero" size="lg" className="w-full" disabled={busy}>
              {busy ? "…" : mode === "in" ? "Sign in" : "Create account"}
            </Button>
            <p className="pt-1 text-center text-sm text-muted-foreground">
              {mode === "in" ? "New here?" : "Already have an account?"}{" "}
              <button type="button" className="text-primary hover:underline" onClick={() => setMode(mode === "in" ? "up" : "in")}>
                {mode === "in" ? "Create an account" : "Sign in"}
              </button>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
