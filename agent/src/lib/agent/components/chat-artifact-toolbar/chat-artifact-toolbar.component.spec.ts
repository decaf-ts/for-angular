import { ComponentFixture, TestBed } from "@angular/core/testing";

import type { AgentChatArtifactKind } from "../../types";
import {
  ChatArtifactToolbarComponent,
  DEFAULT_AGENT_CHAT_ARTIFACT_TOOLS,
} from "./chat-artifact-toolbar.component";

function mount(
  inputs: Record<string, unknown> = {},
): ComponentFixture<ChatArtifactToolbarComponent> {
  const fixture = TestBed.createComponent(ChatArtifactToolbarComponent);
  for (const [key, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(key, value);
  }
  fixture.detectChanges();
  return fixture;
}

function element(
  fixture: ComponentFixture<ChatArtifactToolbarComponent>,
): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

function tools(
  fixture: ComponentFixture<ChatArtifactToolbarComponent>,
): HTMLButtonElement[] {
  return Array.from(
    element(fixture).querySelectorAll(".chat-artifact-toolbar__tool"),
  );
}

describe("ChatArtifactToolbarComponent", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ChatArtifactToolbarComponent],
    });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it("renders the default per-kind tools inside a labelled toolbar", () => {
    const fixture = mount();
    const toolbar = element(fixture).querySelector(
      ".chat-artifact-toolbar",
    ) as HTMLElement;

    expect(toolbar.getAttribute("role")).toBe("toolbar");
    expect(toolbar.getAttribute("aria-label")).toBe("Artifact tools");
    expect(tools(fixture)).toHaveLength(4);
    expect(tools(fixture).map((button) => button.getAttribute("data-kind"))).toEqual([
      "text",
      "code",
      "image",
      "sheet",
    ]);
  });

  it("exposes the default tool inventory", () => {
    expect(DEFAULT_AGENT_CHAT_ARTIFACT_TOOLS.map((tool) => tool.kind)).toEqual([
      "text",
      "code",
      "image",
      "sheet",
    ]);
  });

  it("reflects the controlled selected tool with aria-pressed", () => {
    const fixture = mount({ selected: "image" });
    const [text, code, image, sheet] = tools(fixture);

    expect(text.getAttribute("aria-pressed")).toBe("false");
    expect(code.getAttribute("aria-pressed")).toBe("false");
    expect(image.getAttribute("aria-pressed")).toBe("true");
    expect(image.classList.contains("chat-artifact-toolbar__tool--active")).toBe(
      true,
    );
    expect(sheet.getAttribute("aria-pressed")).toBe("false");
  });

  it("selects a tool and emits its kind", () => {
    const fixture = mount();
    const emitted: AgentChatArtifactKind[] = [];
    fixture.componentInstance.toolSelected.subscribe((kind) =>
      emitted.push(kind),
    );

    tools(fixture)[1].click();
    fixture.detectChanges();

    expect(emitted).toEqual(["code"]);
    expect(fixture.componentInstance.active()).toBe("code");
    expect(tools(fixture)[1].getAttribute("aria-pressed")).toBe("true");
  });

  it("does not select when disabled", () => {
    const fixture = mount({ disabled: true });
    const emitted: AgentChatArtifactKind[] = [];
    fixture.componentInstance.toolSelected.subscribe((kind) =>
      emitted.push(kind),
    );

    tools(fixture)[0].click();
    fixture.detectChanges();

    expect(emitted).toEqual([]);
    expect(tools(fixture)[0].disabled).toBe(true);
    expect(
      element(fixture)
        .querySelector(".chat-artifact-toolbar")
        ?.getAttribute("aria-disabled"),
    ).toBe("true");
  });

  it("honours per-tool disabled flags and custom labels", () => {
    const fixture = mount({
      tools: [
        { kind: "text", labelKey: "custom.text", disabled: true },
        { kind: "code", icon: "bot" },
      ],
    });
    const [text, code] = tools(fixture);

    expect(text.disabled).toBe(true);
    expect(
      fixture.componentInstance.labelKeyFor(fixture.componentInstance.tools()[0]),
    ).toBe("custom.text");
    expect(text.textContent).toContain("text");
    expect(code.textContent).toContain("code");
  });
});
