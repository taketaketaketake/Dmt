import { describe, it, expect } from "vitest";
import { parseNativeSteps, type DeckStep } from "./LessonDeck";

const section = (s: DeckStep) => s as Extract<DeckStep, { kind: "section" }>;

describe("parseNativeSteps", () => {
  it("wraps content in title and finish steps", () => {
    const steps = parseNativeSteps("## Intro\n\nHello");
    expect(steps[0].kind).toBe("title");
    expect(steps[steps.length - 1].kind).toBe("finish");
  });

  it("splits sections on ## headings with bullet-level blocks", () => {
    const steps = parseNativeSteps(
      "## One\n\nA paragraph.\n\n- first bullet\n  - nested child\n- second bullet\n\n## Two\n\n- only"
    );
    const [, s1, s2] = steps;
    expect(section(s1).heading).toBe("One");
    // paragraph, bullet+child, bullet => 3 reveal units
    expect(section(s1).blocks).toHaveLength(3);
    expect(section(s1).blocks[1]).toMatchObject({ type: "md" });
    expect((section(s1).blocks[1] as { md: string }).md).toContain("nested child");
    expect(section(s2).heading).toBe("Two");
    expect(section(s2).blocks).toHaveLength(1);
  });

  it("keeps step widgets (calculator/checks) as their own steps", () => {
    const steps = parseNativeSteps("## A\n\n- x\n\n:::calculator breakeven\n\n## B\n\n- y");
    const kinds = steps.map((s) => s.kind);
    expect(kinds).toEqual(["title", "section", "widget", "section", "finish"]);
    expect(steps[2]).toMatchObject({ kind: "widget", name: "calculator", arg: "breakeven" });
  });

  it("parses fenced cards into items", () => {
    const steps = parseNativeSteps(
      "## A\n\n:::cards\n- **First** — one\n- Second\n  with continuation\n:::"
    );
    const blocks = section(steps[1]).blocks;
    expect(blocks[0]).toMatchObject({ type: "cards" });
    const cards = blocks[0] as { items: string[] };
    expect(cards.items).toHaveLength(2);
    expect(cards.items[1]).toContain("with continuation");
  });

  it("parses compare columns from ### headings", () => {
    const steps = parseNativeSteps(
      "## A\n\n:::compare\n### Left\nleft text\n### Right\nright text\n:::"
    );
    const block = section(steps[1]).blocks[0] as {
      type: string;
      columns: { title: string; md: string }[];
    };
    expect(block.type).toBe("compare");
    expect(block.columns.map((c) => c.title)).toEqual(["Left", "Right"]);
    expect(block.columns[1].md).toContain("right text");
  });

  it("parses formula and reveal fences", () => {
    const steps = parseNativeSteps(
      "## A\n\n:::formula\nX = Y + Z\n:::\n\n:::reveal Why though?\nBecause reasons.\n:::"
    );
    const blocks = section(steps[1]).blocks;
    expect(blocks[0]).toMatchObject({ type: "formula", text: "X = Y + Z" });
    expect(blocks[1]).toMatchObject({ type: "reveal", question: "Why though?" });
  });

  it("does not treat fence contents as widgets or headings", () => {
    const steps = parseNativeSteps("## A\n\n:::cards\n- item\n:::\n\n- after");
    expect(steps.map((s) => s.kind)).toEqual(["title", "section", "finish"]);
    expect(section(steps[1]).blocks).toHaveLength(2); // cards + bullet
  });
});
