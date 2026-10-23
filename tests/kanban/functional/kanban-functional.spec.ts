/**
 * SAA-1034 §2 — functional verification of the packed `/kanban` entry point.
 * The module under test is resolved to the extracted `npm pack` artifact (see
 * `tests/kanban/jest.config.cjs`), never the monorepo path aliases.
 */
import { PLATFORM_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  KanbanBoardComponent,
  type KanbanColumnConfig,
  type KanbanConfig,
  type KanbanSelectionEvent,
  type TaskMoveEvent,
  type TaskMoveRejectedEvent,
  type TaskReorderEvent,
} from '@decaf-ts/for-angular/kanban';

interface Task {
  id: string;
  title: string;
  status: string;
}

const COLUMNS: KanbanColumnConfig[] = [
  { id: 'todo', title: 'To do', wipLimit: 5 },
  { id: 'doing', title: 'In progress', wipLimit: 2 },
  { id: 'done', title: 'Done' },
];

const CONFIG: KanbanConfig<Task> = {
  id: (task) => task.id,
  title: (task) => task.title,
  status: (task) => task.status,
  columns: COLUMNS,
};

function tasks(): Task[] {
  return [
    { id: 'a', title: 'Alpha', status: 'todo' },
    { id: 'b', title: 'Bravo', status: 'todo' },
    { id: 'c', title: 'Charlie', status: 'todo' },
    { id: 'd', title: 'Delta', status: 'doing' },
    { id: 'e', title: 'Echo', status: 'doing' },
  ];
}

interface Harness {
  fixture: ComponentFixture<KanbanBoardComponent<Task>>;
  board: KanbanBoardComponent<Task>;
  moved: TaskMoveEvent<Task>[];
  reordered: TaskReorderEvent<Task>[];
  selected: KanbanSelectionEvent<Task>[];
  edits: KanbanSelectionEvent<Task>[];
  rejected: TaskMoveRejectedEvent<Task>[];
  retries: number;
  setInputs(patch: Record<string, unknown>): void;
  drop(
    task: Task,
    fromColumn: string,
    toColumn: string,
    previousIndex: number,
    currentIndex: number
  ): void;
  key(
    task: Task,
    column: string,
    index: number,
    key: string,
    code: string
  ): void;
}

function mount(
  items: readonly Task[],
  patch: Record<string, unknown> = {},
  platform: 'browser' | 'server' = 'browser'
): Harness {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [KanbanBoardComponent],
    providers: [{ provide: PLATFORM_ID, useValue: platform }],
  });
  const fixture = TestBed.createComponent(KanbanBoardComponent<Task>);
  const board = fixture.componentInstance;
  const harness: Harness = {
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
    drop(task, fromColumn, toColumn, previousIndex, currentIndex) {
      board.onCardDrop({
        previousDropListId: `${board.resolvedInstanceId()}-${fromColumn}-drop`,
        dropListId: `${board.resolvedInstanceId()}-${toColumn}-drop`,
        previousIndex,
        currentIndex,
        task,
      });
      fixture.detectChanges();
    },
    key(task, column, index, key, code) {
      const event = {
        key,
        code,
        preventDefault: jest.fn(),
      } as unknown as KeyboardEvent;
      board.onCardKeydown({ event, task, column, index });
      fixture.detectChanges();
    },
  };
  board.taskMoved.subscribe((event) => harness.moved.push(event));
  board.taskReordered.subscribe((event) => harness.reordered.push(event));
  board.taskSelected.subscribe((event) => harness.selected.push(event));
  board.taskEditRequested.subscribe((event) => harness.edits.push(event));
  board.taskMoveRejected.subscribe((event) => harness.rejected.push(event));
  board.retryRequested.subscribe(() => (harness.retries += 1));
  fixture.componentRef.setInput('instanceId', 'verify');
  fixture.componentRef.setInput('config', CONFIG);
  fixture.componentRef.setInput('items', items);
  for (const [name, value] of Object.entries(patch)) {
    fixture.componentRef.setInput(name, value);
  }
  fixture.detectChanges();
  return harness;
}

