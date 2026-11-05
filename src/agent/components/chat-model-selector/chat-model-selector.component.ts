import {
  Component,
  ElementRef,
  HostListener,
  computed,
  effect,
  inject,
  input,
  linkedSignal,
  output,
  signal,
  viewChild,
} from "@angular/core";
import { AgentTranslateFallbackPipe } from "../../i18n/agent-translate-fallback.pipe";
import type { AgentChatModel } from "../../types";
import { ChatIconComponent } from "../chat-icon/chat-icon.component";

/**
 * Searchable model dropdown for the chat composer. The trigger shows the
 * current model, the panel filters by name/id/provider/description, and an
 * empty-result state is rendered when nothing matches.
 */
@Component({
  selector: "ngx-decaf-chat-model-selector",
  templateUrl: "./chat-model-selector.component.html",
  styleUrls: ["./chat-model-selector.component.scss"],
  imports: [ChatIconComponent, AgentTranslateFallbackPipe],
  standalone: true,
})
export class ChatModelSelectorComponent {
  /** Models offered by the selector. */
  readonly models = input<AgentChatModel[]>([]);
  /** Current model id or model object. */
  readonly model = input<AgentChatModel | string | null>(null);
  /** Disables the trigger and panel. */
  readonly disabled = input<boolean>(false);

  /** Emits the selected model. */
  readonly modelChange = output<AgentChatModel>();
  /** Emits every open/closed transition. */
  readonly openChange = output<boolean>();

  /** Whether the panel is open. */
  readonly isOpen = signal(false);
  /** Current search text. */
  readonly search = signal("");

  /** Resolved current model. */
  readonly selected = computed<AgentChatModel | null>(() => {
    const current = this.model();
    if (!current) return null;
    if (typeof current !== "string") return current;
    return this.models().find((model) => model.id === current) ?? null;
  });
  /** Models matching the search text. */
  readonly filtered = computed<AgentChatModel[]>(() => {
    const query = this.search().trim().toLowerCase();
    if (!query) return this.models();
    return this.models().filter((model) =>
      [model.name, model.id, model.provider ?? "", model.description ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  });
  /** Index of the highlighted model. */
  readonly activeIndex = linkedSignal<AgentChatModel[], number>({
    source: () => this.filtered(),
    computation: () => 0,
  });

  /** Search field used for filtering and keyboard navigation. */
  readonly searchInput = viewChild<ElementRef<HTMLInputElement>>("searchField");

  private readonly host = inject(ElementRef<HTMLElement>);

  constructor() {
    effect(() => {
      if (!this.isOpen()) return;
      queueMicrotask(() => this.searchInput()?.nativeElement.focus());
    });
  }

  /** Toggles the panel. */
  toggle(): void {
    if (this.disabled()) return;
    this.setOpen(!this.isOpen());
  }

  /** Opens the panel and focuses the search field. */
  openPanel(): void {
    if (this.disabled()) return;
    this.setOpen(true);
  }

  /** Closes the panel and clears the search. */
  closePanel(): void {
    if (!this.isOpen()) return;
    this.setOpen(false);
  }

  /** Emits the chosen model and closes the panel. */
  selectModel(model: AgentChatModel): void {
    if (this.disabled()) return;
    this.search.set("");
    this.modelChange.emit(model);
    this.closePanel();
  }

  /** Updates the search text. */
  onSearchInput(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
  }

  /** Keyboard navigation for the search field / panel. */
  onPanelKeydown(event: KeyboardEvent): void {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        this.move(1);
        break;
      case "ArrowUp":
        event.preventDefault();
        this.move(-1);
        break;
      case "Enter":
        event.preventDefault();
        this.selectActive();
        break;
      case "Escape":
        event.preventDefault();
        this.closePanel();
        break;
      default:
        break;
    }
  }

  /** Highlights the next/previous model, wrapping at the ends. */
  move(delta: number): void {
    const total = this.filtered().length;
    if (total === 0) return;
    this.activeIndex.set((this.activeIndex() + delta + total) % total);
  }

  /** Highlights an explicit index. */
  setActive(index: number): void {
    if (index < 0 || index >= this.filtered().length) return;
    this.activeIndex.set(index);
  }

  /** Emits the highlighted model. */
  selectActive(): void {
    const model = this.filtered()[this.activeIndex()];
    if (model) this.selectModel(model);
  }

  /** Closes the panel on clicks outside the component. */
  @HostListener("document:click", ["$event"])
  onDocumentClick(event: MouseEvent): void {
    if (!this.isOpen()) return;
    const target = event.target as Node | null;
    if (target && this.host.nativeElement.contains(target)) return;
    this.closePanel();
  }

  private setOpen(open: boolean): void {
    if (this.isOpen() === open) return;
    this.isOpen.set(open);
    if (!open) this.search.set("");
    this.openChange.emit(open);
  }
}
