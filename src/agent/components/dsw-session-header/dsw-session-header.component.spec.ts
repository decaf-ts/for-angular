import { Component } from "@angular/core";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { provideTranslateService, TranslateService } from "@ngx-translate/core";

import {
  DswSessionHeaderComponent,
  DswSessionStatus,
} from "./dsw-session-header.component";

const TRANSLATIONS: Record<string, string> = {
  "agent.dsw.session.title": "Sessão de análise",
  "agent.dsw.session.menu": "Ações da sessão",
  "agent.dsw.session.status.idle": "Ocioso",
  "agent.dsw.session.status.running": "Em execução",
  "agent.dsw.session.status.done": "Concluído",
  "agent.dsw.session.status.error": "Erro",
};

@Component({
  standalone: true,
  imports: [DswSessionHeaderComponent],
  template: `
    <ngx-decaf-dsw-session-header>
      <span dswSessionHeaderLeading>Leading slot</span>
      <span dswSessionHeaderActions>Actions slot</span>
    </ngx-decaf-dsw-session-header>
  `,
})
class SessionHeaderProjectionHostComponent {}

function setupTranslations(translations: Record<string, string> = TRANSLATIONS): TranslateService {
  const translate = TestBed.inject(TranslateService);
  translate.setDefaultLang("en");
  translate.use("en");
  translate.setTranslation("en", translations, true);
  return translate;
}

function mount(
  inputs: Record<string, unknown> = {},
): ComponentFixture<DswSessionHeaderComponent> {
  const fixture = TestBed.createComponent(DswSessionHeaderComponent);
  for (const [key, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(key, value);
  }
  fixture.detectChanges();
  return fixture;
}

function element(fixture: ComponentFixture<DswSessionHeaderComponent>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

function normalize(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function query<T extends HTMLElement>(
  fixture: ComponentFixture<DswSessionHeaderComponent>,
  selector: string,
): T | null {
  return element(fixture).querySelector(selector) as T | null;
}

describe("DswSessionHeaderComponent", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [DswSessionHeaderComponent, SessionHeaderProjectionHostComponent],
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
      normalize(query(fixture, ".dsw-session-header__title")?.textContent),
    ).toBe("Session");
  });

  it("resolves the title key through the real TranslateService", () => {
    const fixture = mount({
      titleKey: "agent.dsw.session.title",
      titleFallback: "Fallback session",
    });

    expect(
      normalize(query(fixture, ".dsw-session-header__title")?.textContent),
    ).toBe("Sessão de análise");
  });

  it("falls back when the title key is missing", () => {
    const fixture = mount({
      titleKey: "agent.dsw.session.unknown",
      titleFallback: "Fallback session",
    });

    expect(
      normalize(query(fixture, ".dsw-session-header__title")?.textContent),
    ).toBe("Fallback session");
  });

  it("prefers the explicit title input over the fallback when the key is missing", () => {
    const fixture = mount({
      titleKey: "agent.dsw.session.unknown",
      title: "Explicit session",
      titleFallback: "Fallback session",
    });

    expect(
      normalize(query(fixture, ".dsw-session-header__title")?.textContent),
    ).toBe("Explicit session");
  });

  it("renders the subtitle only when one is supplied", () => {
    const without = mount();
    expect(query(without, ".dsw-session-header__subtitle")).toBeNull();

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [DswSessionHeaderComponent, SessionHeaderProjectionHostComponent],
      providers: [provideTranslateService()],
    });
    setupTranslations();

    const withSubtitle = mount({ subtitle: "3 messages" });
    expect(
      normalize(
        query(withSubtitle, ".dsw-session-header__subtitle")?.textContent,
      ),
    ).toBe("3 messages");
  });

  it("renders the translated status label and per-state class", () => {
    const cases: Array<[DswSessionStatus, string, string]> = [
      ["idle", "Ocioso", "dsw-session-header__status--idle"],
      ["running", "Em execução", "dsw-session-header__status--running"],
      ["done", "Concluído", "dsw-session-header__status--done"],
      ["error", "Erro", "dsw-session-header__status--error"],
    ];

    for (const [status, label, modifier] of cases) {
      const fixture = mount({ status });
      const chip = query(fixture, ".dsw-session-header__status");

      expect(chip).not.toBeNull();
      expect(chip?.getAttribute("role")).toBe("status");
      expect(
        normalize(
          query(fixture, ".dsw-session-header__status-label")?.textContent,
        ),
      ).toBe(label);
      if (status === "idle") {
        expect(
          element(fixture).querySelector(".dsw-session-header__status--idle"),
        ).toBeNull();
      } else {
        expect(element(fixture).querySelector(`.${modifier}`)).not.toBeNull();
      }

      fixture.destroy();
    }
  });

  it("hides the status chip when showStatus is false", () => {
    const fixture = mount({ showStatus: false, status: "running" });

    expect(query(fixture, ".dsw-session-header__status")).toBeNull();
  });

  it("gates the menu button on showMenu and emits menu on click", () => {
    const hidden = mount({ showMenu: false });
    expect(query(hidden, ".dsw-session-header__menu")).toBeNull();

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [DswSessionHeaderComponent, SessionHeaderProjectionHostComponent],
      providers: [provideTranslateService()],
    });
    setupTranslations();

    const shown = mount({ showMenu: true });
    const emitted: void[] = [];
    shown.componentInstance.menu.subscribe((value) => emitted.push(value));
    const button = query<HTMLButtonElement>(
      shown,
      ".dsw-session-header__menu",
    );
    expect(button).not.toBeNull();
    expect(button?.getAttribute("aria-label")).toBe("Ações da sessão");

    button?.click();
    expect(emitted).toHaveLength(1);
  });

  it("renders both projection slots in their own regions", () => {
    const fixture = TestBed.createComponent(
      SessionHeaderProjectionHostComponent,
    );
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;

    expect(
      normalize(host.querySelector(".dsw-session-header__leading")?.textContent),
    ).toContain("Leading slot");
    expect(
      normalize(host.querySelector(".dsw-session-header__actions")?.textContent),
    ).toContain("Actions slot");
  });
});
