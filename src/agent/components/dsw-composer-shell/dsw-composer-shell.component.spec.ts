import { Component } from "@angular/core";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { By } from "@angular/platform-browser";
import { provideTranslateService, TranslateService } from "@ngx-translate/core";

import { ChatComposerComponent } from "../chat-composer/chat-composer.component";
import { DswComposerShellComponent } from "./dsw-composer-shell.component";

const TRANSLATIONS: Record<string, string> = {
  "agent.dsw.composer.notice": "Aviso do harness",
  "agent.dsw.composer.permissions": "Permissões",
};

@Component({
  standalone: true,
  imports: [DswComposerShellComponent],
  template: `
    <ngx-decaf-dsw-composer-shell>
      <span dswComposerAccessory>Accessory slot</span>
      <span dswComposerDock>Dock slot</span>
      <span dswComposerTools>Tools slot</span>
      <span dswComposerFooter>Footer slot</span>
    </ngx-decaf-dsw-composer-shell>
  `,
})
class ComposerShellSlotsHostComponent {}

@Component({
  standalone: true,
  imports: [DswComposerShellComponent],
  template: `<ngx-decaf-dsw-composer-shell />`,
})
class ComposerShellEmptyHostComponent {}

function setupTranslations(translations: Record<string, string> = TRANSLATIONS): TranslateService {
  const translate = TestBed.inject(TranslateService);
  translate.setDefaultLang("en");
  translate.use("en");
  translate.setTranslation("en", translations, true);
  return translate;
}

