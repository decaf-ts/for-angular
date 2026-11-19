import {
  Component,
  effect,
  input,
  output,
  signal,
} from "@angular/core";
import { AgentTranslateFallbackPipe } from "@decaf-ts/for-angular/agent";
import type {
  TerminalQuestionAnswer,
  TerminalQuestionItem,
  TerminalQuestionResult,
} from "../../types";

/**
 * @description Form that collects answers for a batch of terminal questions
 * @summary Renders each {@link TerminalQuestionItem} with its options plus a
 * free-text field, tracks single- and multi-select state per question, and
 * emits a {@link TerminalQuestionResult} only when every question has a
 * selection or custom text. A question with neither marks the form invalid and
 * blocks submission. Selections reset whenever the questions input changes.
 * @class TerminalQuestionComponent
 * @category Terminal
 * @example
 * ```html
 * <ngx-decaf-terminal-question
 *   [questions]="activeQuestions()"
 *   [disabled]="busy() !== null"
 *   (answered)="submitAnswer($event)"
 *   (cancel)="cancelActive()"
 * />
 * ```
 */
@Component({
  selector: "ngx-decaf-terminal-question",
  templateUrl: "./terminal-question.component.html",
  styleUrls: ["./terminal-question.component.scss"],
  imports: [AgentTranslateFallbackPipe],
  standalone: true,
})
export class TerminalQuestionComponent {
  /** Questions to answer. */
  readonly questions = input<TerminalQuestionItem[]>([]);

  /** Disables every control while the host is busy. */
  readonly disabled = input<boolean>(false);

  /** Emits the collected answers when the form is submitted. */
  readonly answered = output<TerminalQuestionResult>();

  /** Emits when the user dismisses the form. */
  // eslint-disable-next-line @angular-eslint/no-output-native -- Public event name is already in use.
  readonly cancel = output<void>();

  private readonly selections = signal<string[][]>([]);
  private readonly customs = signal<string[]>([]);

  /** Whether the last submit attempt found an unanswered question. */
  readonly invalid = signal(false);

  constructor() {
    effect(() => {
      const questions = this.questions();
      this.selections.set(questions.map(() => []));
      this.customs.set(questions.map(() => ""));
      this.invalid.set(false);
    });
  }

  /**
   * @description Selected labels for one question
   * @param {number} index - question index.
   * @returns {Array<string>} the selected labels.
   */
  selectionAt(index: number): string[] {
    return this.selections()[index] ?? [];
  }

  /**
   * @description Custom text for one question
   * @param {number} index - question index.
   * @returns {string} the current custom text, or an empty string.
   */
  customAt(index: number): string {
    return this.customs()[index] ?? "";
  }

  /**
   * @description Whether an option is selected for one question
   * @param {number} index - question index.
   * @param {string} label - option label.
   * @returns {boolean} true when the label is selected.
   */
  isSelected(index: number, label: string): boolean {
    return this.selectionAt(index).includes(label);
  }

  /**
   * @description Whether a question accepts multiple selections
   * @param {TerminalQuestionItem} question - the question to inspect.
   * @returns {boolean} true when `multiSelect` is enabled.
   */
  isMulti(question: TerminalQuestionItem): boolean {
    return question.multiSelect === true;
  }

  /**
   * @description Toggle an option for one question
   * @summary Multi-select questions add or remove the label; single-select
   * questions replace the selection. Ignored while disabled.
   * @param {number} index - question index.
   * @param {string} label - option label.
   * @param {boolean} multi - whether the question is multi-select.
   * @returns {void}
   */
  toggle(index: number, label: string, multi: boolean): void {
    if (this.disabled()) return;
    const next = this.selections().map((entry) => [...entry]);
    while (next.length <= index) next.push([]);
    if (multi) {
      const current = next[index];
      const position = current.indexOf(label);
      if (position >= 0) current.splice(position, 1);
      else current.push(label);
    } else {
      next[index] = [label];
    }
    this.selections.set(next);
    this.invalid.set(false);
  }

  /**
   * @description Store the free-text answer for one question
   * @param {number} index - question index.
   * @param {string} value - the custom text.
   * @returns {void}
   */
  setCustom(index: number, value: string): void {
    if (this.disabled()) return;
    const next = this.customs().map((entry) => entry);
    while (next.length <= index) next.push("");
    next[index] = value;
    this.customs.set(next);
    this.invalid.set(false);
  }

  /**
   * @description Validate and emit the collected answers
   * @summary Prevents the browser submit, then emits one
   * {@link TerminalQuestionAnswer} per question. Sets `invalid` and returns
   * without emitting when any question has neither a selection nor custom text.
   * @param {Event} event - the submit event.
   * @returns {void}
   */
  onSubmit(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    if (this.disabled()) return;
    const questions = this.questions();
    const answers: TerminalQuestionAnswer[] = [];
    for (let index = 0; index < questions.length; index += 1) {
      const selected = this.selectionAt(index);
      const custom = this.customAt(index).trim();
      if (!selected.length && !custom) {
        this.invalid.set(true);
        return;
      }
      answers.push(custom ? { selected: [...selected], custom } : { selected: [...selected] });
    }
    this.invalid.set(false);
    this.answered.emit({ answers });
  }

  /**
   * @description Emit a cancellation unless the form is disabled
   * @returns {void}
   */
  onCancel(): void {
    if (this.disabled()) return;
    this.cancel.emit();
  }
}
