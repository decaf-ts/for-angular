import {
  Component,
  ElementRef,
  computed,
  effect,
  input,
  linkedSignal,
  output,
  viewChild,
} from "@angular/core";
import { AgentTranslateFallbackPipe } from "../../i18n/agent-translate-fallback.pipe";
import type { AgentChatSlashCommand } from "../../types";

let slashSequence = 0;

/**
 * Slash-command popover for the composer. Filters by the slash prefix, moves
 * the active option with the arrow keys, selects with Enter, closes with
 * Escape, and keeps the active option scrolled into view.
 */
@Component({
  selector: "ngx-decaf-chat-slash-commands",
  templateUrl: "./chat-slash-commands.component.html",
  styleUrls: ["./chat-slash-commands.component.scss"],
  imports: [AgentTranslateFallbackPipe],
  standalone: true,
})
export class ChatSlashCommandsComponent {
  /** Commands offered by the popover. */
  readonly commands = input<AgentChatSlashCommand[]>([]);
  /** Current query typed after the slash (with or without the leading `/`). */
  readonly query = input<string>("");
  /** Whether the popover is open. */
  readonly open = input<boolean>(true);

  /** Emits the selected command. */
  // eslint-disable-next-line @angular-eslint/no-output-native -- Public event name is already in use.
  readonly select = output<AgentChatSlashCommand>();
  /** Emits when the popover should close. */
  // eslint-disable-next-line @angular-eslint/no-output-native -- Public event name is already in use.
  readonly close = output<void>();

  /** Prefix used for filtering. */
  readonly normalizedQuery = computed(() =>
    this.query().replace(/^\//, "").trim().toLowerCase(),
  );
  /** Commands matching the prefix (name or alias). */
  readonly filtered = computed<AgentChatSlashCommand[]>(() => {
    const prefix = this.normalizedQuery();
    if (!prefix) return this.commands();
    return this.commands().filter((command) => matches(command, prefix));
  });
  /** Index of the highlighted command. */
  readonly activeIndex = linkedSignal<
    AgentChatSlashCommand[],
    number
  >({
    source: () => this.filtered(),
    computation: () => 0,
  });

  /** Scrollable list element used to reveal the highlighted command. */
  readonly list = viewChild<ElementRef<HTMLElement>>("list");

  private readonly instance = ++slashSequence;

  constructor() {
    effect(() => {
      const index = this.activeIndex();
      void this.filtered();
      queueMicrotask(() => this.scrollActiveIntoView(index));
    });
  }

  /** Stable DOM id for an option. */
  optionId(index: number): string {
    return `agent-chat-slash-command-${this.instance}-${index}`;
  }

  /** Id referenced by `aria-activedescendant`. */
  readonly activeDescendant = computed(() =>
    this.filtered().length > 0 ? this.optionId(this.activeIndex()) : null,
  );

  /** Handles keyboard navigation while the popover is open. */
  onKeydown(event: KeyboardEvent): void {
    if (!this.open()) return;
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        this.move(1);
        break;
      case "ArrowUp":
        event.preventDefault();
        this.move(-1);
        break;
      case "Home":
        event.preventDefault();
        this.setActive(0);
        break;
      case "End":
        event.preventDefault();
        this.setActive(this.filtered().length - 1);
        break;
      case "Enter":
        event.preventDefault();
        this.selectActive();
        break;
      case "Escape":
        event.preventDefault();
        this.close.emit();
        break;
      default:
        break;
    }
  }

  /** Highlights the next/previous command, wrapping at the ends. */
  move(delta: number): void {
    const total = this.filtered().length;
    if (total === 0) return;
    const next = (this.activeIndex() + delta + total) % total;
    this.setActive(next);
  }

  /** Highlights an explicit index. */
  setActive(index: number): void {
    const total = this.filtered().length;
    if (index < 0 || index >= total) return;
    this.activeIndex.set(index);
  }

  /** Emits the highlighted command and closes. */
  selectActive(): void {
    const command = this.filtered()[this.activeIndex()];
    if (!command) return;
    this.selectCommand(command);
  }

  /** Emits a command selection and closes the popover. */
  selectCommand(command: AgentChatSlashCommand): void {
    this.select.emit(command);
    this.close.emit();
  }

  private scrollActiveIntoView(index: number): void {
    const container = this.list()?.nativeElement;
    if (!container) return;
    const options = container.querySelectorAll<HTMLElement>(
      "[data-command-index]",
    );
    const active = options[index];
    active?.scrollIntoView?.({ block: "nearest" });
  }
}

function matches(command: AgentChatSlashCommand, prefix: string): boolean {
  const candidates = [command.name, ...(command.aliases ?? [])];
  return candidates.some((candidate) =>
    candidate.toLowerCase().startsWith(prefix),
  );
}
