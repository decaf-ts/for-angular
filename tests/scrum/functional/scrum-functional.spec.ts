/**
 * SAA-1049 — functional verification of the packed `/scrum` entry point.
 *
 * The module under test resolves to the tarball installed into a throwaway
 * consumer (see `tests/scrum/jest.config.cjs`), never the monorepo path
 * aliases. Every assertion therefore proves the published artifact, not the
 * working-tree source.
 */
import { Component, PLATFORM_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import {
  KanbanBoardComponent,
  DecafKanbanCardDirective,
} from '@decaf-ts/for-angular/kanban';
import {
  BacklogComponent,
  SCRUM_BACKLOG_COLUMN_ID,
  SprintBoardComponent,
  SprintSelectorComponent,
  scrumSprintIdOf,
  type BacklogReorderEvent,
  type BacklogReorderRejectedEvent,
  type ScrumConfig,
  type ScrumSprint,
  type SprintAssignmentRejectedEvent,
  type SprintAssignmentRequestedEvent,
  type SprintBoardMoveEvent,
  type SprintBoardMoveRejectedEvent,
  type SprintBoardReorderEvent,
  type SprintBoardSelectionEvent,
  type SprintSelectionEvent,
} from '@decaf-ts/for-angular/scrum';

interface Task {
  id: string;
  title: string;
  status: string;
  sprintId?: string | null;
}

const COLUMNS = [
  { id: 'todo', title: 'To do' },
  { id: 'doing', title: 'In progress' },
  { id: 'done', title: 'Done' },
];

const SPRINTS: readonly ScrumSprint[] = [
  { id: 's1', title: 'Sprint 1' },
  { id: 's2', title: 'Sprint 2', description: 'Second sprint' },
];

function config(): ScrumConfig<Task> {
  return {
    id: (task) => task.id,
    title: (task) => task.title,
    status: (task) => task.status,
    columns: COLUMNS,
    sprint: (task) => task.sprintId,
  };
}

function sprintTasks(): Task[] {
  return [
    { id: 'a', title: 'Alpha', status: 'todo', sprintId: 's1' },
    { id: 'f', title: 'Foxtrot', status: 'todo', sprintId: 's1' },
    { id: 'b', title: 'Bravo', status: 'doing', sprintId: 's1' },
    { id: 'e', title: 'Echo', status: 'done', sprintId: 's1' },
    { id: 'c', title: 'Charlie', status: 'todo', sprintId: 's2' },
    { id: 'd', title: 'Delta', status: 'todo', sprintId: null },
  ];
}

function backlogTasks(): Task[] {
  return [
    { id: 'a', title: 'Alpha', status: 'todo', sprintId: null },
    { id: 'b', title: 'Bravo', status: 'todo', sprintId: 's1' },
    { id: 'c', title: 'Charlie', status: 'todo', sprintId: undefined },
    { id: 'd', title: 'Delta', status: 'todo', sprintId: '' },
  ];
}

function query<T>(fixture: ComponentFixture<unknown>, selector: string): T | null {
  return fixture.nativeElement.querySelector(selector) as T | null;
}

function queryAll<T>(fixture: ComponentFixture<unknown>, selector: string): T[] {
  return Array.from(fixture.nativeElement.querySelectorAll(selector)) as T[];
}

function cardIds(fixture: ComponentFixture<unknown>): string[] {
  return queryAll<HTMLElement>(fixture, '[data-kanban-task-id]').map(
    (node) => node.getAttribute('data-kanban-task-id') as string
  );
}

function childBoardOf(
  fixture: ComponentFixture<unknown>
): KanbanBoardComponent<Task> {
  const debug = fixture.debugElement.query(
    By.directive(KanbanBoardComponent)
  );
  return debug.componentInstance as KanbanBoardComponent<Task>;
}

function drop(
  board: KanbanBoardComponent<Task>,
  task: Task,
  fromColumn: string,
  toColumn: string,
  previousIndex: number,
  currentIndex: number
): void {
  const instance = board.resolvedInstanceId();
  board.onCardDrop({
    previousDropListId: `${instance}-${fromColumn}-drop`,
    dropListId: `${instance}-${toColumn}-drop`,
    previousIndex,
    currentIndex,
    task,
  });
}

interface BacklogHarness {
  fixture: ComponentFixture<BacklogComponent<Task>>;
  backlog: BacklogComponent<Task>;
  reordered: BacklogReorderEvent<Task>[];
  reorderRejected: BacklogReorderRejectedEvent<Task>[];
  requested: SprintAssignmentRequestedEvent<Task>[];
  rejected: SprintAssignmentRejectedEvent<Task>[];
  selected: { task: Task; column: string }[];
  edits: { task: Task; column: string }[];
  retries: number;
  setInputs(patch: Record<string, unknown>): void;
  card(id: string): HTMLElement | null;
  select(id: string): HTMLSelectElement;
  changeSelect(id: string, value: string): HTMLSelectElement;
  board(): KanbanBoardComponent<Task>;
}

function mountBacklog(
  items: readonly Task[],
  patch: Record<string, unknown> = {},
  platform: 'browser' | 'server' = 'browser'
): BacklogHarness {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [BacklogComponent],
    providers: [{ provide: PLATFORM_ID, useValue: platform }],
  });
  const fixture = TestBed.createComponent(BacklogComponent<Task>);
  const backlog = fixture.componentInstance;
  const harness: BacklogHarness = {
    fixture,
    backlog,
    reordered: [],
    reorderRejected: [],
    requested: [],
    rejected: [],
    selected: [],
    edits: [],
    retries: 0,
    setInputs(next) {
      for (const [name, value] of Object.entries(next)) {
        fixture.componentRef.setInput(name, value);
      }
      fixture.detectChanges();
    },
    card(id) {
      return query<HTMLElement>(
        fixture,
        `[data-kanban-task-id="${id}"]`
      );
    },
    select(id) {
      return query<HTMLSelectElement>(
        fixture,
        `select[data-scrum-assign-task-id="${id}"]`
      ) as HTMLSelectElement;
    },
    changeSelect(id, value) {
      const select = harness.select(id);
      select.value = value;
      select.dispatchEvent(new Event('change', { bubbles: true }));
      fixture.detectChanges();
      return select;
    },
    board() {
      return childBoardOf(fixture);
    },
  };

  backlog.backlogReordered.subscribe((event) => harness.reordered.push(event));
  backlog.backlogReorderRejected.subscribe((event) =>
    harness.reorderRejected.push(event)
  );
  backlog.sprintAssignmentRequested.subscribe((event) =>
    harness.requested.push(event)
  );
  backlog.sprintAssignmentRejected.subscribe((event) =>
    harness.rejected.push(event)
  );
  backlog.taskSelected.subscribe((event) => harness.selected.push(event));
  backlog.taskEditRequested.subscribe((event) => harness.edits.push(event));
  backlog.retryRequested.subscribe(() => (harness.retries += 1));

  fixture.componentRef.setInput('instanceId', 'backlog-verify');
  fixture.componentRef.setInput('config', config());
  fixture.componentRef.setInput('items', items);
  fixture.componentRef.setInput('sprints', SPRINTS);
  for (const [name, value] of Object.entries(patch)) {
    fixture.componentRef.setInput(name, value);
  }
  fixture.detectChanges();
  return harness;
}

