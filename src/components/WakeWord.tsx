import { useEffect, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useSettings } from "@/lib/settings";
import { useUI } from "@/lib/ui-store";
import { chime, findWake, getRecognitionCtor, speak } from "@/lib/speech";
import { sendMessage } from "@/lib/chat-store";

/** Background "Hey Millie" listener. Only active while the setting is on and the tab is visible. */
export function WakeWordListener() {
  const { settings } = useSettings();
  const ui = useUI();
  const navigate = useNavigate();
  const capturing = useRef(false);
  const uiRef = useRef(ui);
  uiRef.current = ui;

  useEffect(() => {
    if (!settings.wake_word) {
      ui.setWake("off");
      return;
    }
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      toast.error('"Hey Millie" needs Chrome or Edge.');
      ui.setWake("off");
      return;
    }
    let stopped = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let rec: any = null;
    let captureTimer: ReturnType<typeof setTimeout> | undefined;

    const submit = (text: string) => {
      capturing.current = false;
      clearTimeout(captureTimer);
      if (!text.trim()) {
        uiRef.current.setWake("idle");
        return;
      }
      uiRef.current.setWake("thinking");
      const cur = uiRef.current.current.current;
      void sendMessage({
        conversationId: cur.id,
        mode: cur.mode,
        projectId: cur.projectId,
        text: text.trim(),
        attachments: [],
        webSearch: false,
        onCreated: (id) => navigate({ to: "/chat/$id", params: { id } }),
        onDone: (r) => speak(r, () => uiRef.current.setWake("idle")),
      }).finally(() => setTimeout(() => uiRef.current.setWake("idle"), 300));
    };

    const start = () => {
      if (stopped || document.hidden) return;
      rec = new Ctor();
      rec.continuous = true;
      rec.interimResults = false;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      rec.onresult = (e: any) => {
        const t: string = e.results[e.results.length - 1][0].transcript;
        if (capturing.current) return submit(t);
        const w = findWake(t);
        if (!w.hit) return;
        chime();
        if (w.rest.split(" ").length >= 2) return submit(w.rest);
        capturing.current = true;
        uiRef.current.setWake("capturing");
        captureTimer = setTimeout(() => {
          capturing.current = false;
          uiRef.current.setWake("idle");
        }, 8000);
      };
      rec.onend = () => {
        if (!stopped && !document.hidden) setTimeout(start, 400);
      };
      rec.onerror = (e: { error: string }) => {
        if (e.error === "not-allowed") {
          stopped = true;
          toast.error("Microphone permission was denied, so the wake word is off.");
          uiRef.current.setWake("off");
        }
      };
      try {
        rec.start();
        uiRef.current.setWake("idle");
      } catch {
        /* already started */
      }
    };

    const onVis = () => {
      if (document.hidden) rec?.stop();
      else start();
    };

    navigator.mediaDevices
      ?.getUserMedia({ audio: true })
      .then((s) => {
        s.getTracks().forEach((t) => t.stop());
        start();
      })
      .catch(() => {
        toast.error("Microphone permission is needed for “Hey Millie”.");
        ui.setWake("off");
      });
    document.addEventListener("visibilitychange", onVis);
    return () => {
      stopped = true;
      clearTimeout(captureTimer);
      document.removeEventListener("visibilitychange", onVis);
      rec?.abort?.();
      ui.setWake("off");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.wake_word]);

  return null;
}
