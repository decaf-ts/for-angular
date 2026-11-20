import { Component } from "@angular/core";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { provideTranslateService, TranslateService } from "@ngx-translate/core";

import {
  DswSidebarComponent,
  DswSidebarPluginStatus,
} from "./dsw-sidebar.component";

const TRANSLATIONS: Record<string, string> = {
  "agent.dsw.sidebar.title": "Acme Harness",
  "agent.dsw.sidebar.sessions": "Sessões",
  "agent.dsw.sidebar.plugins": "Estado dos plugins",
  "agent.dsw.sidebar.collapse": "Recolher barra lateral",
  "agent.dsw.sidebar.expand": "Expandir barra lateral",
  "agent.dsw.sidebar.newSession": "Nova sessão",
  "agent.dsw.sidebar.plugin.active": "Ativo",
  "agent.dsw.sidebar.plugin.inactive": "Inativo",
  "agent.dsw.sidebar.plugin.error": "Erro",
};

@Component({
  standalone: true,
  imports: [DswSidebarComponent],
  template: `
    <ngx-decaf-dsw-sidebar>
      <span dswSidebarBrand>Brand slot</span>
      <span dswSidebarSessions>Session slot</span>
      <span dswSidebarFooter>Footer slot</span>
    </ngx-decaf-dsw-sidebar>
  `,
})
class SidebarProjectionHostComponent {}

function setupTranslations(translations: Record<string, string> = TRANSLATIONS): TranslateService {
  const translate = TestBed.inject(TranslateService);
  translate.setDefaultLang("en");
  translate.use("en");
  translate.setTranslation("en", translations, true);
  return translate;
}

