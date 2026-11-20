import { Component, ElementRef, Type, computed, effect, input, output, viewChild } from "@angular/core";
import { Model } from "@decaf-ts/decorator-validation";
import { ModelRendererComponent } from "@decaf-ts/for-angular";
import { AgentTranslateFallbackPipe } from "../../i18n/agent-translate-fallback.pipe";

export type DswSettingsModel = string | Model | Type<Model>;

@Component({
  selector: "ngx-decaf-dsw-settings-drawer",
  templateUrl: "./dsw-settings-drawer.component.html",
  styleUrls: ["./dsw-settings-drawer.component.scss"],
  imports: [ModelRendererComponent, AgentTranslateFallbackPipe],
  standalone: true,
  host: {
    "(document:keydown)": "onDocumentKeydown($event)",
  },
})
export class DswSettingsDrawerComponent {
  readonly open = input<boolean>(false);
  readonly models = input<DswSettingsModel[]>([]);
  readonly variant = input<"drawer" | "panel">("drawer");
  readonly titleKey = input<string>("agent.dsw.settings.title");
  readonly titleFallback = input<string>("Settings");
  readonly emptyKey = input<string>("agent.dsw.settings.empty");
  readonly emptyFallback = input<string>("No settings available");
  readonly closeLabelKey = input<string>("agent.dsw.settings.close");
  readonly closeLabelFallback = input<string>("Close settings");

  readonly openChange = output<boolean>();
  readonly dismiss = output<void>();

  readonly closeButton = viewChild<ElementRef<HTMLButtonElement>>("closeButton");

  readonly renderables = computed<(string | Model)[]>(() =>
    this.models().map((model) => this.toRenderable(model)),
  );
  readonly hasModels = computed(() => this.renderables().length > 0);

  constructor() {
    effect(() => {
      if (this.open() && this.closeButton()) {
        this.closeButton()?.nativeElement.focus();
      }
    });
  }

  closeDrawer(): void {
    this.openChange.emit(false);
    this.dismiss.emit();
  }

  onDocumentKeydown(event: KeyboardEvent): void {
    if (event.key !== "Escape" || !this.open()) return;
    event.preventDefault();
    this.closeDrawer();
  }

  private toRenderable(model: DswSettingsModel): string | Model {
    if (typeof model === "string") return model;
    if (model instanceof Model) return model;
    try {
      return new (model as new (arg?: unknown) => Model)({});
    } catch {
      return (model as Type<Model>).name;
    }
  }
}
