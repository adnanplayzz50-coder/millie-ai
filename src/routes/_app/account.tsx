import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { PageShell, Panel } from "@/components/PageShell";
import { deleteAccount } from "@/lib/account.functions";
import { loadImage, readAsDataUrl } from "@/lib/attachments";

export const Route = createFileRoute("/_app/account")({
  head: () => ({
    meta: [
      { title: "Account — Millie AI" },
      { name: "description", content: "Manage your Millie AI profile and account." },
      { property: "og:title", content: "Account — Millie AI" },
      { property: "og:description", content: "Manage your Millie AI profile and account." },
    ],
  }),
  component: Account,
});

function Account() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const del = useServerFn(deleteAccount);
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const fileIn = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    setEmail(user.email ?? "");
    supabase.from("profiles").select("display_name, avatar_url").eq("id", user.id).maybeSingle().then(({ data }) => {
      setName(data?.display_name ?? "");
      setAvatar(data?.avatar_url ?? null);
    });
  }, [user]);

  const saveProfile = async (patch: { display_name?: string; avatar_url?: string | null }) => {
    const { error } = await supabase.from("profiles").update(patch).eq("id", user!.id);
    if (error) toast.error("Could not save");
    else toast.success("Saved");
  };

  const onAvatar = async (f?: File) => {
    if (!f) return;
    const img = await loadImage(await readAsDataUrl(f));
    const c = document.createElement("canvas");
    const s = Math.min(img.width, img.height);
    c.width = c.height = 192;
    c.getContext("2d")!.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, 192, 192);
    const url = c.toDataURL("image/jpeg", 0.85);
    setAvatar(url);
    await saveProfile({ avatar_url: url });
  };

  return (
    <PageShell title="Account" subtitle={user?.email}>
      <div className="space-y-5">
        <Panel title="Profile">
          <div className="flex items-center gap-4">
            <button onClick={() => fileIn.current?.click()} className="shrink-0" aria-label="Upload avatar">
              {avatar ? (
                <img src={avatar} alt="" className="size-16 rounded-full object-cover ring-2 ring-border" />
              ) : (
                <span className="grid size-16 place-items-center rounded-full bg-primary text-xl text-primary-foreground">{(name || "?")[0]?.toUpperCase()}</span>
              )}
            </button>
            <form className="flex flex-1 gap-2" onSubmit={(e) => { e.preventDefault(); void saveProfile({ display_name: name }); }}>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Display name" />
              <Button type="submit">Save</Button>
            </form>
          </div>
          <input ref={fileIn} type="file" accept="image/*" hidden onChange={(e) => onAvatar(e.target.files?.[0])} />
        </Panel>

        <Panel title="Email">
          <form
            className="flex gap-2"
            onSubmit={async (e) => {
              e.preventDefault();
              const { error } = await supabase.auth.updateUser({ email });
              if (error) toast.error(error.message);
              else toast.success("Check both inboxes to confirm the change.");
            }}
          >
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Button type="submit" variant="outline">Change</Button>
          </form>
        </Panel>

        <Panel title="Password">
          <form
            className="flex flex-col gap-2 sm:flex-row"
            onSubmit={async (e) => {
              e.preventDefault();
              if (password !== confirm) return toast.error("Passwords don't match");
              const { error } = await supabase.auth.updateUser({ password });
              if (error) toast.error(error.message);
              else {
                toast.success("Password updated");
                setPassword("");
                setConfirm("");
              }
            }}
          >
            <Input type="password" minLength={6} required placeholder="New password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <Input type="password" minLength={6} required placeholder="Confirm" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            <Button type="submit" variant="outline">Update</Button>
          </form>
        </Panel>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={async () => {
              await supabase.auth.signOut();
              navigate({ to: "/login" });
            }}
          >
            Sign out
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">Delete account</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                <AlertDialogDescription>
                  This permanently deletes your chats, projects, memories and settings. This can't be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={async () => {
                    try {
                      await del();
                      await supabase.auth.signOut();
                      navigate({ to: "/login" });
                    } catch {
                      toast.error("Could not delete account. Please try again.");
                    }
                  }}
                >
                  Delete forever
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </PageShell>
  );
}
