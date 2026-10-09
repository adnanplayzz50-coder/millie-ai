import type { ReactNode } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUI } from "@/lib/ui-store";

export function PageShell({ title, subtitle, actions, children }: { title: string; subtitle?: string; actions?: ReactNode; children: ReactNode }) {
  const ui = useUI();
  return (
    <div className="h-dvh flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-8 sm:py-10">
        <div className="mb-8 flex items-start gap-3">
          <Button variant="toolbar" size="iconSm" className="md:hidden" onClick={() => ui.setMobileNav(true)} aria-label="Open menu">
            <Menu />
          </Button>
          <div className="flex-1">
            <h1 className="font-reading text-3xl font-medium tracking-tight">{title}</h1>
            {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
          </div>
          {actions}
        </div>
        {children}
      </div>
    </div>
  );
}

export function Panel({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      {title && <h2 className="mb-4 text-sm font-medium">{title}</h2>}
      {children}
    </section>
  );
}
