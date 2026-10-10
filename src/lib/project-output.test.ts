import { describe, expect, it } from "vitest";
import { parseProjectOutput, safeProjectPath } from "./project-output";

describe("C0DE full project output", () => {
  it("preserves complete raw source files and project steps", () => {
    const p = parseProjectOutput('<project name="Demo"><step>Create app</step><file path="src/main.tsx">\nconst app = <div>{"hello"}</div>;\n</file></project>');
    expect(p).toEqual({ name: "Demo", steps: ["Create app"], files: [{ path: "src/main.tsx", content: 'const app = <div>{"hello"}</div>;\n', complete: true }], complete: true });
  });
  it("exposes an unfinished file live but does not mark it downloadable", () => {
    expect(parseProjectOutput('<project name="Demo"><file path="main.js">\nconsole.log(1);</fi')?.files).toEqual([{ path: "main.js", content: "console.log(1);", complete: false }]);
    expect(parseProjectOutput('<project name="Demo"><file path="main.js">x')?.complete).toBe(false);
  });
  it("rejects unsafe ZIP paths", () => {
    for (const path of ["../secret", "/absolute", "C:\\file", "src/../../file", "src\\..\\file"]) expect(safeProjectPath(path)).toBe(false);
    expect(safeProjectPath("src/components/main.tsx")).toBe(true);
  });
});