interface BoardHarness {
  fixture: ComponentFixture<SprintBoardComponent<Task>>;
  board: SprintBoardComponent<Task>;
  moved: SprintBoardMoveEvent<Task>[];
  reordered: SprintBoardReorderEvent<Task>[];
  selected: SprintBoardSelectionEvent<Task>[];
  edits: SprintBoardSelectionEvent<Task>[];
  rejected: SprintBoardMoveRejectedEvent<Task>[];
  retries: number;
  setInputs(patch: Record<string, unknown>): void;
  child(): KanbanBoardComponent<Task>;
  card(id: string): HTMLElement | null;
}

function mountSprintBoard(
  items: readonly Task[],
  patch: Record<string, unknown> = {},
  platform: 'browser' | 'server' = 'browser'
): BoardHarness {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [SprintBoardComponent],
    providers: [{ provide: PLATFORM_ID, useValue: platform }],
  });
  const fixture = TestBed.createComponent(SprintBoardComponent<Task>);
  const board = fixture.componentInstance;
  const harness: BoardHarness = {
    fixture,
    board,
    moved: [],
    reordered: [],
    selected: [],
    edits: [],
    rejected: [],
    retries: 0,
    setInputs(next) {
      for (const [name, value] of Object.entries(next)) {
        fixture.componentRef.setInput(name, value);
      }
      fixture.detectChanges();
    },
    child() {
      return childBoardOf(fixture);
    },
    card(id) {
      return query<HTMLElement>(
        fixture,
        `[data-kanban-task-id="${id}"]`
      );
    },
  };

  board.taskMoved.subscribe((event) => harness.moved.push(event));
  board.taskReordered.subscribe((event) => harness.reordered.push(event));
  board.taskSelected.subscribe((event) => harness.selected.push(event));
  board.taskEditRequested.subscribe((event) => harness.edits.push(event));
  board.taskMoveRejected.subscribe((event) => harness.rejected.push(event));
  board.retryRequested.subscribe(() => (harness.retries += 1));

  fixture.componentRef.setInput('instanceId', 'sprint-verify');
  fixture.componentRef.setInput('config', config());
  fixture.componentRef.setInput('items', items);
  fixture.componentRef.setInput('sprintId', 's1');
  for (const [name, value] of Object.entries(patch)) {
    fixture.componentRef.setInput(name, value);
  }
  fixture.detectChanges();
  return harness;
}

