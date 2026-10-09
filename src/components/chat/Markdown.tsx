import { memo, useEffect, useRef, useState, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { Check, Copy, Play, X } from "lucide-react";
import { Button } from "@/components/ui/button";

function textOf(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (node && typeof node === "object" && "props" in node)
    return textOf((node as { props: { children?: ReactNode } }).props.children);
  return "";
}

const RUNNER = `<script>
const send=(type,args)=>parent.postMessage({__millie:1,type,text:args.map(a=>{try{return typeof a==='string'?a:JSON.stringify(a,null,2)}catch{return String(a)}}).join(' ')},'*');
['log','info','warn','error'].forEach(k=>{console[k]=(...a)=>send(k,a)});
window.onerror=(m)=>{send('error',[String(m)])};
window.addEventListener('message',async e=>{try{const r=await (0,eval)("(async()=>{"+e.data+"\\n})()");if(r!==undefined)send('result',[r]);}catch(err){send('error',[String(err)])}send('done',[])});
</script>`;

type Line = { type: string; text: string };

function useRunner() {
  const [out, setOut] = useState<Line[] | null>(null);
  const [running, setRunning] = useState(false);
  const frame = useRef<HTMLIFrameElement | null>(null);
  useEffect(() => () => frame.current?.remove(), []);
  const run = (code: string) => {
    frame.current?.remove();
    setOut([]);
    setRunning(true);
    const f = document.createElement("iframe");
    f.setAttribute("sandbox", "allow-scripts");
    f.style.display = "none";
    f.srcdoc = RUNNER;
    frame.current = f;
    const onMsg = (e: MessageEvent) => {
      if (e.source !== f.contentWindow || !e.data?.__millie) return;
      if (e.data.type === "done") return finish();
      setOut((o) => [...(o ?? []), { type: e.data.type, text: e.data.text }]);
    };
    const timer = setTimeout(() => {
      setOut((o) => [...(o ?? []), { type: "error", text: "Stopped after 5s timeout." }]);
      finish();
    }, 5000);
    function finish() {
      clearTimeout(timer);
      window.removeEventListener("message", onMsg);
      setRunning(false);
      f.remove();
    }
    window.addEventListener("message", onMsg);
    f.onload = () => f.contentWindow?.postMessage(code, "*");
    document.body.appendChild(f);
  };
  return { out, setOut, running, run };
}

function CodeBlock({ lang, children }: { lang: string; children: ReactNode }) {
  const code = textOf(children).replace(/\n$/, "");
  const [copied, setCopied] = useState(false);
  const { out, setOut, running, run } = useRunner();
  const runnable = /^(js|javascript|jsx|mjs)$/i.test(lang);
  return (
    <div className="my-4 overflow-hidden rounded-xl border border-border bg-code text-code-foreground">
      <div className="flex items-center justify-between border-b border-code-foreground/10 px-3 py-1.5 font-mono text-xs">
        <span className="opacity-70">{lang || "text"}</span>
        <div className="flex gap-1">
          {runnable && (
            <Button size="sm" variant="code" onClick={() => run(code)} disabled={running}>
              <Play className="size-3" /> {running ? "Running" : "Run"}
            </Button>
          )}
          <Button
            size="sm"
            variant="code"
            onClick={() => {
              navigator.clipboard.writeText(code);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
          >
            {copied ? <Check className="size-3" /> : <Copy className="size-3" />} {copied ? "Copied" : "Copy"}
          </Button>
        </div>
      </div>
      <pre className="overflow-x-auto p-4 font-mono text-[0.83rem] leading-relaxed">
        <code className={`hljs language-${lang}`}>{children}</code>
      </pre>
      {out && (
        <div className="border-t border-code-foreground/10 px-4 py-3 font-mono text-xs">
          <div className="mb-1 flex items-center justify-between opacity-60">
            <span>Output · sandboxed</span>
            <button onClick={() => setOut(null)} aria-label="Close output">
              <X className="size-3" />
            </button>
          </div>
          {out.length === 0 && !running && <div className="opacity-60">(no output)</div>}
          {out.map((l, i) => (
            <pre key={i} className={l.type === "error" ? "whitespace-pre-wrap text-destructive" : "whitespace-pre-wrap"}>
              {l.type === "result" ? "← " : ""}
              {l.text}
            </pre>
          ))}
        </div>
      )}
    </div>
  );
}

export const Markdown = memo(function Markdown({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[[rehypeHighlight, { detect: true, ignoreMissing: true }]]}
      components={{
        a: (p) => <a {...p} target="_blank" rel="noreferrer" />,
        pre: ({ children }) => {
          const child = Array.isArray(children) ? children[0] : children;
          const cls = (child as { props?: { className?: string } })?.props?.className ?? "";
          const lang = /language-([\w+-]+)/.exec(cls)?.[1] ?? "";
          return <CodeBlock lang={lang}>{(child as { props: { children: ReactNode } }).props.children}</CodeBlock>;
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
});
