import { ComponentFixture, TestBed } from "@angular/core/testing";
import { provideHttpClient } from "@angular/common/http";
import {
  HttpTestingController,
  provideHttpClientTesting,
} from "@angular/common/http/testing";
import { AtFileComposerComponent } from "./at-file-composer.component";
import type { AtFileSearchResult, AtFileSettings } from "../../types";

const SETTINGS: AtFileSettings = {
  enabled: true,
  ignoreFiles: ["desktop.ini"],
  ignoreFilesConfigured: false,
  workspaceIgnoreFiles: [],
  ignorePastedMentions: true,
};

const SEARCH: AtFileSearchResult = {
  files: [
    { path: "/workspace/README.md", relative: "README.md", kind: "file" },
    { path: "/workspace/src", relative: "src", kind: "dir" },
    { path: "/workspace/src/index.ts", relative: "src/index.ts", kind: "file" },
  ],
  truncated: false,
};

interface MountOptions {
  settings?: AtFileSettings;
  search?: AtFileSearchResult;
}

function mount(
  inputs: Record<string, unknown> = {},
  options: MountOptions = {}
): { fixture: ComponentFixture<AtFileComposerComponent>; http: HttpTestingController } {
  const fixture = TestBed.createComponent(AtFileComposerComponent);
  for (const [key, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(key, value);
  }
  fixture.detectChanges();
  const http = TestBed.inject(HttpTestingController);
  http.expectOne("/files/settings").flush(options.settings ?? SETTINGS);
  if ((options.settings ?? SETTINGS).enabled !== false) {
    http.expectOne("/files/search").flush(options.search ?? SEARCH);
  }
  fixture.detectChanges();
  return { fixture, http };
}

function element(fixture: ComponentFixture<AtFileComposerComponent>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

function textarea(
  fixture: ComponentFixture<AtFileComposerComponent>
): HTMLTextAreaElement {
  return element(fixture).querySelector(
    ".chat-composer__input"
  ) as HTMLTextAreaElement;
}

function typeInto(
  fixture: ComponentFixture<AtFileComposerComponent>,
  value: string
): void {
  const input = textarea(fixture);
  input.value = value;
  input.selectionStart = value.length;
  input.selectionEnd = value.length;
  input.dispatchEvent(new Event("input"));
  fixture.detectChanges();
}

function pasteEvent(text: string): Event {
  const event = new Event("paste", { bubbles: true, cancelable: true });
  Object.defineProperty(event, "clipboardData", {
    value: { getData: () => text },
  });
  return event;
}

describe("AtFileComposerComponent", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [AtFileComposerComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
  });

  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    TestBed.resetTestingModule();
  });

  it("loads settings and the index on mount and renders the dock", () => {
    const { fixture } = mount({ value: "hello @README.md" });

    expect(fixture.componentInstance.enabled()).toBe(true);
    expect(fixture.componentInstance.entries()).toHaveLength(3);
    expect(element(fixture).querySelector(".at-file-dock")).not.toBeNull();
    expect(element(fixture).querySelector(".at-file-picker")).toBeNull();
  });

  it("opens the picker when an @ query becomes active", () => {
    const { fixture } = mount();

    typeInto(fixture, "@sr");
    fixture.detectChanges();

    expect(fixture.componentInstance.atQuery()).toBe("sr");
    expect(element(fixture).querySelector(".at-file-picker")).not.toBeNull();
    expect(
      Array.from(
        element(fixture).querySelectorAll(".at-file-picker__name")
      ).map((node) => node.textContent?.trim())
    ).toContain("src");
  });

  it("inserts a directory reference with a trailing slash", () => {
    const { fixture } = mount();

    typeInto(fixture, "look @sr");
    fixture.componentInstance.onPicked({
      path: "/workspace/src",
      relative: "src",
      kind: "dir",
    });
    fixture.detectChanges();

    expect(fixture.componentInstance.draft()).toBe("look @src/ ");
    expect(textarea(fixture).value).toBe("look @src/ ");
    expect(fixture.componentInstance.atQuery()).toBeNull();
  });

  it("inserts a file reference without a trailing slash", () => {
    const { fixture } = mount();

    typeInto(fixture, "look @RE");
    fixture.componentInstance.onPicked({
      path: "/workspace/README.md",
      relative: "README.md",
      kind: "file",
    });
    fixture.detectChanges();

    expect(fixture.componentInstance.draft()).toBe("look @README.md ");
  });

  it("delegates picker navigation and pick to the picker", () => {
    const { fixture } = mount();

    typeInto(fixture, "@s");
    const picker = fixture.componentInstance.picker();
    const picked: string[] = [];
    picker?.pick.subscribe((entry) => picked.push(entry.relative));

    fixture.componentInstance.onNavigate(1);
    expect(picker?.activeIndex()).toBe(1);
    fixture.componentInstance.onPick();

    expect(picked).toEqual(["src/index.ts"]);
  });

  it("protects pasted @ tokens when the setting is on", () => {
    const { fixture } = mount();
    const event = pasteEvent("look @README.md");
    element(fixture).querySelector(".at-file-composer")!.dispatchEvent(event);
    fixture.detectChanges();

    expect(event.defaultPrevented).toBe(true);
    expect(fixture.componentInstance.draft()).toBe(
      "look @\u2060README.md"
    );
    expect(textarea(fixture).value).toBe("look @\u2060README.md");
  });

  it("leaves pasted text untouched when the setting is off", () => {
    const { fixture } = mount(
      {},
      { settings: { ...SETTINGS, ignorePastedMentions: false } }
    );
    const event = pasteEvent("look @README.md");
    element(fixture).querySelector(".at-file-composer")!.dispatchEvent(event);
    fixture.detectChanges();

    expect(event.defaultPrevented).toBe(false);
    expect(fixture.componentInstance.draft()).toBe("");
  });

  it("removes a dock reference from the draft", () => {
    const { fixture } = mount({ value: "hello @README.md" });

    (
      element(fixture).querySelector(
        ".at-file-dock__remove"
      ) as HTMLButtonElement
    ).click();
    fixture.detectChanges();

    expect(fixture.componentInstance.draft()).toBe("hello ");
    expect(textarea(fixture).value).toBe("hello ");
    expect(element(fixture).querySelector(".at-file-dock")).toBeNull();
  });

  it("shows the error state when settings cannot be loaded", () => {
    const fixture = TestBed.createComponent(AtFileComposerComponent);
    fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    http
      .expectOne("/files/settings")
      .flush({ message: "settings down" }, { status: 500, statusText: "Server Error" });
    fixture.detectChanges();

    const alert = element(fixture).querySelector(
      ".at-file-composer__error"
    ) as HTMLElement;
    expect(alert).not.toBeNull();
    expect(alert.textContent).toContain("Workspace paths are unavailable.");
    expect(alert.textContent?.trim().length).toBeGreaterThan(0);
    http.expectNone("/files/search");
    expect(element(fixture).querySelector(".at-file-picker")).toBeNull();
  });

  it("stays inert when the feature is disabled in settings", () => {
    const { fixture, http } = mount(
      {},
      { settings: { ...SETTINGS, enabled: false } }
    );

    http.expectNone("/files/search");
    expect(element(fixture).querySelector(".at-file-picker")).toBeNull();

    typeInto(fixture, "@src");
    fixture.detectChanges();

    expect(fixture.componentInstance.pickerOpen()).toBe(false);
    expect(element(fixture).querySelector(".at-file-picker")).toBeNull();
  });

  it("shows the truncated note in the open picker", () => {
    const { fixture } = mount(
      {},
      { search: { ...SEARCH, truncated: true } }
    );

    typeInto(fixture, "@s");
    fixture.detectChanges();

    expect(
      element(fixture).querySelector(".at-file-picker__status")?.textContent
    ).toContain("truncated");
  });
});
