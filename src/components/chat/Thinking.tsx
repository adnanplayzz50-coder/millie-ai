import { useEffect, useState } from "react";
import { Shimmer } from "@/components/ai-elements/shimmer";

const WORDS = ["Thinking", "Pondering", "Ruminating", "Cogitating", "Synthesizing", "Percolating", "Conjuring", "Deliberating", "Contemplating", "Simmering", "Brewing"];
export function Thinking() {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setIndex((i) => (i + 1) % WORDS.length), 2400);
    return () => clearInterval(timer);
  }, []);
  return <div role="status" className="h-7 min-w-40 text-sm"><Shimmer className="millie-shimmer">{WORDS[index] ?? "Thinking"}</Shimmer></div>;
}