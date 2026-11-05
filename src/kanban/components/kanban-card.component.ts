import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  TemplateRef,
  computed,
  input,
  output,
} from '@angular/core';
import { CdkDragHandle } from '@angular/cdk/drag-drop';
import {
  KanbanCardKeyboardEvent,
  KanbanCardTemplateContext,
  KanbanColumnConfig,
  KanbanConfig,
  KanbanSelectionEvent,
} from './kanban.types';

/**
 * Single card of the Kanban board: renders the host-provided card template,
 * exposes the drag handle and drives the built-in keyboard interaction
 * (selection, edit request and the keyboard move flow).
 *
 * Usually instantiated implicitly by {@link KanbanColumnComponent}.
 *
 * @template T - Host task type rendered by the board.
 * @category Kanban
 */
@Component({
  selector: 'decaf-kanban-card',
  standalone: true,
  imports: [NgTemplateOutlet, CdkDragHandle],
  templateUrl: './kanban-card.component.html',
  styleUrls: ['./kanban-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'dcf-kanban-card',
    '[attr.data-kanban-task-id]': 'taskId()',
    '[attr.tabindex]': 'disabled() ? null : 0',
    '[attr.role]': '"listitem"',
    '[attr.aria-label]': 'ariaLabel()',
    '[attr.aria-current]': 'selected() ? "true" : null',
    '[attr.aria-grabbed]': 'grabbed()',
    '[attr.aria-describedby]': 'helpId()',
    '[class.dcf-kanban-card--selected]': 'selected()',
    '[class.dcf-kanban-card--grabbed]': 'grabbed()',
    '[class.dcf-kanban-card--readonly]': 'readOnly()',
    '[class.dcf-kanban-card--disabled]': 'disabled()',
    '[class.dcf-kanban-card--dragging]': 'dragging()',
    '(click)': 'onClick()',
    '(dblclick)': 'onDoubleClick()',
    '(keydown)': 'onKeydown($event)',
  },
})
export class KanbanCardComponent<T = unknown> {
  readonly task = input.required<T>();
  readonly config = input.required<KanbanConfig<T>>();
  readonly column = input.required<KanbanColumnConfig>();
  readonly index = input.required<number>();
  readonly count = input.required<number>();
  readonly selected = input(false);
  readonly grabbed = input(false);
  readonly readOnly = input(false);
  readonly disabled = input(false);
  readonly showHandle = input(true);
  readonly dragging = input(false);
  readonly template = input<TemplateRef<KanbanCardTemplateContext<T>> | null>(null);
  readonly helpId = input<string | null>(null);

  readonly cardSelected = output<KanbanSelectionEvent<T>>();
  readonly cardEditRequested = output<KanbanSelectionEvent<T>>();
  readonly cardKeydown = output<KanbanCardKeyboardEvent<T>>();

  readonly taskId = computed(() => this.config().id(this.task()));
  readonly title = computed(() => this.config().title(this.task()));
  readonly isInteractive = computed(() => !this.disabled());
  readonly templateContext = computed<KanbanCardTemplateContext<T>>(() => ({
    $implicit: this.task(),
    task: this.task(),
    column: this.column(),
    index: this.index(),
    selected: this.selected(),
    readOnly: this.readOnly(),
  }));
  readonly ariaLabel = computed(() => {
    const position = this.index() + 1;
    const total = this.count();
    const state = this.selected() ? ', selected' : '';
    return `${this.title()}, ${this.column().title}, position ${position} of ${total}${state}`;
  });

  onClick(): void {
    if (this.disabled()) {
      return;
    }
    this.cardSelected.emit({ task: this.task(), column: this.column().id });
  }

  onDoubleClick(): void {
    if (this.disabled() || this.readOnly()) {
      return;
    }
    this.cardEditRequested.emit({ task: this.task(), column: this.column().id });
  }

  onKeydown(event: KeyboardEvent): void {
    this.cardKeydown.emit({
      event,
      task: this.task(),
      column: this.column().id,
      index: this.index(),
    });
  }
}
