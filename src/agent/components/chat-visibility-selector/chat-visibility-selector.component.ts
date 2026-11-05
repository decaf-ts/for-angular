import {
  Component,
  ElementRef,
  HostListener,
  computed,
  inject,
  input,
  linkedSignal,
  output,
  signal,
} from "@angular/core";
import { AgentTranslateFallbackPipe } from "../../i18n/agent-translate-fallback.pipe";
import type { AgentChatVisibility } from "../../types";
import { ChatIconComponent } from "../chat-icon/chat-icon.component";

const VISIBILITIES: AgentChatVisibility[] = ["private", "shared"];

/**
 * Private/shared dropdown for the conversation. Updates the local state
 * optimistically (unless `optimistic` is `false`) and emits the change.
 */
@Component({
  selector: "ngx-decaf-chat-visibility-selector",
  templateUrl: "./chat-visibility-selector.component.html",
  styleUrls: ["./chat-visibility-selector.component.scss"],
  imports: [ChatIconComponent, AgentTranslateFallbackPipe],
  standalone: true,
})
export class ChatVisibilitySelectorComponent {
  /** Current conversation visibility. */
  readonly visibility = input<AgentChatVisibility>("private");
  /** Disables the trigger and options. */
  readonly disabled = input<boolean>(false);
  /** Reflect the new value immediately, before the parent confirms it. */
  readonly optimistic = input<boolean>(true);

  /** Emits the requested visibility. */
  readonly visibilityChange = output<AgentChatVisibility>();

  /** Whether the dropdown is open. */
  readonly isOpen = signal(false);
  /** Locally displayed visibility. */
  readonly current = linkedSignal<AgentChatVisibility>(() => this.visibility());

  /** Every selectable option. */
  readonly options = computed(() => VISIBILITIES);

  /** i18n key for the current value. */
  readonly currentKey = computed(() => `agent.chat.visibility.${this.current()}`);

  /** English fallback for the current value. */
  readonly currentFallback = computed(() =>
    this.current() === "shared" ? "Shared" : "Private",
  );

  private readonly host = inject(ElementRef<HTMLElement>);

  /** Toggles the dropdown. */
  toggle(): void {
    if (this.disabled()) return;
    this.isOpen.update((open) => !open);
  }

  /** Closes the dropdown. */
  close(): void {
    this.isOpen.set(false);
  }

  /** Selects a visibility, updating optimistically and emitting the change. */
  select(visibility: AgentChatVisibility): void {
    if (this.disabled()) return;
    this.isOpen.set(false);
    if (visibility === this.current()) return;
    if (this.optimistic()) this.current.set(visibility);
    this.visibilityChange.emit(visibility);
  }

  /** Restores the parent-provided value after a failed optimistic change. */
  rollback(): void {
    this.current.set(this.visibility());
  }

  /** i18n key for an option label. */
  optionKey(visibility: AgentChatVisibility): string {
    return `agent.chat.visibility.${visibility}`;
  }

  /** Fallback for an option label. */
  optionFallback(visibility: AgentChatVisibility): string {
    return visibility === "shared" ? "Shared" : "Private";
  }

  /** Whether an option is the current one. */
  isSelected(visibility: AgentChatVisibility): boolean {
    return this.current() === visibility;
  }

  /** Closes the dropdown on outside clicks. */
  @HostListener("document:click", ["$event"])
  onDocumentClick(event: MouseEvent): void {
    if (!this.isOpen()) return;
    const target = event.target as Node | null;
    if (target && this.host.nativeElement.contains(target)) return;
    this.close();
  }
}
