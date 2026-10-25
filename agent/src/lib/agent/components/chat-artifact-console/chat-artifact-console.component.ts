import { Component, computed, input, output, signal } from "@angular/core";
import { AgentTranslateFallbackPipe } from "../../i18n/agent-translate-fallback.pipe";
import type { AgentChatConsoleRow } from "../../types";
import { ChatIconComponent } from "../chat-icon/chat-icon.component";

const MIN_CONSOLE_HEIGHT = 120;
const MAX_CONSOLE_HEIGHT = 560;
const KEYBOARD_STEP = 16;

/** Console output panel for artifact tool runs: level-colored rows, clear action, and a resizable pane with pointer and keyboard controls. */
@Component({
  selector: "ngx-decaf-chat-artifact-console",
  templateUrl: "./chat-artifact-console.component.html",
  styleUrls: ["./chat-artifact-console.component.scss"],
  imports: [AgentTranslateFallbackPipe, ChatIconComponent],
  standalone: true,
})
export class ChatArtifactConsoleComponent {
  /** Console rows rendered by the panel. */
  readonly rows = input<AgentChatConsoleRow[]>([]);
  /** Optional title override. */
  readonly title = input<string | null>(null);
  /** Initial pane height in pixels before any resize. */
  readonly initialHeight = input<number>(200);
  /** Lower height bound in pixels. */
  readonly minHeight = input<number>(MIN_CONSOLE_HEIGHT);
  /** Upper height bound in pixels. */
  readonly maxHeight = input<number>(MAX_CONSOLE_HEIGHT);
  /** Whether the pane can be resized. */
  readonly resizable = input<boolean>(true);
  /** Whether the clear action is rendered. */
  readonly showClear = input<boolean>(true);

  /** Emits the new height after a resize. */
  readonly heightChange = output<number>();
  /** Emits when the clear action is invoked. */
  readonly cleared = output<void>();

  /** Height chosen through resizing, or `null` for the initial height. */
  readonly internalHeight = signal<number | null>(null);

  /** Effective minimum height (never above the maximum). */
  readonly lowerBound = computed(() =>
    Math.max(48, Math.min(this.minHeight(), this.maxHeight())),
  );

  /** Effective maximum height (never below the minimum). */
  readonly upperBound = computed(() =>
    Math.max(this.lowerBound(), this.maxHeight()),
  );

  /** Effective clamped pane height in pixels. */
  readonly height = computed(() => {
    const requested = this.internalHeight() ?? this.initialHeight();
    return Math.min(
      this.upperBound(),
      Math.max(this.lowerBound(), Math.round(requested)),
    );
  });

  /** Number of console rows. */
  readonly rowCount = computed(() => this.rows().length);

  private dragging = false;
  private startY = 0;
  private startHeight = 0;
  private pointerTarget: HTMLElement | null = null;
  private pointerId: number | null = null;

  /** Begins a pointer-driven resize gesture. */
  startResize(event: PointerEvent): void {
    if (!this.resizable()) return;
    event.preventDefault();
    this.dragging = true;
    this.startY = event.clientY;
    this.startHeight = this.height();
    this.pointerId = event.pointerId ?? null;
    const target = event.currentTarget as HTMLElement | null;
    this.pointerTarget = target;
    if (target && this.pointerId !== null) {
      target.setPointerCapture?.(this.pointerId);
    }
  }

  /** Applies pointer movement to the pane height. */
  onResize(event: PointerEvent): void {
    if (!this.dragging) return;
    const delta = this.startY - event.clientY;
    this.applyHeight(this.startHeight + delta);
  }

  /** Ends the resize gesture and releases pointer capture. */
  endResize(event?: PointerEvent): void {
    if (!this.dragging) return;
    this.dragging = false;
    if (this.pointerTarget && this.pointerId !== null) {
      this.pointerTarget.releasePointerCapture?.(this.pointerId);
    }
    this.pointerTarget = null;
    this.pointerId = null;
    void event;
  }

  /** Handles Arrow/Home/End keyboard resizing. */
  onHandleKeydown(event: KeyboardEvent): void {
    if (!this.resizable()) return;
    if (event.key === "ArrowUp") {
      event.preventDefault();
      this.applyHeight(this.height() + KEYBOARD_STEP);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      this.applyHeight(this.height() - KEYBOARD_STEP);
    } else if (event.key === "Home") {
      event.preventDefault();
      this.applyHeight(this.lowerBound());
    } else if (event.key === "End") {
      event.preventDefault();
      this.applyHeight(this.upperBound());
    }
  }

  /** Emits the clear request. */
  clear(): void {
    this.cleared.emit();
  }

  /** Effective console level of a row. */
  levelOf(row: AgentChatConsoleRow): string {
    return row.level ?? "log";
  }

  /** Tracks console rows by id or index/text. */
  trackRow(index: number, row: AgentChatConsoleRow): string {
    return row.id ?? `${index}:${row.text}`;
  }

  private applyHeight(next: number): void {
    const clamped = Math.min(
      this.upperBound(),
      Math.max(this.lowerBound(), Math.round(next)),
    );
    if (clamped === this.height()) return;
    this.internalHeight.set(clamped);
    this.heightChange.emit(clamped);
  }
}
