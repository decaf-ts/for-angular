import { provideHttpClient } from "@angular/common/http";
import { provideHttpClientTesting } from "@angular/common/http/testing";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { provideGenui } from "../../genui.config";
import { GenuiPanelService } from "../../genui-panel.service";
import type { GenuiRenderContext } from "../../render-context";
import { GenuiPanelDockComponent } from "./genui-panel-dock.component";

const CONTEXT: GenuiRenderContext = {
  sessionId: "session-1",
  blockId: "block-1",
  specId: "spec-1",
};

function mount(context: GenuiRenderContext = CONTEXT): ComponentFixture<GenuiPanelDockComponent> {
  const fixture = TestBed.createComponent(GenuiPanelDockComponent);
  fixture.componentRef.setInput("context", context);
  fixture.detectChanges();
  fixture.detectChanges();
  return fixture;
}

function el(fixture: ComponentFixture<GenuiPanelDockComponent>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

describe("GenuiPanelDockComponent", () => {
  let panels: GenuiPanelService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [GenuiPanelDockComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideGenui({ autoRelay: false })],
    });
    panels = TestBed.inject(GenuiPanelService);
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it("renders the empty state when the session has no panel", () => {
    const fixture = mount();

    expect(el(fixture).querySelector(".genui-panel__empty")).not.toBeNull();
    expect(el(fixture).querySelector("ngx-decaf-genui-block")).toBeNull();
  });

  it("renders the published panel title and body", () => {
    panels.publish(CONTEXT.sessionId, {
      title: "Session panel",
      items: [{ type: "callout", content: "panel body" }],
    });
    const fixture = mount();

    expect(el(fixture).querySelector(".genui-panel__title")?.textContent?.trim()).toBe("Session panel");
    expect(el(fixture).querySelector("ngx-decaf-genui-block")).not.toBeNull();
    expect(el(fixture).querySelector(".genui-callout")?.textContent).toContain("panel body");
  });

  it("clears the panel and emits closed on close", () => {
    panels.publish(CONTEXT.sessionId, { items: [{ type: "text", content: "body" }] });
    const fixture = mount();
    let closed = 0;
    fixture.componentInstance.closed.subscribe(() => (closed += 1));

    (el(fixture).querySelector(".genui-panel__close") as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(closed).toBe(1);
    expect(panels.forSession(CONTEXT.sessionId)).toBeNull();
    expect(el(fixture).querySelector(".genui-panel__empty")).not.toBeNull();
  });
});
