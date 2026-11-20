import {
  isComponentRoot,
  isGenuiFenceLanguage,
  isGenuiSpec,
  isKnownNodeType,
  normalizeFenceLanguage,
  parseGenuiSpec,
  resolveFenceSpec,
  splitGenuiFences,
  wrapSingleComponentRoot,
} from "./fence";
import type { GenuiSpec } from "./types";

const CALLOUT_SPEC: GenuiSpec = {
  items: [{ type: "callout", tone: "info", title: "Heads up", content: "Pipeline is green." }],
};

describe("normalizeFenceLanguage", () => {
  it("normalizes the canonical label", () => {
    expect(normalizeFenceLanguage("dsh-ui")).toBe("dsh-ui");
    expect(normalizeFenceLanguage("  DSH-UI  ")).toBe("dsh-ui");
  });

  it("strips trailing punctuation from the label", () => {
    for (const label of ["dsh-ui.", "dsh-ui,", "dsh-ui:", "dsh-ui;", "dsh-ui)", "dsh-ui」", "dsh-ui`"]) {
      expect(normalizeFenceLanguage(label)).toBe("dsh-ui");
    }
  });

  it("returns non-genui languages unchanged", () => {
    expect(normalizeFenceLanguage("json")).toBe("json");
    expect(normalizeFenceLanguage("typescript")).toBe("typescript");
    expect(normalizeFenceLanguage("")).toBe("");
  });
});

describe("isGenuiFenceLanguage", () => {
  it("recognizes genui labels only", () => {
    expect(isGenuiFenceLanguage("dsh-ui")).toBe(true);
    expect(isGenuiFenceLanguage("dsh-ui.")).toBe(true);
    expect(isGenuiFenceLanguage("json")).toBe(false);
    expect(isGenuiFenceLanguage(null)).toBe(false);
    expect(isGenuiFenceLanguage(undefined)).toBe(false);
  });
});

describe("splitGenuiFences", () => {
  it("returns a single text segment when there is no fence", () => {
    const segments = splitGenuiFences("plain text\nsecond line");
    expect(segments).toEqual([{ kind: "text", text: "plain text\nsecond line" }]);
  });

  it("leaves non-genui fences as visible text", () => {
    const text = "Before\n```json\n{\"a\":1}\n```\nAfter";
    const segments = splitGenuiFences(text);

    expect(segments).toHaveLength(1);
    expect(segments[0]).toEqual({ kind: "text", text });
  });

  it("splits a genui fence out of surrounding text", () => {
    const text = [
      "Intro line",
      "```dsh-ui",
      '{"items":[{"type":"callout","content":"hello"}]}',
      "```",
      "Outro line",
    ].join("\n");

    const segments = splitGenuiFences(text);
    expect(segments.map((segment) => segment.kind)).toEqual(["text", "genui", "text"]);
    const genui = segments[1];
    expect(genui.kind).toBe("genui");
    if (genui.kind === "genui") {
      expect(genui.spec?.items[0]).toEqual({ type: "callout", content: "hello" });
      expect(genui.raw).toBe('{"items":[{"type":"callout","content":"hello"}]}');
    }
  });

  it("accepts trailing-punctuation labels and tilde fences", () => {
    const text = ["~~~dsh-ui.", '{"items":[{"type":"text","content":"hi"}]}', "~~~"].join("\n");
    const segments = splitGenuiFences(text);

    expect(segments).toHaveLength(1);
    expect(segments[0]?.kind).toBe("genui");
    if (segments[0]?.kind === "genui") {
      expect(segments[0].spec?.items[0]).toEqual({ type: "text", content: "hi" });
    }
  });

  it("keeps an unparseable genui spec as a null-spec segment so the caller can fall back", () => {
    const text = ["```dsh-ui", "this is not json at all", "```"].join("\n");
    const segments = splitGenuiFences(text);

    expect(segments).toHaveLength(1);
    expect(segments[0]).toEqual({ kind: "genui", raw: "this is not json at all", spec: null });
  });

  it("treats an unclosed genui fence as text", () => {
    const text = ["```dsh-ui", '{"items":[]}'].join("\n");
    const segments = splitGenuiFences(text);

    expect(segments).toHaveLength(1);
    expect(segments[0]?.kind).toBe("text");
  });

  it("supports several genui fences in one message", () => {
    const text = [
      "first",
      "```dsh-ui",
      '{"items":[{"type":"text","content":"one"}]}',
      "```",
      "second",
      "```dsh-ui",
      '{"items":[{"type":"text","content":"two"}]}',
      "```",
    ].join("\n");

    const segments = splitGenuiFences(text);
    expect(segments.filter((segment) => segment.kind === "genui")).toHaveLength(2);
  });

  it("preserves a panel flag on the parsed spec", () => {
    const text = ["```dsh-ui", '{"panel":true,"items":[{"type":"text","content":"panel"}]}', "```"].join("\n");
    const segments = splitGenuiFences(text);

    expect(segments[0]?.kind).toBe("genui");
    if (segments[0]?.kind === "genui") {
      expect(segments[0].spec?.panel).toBe(true);
    }
  });
});