function card(fixture: ComponentFixture<unknown>, id: string): HTMLElement | null {
  return fixture.nativeElement.querySelector(`[data-kanban-task-id="${id}"]`);
}

describe('packed kanban functional contract', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('renders configurable columns with titles and WIP counts', () => {
    const { fixture } = mount(tasks());
    const titles = Array.from(
      fixture.nativeElement.querySelectorAll('.dcf-kanban-column__title')
    ).map((node) => (node as HTMLElement).textContent?.trim());
    const counts = Array.from(
      fixture.nativeElement.querySelectorAll('.dcf-kanban-column__count')
    ).map((node) => (node as HTMLElement).textContent?.replace(/\s+/g, ' ').trim());
    expect(titles).toEqual(['To do', 'In progress', 'Done']);
    expect(counts).toEqual(['3 / 5', '2 / 2', '0']);
    expect(fixture.nativeElement.querySelectorAll('[data-kanban-task-id]')).toHaveLength(5);
  });

  it('keeps card DOM identity across moves through the stable id trackBy', () => {
    const initial = tasks();
    const { fixture, board } = mount(initial);
    const alphaBefore = card(fixture, 'a');
    const deltaBefore = card(fixture, 'd');
    expect(alphaBefore).toBeTruthy();

    const reordered = [
      initial[1],
      initial[0],
      initial[2],
      initial[3],
      initial[4],
    ];
    board.onCardDrop({
      previousDropListId: 'verify-todo-drop',
      dropListId: 'verify-todo-drop',
      previousIndex: 1,
      currentIndex: 0,
      task: initial[1],
    });
    fixture.componentRef.setInput('items', reordered);
    fixture.detectChanges();
    expect(card(fixture, 'a')).toBe(alphaBefore);
    expect(card(fixture, 'd')).toBe(deltaBefore);

    board.onCardDrop({
      previousDropListId: 'verify-doing-drop',
      dropListId: 'verify-todo-drop',
      previousIndex: 0,
      currentIndex: 0,
      task: initial[3],
    });
    fixture.componentRef.setInput('items', [
      initial[3],
      initial[1],
      initial[0],
      initial[2],
      initial[4],
    ]);
    fixture.detectChanges();
    expect(card(fixture, 'a')).toBe(alphaBefore);
    expect(card(fixture, 'd')).toBe(deltaBefore);
  });

  it('emits same-column reorder with full-column indices and does not mutate the input', () => {
    const input = tasks().slice(0, 3);
    const snapshot = input.slice();
    const { moved, reordered, drop } = mount(input);
    drop(input[2], 'todo', 'todo', 2, 0);

    expect(reordered).toHaveLength(1);
    expect(moved).toHaveLength(0);
    expect(reordered[0]).toMatchObject({
      task: input[2],
      column: 'todo',
      previousIndex: 2,
      currentIndex: 0,
    });
    expect(input).toEqual(snapshot);
    expect(input.map((task) => task.id)).toEqual(['a', 'b', 'c']);
    expect(input).toHaveLength(3);
  });

  it('emits cross-column move with from/to columns and full-order indices', () => {
    const input = tasks();
    const { moved, reordered, drop } = mount(input);
    drop(input[3], 'doing', 'todo', 0, 1);

    expect(moved).toHaveLength(1);
    expect(reordered).toHaveLength(0);
    expect(moved[0]).toMatchObject({
      task: input[3],
      fromColumn: 'doing',
      toColumn: 'todo',
      previousIndex: 0,
      currentIndex: 1,
    });
    expect(input.map((task) => task.id)).toEqual(['a', 'b', 'c', 'd', 'e']);
  });

  it('rejects a cross-column move into a full WIP-limited column without a move event', () => {
    const input = tasks();
    const { moved, reordered, rejected, drop } = mount(input);
    drop(input[0], 'todo', 'doing', 0, 0);

    expect(moved).toHaveLength(0);
    expect(reordered).toHaveLength(0);
    expect(rejected).toHaveLength(1);
    expect(rejected[0]).toMatchObject({
      task: input[0],
      fromColumn: 'todo',
      toColumn: 'doing',
      reason: 'wip-limit',
      wipLimit: 2,
    });
  });

  it('rejects invalid, cancelled, and unchanged moves', () => {
    const input = tasks();
    const harness = mount(input);

    harness.drop(input[2], 'todo', 'todo', 0, 1);
    expect(harness.rejected.at(-1)?.reason).toBe('invalid-index');
    expect(harness.moved).toHaveLength(0);
    expect(harness.reordered).toHaveLength(0);

    harness.key(input[0], 'todo', 0, ' ', 'Space');
    expect(harness.board.grabbedId()).toBe('a');
    expect(harness.board.announcement()).toContain('picked up');
    harness.key(input[0], 'todo', 0, 'Escape', 'Escape');
    expect(harness.rejected.at(-1)?.reason).toBe('cancelled');
    expect(harness.board.grabbedId()).toBeNull();

    harness.drop(input[1], 'todo', 'todo', 1, 1);
    expect(harness.rejected.at(-1)?.reason).toBe('unchanged');
    expect(harness.reordered).toHaveLength(0);
  });

  it('renders per-column and whole-board empty states', () => {
    const emptyColumns: KanbanColumnConfig[] = [
      { id: 'todo', title: 'To do' },
      { id: 'doing', title: 'In progress' },
    ];
    const emptyConfig: KanbanConfig<Task> = { ...CONFIG, columns: emptyColumns };
    const { fixture } = mount([], { config: emptyConfig, emptyMessage: 'Nothing here' });
    const perColumn = fixture.nativeElement.querySelectorAll('.dcf-kanban-column__empty');
    expect(perColumn).toHaveLength(2);
    expect(perColumn[0].textContent?.trim()).toBe('Nothing here');

    const boardEmpty = mount([], {
      config: { ...CONFIG, columns: [] },
      emptyMessage: 'No board tasks',
    });
    const state = boardEmpty.fixture.nativeElement.querySelector('.dcf-kanban__state--empty');
    expect(state?.textContent?.trim()).toBe('No board tasks');
  });

  it('blocks pointer and keyboard moves while read-only', () => {
    const input = tasks();
    const harness = mount(input, { readonly: true });
    expect(harness.fixture.nativeElement.querySelectorAll('.dcf-kanban-card__handle')).toHaveLength(0);

    harness.drop(input[0], 'todo', 'todo', 0, 1);
    expect(harness.moved).toHaveLength(0);
    expect(harness.reordered).toHaveLength(0);
    expect(harness.rejected.at(-1)?.reason).toBe('readonly');

    harness.key(input[0], 'todo', 0, ' ', 'Space');
    expect(harness.rejected.at(-1)?.reason).toBe('readonly');
    expect(harness.board.grabbedId()).toBeNull();
  });

  it('blocks pointer and keyboard moves while disabled and reports reason "disabled"', () => {
    const input = tasks();
    const harness = mount(input, { disabled: true });
    harness.drop(input[0], 'todo', 'todo', 0, 1);
    expect(harness.moved).toHaveLength(0);
    expect(harness.reordered).toHaveLength(0);
    expect(harness.rejected).toHaveLength(1);
    expect(harness.rejected[0]?.reason).toBe('disabled');

    harness.key(input[0], 'todo', 0, ' ', 'Space');
    expect(harness.rejected).toHaveLength(2);
    expect(harness.rejected.at(-1)?.reason).toBe('disabled');
    expect(harness.board.grabbedId()).toBeNull();
  });

  it('exposes aria-current on the selected card only, without aria-selected', () => {
    const input = tasks();
    const { fixture } = mount(input, { selectedId: 'b' });
    const alpha = card(fixture, 'a')!;
    const bravo = card(fixture, 'b')!;

    expect(bravo.getAttribute('aria-current')).toBe('true');
    expect(bravo.hasAttribute('aria-selected')).toBe(false);
    expect(bravo.getAttribute('aria-label')).toContain(', selected');
    expect(alpha.hasAttribute('aria-current')).toBe(false);
    expect(alpha.hasAttribute('aria-selected')).toBe(false);
    expect(alpha.getAttribute('aria-label')).not.toContain(', selected');
    expect(alpha.getAttribute('role')).toBe('listitem');
  });

  it('uses role="list" only for populated drop zones and role="group" when empty', () => {
    const { fixture } = mount(tasks());
    const zone = (columnId: string): HTMLElement =>
      fixture.nativeElement.querySelector(
        `[data-column-id="${columnId}"] .dcf-kanban-column__dropzone`
      )!;

    expect(zone('todo').getAttribute('role')).toBe('list');
    expect(zone('doing').getAttribute('role')).toBe('list');
    expect(zone('done').getAttribute('role')).toBe('group');
    expect(zone('done').querySelector('.dcf-kanban-column__empty')).toBeTruthy();
    expect(zone('done').querySelector('[role="listitem"]')).toBeNull();
  });

  it('makes only an empty board a labelled, focusable group', () => {
    const populated = mount(tasks());
    const populatedBoard = populated.fixture.nativeElement.querySelector(
      '.dcf-kanban__board'
    ) as HTMLElement;
    expect(populatedBoard.hasAttribute('role')).toBe(false);
    expect(populatedBoard.hasAttribute('tabindex')).toBe(false);
    expect(populatedBoard.hasAttribute('aria-label')).toBe(false);

    const empty = mount([], { label: 'Empty board' });
    const emptyBoard = empty.fixture.nativeElement.querySelector(
      '.dcf-kanban__board'
    ) as HTMLElement;
    expect(emptyBoard.getAttribute('role')).toBe('group');
    expect(emptyBoard.getAttribute('tabindex')).toBe('0');
    expect(emptyBoard.getAttribute('aria-label')).toBe('Empty board');
  });

  it('renders default column titles as level-2 headings with matching labels', () => {
    const { fixture } = mount(tasks());
    const headings = Array.from(
      fixture.nativeElement.querySelectorAll('.dcf-kanban-column__title')
    ) as HTMLElement[];
    expect(headings).toHaveLength(3);
    for (const heading of headings) {
      expect(heading.tagName).toBe('H2');
    }
    expect(fixture.nativeElement.querySelectorAll('.dcf-kanban h3')).toHaveLength(0);

    const section = fixture.nativeElement.querySelector(
      '[data-column-id="todo"]'
    ) as HTMLElement;
    expect(section.getAttribute('aria-labelledby')).toBe(headings[0].id);
    expect(headings[0].textContent?.trim()).toBe('To do');
  });

  it('emits selection and edit requests from pointer and keyboard, and suppresses edits while read-only', () => {
    const input = tasks();
    const harness = mount(input);
    const alpha = card(harness.fixture, 'a')!;

    alpha.click();
    expect(harness.selected.at(-1)).toMatchObject({ task: input[0], column: 'todo' });

    alpha.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    expect(harness.edits.at(-1)).toMatchObject({ task: input[0], column: 'todo' });

    harness.key(input[0], 'todo', 0, 'e', 'KeyE');
    expect(harness.edits.at(-1)).toMatchObject({ task: input[0] });
    harness.key(input[0], 'todo', 0, 'F2', 'F2');
    expect(harness.edits.at(-1)).toMatchObject({ task: input[0] });

    const readOnly = mount(input, { readonly: true });
    const readOnlyCard = card(readOnly.fixture, 'a')!;
    const editCount = readOnly.edits.length;
    readOnlyCard.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    readOnly.key(input[0], 'todo', 0, 'e', 'KeyE');
    expect(readOnly.edits).toHaveLength(editCount);
    readOnlyCard.click();
    expect(readOnly.selected.at(-1)).toMatchObject({ task: input[0] });

    const disabled = mount(input, { disabled: true });
    const disabledCard = card(disabled.fixture, 'a')!;
    disabledCard.click();
    disabledCard.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    disabled.key(input[0], 'todo', 0, 'F2', 'F2');
    expect(disabled.selected).toHaveLength(0);
    expect(disabled.edits).toHaveLength(0);
  });

  it('keeps view-only selection on readonly boards while disabled boards suppress it', () => {
    const input = tasks();
    const readOnly = mount(input, { readonly: true });
    readOnly.key(input[0], 'todo', 0, 'Enter', 'Enter');
    expect(readOnly.selected.at(-1)).toMatchObject({ task: input[0], column: 'todo' });
    readOnly.drop(input[0], 'todo', 'todo', 0, 1);
    expect(readOnly.rejected.at(-1)?.reason).toBe('readonly');
    expect(readOnly.moved).toHaveLength(0);
    expect(readOnly.reordered).toHaveLength(0);

    const disabled = mount(input, { disabled: true });
    disabled.key(input[0], 'todo', 0, 'Enter', 'Enter');
    expect(disabled.selected).toHaveLength(0);
    disabled.drop(input[0], 'todo', 'todo', 0, 1);
    expect(disabled.rejected.at(-1)?.reason).toBe('disabled');
    expect(disabled.moved).toHaveLength(0);
    expect(disabled.reordered).toHaveLength(0);
  });

  it('hides filtered cards but reports full-column-order indices', () => {
    const input = tasks();
    const harness = mount(input, {
      filter: (task: Task) => task.id !== 'b' && task.id !== 'd',
    });
    expect(card(harness.fixture, 'a')).toBeTruthy();
    expect(card(harness.fixture, 'b')).toBeNull();
    expect(card(harness.fixture, 'c')).toBeTruthy();
    expect(card(harness.fixture, 'd')).toBeNull();

    harness.drop(input[2], 'todo', 'todo', 1, 0);
    expect(harness.reordered).toHaveLength(1);
    expect(harness.reordered[0]).toMatchObject({
      task: input[2],
      column: 'todo',
      previousIndex: 2,
      currentIndex: 0,
    });

    harness.drop(input[2], 'todo', 'done', 1, 0);
    expect(harness.moved).toHaveLength(1);
    expect(harness.moved[0]).toMatchObject({
      fromColumn: 'todo',
      toColumn: 'done',
      previousIndex: 2,
      currentIndex: 0,
    });
  });

  it('renders loading, error, and retry states', () => {
    const loading = mount(tasks(), { loading: true });
    const status = loading.fixture.nativeElement.querySelector('[role="status"]:not(.dcf-kanban__live)');
    expect(status?.textContent).toContain('Loading tasks...');
    expect(loading.fixture.nativeElement.querySelector('.dcf-kanban__board')).toBeNull();

    const error = mount(tasks(), { error: 'Boom', retryLabel: 'Try again' });
    const alert = error.fixture.nativeElement.querySelector('[role="alert"]');
    expect(alert?.textContent).toContain('Boom');
    const retry = alert?.querySelector('button') as HTMLButtonElement;
    expect(retry.textContent?.trim()).toBe('Try again');
    retry.click();
    expect(error.retries).toBe(1);
    expect(error.fixture.nativeElement.querySelector('.dcf-kanban__board')).toBeNull();
  });
});

