import { describe, expect, it } from "vitest";
import { needsWebSearch, selectRelevantFacts } from "./ai-prompt";

describe("auto web search", () => {
  it("triggers for current-information questions", () => {
    expect(needsWebSearch("What's the latest news on AI?")).toBe(true);
    expect(needsWebSearch("bitcoin price today")).toBe(true);
    expect(needsWebSearch("Lakers score last night")).toBe(true);
  });
  it("does not trigger for timeless questions", () => {
    expect(needsWebSearch("Explain recursion with an example")).toBe(false);
  });
});

describe("memory relevance", () => {
  const facts = ["Is learning Spanish for a trip", "Prefers TypeScript over Python", "Runs every morning"];
  it("only returns facts related to the message", () => {
    expect(selectRelevantFacts("Help me write a typescript function", facts)).toEqual([
      "Prefers TypeScript over Python",
    ]);
  });
  it("returns nothing for unrelated messages", () => {
    expect(selectRelevantFacts("What is the capital of France?", facts)).toEqual([]);
  });
});
