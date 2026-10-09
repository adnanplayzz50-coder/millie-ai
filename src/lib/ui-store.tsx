import { createContext, useContext, useRef, useState, type ReactNode, type MutableRefObject } from "react";

export type Mode = "chat" | "code";
export type WakeState = "off" | "idle" | "capturing" | "thinking";
export type CurrentChat = { id: string | null; mode: Mode; projectId: string | null };

type Ctx = {
  mode: Mode;
  setMode: (m: Mode) => void;
  customizeOpen: boolean;
  setCustomizeOpen: (b: boolean) => void;
  paletteOpen: boolean;
  setPaletteOpen: (b: boolean) => void;
  wake: WakeState;
  setWake: (w: WakeState) => void;
  current: MutableRefObject<CurrentChat>;
  mobileNav: boolean;
  setMobileNav: (b: boolean) => void;
};

const UICtx = createContext<Ctx | null>(null);

export function UIProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<Mode>("chat");
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [wake, setWake] = useState<WakeState>("off");
  const [mobileNav, setMobileNav] = useState(false);
  const current = useRef<CurrentChat>({ id: null, mode: "chat", projectId: null });
  return (
    <UICtx.Provider
      value={{ mode, setMode, customizeOpen, setCustomizeOpen, paletteOpen, setPaletteOpen, wake, setWake, current, mobileNav, setMobileNav }}
    >
      {children}
    </UICtx.Provider>
  );
}

export const useUI = () => {
  const c = useContext(UICtx);
  if (!c) throw new Error("UIProvider missing");
  return c;
};