describe('packed kanban — server rendering (SSR)', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('renders the static column/card structure on the server platform', () => {
    const harness = mount(tasks(), {}, 'server');
    const root = harness.fixture.nativeElement.querySelector(
      '.dcf-kanban'
    ) as HTMLElement;

    expect(root).not.toBeNull();
    expect(root.getAttribute('role')).toBe('region');
    expect(root.getAttribute('aria-label')).toBe('Kanban board');
    expect(root.querySelectorAll('.dcf-kanban-column')).toHaveLength(3);
    expect(
      Array.from(
        harness.fixture.nativeElement.querySelectorAll(
          '[data-kanban-task-id]'
        ) as NodeListOf<Element>
      ).map((node) => node.getAttribute('data-kanban-task-id'))
    ).toEqual(['a', 'b', 'c', 'd', 'e']);
    expect(harness.fixture.nativeElement.querySelectorAll('.dcf-kanban__help')).toHaveLength(1);
  });

  it('renders the empty board state without a browser platform', () => {
    const harness = mount([], { label: 'Empty SSR board' }, 'server');
    const board = harness.fixture.nativeElement.querySelector(
      '.dcf-kanban__board'
    ) as HTMLElement;

    expect(board.getAttribute('role')).toBe('group');
    expect(board.getAttribute('aria-label')).toBe('Empty SSR board');
  });
});