function mount(
  inputs: Record<string, unknown> = {},
): ComponentFixture<DswSidebarComponent> {
  const fixture = TestBed.createComponent(DswSidebarComponent);
  for (const [key, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(key, value);
  }
  fixture.detectChanges();
  return fixture;
}

function element(fixture: ComponentFixture<DswSidebarComponent>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

function normalize(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function query<T extends HTMLElement>(
  fixture: ComponentFixture<DswSidebarComponent>,
  selector: string,
): T | null {
  return element(fixture).querySelector(selector) as T | null;
}

const PLUGINS: DswSidebarPluginStatus[] = [
  { id: "graph", label: "Graph", state: "active" },
  { id: "files", label: "Files", state: "inactive", detail: "Indexing" },
  { id: "search", label: "Search", state: "error" },
];

describe("DswSidebarComponent", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [DswSidebarComponent, SidebarProjectionHostComponent],
      providers: [provideTranslateService()],
    });
    setupTranslations();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it("renders the default title fallback when no key or title is supplied", () => {
    const fixture = mount();

    expect(
      normalize(query(fixture, ".dsw-sidebar__brand-name")?.textContent),
    ).toBe("Harness");
  });

  it("resolves the title key through the real TranslateService", () => {
    const fixture = mount({
      titleKey: "agent.dsw.sidebar.title",
      titleFallback: "Fallback harness",
    });

    expect(
      normalize(query(fixture, ".dsw-sidebar__brand-name")?.textContent),
    ).toBe("Acme Harness");
  });

  it("falls back when the title key is missing", () => {
    const fixture = mount({
      titleKey: "agent.dsw.sidebar.unknown",
      titleFallback: "Fallback harness",
    });

    expect(
      normalize(query(fixture, ".dsw-sidebar__brand-name")?.textContent),
    ).toBe("Fallback harness");
  });

  it("prefers the title input over the fallback when the key is missing", () => {
    const fixture = mount({
      titleKey: "agent.dsw.sidebar.unknown",
      title: "Explicit title",
      titleFallback: "Fallback harness",
    });

    expect(
      normalize(query(fixture, ".dsw-sidebar__brand-name")?.textContent),
    ).toBe("Explicit title");
  });

  it("reflects the collapsed state through aria-expanded and aria-controls", () => {
    const fixture = mount({ collapsed: true });
    const toggle = query<HTMLButtonElement>(fixture, ".dsw-sidebar__toggle");
    const region = query<HTMLElement>(fixture, ".dsw-sidebar__region");

    expect(toggle).not.toBeNull();
    expect(toggle?.getAttribute("aria-expanded")).toBe("false");
    expect(region).not.toBeNull();
    expect(toggle?.getAttribute("aria-controls")).toBe(region?.id);
    expect(region?.id).toBe(fixture.componentInstance.sessionsId);

    fixture.componentRef.setInput("collapsed", false);
    fixture.detectChanges();
    expect(toggle?.getAttribute("aria-expanded")).toBe("true");
  });

  it("emits the inverted collapse value when the toggle is clicked", () => {
    const fixture = mount({ collapsed: false });
    const emitted: boolean[] = [];
    fixture.componentInstance.collapseChange.subscribe((value) =>
      emitted.push(value),
    );

    query<HTMLButtonElement>(fixture, ".dsw-sidebar__toggle")?.click();

    expect(emitted).toEqual([true]);
  });

  it("emits false when expanding an already collapsed sidebar", () => {
    const fixture = mount({ collapsed: true });
    const emitted: boolean[] = [];
    fixture.componentInstance.collapseChange.subscribe((value) =>
      emitted.push(value),
    );

    query<HTMLButtonElement>(fixture, ".dsw-sidebar__toggle")?.click();

    expect(emitted).toEqual([false]);
  });

  it("hides the collapse toggle when collapsible is false", () => {
    const fixture = mount({ collapsible: false });

    expect(query(fixture, ".dsw-sidebar__toggle")).toBeNull();
  });

  it("emits newSession and does not emit when disabled", () => {
    const enabled = mount({ newSessionDisabled: false });
    const enabledEmits: void[] = [];
    enabled.componentInstance.newSession.subscribe((value) =>
      enabledEmits.push(value),
    );
    query<HTMLButtonElement>(enabled, ".dsw-sidebar__new-session")?.click();
    expect(enabledEmits).toHaveLength(1);

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [DswSidebarComponent, SidebarProjectionHostComponent],
      providers: [provideTranslateService()],
    });
    setupTranslations();

    const disabled = mount({ newSessionDisabled: true });
    const disabledEmits: void[] = [];
    disabled.componentInstance.newSession.subscribe((value) =>
      disabledEmits.push(value),
    );
    const button = query<HTMLButtonElement>(
      disabled,
      ".dsw-sidebar__new-session",
    );
    expect(button?.disabled).toBe(true);
    button?.click();
    expect(disabledEmits).toHaveLength(0);
  });

  it("renders one row per plugin with translated state text and dot classes", () => {
    const fixture = mount({ plugins: PLUGINS });
    const rows = Array.from(
      element(fixture).querySelectorAll(".dsw-sidebar__plugin"),
    );

    expect(rows).toHaveLength(PLUGINS.length);
    expect(
      Array.from(
        element(fixture).querySelectorAll(".dsw-sidebar__plugin-label"),
      ).map((row) => normalize(row.textContent)),
    ).toEqual(["Graph", "Files", "Search"]);
    expect(
      Array.from(
        element(fixture).querySelectorAll(".dsw-sidebar__plugin-state"),
      ).map((row) => normalize(row.textContent)),
    ).toEqual(["Ativo", "Inativo", "Erro"]);
    expect(
      element(fixture).querySelector(
        ".dsw-sidebar__plugin-dot--active",
      ),
    ).not.toBeNull();
    expect(
      element(fixture).querySelector(
        ".dsw-sidebar__plugin-dot--inactive",
      ),
    ).not.toBeNull();
    expect(
      element(fixture).querySelector(".dsw-sidebar__plugin-dot--error"),
    ).not.toBeNull();
  });

  it("emits the clicked plugin through pluginOpen", () => {
    const fixture = mount({ plugins: PLUGINS });
    const emitted: DswSidebarPluginStatus[] = [];
    fixture.componentInstance.pluginOpen.subscribe((plugin) =>
      emitted.push(plugin),
    );

    const buttons = element(fixture).querySelectorAll(
      ".dsw-sidebar__plugin-button",
    );
    (buttons[1] as HTMLButtonElement).click();

    expect(emitted).toHaveLength(1);
    expect(emitted[0]).toEqual(PLUGINS[1]);
  });

  it("hides the plugin status list when showPluginStatus is false", () => {
    const fixture = mount({ plugins: PLUGINS, showPluginStatus: false });

    expect(query(fixture, ".dsw-sidebar__plugins")).toBeNull();
  });

  it("renders all three projection slots in their own regions", () => {
    const fixture = TestBed.createComponent(SidebarProjectionHostComponent);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;

    expect(
      normalize(host.querySelector(".dsw-sidebar__brand-slot")?.textContent),
    ).toContain("Brand slot");
    expect(
      normalize(host.querySelector(".dsw-sidebar__region")?.textContent),
    ).toContain("Session slot");
    expect(
      normalize(host.querySelector(".dsw-sidebar__footer")?.textContent),
    ).toContain("Footer slot");
  });

  it("exposes accessible names for the nav, sessions region, and plugin list", () => {
    const fixture = mount({ plugins: PLUGINS });

    expect(query(fixture, "nav")?.getAttribute("aria-label")).toBe("Sidebar");
    expect(
      query(fixture, ".dsw-sidebar__region")?.getAttribute("aria-label"),
    ).toBe("Sessões");
    expect(
      query(fixture, ".dsw-sidebar__plugins")?.getAttribute("aria-label"),
    ).toBe("Estado dos plugins");
  });
});
