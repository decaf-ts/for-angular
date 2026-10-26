import { ComponentFixture, TestBed } from "@angular/core/testing";

import { ChatArtifactSkeletonComponent } from "./chat-artifact-skeleton.component";

function mount(
  inputs: Record<string, unknown> = {},
): ComponentFixture<ChatArtifactSkeletonComponent> {
  const fixture = TestBed.createComponent(ChatArtifactSkeletonComponent);
  for (const [key, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(key, value);
  }
  fixture.detectChanges();
  return fixture;
}

function element(
  fixture: ComponentFixture<ChatArtifactSkeletonComponent>,
): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

describe("ChatArtifactSkeletonComponent", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ChatArtifactSkeletonComponent],
    });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it("renders the full-panel skeleton with a header and default four lines", () => {
    const fixture = mount();
    const skeleton = element(fixture).querySelector(
      ".chat-artifact-skeleton--full",
    ) as HTMLElement;

    expect(skeleton).not.toBeNull();
    expect(skeleton.getAttribute("role")).toBe("status");
    expect(skeleton.getAttribute("aria-busy")).toBe("true");
    expect(skeleton.getAttribute("aria-label")).toBe("Loading artifact panel…");
    expect(
      element(fixture).querySelector(".chat-artifact-skeleton__header"),
    ).not.toBeNull();
    expect(
      element(fixture).querySelectorAll(
        ".chat-artifact-skeleton__bar--line",
      ).length,
    ).toBe(4);
  });

  it("honours the requested number of lines", () => {
    const fixture = mount({ lines: 7 });

    expect(
      element(fixture).querySelectorAll(
        ".chat-artifact-skeleton__bar--line",
      ).length,
    ).toBe(7);
  });

  it("clamps non-positive line counts to one", () => {
    const fixture = mount({ lines: 0 });

    expect(
      element(fixture).querySelectorAll(
        ".chat-artifact-skeleton__bar--line",
      ).length,
    ).toBe(1);
  });

  it("renders the inline variant with its label", () => {
    const fixture = mount({ variant: "inline" });
    const skeleton = element(fixture).querySelector(
      ".chat-artifact-skeleton--inline",
    ) as HTMLElement;

    expect(skeleton).not.toBeNull();
    expect(skeleton.getAttribute("aria-label")).toBe("Loading artifact…");
    expect(
      element(fixture).querySelector(".chat-artifact-skeleton__label")
        ?.textContent,
    ).toContain("Loading artifact");
    expect(
      element(fixture).querySelector(".chat-artifact-skeleton--full"),
    ).toBeNull();
  });

  it("lets callers override the accessible label", () => {
    const fixture = mount({ variant: "inline", label: "Fetching document" });

    expect(
      element(fixture)
        .querySelector(".chat-artifact-skeleton--inline")
        ?.getAttribute("aria-label"),
    ).toBe("Fetching document");
    expect(
      element(fixture).querySelector(".chat-artifact-skeleton__label")
        ?.textContent,
    ).toContain("Fetching document");
  });
});
