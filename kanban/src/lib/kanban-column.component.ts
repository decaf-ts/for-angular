import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  TemplateRef,
  computed,
  input,
  output,
} from '@angular/core';
import { CdkDrag, CdkDragDrop, CdkDropList } from '@angular/cdk/drag-drop';
import { KanbanCardComponent } from './kanban-card.component';
import {
  KanbanCardKeyboardEvent,
  KanbanCardTemplateContext,
  KanbanColumnConfig,
  KanbanColumnDropEvent,
  KanbanColumnHeaderTemplateContext,
  KanbanConfig,
  KanbanEmptyTemplateContext,
  KanbanSelectionEvent,
} from './kanban.types';

/**
 * Single column of the Kanban board: renders its header, the visible cards and
 * the empty state, and owns the CDK drop list for that column.
 *
 * Usually instantiated implicitly by {@link KanbanBoardComponent}; it is
 * exported so hosts can compose custom column layouts.
 *
 * @template T - Host task type rendered by the board.
 * @category Kanban
 */
@Component({
  selector: 'decaf-kanban-column',
  standalone: true,
  imports: [NgTemplateOutlet, CdkDropList, CdkDrag, KanbanCardComponent],
  templateUrl: './kanban-column.component.html',
  styleUrls: ['./kanban-column.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'dcf-kanban-column-host',
  },
})
export class KanbanColumnComponent<T = unknown> {
  readonly column = input.required<KanbanColumnConfig>();
  readonly config = input.required<KanbanConfig<T>>();
  readonly items = input.required<readonly T[]>();
  readonly instanceId = input.required<string>();
  readonly selectedId = input<string | null>(null);
  readonly grabbedId = input<string | null>(null);
  readonly readOnly = input(false);
  readonly disabled = input(false);
  readonly showDragHandles = input(true);
  readonly emptyMessage = input('No tasks');
  readonly helpId = input<string | null>(null);
  readonly cardTemplate = input<TemplateRef<KanbanCardTemplateContext<T>> | null>(null);
  readonly headerTemplate = input<TemplateRef<KanbanColumnHeaderTemplateContext> | null>(null);
  readonly emptyTemplate = input<TemplateRef<KanbanEmptyTemplateContext> | null>(null);

  readonly cardSelected = output<KanbanSelectionEvent<T>>();
  readonly cardEditRequested = output<KanbanSelectionEvent<T>>();
  readonly cardKeydown = output<KanbanCardKeyboardEvent<T>>();
  readonly cardDropped = output<KanbanColumnDropEvent<T>>();

  readonly dragDisabled = computed(() => this.disabled() || this.readOnly());
  readonly headingId = computed(
    () => `${this.instanceId()}-${this.column().id}-heading`
  );
  readonly dropListId = computed(
    () => `${this.instanceId()}-${this.column().id}-drop`
  );
  readonly overLimit = computed(() => {
    const limit = this.column().wipLimit;
    return limit !== undefined && limit >= 0 && this.items().length > limit;
  });
  readonly headerContext = computed<KanbanColumnHeaderTemplateContext>(() => ({
    $implicit: this.column(),
    column: this.column(),
    count: this.items().length,
    wipLimit: this.column().wipLimit,
    readOnly: this.dragDisabled(),
  }));
  readonly emptyContext = computed<KanbanEmptyTemplateContext>(() => ({
    $implicit: this.column(),
    column: this.column(),
    count: 0,
    board: false,
  }));

  taskId(item: T): string {
    return this.config().id(item);
  }

  onDrop(event: CdkDragDrop<readonly T[]>): void {
    this.cardDropped.emit({
      previousDropListId: event.previousContainer.id,
      dropListId: event.container.id,
      previousIndex: event.previousIndex,
      currentIndex: event.currentIndex,
      task: event.item.data as T,
    });
  }

  onCardSelected(item: T): void {
    this.cardSelected.emit({ task: item, column: this.column().id });
  }

  onCardEditRequested(item: T): void {
    this.cardEditRequested.emit({ task: item, column: this.column().id });
  }

  onCardKeydown(event: KanbanCardKeyboardEvent<T>): void {
    this.cardKeydown.emit(event);
  }
}