interface SelectorHarness {
  fixture: ComponentFixture<SprintSelectorComponent>;
  selector: SprintSelectorComponent;
  emitted: SprintSelectionEvent[];
  setInputs(patch: Record<string, unknown>): void;
  select(): HTMLSelectElement;
  change(value: string): SprintSelectionEvent;
}

function mountSelector(
  patch: Record<string, unknown> = {},
  platform: 'browser' | 'server' = 'browser'
): SelectorHarness {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [SprintSelectorComponent],
    providers: [{ provide: PLATFORM_ID, useValue: platform }],
  });
  const fixture = TestBed.createComponent(SprintSelectorComponent);
  const selector = fixture.componentInstance;
  const harness: SelectorHarness = {
    fixture,
    selector,
    emitted: [],
    setInputs(next) {
      for (const [name, value] of Object.entries(next)) {
        fixture.componentRef.setInput(name, value);
      }
      fixture.detectChanges();
    },
    select() {
      return query<HTMLSelectElement>(
        fixture,
        'select.dcf-sprint-selector__select'
      ) as HTMLSelectElement;
    },
    change(value) {
      const select = harness.select();
      select.value = value;
      select.dispatchEvent(new Event('change', { bubbles: true }));
      fixture.detectChanges();
      return harness.emitted.at(-1) as SprintSelectionEvent;
    },
  };
  selector.sprintSelected.subscribe((event) => harness.emitted.push(event));
  fixture.componentRef.setInput('instanceId', 'selector-verify');
  fixture.componentRef.setInput('sprints', SPRINTS);
  for (const [name, value] of Object.entries(patch)) {
    fixture.componentRef.setInput(name, value);
  }
  fixture.detectChanges();
  return harness;
}

@Component({
  standalone: true,
  imports: [BacklogComponent, DecafKanbanCardDirective],
  template: `
    <decaf-scrum-backlog
      [items]="items"
      [config]="config"
      [sprints]="sprints"
      instanceId="custom-backlog"
    >
      <ng-template decafKanbanCard let-task>
        <span class="custom-backlog-card">{{ task.id }}:{{ task.title }}</span>
      </ng-template>
    </decaf-scrum-backlog>
  `,
})
class BacklogHostComponent {
  readonly items = backlogTasks();
  readonly config = config();
  readonly sprints = SPRINTS;
}

@Component({
  standalone: true,
  imports: [SprintBoardComponent, DecafKanbanCardDirective],
  template: `
    <decaf-scrum-sprint-board
      [items]="items"
      [config]="config"
      sprintId="s1"
      instanceId="custom-sprint"
    >
      <ng-template decafKanbanCard let-task>
        <span class="custom-sprint-card">{{ task.id }}:{{ task.title }}</span>
      </ng-template>
    </decaf-scrum-sprint-board>
  `,
})
class SprintBoardHostComponent {
  readonly items = sprintTasks();
  readonly config = config();
}

describe('packed scrum public surface', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('exports the three components, the backlog column id, and the sprint helper', () => {
    expect(typeof BacklogComponent).toBe('function');
    expect(typeof SprintBoardComponent).toBe('function');
    expect(typeof SprintSelectorComponent).toBe('function');
    expect(SCRUM_BACKLOG_COLUMN_ID).toBe('backlog');
    expect(typeof scrumSprintIdOf).toBe('function');
  });

  it('normalizes only empty sprint values to backlog', () => {
    const scrum = config();
    expect(scrumSprintIdOf(scrum, { id: 'x', title: 'X', status: 'todo', sprintId: null })).toBeNull();
    expect(scrumSprintIdOf(scrum, { id: 'x', title: 'X', status: 'todo', sprintId: undefined })).toBeNull();
    expect(scrumSprintIdOf(scrum, { id: 'x', title: 'X', status: 'todo', sprintId: '' })).toBeNull();
    expect(scrumSprintIdOf(scrum, { id: 'x', title: 'X', status: 'todo', sprintId: 's1' })).toBe('s1');
    expect(
      scrumSprintIdOf(scrum, { id: 'x', title: 'X', status: 'todo', sprintId: ' s1 ' })
    ).toBe(' s1 ');
  });

  it('publishes the documented element selectors', () => {
    const selectorsOf = (type: unknown): string[] => {
      const definition = (type as { ɵcmp?: { selectors?: string[][] } }).ɵcmp;
      return (definition?.selectors ?? []).map((entry) => entry[0]);
    };

    expect(selectorsOf(BacklogComponent)).toContain('decaf-scrum-backlog');
    expect(selectorsOf(SprintBoardComponent)).toContain(
      'decaf-scrum-sprint-board'
    );
    expect(selectorsOf(SprintSelectorComponent)).toContain(
      'decaf-sprint-selector'
    );
  });
});

