import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { loadImage } from "@/lib/attachments";

type Rect = { x: number; y: number; w: number; h: number }; // fractions 0..1

export function ImageCropModal({
  src,
  open,
  onClose,
  onCrop,
}: {
  src: string | null;
  open: boolean;
  onClose: () => void;
  onCrop: (dataUrl: string) => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState<Rect>({ x: 0.15, y: 0.15, w: 0.7, h: 0.7 });
  const drag = useRef<{ kind: "move" | "new" | "resize"; sx: number; sy: number; r: Rect } | null>(null);

  useEffect(() => {
    if (open) setRect({ x: 0.15, y: 0.15, w: 0.7, h: 0.7 });
  }, [open, src]);

  const pos = (e: React.PointerEvent) => {
    const b = box.current!.getBoundingClientRect();
    return { x: Math.min(1, Math.max(0, (e.clientX - b.left) / b.width)), y: Math.min(1, Math.max(0, (e.clientY - b.top) / b.height)) };
  };
  const down = (kind: "move" | "new" | "resize") => (e: React.PointerEvent) => {
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    const p = pos(e);
    drag.current = { kind, sx: p.x, sy: p.y, r: rect };
    if (kind === "new") setRect({ x: p.x, y: p.y, w: 0, h: 0 });
  };
  const move = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const p = pos(e);
    if (d.kind === "move") {
      setRect({
        ...d.r,
        x: Math.min(1 - d.r.w, Math.max(0, d.r.x + p.x - d.sx)),
        y: Math.min(1 - d.r.h, Math.max(0, d.r.y + p.y - d.sy)),
      });
    } else if (d.kind === "resize") {
      setRect({ ...d.r, w: Math.max(0.03, p.x - d.r.x), h: Math.max(0.03, p.y - d.r.y) });
    } else {
      setRect({ x: Math.min(p.x, d.sx), y: Math.min(p.y, d.sy), w: Math.abs(p.x - d.sx), h: Math.abs(p.y - d.sy) });
    }
  };

  const crop = async () => {
    if (!src) return;
    const img = await loadImage(src);
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(rect.w * img.width));
    c.height = Math.max(1, Math.round(rect.h * img.height));
    c.getContext("2d")!.drawImage(img, rect.x * img.width, rect.y * img.height, c.width, c.height, 0, 0, c.width, c.height);
    onCrop(c.toDataURL("image/png"));
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="font-reading text-xl font-medium">Select a region</DialogTitle>
        </DialogHeader>
        <p className="-mt-2 text-sm text-muted-foreground">Drag to draw, move the box, or pull the corner to resize.</p>
        {src && (
          <div
            ref={box}
            className="relative mx-auto max-h-[60vh] w-fit cursor-crosshair touch-none select-none overflow-hidden rounded-lg"
            onPointerDown={down("new")}
            onPointerMove={move}
            onPointerUp={() => (drag.current = null)}
          >
            <img src={src} alt="" className="block max-h-[60vh] max-w-full" draggable={false} />
            <div
              className="absolute cursor-move border-2 border-primary shadow-[0_0_0_9999px_color-mix(in_oklch,var(--background)_65%,transparent)]"
              style={{ left: `${rect.x * 100}%`, top: `${rect.y * 100}%`, width: `${rect.w * 100}%`, height: `${rect.h * 100}%` }}
              onPointerDown={down("move")}
            >
              <div
                className="absolute -bottom-1.5 -right-1.5 size-3.5 cursor-se-resize rounded-sm border-2 border-primary bg-background"
                onPointerDown={down("resize")}
              />
            </div>
          </div>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Use full image
          </Button>
          <Button onClick={crop} disabled={rect.w < 0.01 || rect.h < 0.01}>
            Use selected area
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
