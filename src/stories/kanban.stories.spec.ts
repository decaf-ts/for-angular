import { TestBed } from '@angular/core/testing';
import {
  KanbanBoardComponent,
  type KanbanConfig,
  type TaskMoveRejectedEvent,
} from '@decaf-ts/for-angular/kanban';

import stories, {
  Default,
  Disabled,
  Empty,
  ErrorState,
  Filtered,
  Loading,
  ReadOnly,
  WipLimitReached,
} from './kanban.stories';

interface DemoTask {
  id: string;
  title: string;
  status: string;
  assignee: string;
}


const metaArgs = (stories.args ?? {}) as Record<string, unknown>;

function mount(storyArgs: Record<string, unknown> = {}) {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ imports: [KanbanBoardComponent] });
  const fixture = TestBed.createComponent(KanbanBoardComponent<DemoTask>);
  const args = { ...metaArgs, ...storyArgs };
  fixture.componentRef.setInput('config', args['config'] as KanbanConfig<DemoTask>);
  fixture.componentRef.setInput('items', (args['items'] ?? []) as DemoTask[]);
  fixture.componentRef.setInput('selectedId', args['selectedId'] ?? null);
  fixture.componentRef.setInput('readonly', !!args['readOnly']);
  fixture.componentRef.setInput('disabled', !!args['disabled']);
  fixture.componentRef.setInput('loading', !!args['loading']);
  fixture.componentRef.setInput('error', args['error'] ?? null);
  fixture.componentRef.setInput('filter', args['filter'] ?? null);
  fixture.componentRef.setInput(
    'showDragHandles',
    args['showDragHandles'] === undefined ? true : !!args['showDragHandles']
  );
  fixture.componentRef.setInput('label', args['label'] ?? 'Kanban board');
  fixture.detectChanges();
  return fixture;
}

const storyArgs = (story: unknown): Record<string, unknown> =>
  ((story as { args?: Record<string, unknown> })?.args ?? {}) as Record<string, unknown>;

describe('kanban.stories — Storybook contract', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('exposes all documented stories on the Components/Kanban meta', () => {
    expect(stories.title).toBe('Components/Kanban');
    expect(stories.component).toBe(KanbanBoardComponent);
    expect(Default).toBeDefined();
    expect(Empty).toBeDefined();
    expect(ReadOnly).toBeDefined();
    expect(Disabled).toBeDefined();
    expect(Loading).toBeDefined();
    expect(ErrorState).toBeDefined();
    expect(WipLimitReached).toBeDefined();
    expect(Filtered).toBeDefined();
  });

  it('Default renders four columns and seven cards', () => {
    const fixture = mount(storyArgs(Default));
    expect(fixture.nativeElement.querySelectorAll('.dcf-kanban-column')).toHaveLength(4);
    expect(fixture.nativeElement.querySelectorAll('[data-kanban-task-id]')).toHaveLength(7);
    expect(fixture.componentInstance.columns().map((column) => column.title)).toEqual([
      'To do',
      'In progress',
      'Review',
      'Done',
    ]);
  });

  it('Empty renders four columns without cards', () => {
    const fixture = mount(storyArgs(Empty));
    expect(fixture.nativeElement.querySelectorAll('.dcf-kanban-column')).toHaveLength(4);
    expect(fixture.nativeElement.querySelectorAll('[data-kanban-task-id]')).toHaveLength(0);
    expect(fixture.nativeElement.querySelectorAll('.dcf-kanban-column__empty')).toHaveLength(4);
  });

  it('ReadOnly removes drag handles and rejects moves', () => {
    const fixture = mount(storyArgs(ReadOnly));
    expect(fixture.nativeElement.querySelectorAll('.dcf-kanban-card__handle')).toHaveLength(0);
    const board = fixture.componentInstance;
    const rejected: TaskMoveRejectedEvent<DemoTask>[] = [];
    board.taskMoveRejected.subscribe((event) => rejected.push(event));
    const task = (metaArgs['items'] as DemoTask[])[0];
    board.onCardDrop({
      previousDropListId: `${board.resolvedInstanceId()}-todo-drop`,
      dropListId: `${board.resolvedInstanceId()}-todo-drop`,
      previousIndex: 0,
      currentIndex: 1,
      task,
    });
    expect(rejected[0]?.reason).toBe('readonly');
  });

  it('Disabled exposes no interactive drag handles and no selection', () => {
    const fixture = mount(storyArgs(Disabled));
    const board = fixture.componentInstance;
    const selected: unknown[] = [];
    const edits: unknown[] = [];
    board.taskSelected.subscribe((event) => selected.push(event));
    board.taskEditRequested.subscribe((event) => edits.push(event));
    const card = fixture.nativeElement.querySelector('[data-kanban-task-id="t-1"]') as HTMLElement;
    card.click();
    card.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    expect(selected).toHaveLength(0);
    expect(edits).toHaveLength(0);
    expect(fixture.nativeElement.querySelectorAll('.dcf-kanban-card__handle')).toHaveLength(0);
  });

  it('Loading renders the loading status instead of the board', () => {
    const fixture = mount(storyArgs(Loading));
    expect(fixture.nativeElement.querySelector('.dcf-kanban__state--loading')?.textContent).toContain(
      'Loading tasks...'
    );
    expect(fixture.nativeElement.querySelector('.dcf-kanban__board')).toBeNull();
  });

  it('ErrorState renders the error alert', () => {
    const fixture = mount(storyArgs(ErrorState));
    expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent).toContain(
      'The board could not be loaded'
    );
    expect(fixture.nativeElement.querySelector('.dcf-kanban__board')).toBeNull();
  });

  it('WipLimitReached shows the over-limit column state', () => {
    const fixture = mount(storyArgs(WipLimitReached));
    const doing = fixture.nativeElement.querySelector('[data-column-id="doing"]') as HTMLElement;
    expect(doing.classList).toContain('dcf-kanban-column--over-limit');
    expect(
      doing.querySelector('.dcf-kanban-column__count')?.textContent?.replace(/\s+/g, ' ').trim()
    ).toBe('3 / 2');
    expect(doing.querySelectorAll('[data-kanban-task-id]')).toHaveLength(3);
  });

  it('Filtered hides non-matching cards but keeps all columns', () => {
    const fixture = mount(storyArgs(Filtered));
    expect(fixture.nativeElement.querySelectorAll('.dcf-kanban-column')).toHaveLength(4);
    expect(fixture.nativeElement.querySelectorAll('[data-kanban-task-id]')).toHaveLength(3);
    for (const id of ['t-1', 't-4', 't-7']) {
      expect(fixture.nativeElement.querySelector(`[data-kanban-task-id="${id}"]`)).toBeTruthy();
    }
    for (const id of ['t-2', 't-3', 't-5', 't-6']) {
      expect(fixture.nativeElement.querySelector(`[data-kanban-task-id="${id}"]`)).toBeNull();
    }
  });
});