describe('BacklogComponent — composition and rendering', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('renders only backlog items in a single synthetic backlog column', () => {
    const harness = mountBacklog(backlogTasks());
    const board = harness.board();

    expect(board.config().columns).toEqual([
      { id: 'backlog', title: 'Backlog' },
    ]);
    expect(board.config().status(backlogTasks()[0])).toBe('backlog');
    expect(cardIds(harness.fixture)).toEqual(['a', 'c', 'd']);
    expect(harness.card('b')).toBeNull();
    expect(queryAll(harness.fixture, '.dcf-kanban-column')).toHaveLength(1);
    expect(
      query<HTMLElement>(harness.fixture, '[data-column-id="backlog"]')
        ?.getAttribute('data-column-title')
    ).toBe('Backlog');
    expect(
      query<HTMLElement>(harness.fixture, '.dcf-kanban-column__count')
        ?.textContent?.trim()
    ).toBe('3');
  });

  it('forwards every documented input to the composed board', () => {
    const filter = (task: Task): boolean => task.id !== 'd';
    const harness = mountBacklog(backlogTasks(), {
      selectedId: 'a',
      readonly: true,
      disabled: true,
      loading: false,
      error: null,
      filter,
      label: 'Backlog board',
      columnTitle: 'Sprint backlog',
      emptyMessage: 'Nothing queued',
      loadingMessage: 'Fetching backlog',
      errorMessage: 'Backlog failed',
      retryLabel: 'Reload backlog',
      showDragHandles: false,
    });
    const board = harness.board();

    expect(board.selectedId()).toBe('a');
    expect(board.readOnly()).toBe(true);
    expect(board.disabled()).toBe(true);
    expect(board.loading()).toBe(false);
    expect(board.error()).toBeNull();
    expect(board.filter()).toBe(filter);
    expect(board.label()).toBe('Backlog board');
    expect(board.emptyMessage()).toBe('Nothing queued');
    expect(board.loadingMessage()).toBe('Fetching backlog');
    expect(board.errorMessage()).toBe('Backlog failed');
    expect(board.retryLabel()).toBe('Reload backlog');
    expect(board.showDragHandles()).toBe(false);
    expect(board.instanceId()).toBe('backlog-verify');
    expect(board.config().columns[0].title).toBe('Sprint backlog');

    expect(harness.card('d')).toBeNull();
    expect(harness.card('a')).not.toBeNull();
  });

  it('renders the loading state with the forwarded message and no board', () => {
    const harness = mountBacklog(backlogTasks(), {
      loading: true,
      loadingMessage: 'Fetching backlog',
    });
    expect(query(harness.fixture, '.dcf-kanban__board')).toBeNull();
    const status = query<HTMLElement>(
      harness.fixture,
      '.dcf-kanban__state--loading'
    );
    expect(status?.getAttribute('role')).toBe('status');
    expect(status?.textContent).toContain('Fetching backlog');
  });

  it('renders the empty state with the forwarded message', () => {
    const harness = mountBacklog([], { emptyMessage: 'Nothing queued' });
    expect(
      query<HTMLElement>(harness.fixture, '.dcf-kanban-column__empty')
        ?.textContent?.trim()
    ).toBe('Nothing queued');
  });

  it('renders the error state and forwards retryRequested', () => {
    const harness = mountBacklog(backlogTasks(), {
      error: 'Backlog exploded',
      errorMessage: 'Backlog failed',
      retryLabel: 'Reload backlog',
    });
    const alert = query<HTMLElement>(harness.fixture, '[role="alert"]');
    expect(alert?.textContent).toContain('Backlog exploded');
    const retry = alert?.querySelector('button') as HTMLButtonElement;
    expect(retry.textContent?.trim()).toBe('Reload backlog');
    retry.click();
    harness.fixture.detectChanges();
    expect(harness.retries).toBe(1);
  });

  it('hides drag handles when showDragHandles is false', () => {
    const visible = mountBacklog(backlogTasks());
    expect(
      queryAll(visible.fixture, '.dcf-kanban-card__handle').length
    ).toBeGreaterThan(0);

    const hidden = mountBacklog(backlogTasks(), { showDragHandles: false });
    expect(queryAll(hidden.fixture, '.dcf-kanban-card__handle')).toHaveLength(0);
  });

  it('projects a custom card template through [decafKanbanCard]', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ imports: [BacklogHostComponent] });
    const fixture = TestBed.createComponent(BacklogHostComponent);
    fixture.detectChanges();

    expect(
      queryAll<HTMLElement>(fixture, '.custom-backlog-card').map(
        (node) => node.textContent?.trim()
      )
    ).toEqual(['a:Alpha', 'c:Charlie', 'd:Delta']);
    expect(queryAll(fixture, '.dcf-scrum-backlog__title')).toHaveLength(0);
  });
});

