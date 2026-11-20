import { TestBed } from "@angular/core/testing";
import { GenuiPanelService } from "./genui-panel.service";
import type { GenuiNode, GenuiSpec } from "./types";

function text(value: string): GenuiNode {
  return { type: "text", content: value };
}

describe("GenuiPanelService", () => {
  let service: GenuiPanelService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GenuiPanelService);
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it("returns null for a session with no panel", () => {
    expect(service.forSession("s1")).toBeNull();
  });

  it("publishes and replaces a panel for a session", () => {
    service.publish("s1", { title: "One", items: [text("a")] });
    expect(service.forSession("s1")).toMatchObject({ title: "One", items: [text("a")] });

    service.publish("s1", { title: "Two", items: [text("b")] });
    expect(service.forSession("s1")).toMatchObject({ title: "Two", items: [text("b")] });
  });

  it("merges an append publication into the existing panel", () => {
    service.publish("s1", { title: "Kept", items: [text("a")] });
    service.publish("s1", { append: true, items: [text("b")] });

    expect(service.forSession("s1")).toMatchObject({
      title: "Kept",
      items: [text("a"), text("b")],
    });
  });

  it("appends into a tabbed panel", () => {
    service.publish("s1", { items: [{ type: "tabs", tabs: [{ label: "Overview", items: [text("a")] }] }] });
    service.publish("s1", {
      append: true,
      items: [
        {
          type: "tabs",
          tabs: [
            { label: "Overview", items: [text("b")] },
            { label: "Details", items: [text("c")] },
          ],
        },
      ],
    });

    const panel = service.forSession("s1") as unknown as {
      items: { tabs: { label: string; items: unknown[] }[] }[];
    };
    expect(panel.items[0]?.tabs.map((tab) => tab.label)).toEqual(["Overview", "Details"]);
    expect(panel.items[0]?.tabs[0]?.items).toEqual([text("a"), text("b")]);
  });

  it("keeps sessions isolated", () => {
    service.publish("s1", { items: [text("one")] });
    service.publish("s2", { items: [text("two")] });

    expect(service.forSession("s1")).toMatchObject({ items: [text("one")] });
    expect(service.forSession("s2")).toMatchObject({ items: [text("two")] });
  });

  it("clears one session without touching the others", () => {
    service.publish("s1", { items: [text("one")] });
    service.publish("s2", { items: [text("two")] });

    service.clear("s1");

    expect(service.forSession("s1")).toBeNull();
    expect(service.forSession("s2")).toMatchObject({ items: [text("two")] });
  });

  it("clearing an unknown session is a no-op", () => {
    service.publish("s1", { items: [text("one")] });
    service.clear("missing");
    expect(service.forSession("s1")).not.toBeNull();
  });

  it("exposes every published panel through `all`", () => {
    const spec: GenuiSpec = { items: [text("one")] };
    service.publish("s1", spec);

    expect(service.all()).toEqual({ s1: spec });
  });
});