describe("resolveFenceSpec", () => {
  it("returns the direct spec when the JSON is complete", () => {
    const spec = resolveFenceSpec(JSON.stringify(CALLOUT_SPEC), { settled: true });
    expect(spec).toEqual(CALLOUT_SPEC);
  });

  it("repairs a near-complete truncated fence", () => {
    const spec = resolveFenceSpec('{"items":[{"type":"text","content":"a"},', { settled: true });
    expect(spec).not.toBeNull();
    expect(spec?.items).toHaveLength(1);
    expect(spec?.items[0]).toMatchObject({ type: "text", content: "a" });
  });

  it("does not repair closed-then-reopened brackets", () => {
    expect(resolveFenceSpec('{"items":[]}]}', { settled: true })).toBeNull();
  });

  it("returns null for empty or non-spec JSON", () => {
    expect(resolveFenceSpec("", { settled: true })).toBeNull();
    expect(resolveFenceSpec("42", { settled: true })).toBeNull();
  });
});

describe("spec coercion", () => {
  it("recognizes a spec-shaped object", () => {
    expect(isGenuiSpec({ items: [] })).toBe(true);
    expect(isGenuiSpec({ items: [], title: "t", gap: 8 })).toBe(true);
    expect(isGenuiSpec({ items: [], title: 3 })).toBe(false);
    expect(isGenuiSpec({ items: [], gap: "8" })).toBe(false);
    expect(isGenuiSpec({})).toBe(false);
    expect(isGenuiSpec(null)).toBe(false);
  });

  it("wraps a single component root into a spec", () => {
    const spec = parseGenuiSpec('{"type":"callout","content":"hello"}');
    expect(spec?.items).toEqual([{ type: "callout", content: "hello" }]);
  });

  it("hoists a root-level title that is not a callout/card/hero field", () => {
    const spec = parseGenuiSpec('{"type":"text","content":"hello","title":"My title"}');
    expect(spec?.title).toBe("My title");
    expect(spec?.items[0]).toEqual({ type: "text", content: "hello" });
  });

  it("keeps a callout title on the node", () => {
    const spec = parseGenuiSpec('{"type":"callout","content":"hello","title":"Node title"}');
    expect(spec?.title).toBeUndefined();
    expect(spec?.items[0]).toMatchObject({ type: "callout", title: "Node title" });
  });

  it("detects component roots and rejects nested non-roots", () => {
    expect(isComponentRoot({ type: "callout", content: "x" })).toBe(true);
    expect(isComponentRoot({ type: "card", items: [] })).toBe(true);
    expect(isComponentRoot({ type: "genui", items: [] })).toBe(false);
    expect(isComponentRoot({ items: [] })).toBe(false);
    expect(isComponentRoot(null)).toBe(false);
  });

  it("wrapSingleComponentRoot returns null for values without a type", () => {
    expect(wrapSingleComponentRoot({ items: [] })).toBeNull();
    expect(wrapSingleComponentRoot("x")).toBeNull();
  });

  it("exposes the known node type vocabulary", () => {
    expect(isKnownNodeType("callout")).toBe(true);
    expect(isKnownNodeType("tabs")).toBe(true);
    expect(isKnownNodeType("definitely-not-a-type")).toBe(false);
  });
});
