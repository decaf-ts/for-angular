import { provideHttpClient } from "@angular/common/http";
import { provideHttpClientTesting } from "@angular/common/http/testing";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { GenuiPanelService } from "../../genui-panel.service";
import { provideGenui } from "../../genui.config";
import type { GenuiRenderContext } from "../../render-context";
import { GenuiFenceComponent } from "./genui-fence.component";

const CONTEXT: GenuiRenderContext = {
  sessionId: "session-1",
  blockId: "block-1",
  specId: "spec-1",
};

function mount(
  value: string,
  context: GenuiRenderContext = CONTEXT,
): ComponentFixture<GenuiFenceComponent> {
  const fixture = TestBed.createComponent(GenuiFenceComponent);
  fixture.componentRef.setInput("text", value);
  fixture.componentRef.setInput("context", context);
  fixture.detectChanges();
  fixture.detectChanges();
  return fixture;
}

function el(fixture: ComponentFixture<GenuiFenceComponent>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

describe("GenuiFenceComponent", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [GenuiFenceComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideGenui({ autoRelay: false })],
    });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it("renders plain text without a block", () => {
    const fixture = mount("just some text");

    expect(el(fixture).querySelector(".genui-fence__text")?.textContent?.trim()).toBe("just some text");
    expect(el(fixture).querySelector("ngx-decaf-genui-block")).toBeNull();
  });

  it("renders a GenUI spec found inside a dsh-ui fence", () => {
    const fixture = mount(
      ["Before", "```dsh-ui", '{"items":[{"type":"callout","content":"from the fence"}]}', "```"].join("\n"),
    );

    expect(el(fixture).querySelector("ngx-decaf-genui-block")).not.toBeNull();
    expect(el(fixture).querySelector(".genui-callout")?.textContent).toContain("from the fence");
  });

  it("renders a non-genui fence as text", () => {
    const value = "```json\n{\"a\":1}\n```";
    const fixture = mount(value);

    expect(el(fixture).querySelector("ngx-decaf-genui-block")).toBeNull();
    expect(el(fixture).querySelector(".genui-fence__text")?.textContent).toContain("```json");
  });

  it("falls back to a visible <pre> for an unresolved genui spec instead of crashing", () => {
    const fixture = mount(["```dsh-ui", "definitely not json", "```"].join("\n"));

    const fallback = el(fixture).querySelector(".genui-fence__fallback");
    expect(fallback).not.toBeNull();
    expect(fallback?.tagName.toLowerCase()).toBe("pre");
    expect(fallback?.textContent).toContain("definitely not json");
    expect(el(fixture).querySelector("ngx-decaf-genui-block")).toBeNull();
  });

  it("publishes a panel spec to the session panel and shows the panel hint", () => {
    const panels = TestBed.inject(GenuiPanelService);
    const fixture = mount(
      [
        "```dsh-ui",
        '{"panel":true,"title":"Session panel","items":[{"type":"text","content":"panel body"}]}',
        "```",
      ].join("\n"),
    );

    expect(el(fixture).querySelector(".genui-fence__panel")).not.toBeNull();
    expect(el(fixture).querySelector("ngx-decaf-genui-block")).toBeNull();
    expect(panels.forSession(CONTEXT.sessionId)).toMatchObject({
      title: "Session panel",
      items: [{ type: "text", content: "panel body" }],
    });
  });

  it("forwards block actions through the fence action output", () => {
    const fixture = mount(
      ["```dsh-ui", '{"items":[{"type":"button","label":"Go","action":"go"}]}', "```"].join("\n"),
    );
    const emitted: string[] = [];
    fixture.componentInstance.action.subscribe((event) => emitted.push(event.name));

    (el(fixture).querySelector(".genui-button") as HTMLButtonElement).click();

    expect(emitted).toEqual(["go"]);
  });

  it("renders multiple segments in document order", () => {
    const fixture = mount(
      [
        "lead-in",
        "```dsh-ui",
        '{"items":[{"type":"text","content":"segment"}]}',
        "```",
        "tail",
      ].join("\n"),
    );

    const textSegments = Array.from(el(fixture).querySelectorAll(".genui-fence__text")).map((node) =>
      node.textContent?.trim(),
    );
    expect(textSegments).toEqual(["lead-in", "tail"]);
    expect(el(fixture).querySelector("ngx-decaf-genui-block")).not.toBeNull();
  });
});