describe('BacklogComponent — selection and edit', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('passes selection and edit requests through unchanged', () => {
    const items = backlogTasks();
    const harness = mountBacklog(items, { selectedId: 'a' });
    expect(harness.card('a')?.getAttribute('aria-current')).toBe('true');

    harness.card('a')?.click();
    harness.fixture.detectChanges();
    expect(harness.selected.at(-1)).toMatchObject({
      task: items[0],
      column: 'backlog',
    });

    harness.card('c')?.dispatchEvent(
      new MouseEvent('dblclick', { bubbles: true })
    );
    harness.fixture.detectChanges();
    expect(harness.edits.at(-1)).toMatchObject({
      task: items[2],
      column: 'backlog',
    });
  });

  it('does not turn assignment-select focus, click, or keydown into a card selection', () => {
    const harness = mountBacklog(backlogTasks());
    const select = harness.select('a');

    select.focus();
    select.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    select.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Enter',
        code: 'Enter',
        bubbles: true,
        cancelable: true,
      })
    );
    harness.fixture.detectChanges();

    expect(harness.selected).toHaveLength(0);
    expect(harness.edits).toHaveLength(0);
  });
});

describe('BacklogComponent — ordering', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('emits backlogReordered with task and indices and never mutates the task', () => {
    const items = backlogTasks();
    const snapshot = items.map((task) => ({ ...task }));
    const harness = mountBacklog(items);
    const charlie = items[2];

    drop(harness.board(), charlie, 'backlog', 'backlog', 1, 0);
    harness.fixture.detectChanges();

    expect(harness.reordered).toEqual([
      { task: charlie, previousIndex: 1, currentIndex: 0 },
    ]);
    expect(harness.reorderRejected).toHaveLength(0);
    expect(items).toEqual(snapshot);
  });

  it('forwards the Kanban rejection reason to backlogReorderRejected', () => {
    const items = backlogTasks();
    const harness = mountBacklog(items);

    drop(harness.board(), items[0], 'backlog', 'backlog', 0, 0);
    harness.fixture.detectChanges();

    expect(harness.reordered).toHaveLength(0);
    expect(harness.reorderRejected.at(-1)).toMatchObject({
      task: items[0],
      previousIndex: 0,
      currentIndex: 0,
      reason: 'unchanged',
    });
  });

  it('forwards a readonly rejection reason from the composed board', () => {
    const items = backlogTasks();
    const harness = mountBacklog(items, { readonly: true });

    drop(harness.board(), items[1], 'backlog', 'backlog', 1, 0);
    harness.fixture.detectChanges();

    expect(harness.reordered).toHaveLength(0);
    expect(harness.reorderRejected.at(-1)?.reason).toBe('readonly');
  });
});

describe('BacklogComponent — sprint assignment', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('offers the placeholder and every configured sprint on each backlog card', () => {
    const harness = mountBacklog(backlogTasks());
    const select = harness.select('a');
    expect(Array.from(select.options).map((option) => option.value)).toEqual([
      '',
      's1',
      's2',
    ]);
    expect(Array.from(select.options).map((option) => option.textContent?.trim())).toEqual([
      'Select a sprint',
      'Sprint 1',
      'Sprint 2',
    ]);
    expect(select.value).toBe('');
    expect(harness.select('c').value).toBe('');
  });

  it('emits the assignment request without mutating the task and resets the select', () => {
    const items = backlogTasks();
    const harness = mountBacklog(items);

    const select = harness.changeSelect('a', 's2');

    expect(harness.requested).toEqual([
      { task: items[0], sprintId: 's2', previousSprintId: null },
    ]);
    expect(harness.rejected).toHaveLength(0);
    expect(items[0].sprintId).toBeNull();
    expect(select.value).toBe('');
  });

  it('reports selecting the current sprint as unchanged and still resets the select', () => {
    const harness = mountBacklog(backlogTasks());

    const empty = harness.changeSelect('a', '');
    expect(harness.requested).toHaveLength(0);
    expect(harness.rejected.at(-1)).toMatchObject({
      task: harness.backlog.items()[0],
      sprintId: '',
      previousSprintId: null,
      reason: 'unchanged',
    });
    expect(empty.value).toBe('');
  });

  it('reports an unknown sprint and rejects with the full event payload', () => {
    const items = backlogTasks();
    const harness = mountBacklog(items);

    const select = harness.select('a');
    const option = document.createElement('option');
    option.value = 'missing';
    select.appendChild(option);
    select.value = 'missing';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    harness.fixture.detectChanges();

    expect(harness.requested).toHaveLength(0);
    expect(harness.rejected.at(-1)).toEqual({
      task: items[0],
      sprintId: 'missing',
      previousSprintId: null,
      reason: 'unknown-sprint',
    });
  });

  it('rejects assignment while disabled, readonly, loading, or in error', () => {
    const items = backlogTasks();

    const disabled = mountBacklog(items, { disabled: true });
    expect(disabled.select('a').disabled).toBe(true);
    expect(disabled.changeSelect('a', 's1').value).toBe('');
    expect(disabled.rejected.at(-1)?.reason).toBe('disabled');
    TestBed.resetTestingModule();

    const readonly = mountBacklog(items, { readonly: true });
    expect(readonly.select('a').disabled).toBe(true);
    expect(readonly.changeSelect('a', 's1').value).toBe('');
    expect(readonly.rejected.at(-1)?.reason).toBe('readonly');
    TestBed.resetTestingModule();

    // Loading and error replace the board, so exercise the same public handler
    // with the select a host would have interacted with before the state change.
    const loading = mountBacklog(items, { loading: true });
    const loadingSelect = document.createElement('select');
    loadingSelect.innerHTML = '<option value="s1">Sprint 1</option>';
    loadingSelect.value = 's1';
    loading.backlog.onAssign(items[0], { target: loadingSelect } as unknown as Event);
    expect(loading.rejected.at(-1)?.reason).toBe('loading');
    expect(loadingSelect.value).toBe('');
    TestBed.resetTestingModule();

    const error = mountBacklog(items, { error: 'Boom' });
    const errorSelect = document.createElement('select');
    errorSelect.innerHTML = '<option value="s1">Sprint 1</option>';
    errorSelect.value = 's1';
    error.backlog.onAssign(items[0], { target: errorSelect } as unknown as Event);
    expect(error.rejected.at(-1)?.reason).toBe('error');
    expect(errorSelect.value).toBe('');
  });

  it('reports a non-backlog task current sprint as unchanged', () => {
    const harness = mountBacklog(backlogTasks());
    const sprintTask: Task = {
      id: 'z',
      title: 'Zulu',
      status: 'todo',
      sprintId: 's1',
    };
    const select = document.createElement('select');
    select.innerHTML = '<option value="s1">Sprint 1</option>';
    select.value = 's1';

    harness.backlog.onAssign(sprintTask, { target: select } as unknown as Event);

    expect(harness.requested).toHaveLength(0);
    expect(harness.rejected.at(-1)).toEqual({
      task: sprintTask,
      sprintId: 's1',
      previousSprintId: 's1',
      reason: 'unchanged',
    });
    expect(select.value).toBe('s1');
  });
});

