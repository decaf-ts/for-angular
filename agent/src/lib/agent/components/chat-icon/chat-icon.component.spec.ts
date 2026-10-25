import { ComponentFixture, TestBed } from "@angular/core/testing";

import {
  AGENT_CHAT_ICON_NAMES,
  ChatIconComponent,
} from "./chat-icon.component";

function mount(): ComponentFixture<ChatIconComponent> {
  const fixture = TestBed.createComponent(ChatIconComponent);
  fixture.detectChanges();
  return fixture;
}

function svgOf(fixture: ComponentFixture<ChatIconComponent>): SVGElement {
  return fixture.nativeElement.querySelector("svg.chat-icon") as SVGElement;
}

describe("ChatIconComponent", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [ChatIconComponent] });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it("renders a non-empty glyph for every declared icon name", () => {
    for (const name of AGENT_CHAT_ICON_NAMES) {
      const fixture = TestBed.createComponent(ChatIconComponent);
      fixture.componentRef.setInput("name", name);
      fixture.detectChanges();

      const svg = svgOf(fixture);
      expect(svg).not.toBeNull();
      expect(
        svg.querySelectorAll("path, rect, circle").length,
      ).toBeGreaterThan(0);

      fixture.destroy();
    }
  });

  it("binds size and strokeWidth to the svg attributes", () => {
    const fixture = mount();
    fixture.componentRef.setInput("size", 32);
    fixture.componentRef.setInput("strokeWidth", 2.5);
    fixture.detectChanges();

    const svg = svgOf(fixture);
    expect(svg.getAttribute("width")).toBe("32");
    expect(svg.getAttribute("height")).toBe("32");
    expect(svg.getAttribute("stroke-width")).toBe("2.5");
  });

  it("is decorative by default (aria-hidden, no role, no title)", () => {
    const fixture = mount();

    const svg = svgOf(fixture);
    expect(svg.getAttribute("aria-hidden")).toBe("true");
    expect(svg.getAttribute("role")).toBeNull();
    expect(svg.querySelector("title")).toBeNull();
  });

  it("switches to role=img with a title element when a title is supplied", () => {
    const fixture = mount();
    fixture.componentRef.setInput("name", "send");
    fixture.componentRef.setInput("title", "Send message");
    fixture.detectChanges();

    const svg = svgOf(fixture);
    expect(svg.getAttribute("role")).toBe("img");
    expect(svg.getAttribute("aria-label")).toBe("Send message");
    expect(svg.getAttribute("aria-hidden")).toBeNull();
    expect(svg.querySelector("title")?.textContent?.trim()).toBe("Send message");
  });

  it("adds the spin class for the loader icon only", () => {
    const fixture = mount();
    fixture.componentRef.setInput("name", "loader");
    fixture.detectChanges();
    expect(svgOf(fixture).classList.contains("chat-icon--spin")).toBe(true);

    fixture.componentRef.setInput("name", "bot");
    fixture.detectChanges();
    expect(svgOf(fixture).classList.contains("chat-icon--spin")).toBe(false);
  });

  it("falls back to the info glyph for an unknown name", () => {
    const info = mount();
    info.componentRef.setInput("name", "info");
    info.detectChanges();

    const unknown = TestBed.createComponent(ChatIconComponent);
    unknown.componentRef.setInput("name", "definitely-not-an-icon");
    unknown.detectChanges();

    const infoSvg = svgOf(info);
    const unknownSvg = svgOf(unknown);
    expect(unknownSvg).not.toBeNull();
    expect(unknownSvg.querySelectorAll("path").length).toBe(
      infoSvg.querySelectorAll("path").length,
    );
    expect(unknownSvg.querySelectorAll("circle").length).toBe(
      infoSvg.querySelectorAll("circle").length,
    );
    expect(unknownSvg.querySelector("circle")?.getAttribute("r")).toBe("9");
  });
});