function mount(
  inputs: Record<string, unknown> = {},
): ComponentFixture<DswComposerShellComponent> {
  const fixture = TestBed.createComponent(DswComposerShellComponent);
  for (const [key, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(key, value);
  }
  fixture.detectChanges();
  return fixture;
}

function element(fixture: ComponentFixture<DswComposerShellComponent>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

function normalize(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function query<T extends HTMLElement>(
  fixture: ComponentFixture<DswComposerShellComponent>,
  selector: string,
): T | null {
  return element(fixture).querySelector(selector) as T | null;
}

function composerOf(
  fixture: ComponentFixture<DswComposerShellComponent>,
): ChatComposerComponent {
  const debugElement = fixture.debugElement.query(
    By.directive(ChatComposerComponent),
  );
  expect(debugElement).not.toBeNull();
  return debugElement.componentInstance as ChatComposerComponent;
}

type ContentFlags = {
  accessory?: boolean;
  dock?: boolean;
  tools?: boolean;
  footer?: boolean;
};

function applyContentFlags(
  fixture: ComponentFixture<unknown>,
  flags: ContentFlags,
): void {
  const shell = fixture.debugElement.query(
    By.directive(DswComposerShellComponent),
  ).componentInstance as unknown as Record<string, unknown>;
  if (flags.accessory !== undefined) {
    shell["hasAccessory"] = () => flags.accessory;
  }
  if (flags.dock !== undefined) {
    shell["hasDock"] = () => flags.dock;
  }
  if (flags.tools !== undefined) {
    shell["hasTools"] = () => flags.tools;
    shell["showsToolsRow"] = () =>
      flags.tools ||
      (shell as unknown as DswComposerShellComponent).showPermissions();
  }
  if (flags.footer !== undefined) {
    shell["hasFooter"] = () => flags.footer;
  }
}

describe("DswComposerShellComponent", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        DswComposerShellComponent,
        ChatComposerComponent,
        ComposerShellSlotsHostComponent,
        ComposerShellEmptyHostComponent,
      ],
      providers: [provideTranslateService()],
    });
    setupTranslations();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it("renders exactly one chat composer", () => {
    const fixture = mount();

    expect(
      element(fixture).querySelectorAll("ngx-decaf-chat-composer"),
    ).toHaveLength(1);
    expect(fixture.debugElement.queryAll(By.directive(ChatComposerComponent)))
      .toHaveLength(1);
  });

  it("forwards all six inputs to the chat composer", () => {
    const fixture = mount({
      value: "draft prompt",
      running: true,
      disabled: true,
      placeholder: "Ask anything",
      minRows: 2,
      maxRows: 9,
    });
    const composer = composerOf(fixture);

    expect(composer.value()).toBe("draft prompt");
    expect(composer.running()).toBe(true);
    expect(composer.disabled()).toBe(true);
    expect(composer.placeholder()).toBe("Ask anything");
    expect(composer.minRows()).toBe(2);
    expect(composer.maxRows()).toBe(9);
  });

  it("forwards send, stop, valueChange and slashQuery to the shell outputs", () => {
    const fixture = mount();
    const composer = composerOf(fixture);
    const sends: string[] = [];
    const stops: void[] = [];
    const valueChanges: string[] = [];
    const slashQueries: (string | null)[] = [];
    fixture.componentInstance.send.subscribe((value) => sends.push(value));
    fixture.componentInstance.stop.subscribe((value) => stops.push(value));
    fixture.componentInstance.valueChange.subscribe((value) =>
      valueChanges.push(value),
    );
    fixture.componentInstance.slashQuery.subscribe((value) =>
      slashQueries.push(value),
    );

    composer.send.emit("hello");
    composer.stop.emit();
    composer.valueChange.emit("next draft");
    composer.slashQuery.emit("help");

    expect(sends).toEqual(["hello"]);
    expect(stops).toHaveLength(1);
    expect(valueChanges).toEqual(["next draft"]);
    expect(slashQueries).toEqual(["help"]);
  });

  it("renders the notice from a translated key", () => {
    const fixture = mount({ noticeKey: "agent.dsw.composer.notice" });
    const notice = query(fixture, ".dsw-composer-shell__notice");

    expect(notice).not.toBeNull();
    expect(notice?.getAttribute("role")).toBe("status");
    expect(normalize(notice?.textContent)).toBe("Aviso do harness");
  });

  it("renders a literal notice when no key is supplied", () => {
    const fixture = mount({ notice: "Heads up" });

    expect(
      normalize(query(fixture, ".dsw-composer-shell__notice")?.textContent),
    ).toBe("Heads up");
  });

  it("omits the notice when neither key nor literal is supplied", () => {
    const fixture = mount();

    expect(query(fixture, ".dsw-composer-shell__notice")).toBeNull();
  });

  it("renders the permissions trigger only when showPermissions is true", () => {
    const hidden = mount({ showPermissions: false });
    expect(query(hidden, ".dsw-composer-shell__permissions")).toBeNull();
  });

  it("reflects permissionsActive through aria-pressed and emits permissionsOpen", () => {
    const inactive = mount({ showPermissions: true, permissionsActive: false });
    const inactiveButton = query<HTMLButtonElement>(
      inactive,
      ".dsw-composer-shell__permissions",
    );
    expect(inactiveButton).not.toBeNull();
    expect(inactiveButton?.getAttribute("aria-pressed")).toBe("false");
    expect(
      normalize(inactiveButton?.textContent),
    ).toBe("Permissões");

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [
        DswComposerShellComponent,
        ChatComposerComponent,
        ComposerShellSlotsHostComponent,
        ComposerShellEmptyHostComponent,
      ],
      providers: [provideTranslateService()],
    });
    setupTranslations();

    const active = mount({ showPermissions: true, permissionsActive: true });
    const emitted: void[] = [];
    active.componentInstance.permissionsOpen.subscribe((value) =>
      emitted.push(value),
    );
    const activeButton = query<HTMLButtonElement>(
      active,
      ".dsw-composer-shell__permissions",
    );
    expect(activeButton?.getAttribute("aria-pressed")).toBe("true");
    expect(
      element(active).querySelector(
        ".dsw-composer-shell__permissions--active",
      ),
    ).not.toBeNull();

    activeButton?.click();
    expect(emitted).toHaveLength(1);
  });

  it("renders the tools row only when tools are projected or permissions are shown", () => {
    const empty = mount();
    expect(query(empty, ".dsw-composer-shell__tools")).toBeNull();
  });

  it("renders projected tools in the tools row", () => {
    const fixture = TestBed.createComponent(ComposerShellSlotsHostComponent);
    applyContentFlags(fixture, { tools: true });
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    const tools = host.querySelector(".dsw-composer-shell__tools");

    expect(tools).not.toBeNull();
    expect(
      normalize(
        tools?.querySelector(".dsw-composer-shell__tools-slot")?.textContent,
      ),
    ).toContain("Tools slot");
  });

  it("renders the accessory, dock and footer only when projected", () => {
    const empty = TestBed.createComponent(ComposerShellEmptyHostComponent);
    empty.detectChanges();
    const emptyHost = empty.nativeElement as HTMLElement;
    expect(
      emptyHost.querySelector(".dsw-composer-shell__accessory"),
    ).toBeNull();
    expect(emptyHost.querySelector(".dsw-composer-shell__dock")).toBeNull();
    expect(emptyHost.querySelector(".dsw-composer-shell__footer")).toBeNull();

    const slots = TestBed.createComponent(ComposerShellSlotsHostComponent);
    applyContentFlags(slots, {
      accessory: true,
      dock: true,
      tools: true,
      footer: true,
    });
    slots.detectChanges();
    const host = slots.nativeElement as HTMLElement;

    expect(
      normalize(
        host.querySelector(".dsw-composer-shell__accessory")?.textContent,
      ),
    ).toContain("Accessory slot");
    expect(
      normalize(host.querySelector(".dsw-composer-shell__dock")?.textContent),
    ).toContain("Dock slot");
    expect(
      normalize(host.querySelector(".dsw-composer-shell__footer")?.textContent),
    ).toContain("Footer slot");
  });
});
