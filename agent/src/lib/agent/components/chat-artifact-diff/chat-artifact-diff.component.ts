import { Component, computed, input, output, signal } from "@angular/core";
import { AgentTranslateFallbackPipe } from "../../i18n/agent-translate-fallback.pipe";
import type {
  AgentChatDiffLine,
  AgentChatDiffRow,
} from "../../types";
import { ChatIconComponent } from "../chat-icon/chat-icon.component";

/** Diff layout mode: side-by-side columns or a single inline column. */
export type ChatArtifactDiffMode = "side-by-side" | "inline";

interface DiffOperation {
  kind: "equal" | "removed" | "added";
  previous?: AgentChatDiffLine;
  current?: AgentChatDiffLine;
}

const MAX_DP_CELLS = 250_000;

function toLines(text: string): string[] {
  return text.length === 0 ? [] : text.split("\n");
}

function buildOperations(previous: string[], current: string[]): DiffOperation[] {
  if (previous.length * current.length > MAX_DP_CELLS) {
    return [
      ...previous.map<DiffOperation>((text, index) => ({
        kind: "removed",
        previous: { number: index + 1, text },
      })),
      ...current.map<DiffOperation>((text, index) => ({
        kind: "added",
        current: { number: index + 1, text },
      })),
    ];
  }
  const rows = previous.length;
  const columns = current.length;
  const table: number[][] = Array.from({ length: rows + 1 }, () =>
    new Array<number>(columns + 1).fill(0),
  );
  for (let i = rows - 1; i >= 0; i -= 1) {
    for (let j = columns - 1; j >= 0; j -= 1) {
      table[i][j] =
        previous[i] === current[j]
          ? table[i + 1][j + 1] + 1
          : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }
  const operations: DiffOperation[] = [];
  let i = 0;
  let j = 0;
  while (i < rows && j < columns) {
    if (previous[i] === current[j]) {
      operations.push({
        kind: "equal",
        previous: { number: i + 1, text: previous[i] },
        current: { number: j + 1, text: current[j] },
      });
      i += 1;
      j += 1;
      continue;
    }
    if (table[i + 1][j] >= table[i][j + 1]) {
      operations.push({
        kind: "removed",
        previous: { number: i + 1, text: previous[i] },
      });
      i += 1;
    } else {
      operations.push({
        kind: "added",
        current: { number: j + 1, text: current[j] },
      });
      j += 1;
    }
  }
  while (i < rows) {
    operations.push({
      kind: "removed",
      previous: { number: i + 1, text: previous[i] },
    });
    i += 1;
  }
  while (j < columns) {
    operations.push({
      kind: "added",
      current: { number: j + 1, text: current[j] },
    });
    j += 1;
  }
  return operations;
}

/**
 * Computes a line diff between two artifact versions, grouping adjacent
 * removals and additions into `changed` rows.
 *
 * @param previousText - Previous artifact text.
 * @param currentText - Current artifact text.
 * @returns Diff rows ready for side-by-side or inline rendering.
 */
export function diffAgentChatArtifactText(
  previousText: string,
  currentText: string,
): AgentChatDiffRow[] {
  const operations = buildOperations(
    toLines(previousText),
    toLines(currentText),
  );
  const rows: AgentChatDiffRow[] = [];
  let index = 0;
  while (index < operations.length) {
    const operation = operations[index];
    if (operation.kind === "equal") {
      rows.push({
        kind: "equal",
        previous: operation.previous,
        current: operation.current,
      });
      index += 1;
      continue;
    }
    const removed: AgentChatDiffLine[] = [];
    const added: AgentChatDiffLine[] = [];
    while (index < operations.length && operations[index].kind !== "equal") {
      if (operations[index].kind === "removed" && operations[index].previous) {
        removed.push(operations[index].previous as AgentChatDiffLine);
      }
      if (operations[index].kind === "added" && operations[index].current) {
        added.push(operations[index].current as AgentChatDiffLine);
      }
      index += 1;
    }
    const length = Math.max(removed.length, added.length);
    for (let offset = 0; offset < length; offset += 1) {
      const previousLine = removed[offset];
      const currentLine = added[offset];
      if (previousLine && currentLine) {
        rows.push({ kind: "changed", previous: previousLine, current: currentLine });
      } else if (previousLine) {
        rows.push({ kind: "removed", previous: previousLine });
      } else if (currentLine) {
        rows.push({ kind: "added", current: currentLine });
      }
    }
  }
  return rows;
}

/**
 * Reports whether a diff contains any non-equal row.
 *
 * @param rows - Diff rows produced by `diffAgentChatArtifactText`.
 * @returns `true` when at least one line was added, removed, or changed.
 */
export function hasAgentChatArtifactChanges(rows: AgentChatDiffRow[]): boolean {
  return rows.some((row) => row.kind !== "equal");
}

/** Text diff viewer for artifact versions, supporting side-by-side and inline modes with line statistics and an LCS-based diff (falling back to whole-block replace for very large inputs). */
@Component({
  selector: "ngx-decaf-chat-artifact-diff",
  templateUrl: "./chat-artifact-diff.component.html",
  styleUrls: ["./chat-artifact-diff.component.scss"],
  imports: [AgentTranslateFallbackPipe, ChatIconComponent],
  standalone: true,
})
export class ChatArtifactDiffComponent {
  /** Previous artifact text. */
  readonly previous = input<string>("");
  /** Current artifact text. */
  readonly current = input<string>("");
  /** Controlled diff mode. */
  readonly mode = input<ChatArtifactDiffMode | null>(null);
  /** Whether the mode toggle is rendered. */
  readonly showToggle = input<boolean>(true);

  /** Emits the selected diff mode. */
  readonly modeChange = output<ChatArtifactDiffMode>();

  /** Uncontrolled diff mode. */
  readonly internalMode = signal<ChatArtifactDiffMode | null>(null);
  /** Effective diff mode. */
  readonly activeMode = computed<ChatArtifactDiffMode>(
    () => this.mode() ?? this.internalMode() ?? "side-by-side",
  );

  /** Diff rows computed from the two texts. */
  readonly rows = computed(() =>
    diffAgentChatArtifactText(this.previous(), this.current()),
  );

  /** Whether the texts differ. */
  readonly changed = computed(() => hasAgentChatArtifactChanges(this.rows()));

  /** Added and removed line counts. */
  readonly stats = computed(() => {
    let added = 0;
    let removed = 0;
    for (const row of this.rows()) {
      if (row.kind === "added") added += 1;
      else if (row.kind === "removed") removed += 1;
      else if (row.kind === "changed") {
        added += 1;
        removed += 1;
      }
    }
    return { added, removed };
  });

  /** Sets the diff mode and emits the change. */
  setMode(mode: ChatArtifactDiffMode): void {
    this.internalMode.set(mode);
    this.modeChange.emit(mode);
  }
}