describe('SprintBoardComponent — scoping and event contract', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('scopes cards to config.sprint(item) === sprintId and exposes data-sprint-id', () => {
    const harness = mountSprintBoard(sprintTasks());

    expect(
      harness.fixture.nativeElement.getAttribute('data-sprint-id')
    ).toBe('s1');
    expect(cardIds(harness.fixture)).toEqual(['a', 'f', 'b', 'e']);
    expect(harness.card('c')).toBeNull();
    expect(harness.card('d')).toBeNull();

    expect(
      queryAll<HTMLElement>(harness.fixture, '.dcf-kanban-column')
        .map((node) => node.getAttribute('data-column-id'))
    ).toEqual(['todo', 'doing', 'done']);
    expect(
      queryAll<HTMLElement>(harness.fixture, '.dcf-kanban-column__count')
        .map((node) => node.textContent?.replace(/\s+/g, ' ').trim())
    ).toEqual(['2', '1', '1']);
  });

  it('carries the bound sprintId on selection and edit events', () => {
    const items = sprintTasks();
    const harness = mountSprintBoard(items, { selectedId: 'a' });
    expect(harness.card('a')?.getAttribute('aria-current')).toBe('true');

    harness.card('a')?.click();
    harness.fixture.detectChanges();
    expect(harness.selected.at(-1)).toMatchObject({
      task: items[0],
      column: 'todo',
      sprintId: 's1',
    });

    harness.card('f')?.dispatchEvent(
      new MouseEvent('dblclick', { bubbles: true })
    );
    harness.fixture.detectChanges();
    expect(harness.edits.at(-1)).toMatchObject({
      task: items[1],
      column: 'todo',
      sprintId: 's1',
    });
  });

  it('carries the bound sprintId on move and reorder events', () => {
    const items = sprintTasks();
    const harness = mountSprintBoard(items);

    drop(harness.child(), items[0], 'todo', 'doing', 0, 0);
    harness.fixture.detectChanges();
    expect(harness.moved.at(-1)).toMatchObject({
      task: items[0],
      fromColumn: 'todo',
      toColumn: 'doing',
      sprintId: 's1',
    });

    drop(harness.child(), items[1], 'todo', 'todo', 1, 0);
    harness.fixture.detectChanges();
    expect(harness.reordered.at(-1)).toMatchObject({
      task: items[1],
      column: 'todo',
      previousIndex: 1,
      currentIndex: 0,
      sprintId: 's1',
    });
  });

  it('carries the bound sprintId on move rejections', () => {
    const items = sprintTasks();
    const harness = mountSprintBoard(items);

    drop(harness.child(), items[0], 'todo', 'todo', 0, 0);
    harness.fixture.detectChanges();

    expect(harness.moved).toHaveLength(0);
    expect(harness.rejected.at(-1)).toMatchObject({
      task: items[0],
      fromColumn: 'todo',
      toColumn: 'todo',
      reason: 'unchanged',
      sprintId: 's1',
    });
  });
});

