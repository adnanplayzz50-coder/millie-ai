import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { FONTS, PALETTES, type Settings, useSettings } from "@/lib/settings";
import { useUI } from "@/lib/ui-store";
import { cn } from "@/lib/utils";

export function CustomizePanel() {
  const { customizeOpen, setCustomizeOpen } = useUI();
  const { settings, update, preview } = useSettings();
  const [draft, setDraft] = useState<Settings>(settings);

  useEffect(() => {
    if (customizeOpen) setDraft(settings);
  }, [customizeOpen, settings]);

  const change = (p: Partial<Settings>) => {
    const next = { ...draft, ...p };
    setDraft(next);
    preview(next);
  };
  const close = (save: boolean) => {
    if (save) update(draft);
    preview(null);
    setCustomizeOpen(false);
  };

  return (
    <Sheet open={customizeOpen} onOpenChange={(o) => !o && close(false)}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="font-reading text-2xl font-medium">Customize</SheetTitle>
        </SheetHeader>
        <div className="space-y-7 px-4 pb-6">
          <section>
            <Label>Font</Label>
            <div className="grid gap-2">
              {FONTS.map((f) => (
                <button
                  key={f.key}
                  data-font={f.key}
                  onClick={() => change({ font: f.key })}
                  className={cn(
                    "flex items-center justify-between rounded-xl border border-border px-3 py-2.5 text-left transition-colors hover:border-primary/50",
                    draft.font === f.key && "border-primary bg-accent",
                  )}
                >
                  <span className="font-reading text-base">{f.label}</span>
                  <span className="text-xs text-muted-foreground">{f.sample}</span>
                </button>
              ))}
            </div>
          </section>
          <section>
            <Label>Accent</Label>
            <div className="grid grid-cols-4 gap-2">
              {PALETTES.map((p) => (
                <button
                  key={p.key}
                  onClick={() => change({ palette: p.key })}
                  className={cn("rounded-xl border border-border p-2 text-xs transition-colors", draft.palette === p.key && "border-primary bg-accent")}
                >
                  <span className="mx-auto mb-1.5 block size-7 rounded-full" style={{ background: p.swatch }} />
                  {p.label}
                </button>
              ))}
              <label className={cn("cursor-pointer rounded-xl border border-border p-2 text-center text-xs", draft.palette === "custom" && "border-primary bg-accent")}>
                <input
                  type="color"
                  className="mx-auto mb-1.5 block size-7 cursor-pointer rounded-full border-0 bg-transparent p-0"
                  value={draft.custom_color ?? "#8b5cf6"}
                  onChange={(e) => change({ palette: "custom", custom_color: e.target.value })}
                />
                Custom
              </label>
            </div>
          </section>
          <section>
            <Label>Theme</Label>
            <div className="grid grid-cols-3 gap-2">
              {([
                ["light", Sun],
                ["dark", Moon],
                ["system", Monitor],
              ] as const).map(([k, Icon]) => (
                <button
                  key={k}
                  onClick={() => change({ theme: k })}
                  className={cn("flex items-center justify-center gap-2 rounded-xl border border-border py-2 text-sm capitalize", draft.theme === k && "border-primary bg-accent")}
                >
                  <Icon className="size-4" /> {k}
                </button>
              ))}
            </div>
          </section>
          <section>
            <Label>Preview</Label>
            <div className="rounded-xl border border-border bg-background p-4">
              <div className="mb-3 ml-auto w-fit rounded-2xl rounded-br-md bg-bubble px-3 py-2 text-sm">What's a good morning routine?</div>
              <p className="prose-millie !text-base">Start small: <a>water</a>, light, and five quiet minutes before your phone.</p>
              <Button size="sm" className="mt-3">Primary action</Button>
            </div>
          </section>
          <section className="space-y-4">
            <Label>Voice</Label>
            <Row
              title="Read replies aloud"
              desc="Speak every reply using your browser's voice."
              checked={draft.read_aloud}
              onChange={(v) => change({ read_aloud: v })}
            />
            <Row
              title={'"Hey Millie" wake word'}
              desc="Listens continuously while this tab is open in Chrome or Edge. Audio may be processed by your browser's speech service. Pauses when the tab is hidden."
              checked={draft.wake_word}
              onChange={(v) => change({ wake_word: v })}
            />
          </section>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => close(false)}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={() => close(true)}>
              Save
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <div className="mb-2.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">{children}</div>;
}
function Row({ title, desc, checked, onChange }: { title: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <div className="text-sm font-medium">{title}</div>
        <div className="text-xs text-muted-foreground">{desc}</div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
