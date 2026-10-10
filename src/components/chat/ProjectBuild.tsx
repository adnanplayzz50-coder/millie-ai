import { useState } from "react";
import { Check, ChevronRight, Download, FileCode, Folder } from "lucide-react";
import { zipSync, strToU8 } from "fflate";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { parseProjectOutput, type ProjectFile } from "@/lib/project-output";

function FileTree({ files, prefix = "", selected, onSelect }: { files: ProjectFile[]; prefix?: string; selected: string; onSelect: (path: string) => void }) {
  const entries = [...new Set(files.filter((f) => f.path.startsWith(prefix)).map((f) => f.path.slice(prefix.length).split("/")[0] ?? ""))].sort();
  return <div className="space-y-1">{entries.map((entry) => {
    const path = prefix + entry;
    const file = files.find((f) => f.path === path);
    return file ? <Button key={path} variant="ghost" size="sm" className="w-full justify-start truncate font-mono" data-active={selected === path} onClick={() => onSelect(path)}><FileCode className="shrink-0" /><span className="truncate">{entry}</span>{!file.complete && <span className="ml-auto text-muted-foreground">…</span>}</Button> : <details key={path} open className="group/tree"><summary className="flex cursor-pointer items-center gap-2 py-1.5 font-mono text-xs text-muted-foreground"><ChevronRight className="size-3 group-open/tree:rotate-90" /><Folder className="size-3.5" />{entry}</summary><div className="ml-3 border-l border-border pl-2"><FileTree files={files} prefix={path + "/"} selected={selected} onSelect={onSelect} /></div></details>;
  })}</div>;
}

export function ProjectBuild({ content, streaming }: { content: string; streaming: boolean }) {
  const [selected, setSelected] = useState("");
  const project = parseProjectOutput(content);
  if (!project) return null;
  const file = project.files.find((f) => f.path === selected) ?? project.files.at(-1);
  const download = () => {
    try {
      const entries: Record<string, Uint8Array> = {};
      for (const f of project.files) entries[f.path] = strToU8(f.content);
      const bytes = zipSync(entries);
      const url = URL.createObjectURL(new Blob([new Uint8Array(bytes).buffer], { type: "application/zip" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `${project.name.replace(/[^a-z0-9_-]/gi, "-") || "project"}.zip`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch { toast.error("Could not download the project."); }
  };
  return <section className="min-w-0 font-sans text-sm" aria-label={`Project ${project.name}`}>
    <h2 className="mb-3 break-words text-lg font-medium">{project.name}</h2>
    <ol className="mb-4 space-y-2">{project.steps.map((step, i) => <li key={i} className="flex items-start gap-2"><Check className="mt-1 size-3.5 shrink-0 text-primary" /><span>{step}</span></li>)}</ol>
    <details open className="border-y border-border py-3"><summary className="cursor-pointer text-xs text-muted-foreground">Files · {project.files.length}</summary><div className="mt-3"><FileTree files={project.files} selected={file?.path ?? ""} onSelect={setSelected} /></div></details>
    {file && <div className="my-3 min-w-0 overflow-hidden rounded-lg border border-border bg-code text-code-foreground"><div className="break-all border-b border-border px-3 py-2 font-mono text-xs">{file.path}{!file.complete ? " · Writing…" : ""}</div><pre className="max-h-80 overflow-auto p-3 font-mono text-xs"><code>{file.content}</code></pre></div>}
    <Button onClick={download} disabled={streaming || !project.complete || !project.files.length} className="mt-3 max-w-full"><Download />Download full project</Button>
    <p className="mt-1 text-[10px] text-muted-foreground opacity-50">Project may have errors</p>
  </section>;
}