describe('SprintBoardComponent — input forwarding', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('forwards every documented input to the composed board', () => {
    const filter = (task: Task): boolean => task.id !== 'e';
    const harness = mountSprintBoard(sprintTasks(), {
      selectedId: 'f',
      readonly: true,
      disabled: true,
      error: null,
      filter,
      label: 'Sprint one',
      emptyMessage: 'No sprint tasks',
      loadingMessage: 'Fetching sprint',
      errorMessage: 'Sprint failed',
      retryLabel: 'Reload sprint',
      showDragHandles: false,
    });
    const board = harness.child();

    expect(board.selectedId()).toBe('f');
    expect(board.readOnly()).toBe(true);
    expect(board.disabled()).toBe(true);
    expect(board.loading()).toBe(false);
    expect(board.error()).toBeNull();
    expect(board.filter()).toBe(filter);
    expect(board.label()).toBe('Sprint one');
    expect(board.emptyMessage()).toBe('No sprint tasks');
    expect(board.loadingMessage()).toBe('Fetching sprint');
    expect(board.errorMessage()).toBe('Sprint failed');
    expect(board.retryLabel()).toBe('Reload sprint');
    expect(board.showDragHandles()).toBe(false);
    expect(board.instanceId()).toBe('sprint-verify');
    expect(board.config()).toBe(harness.board.config());
    expect(board.config().columns).toBe(COLUMNS);
    expect(board.config().status(sprintTasks()[2])).toBe('doing');

    expect(harness.card('e')).toBeNull();
    expect(harness.card('a')).not.toBeNull();
  });

  it('renders loading, empty, and error states from the forwarded messages', () => {
    const loading = mountSprintBoard(sprintTasks(), {
      loading: true,
      loadingMessage: 'Fetching sprint',
    });
    expect(query(loading.fixture, '.dcf-kanban__board')).toBeNull();
    expect(
      query<HTMLElement>(loading.fixture, '.dcf-kanban__state--loading')
        ?.textContent
    ).toContain('Fetching sprint');
    TestBed.resetTestingModule();

    const empty = mountSprintBoard([], { emptyMessage: 'No sprint tasks' });
    expect(
      query<HTMLElement>(empty.fixture, '.dcf-kanban-column__empty')
        ?.textContent?.trim()
    ).toBe('No sprint tasks');
    TestBed.resetTestingModule();

    const error = mountSprintBoard(sprintTasks(), {
      error: 'Sprint exploded',
      retryLabel: 'Reload sprint',
    });
    const alert = query<HTMLElement>(error.fixture, '[role="alert"]');
    expect(alert?.textContent).toContain('Sprint exploded');
    (alert?.querySelector('button') as HTMLButtonElement).click();
    error.fixture.detectChanges();
    expect(error.retries).toBe(1);
  });

  it('projects a custom card template through [decafKanbanCard]', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ imports: [SprintBoardHostComponent] });
    const fixture = TestBed.createComponent(SprintBoardHostComponent);
    fixture.detectChanges();

    expect(
      queryAll<HTMLElement>(fixture, '.custom-sprint-card').map((node) =>
        node.textContent?.trim()
      )
    ).toEqual(['a:Alpha', 'f:Foxtrot', 'b:Bravo', 'e:Echo']);
    expect(queryAll(fixture, '.dcf-scrum-sprint-board__title')).toHaveLength(0);
  });
});

