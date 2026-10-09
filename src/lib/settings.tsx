import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./auth";

export type FontKey = "claude" | "grotesk" | "mono" | "lora" | "outfit";
export type PaletteKey = "violet" | "lavender" | "electric" | "custom";
export type ThemeKey = "light" | "dark" | "system";

export type Settings = {
  font: FontKey;
  palette: PaletteKey;
  custom_color: string | null;
  theme: ThemeKey;
  wake_word: boolean;
  read_aloud: boolean;
};

export const DEFAULT_SETTINGS: Settings = {
  font: "claude",
  palette: "violet",
  custom_color: null,
  theme: "system",
  wake_word: false,
  read_aloud: false,
};

export const FONTS: { key: FontKey; label: string; sample: string }[] = [
  { key: "claude", label: "Claude-style", sample: "Newsreader + Inter" },
  { key: "grotesk", label: "Space Grotesk", sample: "Geometric & modern" },
  { key: "mono", label: "JetBrains Mono", sample: "For the hackers" },
  { key: "lora", label: "Lora", sample: "Warm literary serif" },
  { key: "outfit", label: "Outfit", sample: "Clean & friendly" },
];

export const PALETTES: { key: Exclude<PaletteKey, "custom">; label: string; swatch: string }[] = [
  { key: "violet", label: "Deep violet", swatch: "oklch(0.45 0.19 292)" },
  { key: "lavender", label: "Soft lavender", swatch: "oklch(0.72 0.11 300)" },
  { key: "electric", label: "Electric purple", swatch: "oklch(0.6 0.28 305)" },
];

type Ctx = { settings: Settings; update: (p: Partial<Settings>) => void; preview: (p: Partial<Settings> | null) => void };
const SettingsCtx = createContext<Ctx>({ settings: DEFAULT_SETTINGS, update: () => {}, preview: () => {} });

export function applySettings(s: Settings) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.dataset.font = s.font;
  root.dataset.palette = s.palette === "custom" ? "violet" : s.palette;
  if (s.palette === "custom" && s.custom_color) root.style.setProperty("--primary", s.custom_color);
  else root.style.removeProperty("--primary");
  const dark =
    s.theme === "dark" || (s.theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  root.classList.toggle("dark", dark);
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [draft, setDraft] = useState<Partial<Settings> | null>(null);

  useEffect(() => {
    if (!user) {
      setSettings(DEFAULT_SETTINGS);
      return;
    }
    supabase
      .from("user_settings")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setSettings({ ...DEFAULT_SETTINGS, ...(data as Partial<Settings>) });
      });
  }, [user]);

  useEffect(() => {
    const s = { ...settings, ...(draft ?? {}) };
    applySettings(s);
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const fn = () => applySettings(s);
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, [settings, draft]);

  const update = useCallback(
    (p: Partial<Settings>) => {
      setSettings((prev) => {
        const next = { ...prev, ...p };
        if (user) {
          void supabase
            .from("user_settings")
            .upsert({ user_id: user.id, ...next, updated_at: new Date().toISOString() });
        }
        return next;
      });
    },
    [user],
  );

  return (
    <SettingsCtx.Provider value={{ settings, update, preview: setDraft }}>{children}</SettingsCtx.Provider>
  );
}

export const useSettings = () => useContext(SettingsCtx);
