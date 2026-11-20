import { mergePanelSpecs } from "./panel";
import type { GenuiNode, GenuiSpec } from "./types";

function text(value: string): GenuiNode {
  return { type: "text", content: value };
}

describe("mergePanelSpecs", () => {
  it("returns the next spec when there is no previous panel", () => {
    const next: GenuiSpec = { title: "Panel", items: [text("one")] };
    expect(mergePanelSpecs(null, next)).toBe(next);
  });

  it("returns the next spec when the previous panel is empty", () => {
    const next: GenuiSpec = { items: [text("one")] };
    expect(mergePanelSpecs({ items: [] }, next)).toBe(next);
  });

  it("appends plain item lists and keeps the previous title", () => {
    const prev: GenuiSpec = { title: "Prev", items: [text("one")] };
    const next: GenuiSpec = { title: "Next", items: [text("two")] };

    const merged = mergePanelSpecs(prev, next);
    expect(merged.title).toBe("Prev");
    expect(merged.items).toEqual([text("one"), text("two")]);
  });

  it("uses the next title when the previous panel had none", () => {
    const merged = mergePanelSpecs({ items: [text("one")] }, { title: "Next", items: [text("two")] });
    expect(merged.title).toBe("Next");
  });

  it("appends same-labelled tabs in place and adds new tabs", () => {
    const prev: GenuiSpec = {
      title: "Panel",
      items: [{ type: "tabs", tabs: [{ label: "Overview", items: [text("a")] }] }],
    };
    const next: GenuiSpec = {
      items: [
        {
          type: "tabs",
          tabs: [
            { label: "Overview", items: [text("b")] },
            { label: "Details", items: [text("c")] },
          ],
        },
      ],
    };

    const merged = mergePanelSpecs(prev, next);
    expect(merged.title).toBe("Panel");
    expect(merged.items).toHaveLength(1);
    const tabs = (merged.items[0] as unknown as { tabs: { label: string; items: unknown[] }[] }).tabs;
    expect(tabs.map((tab) => tab.label)).toEqual(["Overview", "Details"]);
    expect(tabs[0]?.items).toEqual([text("a"), text("b")]);
    expect(tabs[1]?.items).toEqual([text("c")]);
  });

  it("does not mutate the previous tab arrays", () => {
    const prevTabs = [{ label: "Overview", items: [text("a")] }];
    const prev: GenuiSpec = { items: [{ type: "tabs", tabs: prevTabs }] };
    const next: GenuiSpec = { items: [{ type: "tabs", tabs: [{ label: "Overview", items: [text("b")] }] }] };

    mergePanelSpecs(prev, next);
    expect(prevTabs[0]?.items).toEqual([text("a")]);
  });

  it("falls back to item append when only one side is a tabs container", () => {
    const prev: GenuiSpec = { items: [{ type: "tabs", tabs: [{ label: "A", items: [text("a")] }] }] };
    const next: GenuiSpec = { items: [text("plain")] };

    const merged = mergePanelSpecs(prev, next);
    expect(merged.items).toHaveLength(2);
    expect(merged.items[1]).toEqual(text("plain"));
  });

  it("concatenates computed definitions", () => {
    const prev: GenuiSpec = { items: [text("a")], computed: [{ id: "total", expr: "a+b" }] };
    const next: GenuiSpec = { items: [text("b")], computed: [{ id: "avg", expr: "a/2" }] };

    const merged = mergePanelSpecs(prev, next);
    expect(merged.computed?.map((field) => field.id)).toEqual(["total", "avg"]);
  });

  it("omits computed when neither side defines one", () => {
    const merged = mergePanelSpecs({ items: [text("a")] }, { items: [text("b")] });
    expect(merged.computed).toBeUndefined();
  });

  it("treats a previous panel with computed but no items as mergeable", () => {
    const prev: GenuiSpec = { items: [], computed: [{ id: "total", expr: "1+1" }] };
    const next: GenuiSpec = { items: [text("next")] };

    const merged = mergePanelSpecs(prev, next);
    expect(merged.items).toEqual([text("next")]);
    expect(merged.computed?.map((field) => field.id)).toEqual(["total"]);
  });
});
