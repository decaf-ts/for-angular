import { ComponentFixture, TestBed } from "@angular/core/testing";
import { provideHttpClientTesting } from "@angular/common/http/testing";
import { provideRouter } from "@angular/router";
import { By } from "@angular/platform-browser";
import { NavController } from "@ionic/angular/standalone";
import { ModelRendererComponent } from "@decaf-ts/for-angular";
import {
  model,
  Model,
  ModelArg,
  required,
} from "@decaf-ts/decorator-validation";
import { uielement, uimodel } from "@decaf-ts/ui-decorators";
import { provideTranslateService, TranslateService } from "@ngx-translate/core";

import {
  DswSettingsDrawerComponent,
  DswSettingsModel,
} from "./dsw-settings-drawer.component";

@uimodel("ngx-decaf-crud-form")
@model()
class DrawerSettingsModel extends Model {
  @required()
  @uielement("ngx-decaf-crud-field", {
    label: "settings.host.label",
    type: "text",
  })
  host!: string;

  constructor(arg: ModelArg<DrawerSettingsModel> = {}) {
    super(arg);
  }
}

const TRANSLATIONS: Record<string, string> = {
  "agent.dsw.settings.title": "Configurações",
  "agent.dsw.settings.empty": "Sem configurações",
  "agent.dsw.settings.close": "Fechar configurações",
};

const navControllerMock = {
  navigateRoot: jest.fn(),
  navigateForward: jest.fn(),
  navigateBack: jest.fn(),
};

const RENDERER_PROVIDERS = [
  provideTranslateService(),
  provideRouter([]),
  provideHttpClientTesting(),
  { provide: NavController, useValue: navControllerMock },
];

function setupTranslations(translations: Record<string, string> = TRANSLATIONS): TranslateService {
  const translate = TestBed.inject(TranslateService);
  translate.setDefaultLang("en");
  translate.use("en");
  translate.setTranslation("en", translations, true);
  return translate;
}

function mount(
  inputs: Record<string, unknown> = {},
): ComponentFixture<DswSettingsDrawerComponent> {
  const fixture = TestBed.createComponent(DswSettingsDrawerComponent);
  for (const [key, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(key, value);
  }
  fixture.detectChanges();
  return fixture;
}

function element(fixture: ComponentFixture<DswSettingsDrawerComponent>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

function normalize(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function query<T extends HTMLElement>(
  fixture: ComponentFixture<DswSettingsDrawerComponent>,
  selector: string,
): T | null {
  return element(fixture).querySelector(selector) as T | null;
}

function rendererModels(
  fixture: ComponentFixture<DswSettingsDrawerComponent>,
): (string | Model)[] {
  return fixture.debugElement
    .queryAll(By.directive(ModelRendererComponent))
    .map((debugElement) => debugElement.componentInstance.model as string | Model);
}

describe("DswSettingsDrawerComponent", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [DswSettingsDrawerComponent],
      providers: RENDERER_PROVIDERS,
    });
    setupTranslations();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it("renders nothing while open is false", () => {
    const fixture = mount({ open: false, models: [new DrawerSettingsModel({})] });

    expect(query(fixture, ".dsw-settings-drawer")).toBeNull();
    expect(query(fixture, ".dsw-settings-drawer__scrim")).toBeNull();
  });

  it("renders a modal dialog with the translated title when opened", () => {
    const fixture = mount({ open: true });
    const dialog = query(fixture, ".dsw-settings-drawer");

    expect(dialog).not.toBeNull();
    expect(dialog?.getAttribute("role")).toBe("dialog");
    expect(dialog?.getAttribute("aria-modal")).toBe("true");
    expect(dialog?.getAttribute("aria-label")).toBe("Configurações");
    expect(
      normalize(query(fixture, ".dsw-settings-drawer__title")?.textContent),
    ).toBe("Configurações");
  });

  it("falls back to the title fallback when the key is missing", () => {
    const fixture = mount({
      open: true,
      titleKey: "agent.dsw.settings.unknown",
      titleFallback: "Preferences",
    });

    expect(
      normalize(query(fixture, ".dsw-settings-drawer__title")?.textContent),
    ).toBe("Preferences");
  });

  it("renders one model renderer per supplied model and forwards each model", () => {
    const instance = new DrawerSettingsModel({ host: "localhost" });
    const models: DswSettingsModel[] = [
      instance,
      DrawerSettingsModel,
      "DrawerSettingsModel",
    ];
    const fixture = mount({ open: true, models });
    const forwarded = rendererModels(fixture);

    expect(forwarded).toHaveLength(3);
    expect(forwarded[0]).toBe(instance);
    expect(forwarded[1]).toBeInstanceOf(DrawerSettingsModel);
    expect(forwarded[2]).toBe("DrawerSettingsModel");
  });

  it("renders the empty state when no models are supplied", () => {
    const fixture = mount({ open: true, models: [] });
    const empty = query(fixture, ".dsw-settings-drawer__empty");

    expect(empty).not.toBeNull();
    expect(empty?.getAttribute("role")).toBe("status");
    expect(normalize(empty?.textContent)).toBe("Sem configurações");
  });

  it("emits openChange(false) and dismiss when the close button is clicked", () => {
    const fixture = mount({ open: true });
    const openChanges: boolean[] = [];
    const dismissals: void[] = [];
    fixture.componentInstance.openChange.subscribe((value) =>
      openChanges.push(value),
    );
    fixture.componentInstance.dismiss.subscribe((value) =>
      dismissals.push(value),
    );

    query<HTMLButtonElement>(fixture, ".dsw-settings-drawer__close")?.click();

    expect(openChanges).toEqual([false]);
    expect(dismissals).toHaveLength(1);
  });

  it("emits openChange(false) and dismiss when Escape is pressed", () => {
    const fixture = mount({ open: true });
    const openChanges: boolean[] = [];
    const dismissals: void[] = [];
    fixture.componentInstance.openChange.subscribe((value) =>
      openChanges.push(value),
    );
    fixture.componentInstance.dismiss.subscribe((value) =>
      dismissals.push(value),
    );

    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );
    fixture.detectChanges();

    expect(openChanges).toEqual([false]);
    expect(dismissals).toHaveLength(1);
  });

  it("moves focus to the close button when opened", () => {
    const fixture = mount({ open: true });
    fixture.detectChanges();

    expect(document.activeElement).toBe(
      query<HTMLButtonElement>(fixture, ".dsw-settings-drawer__close"),
    );
  });

  it("renders the scrim for the drawer variant and omits it for the panel variant", () => {
    const drawer = mount({ open: true, variant: "drawer" });
    expect(query(drawer, ".dsw-settings-drawer__scrim")).not.toBeNull();

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [DswSettingsDrawerComponent],
      providers: RENDERER_PROVIDERS,
    });
    setupTranslations();

    const panel = mount({ open: true, variant: "panel" });
    expect(query(panel, ".dsw-settings-drawer__scrim")).toBeNull();
    expect(query(panel, ".dsw-settings-drawer--panel")).not.toBeNull();
  });
});