describe('SprintSelectorComponent', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('renders the placeholder and every sprint option', () => {
    const harness = mountSelector({ selectedSprintId: 's1' });
    const select = harness.select();

    expect(Array.from(select.options).map((option) => option.value)).toEqual([
      '',
      's1',
      's2',
    ]);
    expect(
      Array.from(select.options).map((option) => option.textContent?.trim())
    ).toEqual(['Select a sprint', 'Sprint 1', 'Sprint 2']);
    expect(select.options[0].selected).toBe(false);
    expect(select.options[1].selected).toBe(true);
  });

  it('reflects the controlled selectedSprintId on first render', () => {
    const harness = mountSelector({ selectedSprintId: 's1' });
    expect(harness.select().value).toBe('s1');
    expect(harness.select().selectedOptions[0]?.textContent?.trim()).toBe(
      'Sprint 1'
    );
  });

  it('emits the selected id and lets selectedSprintId win (controlled)', () => {
    const harness = mountSelector({ selectedSprintId: 's1' });
    const select = harness.select();

    select.value = 's2';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    harness.fixture.detectChanges();

    expect(harness.emitted.at(-1)).toEqual({ sprintId: 's2' });
    expect(select.value).toBe('s1');

    select.value = 's2';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    harness.fixture.detectChanges();
    expect(harness.emitted.at(-1)).toEqual({ sprintId: 's2' });
    expect(select.value).toBe('s1');
  });

  it('emits null when the empty option is selected', () => {
    const harness = mountSelector({ selectedSprintId: 's2' });
    const select = harness.select();

    select.value = '';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    harness.fixture.detectChanges();

    expect(harness.emitted.at(-1)).toEqual({ sprintId: null });
    expect(select.value).toBe('s2');
  });

  it('is disabled while disabled or loading', () => {
    const disabled = mountSelector({ disabled: true });
    expect(disabled.select().disabled).toBe(true);
    TestBed.resetTestingModule();

    const loading = mountSelector({ loading: true });
    expect(loading.select().disabled).toBe(true);
    expect(loading.select().getAttribute('aria-busy')).toBe('true');
    TestBed.resetTestingModule();

    const enabled = mountSelector({ disabled: false, loading: false });
    expect(enabled.select().disabled).toBe(false);
    expect(enabled.select().getAttribute('aria-busy')).toBe('false');
  });

  it('wires the label and status descriptions', () => {
    const harness = mountSelector({ label: 'Choose sprint' });
    const select = harness.select();
    const label = query<HTMLLabelElement>(
      harness.fixture,
      '.dcf-sprint-selector__label'
    );

    expect(label?.textContent?.trim()).toBe('Choose sprint');
    expect(label?.getAttribute('for')).toBe(select.id);
    expect(select.id).toBe('selector-verify-select');
    expect(select.hasAttribute('aria-describedby')).toBe(false);
    expect(
      query<HTMLElement>(harness.fixture, '.dcf-sprint-selector__status')
    ).toBeNull();
  });

  it('describes the select with the loading status', () => {
    const harness = mountSelector({ loading: true });
    const status = query<HTMLElement>(
      harness.fixture,
      '.dcf-sprint-selector__status'
    );

    expect(status?.getAttribute('role')).toBe('status');
    expect(status?.textContent?.trim()).toBe('Loading sprints...');
    expect(harness.select().getAttribute('aria-describedby')).toBe(status?.id);
  });

  it('describes the select with the empty-sprints status', () => {
    const harness = mountSelector({ sprints: [] });
    const status = query<HTMLElement>(
      harness.fixture,
      '.dcf-sprint-selector__status'
    );

    expect(status?.getAttribute('role')).toBe('status');
    expect(status?.textContent?.trim()).toBe('No sprints available.');
    expect(harness.select().getAttribute('aria-describedby')).toBe(status?.id);
    expect(harness.select().options).toHaveLength(1);
  });
});

describe('packed scrum — server rendering (SSR)', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('renders the backlog board and its synthetic column on the server platform', () => {
    const harness = mountBacklog(backlogTasks(), {}, 'server');
    const root = harness.fixture.nativeElement.querySelector(
      '.dcf-kanban'
    ) as HTMLElement;

    expect(root).not.toBeNull();
    expect(root.getAttribute('role')).toBe('region');
    expect(
      harness.fixture.nativeElement.querySelectorAll('.dcf-kanban-column')
    ).toHaveLength(1);
    expect(
      (harness.fixture.nativeElement.querySelector(
        '.dcf-kanban-column__title'
      ) as HTMLElement).textContent?.trim()
    ).toBe('Backlog');
    expect(
      Array.from(
        harness.fixture.nativeElement.querySelectorAll(
          '.dcf-scrum-backlog__card'
        ) as NodeListOf<Element>
      ).map((node) => node.getAttribute('data-scrum-backlog-task-id'))
    ).toEqual(['a', 'c', 'd']);
  });

  it('renders the sprint board structure and scoped cards on the server platform', () => {
    const harness = mountSprintBoard(sprintTasks(), {}, 'server');
    const root = harness.fixture.nativeElement.querySelector(
      '.dcf-kanban'
    ) as HTMLElement;

    expect(root).not.toBeNull();
    expect(
      harness.fixture.nativeElement.querySelectorAll('.dcf-kanban-column')
    ).toHaveLength(3);
    expect(
      Array.from(
        harness.fixture.nativeElement.querySelectorAll(
          '[data-kanban-task-id]'
        ) as NodeListOf<Element>
      ).map((node) => node.getAttribute('data-kanban-task-id'))
    ).toEqual(['a', 'f', 'b', 'e']);
    expect(
      harness.fixture.nativeElement.querySelectorAll(
        '.dcf-scrum-sprint-board__title'
      )
    ).toHaveLength(4);
  });

  it('renders the sprint selector options on the server platform', () => {
    const harness = mountSelector({}, 'server');
    const options = Array.from(
      harness.fixture.nativeElement.querySelectorAll(
        'option'
      ) as NodeListOf<HTMLOptionElement>
    ).map((option) => option.textContent?.trim());

    expect(harness.select().getAttribute('aria-busy')).toBe('false');
    expect(options).toEqual(['Select a sprint', 'Sprint 1', 'Sprint 2']);
  });
});
