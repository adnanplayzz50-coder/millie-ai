export type Attachment = {
  id: string;
  kind: "image" | "file";
  name: string;
  dataUrl?: string;
  text?: string;
};

const SKIP_DIRS = ["node_modules", ".git", "dist", "build", ".next", "__pycache__", ".venv"];
const TEXT_EXT =
  /\.(txt|md|mdx|json|js|jsx|ts|tsx|mjs|cjs|css|scss|html|htm|xml|yml|yaml|toml|ini|env|py|rb|go|rs|java|kt|c|h|cpp|hpp|cs|php|sh|bash|sql|swift|vue|svelte|csv|log|gitignore|dockerfile)$/i;
export const MAX_TEXT_BYTES = 200_000;

export const uid = () => Math.random().toString(36).slice(2, 10);

export function shouldSkipPath(path: string) {
  const parts = path.split("/");
  return parts.some((p) => SKIP_DIRS.includes(p));
}

export function isTextFile(f: File) {
  return f.type.startsWith("text/") || TEXT_EXT.test(f.name) || f.type === "application/json";
}

export function readAsDataUrl(f: Blob): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(f);
  });
}

/** Downscale big images so they stay under free-tier request limits. */
export async function compressImage(dataUrl: string, max = 1600): Promise<string> {
  const img = await loadImage(dataUrl);
  const scale = Math.min(1, max / Math.max(img.width, img.height));
  if (scale === 1 && dataUrl.length < 1_500_000) return dataUrl;
  const c = document.createElement("canvas");
  c.width = Math.round(img.width * scale);
  c.height = Math.round(img.height * scale);
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", 0.88);
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = src;
  });
}

export async function filesToAttachments(files: File[]): Promise<{ items: Attachment[]; skipped: number }> {
  const items: Attachment[] = [];
  let skipped = 0;
  for (const f of files) {
    const path = (f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name;
    if (shouldSkipPath(path)) {
      skipped++;
      continue;
    }
    if (f.type.startsWith("image/")) {
      items.push({ id: uid(), kind: "image", name: f.name, dataUrl: await compressImage(await readAsDataUrl(f)) });
    } else if (isTextFile(f) && f.size <= MAX_TEXT_BYTES) {
      items.push({ id: uid(), kind: "file", name: path, text: await f.text() });
    } else skipped++;
  }
  return { items, skipped };
}
