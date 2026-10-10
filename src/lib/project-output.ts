export type ProjectFile = { path: string; content: string; complete: boolean };
export type ProjectOutput = { name: string; steps: string[]; files: ProjectFile[]; complete: boolean };

export function safeProjectPath(path: string): boolean {
  return !!path && !/^[\\/]|^[a-z]:|[\x00-\x1f]/i.test(path) && !path.split(/[\\/]/).some((part) => !part || part === ".." || part === ".");
}

/** File contents are raw, not XML: preserve JSX, HTML and escaped source verbatim. */
export function parseProjectOutput(text: string): ProjectOutput | null {
  const start = /<project\s+name=["']([^"']+)["']\s*>/.exec(text);
  if (!start) return null;
  const body = text.slice(start.index + start[0].length);
  const steps: string[] = [];
  const files: ProjectFile[] = [];
  const tag = /<(step|file)(?:\s+path=["']([^"']+)["'])?\s*>/g;
  let match: RegExpExecArray | null;
  let cursor = 0;
  while ((match = tag.exec(body))) {
    if (match.index < cursor) continue;
    const kind = match[1];
    const from = match.index + match[0].length;
    const end = body.indexOf(`</${kind}>`, from);
    const complete = end >= 0;
    let content = body.slice(from, complete ? end : undefined);
    if (!complete) content = content.replace(/<\/?(?:f(?:i(?:l(?:e)?)?)?|s(?:t(?:e(?:p)?)?)?|p(?:r(?:o(?:j(?:e(?:c(?:t)?)?)?)?)?)?)?$/, "");
    if (kind === "step") steps.push(content.trim());
    else if (match[2] && safeProjectPath(match[2])) {
      // Remove only the structural newline immediately after the opening tag.
      files.push({ path: match[2], content: content.replace(/^\r?\n/, ""), complete });
    }
    cursor = complete ? end + `</${kind}>`.length : body.length;
    tag.lastIndex = cursor;
  }
  return { name: start[1] ?? "Project", steps, files, complete: body.trimEnd().endsWith("</project>") && files.every((f) => f.complete) };
}