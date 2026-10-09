import { useEffect, useRef, useState } from "react";
import { ArrowUp, FileText, FolderOpen, Globe, ImageIcon, Mic, MicOff, Monitor, Paperclip, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { type Attachment, compressImage, filesToAttachments, uid } from "@/lib/attachments";
import { getRecognitionCtor } from "@/lib/speech";
import { ImageCropModal } from "./ImageCropModal";
import { cn } from "@/lib/utils";

export async function captureScreenshot(): Promise<string | null> {
  if (!navigator.mediaDevices?.getDisplayMedia) {
    toast.error("Screen capture isn't supported in this browser.");
    return null;
  }
  let stream: MediaStream | null = null;
  try {
    stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
    const video = document.createElement("video");
    video.srcObject = stream;
    video.muted = true;
    await video.play();
    await new Promise((r) => setTimeout(r, 250));
    const c = document.createElement("canvas");
    c.width = video.videoWidth;
    c.height = video.videoHeight;
    c.getContext("2d")!.drawImage(video, 0, 0);
    return await compressImage(c.toDataURL("image/png"), 1920);
  } catch {
    return null;
  } finally {
    stream?.getTracks().forEach((t) => t.stop());
  }
}

export function Composer({
  mode,
  disabled,
  onSend,
  initialText,
}: {
  mode: "chat" | "code";
  disabled?: boolean;
  onSend: (text: string, attachments: Attachment[], webSearch: boolean) => void;
  initialText?: string;
}) {
  const [text, setText] = useState("");
  const [atts, setAtts] = useState<Attachment[]>([]);
  const [web, setWeb] = useState(false);
  const [drag, setDrag] = useState(false);
  const [cropId, setCropId] = useState<string | null>(null);
  const [dictating, setDictating] = useState(false);
  const ta = useRef<HTMLTextAreaElement>(null);
  const imgIn = useRef<HTMLInputElement>(null);
  const fileIn = useRef<HTMLInputElement>(null);
  const dirIn = useRef<HTMLInputElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rec = useRef<any>(null);

  useEffect(() => {
    if (initialText) {
      setText(initialText);
      ta.current?.focus();
    }
  }, [initialText]);

  useEffect(() => {
    const el = ta.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 240) + "px";
  }, [text]);

  const add = async (files: File[]) => {
    if (!files.length) return;
    const { items, skipped } = await filesToAttachments(files);
    setAtts((a) => [...a, ...items].slice(0, 40));
    if (skipped) toast.message(`Skipped ${skipped} file(s) (binary, too large, or in ignored folders).`);
  };

  const screenshot = async () => {
    const url = await captureScreenshot();
    if (url) setAtts((a) => [...a, { id: uid(), kind: "image", name: "screenshot.png", dataUrl: url }]);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void screenshot();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const toggleDictation = () => {
    if (dictating) {
      rec.current?.stop();
      return;
    }
    const Ctor = getRecognitionCtor();
    if (!Ctor) return toast.error("Voice input works in Chrome or Edge.");
    const r = new Ctor();
    r.interimResults = true;
    r.continuous = true;
    const base = text ? text + " " : "";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    r.onresult = (e: any) => {
      let s = "";
      for (let i = 0; i < e.results.length; i++) s += e.results[i][0].transcript;
      setText(base + s);
    };
    r.onend = () => setDictating(false);
    r.onerror = () => setDictating(false);
    rec.current = r;
    r.start();
    setDictating(true);
  };

  const submit = () => {
    if (disabled || (!text.trim() && !atts.length)) return;
    rec.current?.stop();
    onSend(text.trim(), atts, web);
    setText("");
    setAtts([]);
  };

  const cropAtt = atts.find((a) => a.id === cropId);

  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-card shadow-sm transition-all focus-within:border-primary/50 focus-within:shadow-glow",
        drag && "border-primary ring-2 ring-primary/30",
        mode === "code" && "font-mono",
      )}
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        void add([...e.dataTransfer.files]);
      }}
    >
      {atts.length > 0 && (
        <div className="flex flex-wrap gap-2 px-3 pt-3">
          {atts.map((a) => (
            <div key={a.id} className="group relative">
              {a.kind === "image" ? (
                <button onClick={() => setCropId(a.id)} title="Click to select a region">
                  <img src={a.dataUrl} alt={a.name} className="size-14 rounded-lg border border-border object-cover" />
                </button>
              ) : (
                <div className="flex h-8 max-w-52 items-center gap-1.5 rounded-lg border border-border bg-muted px-2 text-xs">
                  <FileText className="size-3.5 shrink-0 text-primary" />
                  <span className="truncate">{a.name}</span>
                </div>
              )}
              <button
                onClick={() => setAtts((x) => x.filter((y) => y.id !== a.id))}
                className="absolute -right-1.5 -top-1.5 grid size-5 place-items-center rounded-full border border-border bg-background opacity-90 hover:opacity-100"
                aria-label={`Remove ${a.name}`}
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
        </div>
      )}
      <textarea
        ref={ta}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
        onPaste={(e) => {
          const imgs = [...e.clipboardData.files].filter((f) => f.type.startsWith("image/"));
          if (imgs.length) {
            e.preventDefault();
            void add(imgs);
          }
        }}
        rows={1}
        placeholder={mode === "code" ? "Ask C0DE to write, debug or explain code…" : "Message Millie…"}
        className="block w-full resize-none bg-transparent px-4 pt-3.5 pb-2 text-[0.95rem] outline-none placeholder:text-muted-foreground"
      />
      <div className="flex items-center gap-1 px-2 pb-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="toolbar" size="iconSm" aria-label="Attach">
              <Paperclip />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => imgIn.current?.click()}>
              <ImageIcon /> Add image
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => fileIn.current?.click()}>
              <FileText /> Add file
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => dirIn.current?.click()}>
              <FolderOpen /> Add folder
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="toolbar" size="iconSm" onClick={screenshot} aria-label="Screenshot">
              <Monitor />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Screenshot (Ctrl+Shift+S)</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="toolbar"
              size="sm"
              data-active={web}
              onClick={() => setWeb((w) => !w)}
              aria-pressed={web}
              className="gap-1.5"
            >
              <Globe /> <span className="hidden sm:inline">Search the web</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Ground the answer with Google Search</TooltipContent>
        </Tooltip>
        <div className="ml-auto flex items-center gap-1">
          <Button
            variant="toolbar"
            size="iconSm"
            data-active={dictating}
            onClick={toggleDictation}
            aria-label={dictating ? "Stop dictation" : "Dictate"}
            className={cn(dictating && "animate-pulse-ring")}
          >
            {dictating ? <MicOff /> : <Mic />}
          </Button>
          <Button size="iconSm" className="rounded-lg" onClick={submit} disabled={disabled || (!text.trim() && !atts.length)} aria-label="Send">
            <ArrowUp />
          </Button>
        </div>
      </div>
      <input ref={imgIn} type="file" accept="image/*" multiple hidden onChange={(e) => { void add([...(e.target.files ?? [])]); e.target.value = ""; }} />
      <input ref={fileIn} type="file" multiple hidden onChange={(e) => { void add([...(e.target.files ?? [])]); e.target.value = ""; }} />
      <input
        ref={(el) => {
          dirIn.current = el;
          el?.setAttribute("webkitdirectory", "");
        }}
        type="file"
        multiple
        hidden
        onChange={(e) => { void add([...(e.target.files ?? [])]); e.target.value = ""; }}
      />
      <ImageCropModal
        open={!!cropAtt}
        src={cropAtt?.dataUrl ?? null}
        onClose={() => setCropId(null)}
        onCrop={(url) => {
          setAtts((a) => a.map((x) => (x.id === cropId ? { ...x, dataUrl: url, name: "selection.png" } : x)));
          setCropId(null);
        }}
      />
    </div>
  );
}
