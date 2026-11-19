import { ComponentFixture, TestBed } from "@angular/core/testing";
import { provideHttpClient } from "@angular/common/http";
import {
  HttpTestingController,
  provideHttpClientTesting,
} from "@angular/common/http/testing";
import { AtFileSettingsComponent } from "./at-file-settings.component";
import type { AtFileSettings } from "../../types";

function rule(
  pattern: string,
  kind: "exact" | "regex" = "exact",
  caseSensitive = false
) {
  return { kind, pattern, caseSensitive };
}

const SETTINGS: AtFileSettings = {
  enabled: true,
  ignoreFiles: ["desktop.ini", "Thumbs.db"],
  ignoreFilesConfigured: true,
  workspaceIgnoreFiles: [
    { workspace: "/work/app", ignoreFiles: ["a.txt"] },
    { workspace: "/work/other", ignoreFiles: ["other.txt"] },
  ],
  ignorePastedMentions: true,
};

function mount(
  inputs: Record<string, unknown> = {},
  settings: AtFileSettings = SETTINGS
): { fixture: ComponentFixture<AtFileSettingsComponent>; http: HttpTestingController } {
  const fixture = TestBed.createComponent(AtFileSettingsComponent);
  for (const [key, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(key, value);
  }
  fixture.detectChanges();
  const http = TestBed.inject(HttpTestingController);
  http.expectOne("/files/settings").flush(settings);
  fixture.detectChanges();
  return { fixture, http };
}

function element(fixture: ComponentFixture<AtFileSettingsComponent>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

function patterns(fixture: ComponentFixture<AtFileSettingsComponent>): string[] {
  return Array.from(
    element(fixture).querySelectorAll(".at-file-settings__pattern")
  ).map((node) => node.textContent?.trim() ?? "");
}

function toggle(
  fixture: ComponentFixture<AtFileSettingsComponent>,
  index: number
): HTMLInputElement {
  return element(fixture).querySelectorAll(
    ".at-file-settings__toggle input"
  )[index] as HTMLInputElement;
}

function addButton(
  fixture: ComponentFixture<AtFileSettingsComponent>
): HTMLButtonElement {
  return element(fixture).querySelector(
    ".at-file-settings__addButton"
  ) as HTMLButtonElement;
}

function typePattern(
  fixture: ComponentFixture<AtFileSettingsComponent>,
  value: string
): void {
  const input = element(fixture).querySelector(
    ".at-file-settings__input"
  ) as HTMLInputElement;
  input.value = value;
  input.dispatchEvent(new Event("input"));
  fixture.detectChanges();
}

function errorText(fixture: ComponentFixture<AtFileSettingsComponent>): string {
  return (
    element(fixture).querySelector(".at-file-settings__error")?.textContent ?? ""
  );
}

describe("AtFileSettingsComponent", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [AtFileSettingsComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
  });

  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    TestBed.resetTestingModule();
  });

  it("renders the global rules with their kind and case sensitivity", () => {
    const { fixture } = mount();

    expect(patterns(fixture)).toEqual(["desktop.ini", "Thumbs.db"]);
    expect(
      Array.from(
        element(fixture).querySelectorAll(".at-file-settings__kind")
      ).map((node) => node.textContent?.trim())
    ).toEqual(["exact", "exact"]);
    expect(
      element(fixture).querySelector(".at-file-settings__case")?.textContent
    ).toContain("Case-insensitive");
  });

  it("toggles the feature and pasted-mention policy through PUT", () => {
    const { fixture, http } = mount();

    const enabled = toggle(fixture, 0);
    enabled.checked = false;
    enabled.dispatchEvent(new Event("change"));
    const enabledRequest = http.expectOne("/files/settings");
    expect(enabledRequest.request.method).toBe("PUT");
    expect(enabledRequest.request.body).toEqual({
      field: "enabled",
      value: false,
    });
    enabledRequest.flush({ ...SETTINGS, enabled: false });
    fixture.detectChanges();
    expect(fixture.componentInstance.settings()?.enabled).toBe(false);

    const pasted = toggle(fixture, 1);
    pasted.checked = false;
    pasted.dispatchEvent(new Event("change"));
    const pastedRequest = http.expectOne("/files/settings");
    expect(pastedRequest.request.body).toEqual({
      field: "ignorePastedMentions",
      value: false,
    });
    pastedRequest.flush({
      ...SETTINGS,
      enabled: false,
      ignorePastedMentions: false,
    });
    fixture.detectChanges();
    expect(
      fixture.componentInstance.settings()?.ignorePastedMentions
    ).toBe(false);
  });

  it("adds an exact rule as a rule object and clears the input", () => {
    const { fixture, http } = mount();
    typePattern(fixture, "  new.tmp  ");

    addButton(fixture).click();
    const request = http.expectOne("/files/settings");
    expect(request.request.body).toEqual({
      field: "ignoreFiles",
      value: [
        rule("desktop.ini"),
        rule("Thumbs.db"),
        rule("new.tmp"),
      ],
    });
    request.flush({
      ...SETTINGS,
      ignoreFiles: [...SETTINGS.ignoreFiles, "new.tmp"],
    });
    fixture.detectChanges();

    expect(patterns(fixture)).toEqual([
      "desktop.ini",
      "Thumbs.db",
      "new.tmp",
    ]);
    expect(fixture.componentInstance.pattern()).toBe("");
  });

  it("rejects exact rules that contain a path separator", () => {
    const { fixture } = mount();
    typePattern(fixture, "src/a.txt");

    addButton(fixture).click();
    fixture.detectChanges();

    expect(errorText(fixture)).toContain(
      "cannot contain a path separator"
    );
    expect(fixture.componentInstance.pattern()).toBe("src/a.txt");
  });

  it("rejects an invalid regex before saving", () => {
    const { fixture } = mount();
    const select = element(fixture).querySelector(
      ".at-file-settings__select"
    ) as HTMLSelectElement;
    select.value = "regex";
    select.dispatchEvent(new Event("change"));
    typePattern(fixture, "(");

    addButton(fixture).click();
    fixture.detectChanges();

    expect(errorText(fixture)).toContain("Invalid regular expression");
  });

  it("rejects a duplicate filter regardless of exact case", () => {
    const { fixture } = mount();
    typePattern(fixture, "DESKTOP.INI");

    addButton(fixture).click();
    fixture.detectChanges();

    expect(errorText(fixture)).toContain("already exists");
  });

  it("adds a case-sensitive regex rule", () => {
    const { fixture, http } = mount();
    const select = element(fixture).querySelector(
      ".at-file-settings__select"
    ) as HTMLSelectElement;
    select.value = "regex";
    select.dispatchEvent(new Event("change"));
    const caseToggle = element(fixture).querySelector(
      ".at-file-settings__caseToggle input"
    ) as HTMLInputElement;
    caseToggle.checked = true;
    caseToggle.dispatchEvent(new Event("change"));
    typePattern(fixture, "^test-");

    addButton(fixture).click();
    const request = http.expectOne("/files/settings");
    expect(request.request.body.value).toEqual([
      rule("desktop.ini"),
      rule("Thumbs.db"),
      rule("^test-", "regex", true),
    ]);
    request.flush({ ...SETTINGS, ignoreFiles: [] });
    fixture.detectChanges();
  });

  it("removes a rule", () => {
    const { fixture, http } = mount();

    (
      element(fixture).querySelector(
        ".at-file-settings__remove"
      ) as HTMLButtonElement
    ).click();
    const request = http.expectOne("/files/settings");
    expect(request.request.body).toEqual({
      field: "ignoreFiles",
      value: [rule("Thumbs.db")],
    });
    request.flush({ ...SETTINGS, ignoreFiles: ["Thumbs.db"] });
    fixture.detectChanges();

    expect(patterns(fixture)).toEqual(["Thumbs.db"]);
  });

  it("restores the built-in defaults", () => {
    const { fixture, http } = mount();

    (
      element(fixture).querySelector(
        ".at-file-settings__link"
      ) as HTMLButtonElement
    ).click();
    const request = http.expectOne("/files/settings");
    expect(request.request.body).toEqual({
      field: "ignoreFiles",
      value: ["desktop.ini", "Thumbs.db", ".DS_Store"],
    });
    request.flush({ ...SETTINGS });
    fixture.detectChanges();
  });

  it("edits the workspace scope while preserving other workspaces", () => {
    const { fixture, http } = mount({ workspace: "/work/app" });

    const workspaceTab = element(fixture).querySelectorAll(
      ".at-file-settings__tab"
    )[1] as HTMLButtonElement;
    expect(workspaceTab.disabled).toBe(false);
    workspaceTab.click();
    fixture.detectChanges();
    expect(patterns(fixture)).toEqual(["a.txt"]);

    typePattern(fixture, "b.txt");
    addButton(fixture).click();
    const request = http.expectOne("/files/settings");
    expect(request.request.body).toEqual({
      field: "workspaceIgnoreFiles",
      value: [
        { workspace: "/work/other", ignoreFiles: ["other.txt"] },
        {
          workspace: "/work/app",
          ignoreFiles: [rule("a.txt"), rule("b.txt")],
        },
      ],
    });
    request.flush({
      ...SETTINGS,
      workspaceIgnoreFiles: [
        { workspace: "/work/app", ignoreFiles: ["a.txt", "b.txt"] },
        { workspace: "/work/other", ignoreFiles: ["other.txt"] },
      ],
    });
    fixture.detectChanges();
    expect(patterns(fixture)).toEqual(["a.txt", "b.txt"]);
  });

  it("clears the current workspace filters", () => {
    const { fixture, http } = mount({ workspace: "/work/app" });
    (
      element(fixture).querySelectorAll(
        ".at-file-settings__tab"
      )[1] as HTMLButtonElement
    ).click();
    fixture.detectChanges();

    (
      element(fixture).querySelector(
        ".at-file-settings__link"
      ) as HTMLButtonElement
    ).click();
    const request = http.expectOne("/files/settings");
    expect(request.request.body).toEqual({
      field: "workspaceIgnoreFiles",
      value: [
        { workspace: "/work/other", ignoreFiles: ["other.txt"] },
        { workspace: "/work/app", ignoreFiles: [] },
      ],
    });
    request.flush({ ...SETTINGS });
    fixture.detectChanges();
  });

  it("disables the workspace scope when no workspace is selected", () => {
    const { fixture } = mount();

    const workspaceTab = element(fixture).querySelectorAll(
      ".at-file-settings__tab"
    )[1] as HTMLButtonElement;
    expect(workspaceTab.disabled).toBe(true);
    fixture.componentInstance.setScope("workspace");
    expect(fixture.componentInstance.scope()).toBe("global");
  });

  it("surfaces a save failure and clears the saving flag", () => {
    const { fixture, http } = mount();

    const enabled = toggle(fixture, 0);
    enabled.checked = false;
    enabled.dispatchEvent(new Event("change"));
    http
      .expectOne("/files/settings")
      .flush({ message: "save failed" }, { status: 500, statusText: "Server Error" });
    fixture.detectChanges();

    expect(errorText(fixture).trim().length).toBeGreaterThan(0);
    expect(fixture.componentInstance.saving()).toBe(false);
  });
});
