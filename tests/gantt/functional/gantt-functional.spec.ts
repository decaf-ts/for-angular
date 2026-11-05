/**
 * SAA-1045 — functional Jest verification of the packed `/gantt` entry point.
 * The module under test resolves to the extracted `npm pack` artifact (see
 * `tests/gantt/jest.config.cjs`), never the monorepo path aliases.
 */
import { PLATFORM_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  GanttComponent,
  type GanttConfig,
  type GanttTaskDateChangeRejectedEvent,
  type GanttModelIssue,
  type GanttTaskProgressChangeRejectedEvent,
  type GanttTaskDateChangeEvent,
  type GanttTaskProgressChangeEvent,
  type GanttTaskSelectionEvent,
} from '@decaf-ts/for-angular/gantt';

interface Task {
  id: string;
  title: string;
  start: string;
  end: string;
  progress: number;
  parentId?: string;
  dependencies?: string[];
  milestone?: boolean;
  locked?: boolean;
}

function config(): GanttConfig<Task> {
  return {
    id: (task) => task.id,
    title: (task) => task.title,
    start: (task) => task.start,
    end: (task) => task.end,
    progress: (task) => task.progress,
    parent: (task) => task.parentId,
    dependencies: (task) => task.dependencies,
    milestone: (task) => Boolean(task.milestone),
    editable: (task) => !task.locked,
    tooltip: (task) => `${task.title} tooltip`,
  };
}

function tasks(): Task[] {
  return [
    {
      id: 'a',
      title: 'Alpha',
      start: '2026-10-01',
      end: '2026-10-03',
      progress: 0.2,
    },
    {
      id: 'b',
      title: 'Bravo',
      start: '2026-10-05',
      end: '2026-10-08',
      progress: 0.4,
      parentId: 'a',
      dependencies: ['a'],
    },
    {
      id: 'm',
      title: 'Milestone',
      start: '2026-10-10',
      end: '2026-10-10',
      progress: 0,
      milestone: true,
    },
  ];
}

interface Harness {
  fixture: ComponentFixture<GanttComponent<Task>>;
  gantt: GanttComponent<Task>;
  selected: GanttTaskSelectionEvent<Task>[];
  edits: GanttTaskSelectionEvent<Task>[];
  dateChanged: GanttTaskDateChangeEvent<Task>[];
  dateRejected: GanttTaskDateChangeRejectedEvent<Task>[];
  progressChanged: GanttTaskProgressChangeEvent<Task>[];
  progressRejected: GanttTaskProgressChangeRejectedEvent<Task>[];
  issues: GanttModelIssue[][];
  retries: number;
  element: HTMLElement;
  setInputs(patch: Record<string, unknown>): void;
  render(): void;
  bar(taskId: string): HTMLElement | null;
  injectBar(taskId: string): HTMLElement;
  key(taskId: string, key: string, init?: KeyboardEventInit): KeyboardEvent;
  date(
    taskId: string,
    start: string | null,
    end: string | null,
    mode?: 'move' | 'resize'
  ): boolean;
  progress(taskId: string, value: number): boolean;
}

function mount(
  items: readonly Task[],
  patch: Record<string, unknown> = {},
  platform: 'browser' | 'server' = 'browser'
): Harness {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [GanttComponent],
    providers: [{ provide: PLATFORM_ID, useValue: platform }],
  });
  const fixture = TestBed.createComponent(GanttComponent<Task>);
  const gantt = fixture.componentInstance;
  const harness: Harness = {
    fixture,
    gantt,
    selected: [],
    edits: [],
    dateChanged: [],
    dateRejected: [],
    progressChanged: [],
    progressRejected: [],
    issues: [],
    retries: 0,
    element: fixture.nativeElement as HTMLElement,
    setInputs(next) {
      for (const [name, value] of Object.entries(next)) {
        fixture.componentRef.setInput(name, value);
      }
      fixture.detectChanges();
    },
    render() {
      fixture.detectChanges();
    },
    bar(taskId) {
      return (
        (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(
          `.gantt-bar-content[data-gantt-task-id="${taskId}"]`
        ) ?? null
      );
    },
    injectBar(taskId) {
      const bar = document.createElement('span');
      bar.className = 'gantt-bar-content';
      bar.setAttribute('data-gantt-task-id', taskId);
      (harness.element.querySelector('.dcf-gantt') as HTMLElement).appendChild(
        bar
      );
      fixture.detectChanges();
      return bar;
    },
    key(taskId, key, init = {}) {
      const bar = harness.bar(taskId) ?? harness.injectBar(taskId);
      const event = new KeyboardEvent('keydown', {
        key,
        bubbles: true,
        cancelable: true,
        ...init,
      });
      (bar ?? harness.element).dispatchEvent(event);
      fixture.detectChanges();
      return event;
    },
    date(taskId, start, end, mode = 'move') {
      const result = gantt.applyDateChange(taskId, start, end, mode);
      fixture.detectChanges();
      return result;
    },
    progress(taskId, value) {
      const result = gantt.setProgress(taskId, value);
      fixture.detectChanges();
      return result;
    },
  };

  fixture.componentRef.setInput('items', items);
  fixture.componentRef.setInput('config', config());
  for (const [name, value] of Object.entries(patch)) {
    fixture.componentRef.setInput(name, value);
  }

  gantt.taskSelected.subscribe((event) => harness.selected.push(event));
  gantt.taskEditRequested.subscribe((event) => harness.edits.push(event));
  gantt.taskDateChanged.subscribe((event) => harness.dateChanged.push(event));
  gantt.taskDateChangeRejected.subscribe((event) =>
    harness.dateRejected.push(event)
  );
  gantt.taskProgressChanged.subscribe((event) =>
    harness.progressChanged.push(event)
  );
  gantt.taskProgressChangeRejected.subscribe((event) =>
    harness.progressRejected.push(event)
  );
  gantt.modelIssuesChange.subscribe((event) => harness.issues.push([...event]));
  gantt.retryRequested.subscribe(() => (harness.retries += 1));

  fixture.detectChanges();
  return harness;
}

describe('GanttComponent — rendered states', () => {
  it('renders the empty state when there are no tasks', () => {
    const harness = mount([]);
    expect(
      harness.element.querySelector('.dcf-gantt__state--empty')
    ).not.toBeNull();
    expect(harness.element.querySelector('ngx-gantt')).toBeNull();
  });

  it('renders the loading state without the toolbar or renderer', () => {
    const harness = mount(tasks(), { loading: true });
    const loading = harness.element.querySelector(
      '.dcf-gantt__state--loading'
    );
    expect(loading).not.toBeNull();
    expect(loading?.getAttribute('role')).toBe('status');
    expect(harness.element.querySelector('.dcf-gantt__toolbar')).toBeNull();
    expect(harness.element.querySelector('ngx-gantt')).toBeNull();
    expect(harness.element.querySelector('.dcf-gantt')?.getAttribute('aria-busy')).toBe(
      'true'
    );
  });

  it('renders the error state and emits retryRequested', () => {
    const harness = mount(tasks(), { error: 'Timeline failed' });
    const alert = harness.element.querySelector(
      '.dcf-gantt__state--error'
    ) as HTMLElement;
    expect(alert).not.toBeNull();
    expect(alert.getAttribute('role')).toBe('alert');
    expect(alert.textContent).toContain('Timeline failed');
    (alert.querySelector('.dcf-gantt__retry') as HTMLButtonElement).click();
    expect(harness.retries).toBe(1);
  });

  it('reflects readOnly and disabled on the host', () => {
    const readOnly = mount(tasks(), { readonly: true });
    expect(
      readOnly.element.querySelector('.dcf-gantt--readonly')
    ).not.toBeNull();
    TestBed.resetTestingModule();

    const disabled = mount(tasks(), { disabled: true });
    expect(
      disabled.element.querySelector('.dcf-gantt--disabled')
    ).not.toBeNull();
  });

  it('emits model issues for invalid tasks', () => {
    const harness = mount([
      { id: 'a', title: 'A', start: '2026-10-01', end: '2026-10-02', progress: 2 },
    ]);
    expect(harness.issues.at(-1)?.map((issue) => issue.code)).toContain(
      'invalid-progress'
    );
    expect(
      harness.element.querySelectorAll('.dcf-gantt__issue').length
    ).toBeGreaterThan(0);
  });

  it('renders a sized placeholder and no vendor DOM during SSR', () => {
    const harness = mount(tasks(), {}, 'server');
    expect(
      harness.element.querySelector('.dcf-gantt__ssr-placeholder')
    ).not.toBeNull();
    expect(harness.element.querySelector('ngx-gantt')).toBeNull();
    expect(
      harness.element.querySelector('.dcf-gantt__toolbar')
    ).not.toBeNull();
  });
});

describe('GanttComponent — accessibility contract', () => {
  it('decorates rendered bars with role, tabindex, aria state, and shortcuts', () => {
    const harness = mount(tasks(), { selectedId: 'b' });
    expect(harness.element.querySelector('ngx-gantt')).not.toBeNull();
    harness.injectBar('a');
    const bar = harness.injectBar('b');
    expect(bar).not.toBeNull();
    expect(bar?.getAttribute('tabindex')).toBe('0');
    expect(bar?.getAttribute('role')).toBe('button');
    expect(bar?.getAttribute('aria-pressed')).toBe('true');
    expect(bar?.hasAttribute('aria-selected')).toBe(false);
    expect(bar?.getAttribute('aria-disabled')).toBe('false');
    expect(bar?.getAttribute('aria-keyshortcuts')).toContain('Alt+ArrowLeft');
    expect(bar?.getAttribute('aria-label')).toContain('Bravo');
    expect(harness.bar('a')?.getAttribute('aria-pressed')).toBe('false');
    expect(harness.bar('a')?.hasAttribute('aria-selected')).toBe(false);
  });

  it('marks bars aria-disabled while disabled', () => {
    const harness = mount(tasks(), { disabled: true });
    expect(harness.injectBar('b').getAttribute('aria-disabled')).toBe('true');
  });

  it('selects with Enter and Space and requests edit with E', () => {
    const harness = mount(tasks());
    harness.key('b', 'Enter');
    harness.key('b', ' ');
    harness.key('b', 'e');
    expect(harness.selected.map((event) => event.taskId)).toEqual(['b', 'b']);
    expect(harness.edits.map((event) => event.taskId)).toEqual(['b']);
  });
});

describe('GanttComponent — date changes', () => {
  it('emits accepted control events with Date values and stable strings', () => {
    const harness = mount(tasks());
    expect(harness.date('b', '2026-10-06', '2026-10-09')).toBe(true);
    const event = harness.dateChanged.at(-1) as GanttTaskDateChangeEvent<Task>;
    expect(event.taskId).toBe('b');
    expect(event.task).toBe(harness.gantt.items()[1]);
    expect(event.reason).toBe('control');
    expect(event.mode).toBe('move');
    expect(event.previous.start).toEqual(new Date(2026, 9, 5));
    expect(event.previous.startDate).toBe('2026-10-05');
    expect(event.previous.endDate).toBe('2026-10-08');
    expect(event.current.start).toEqual(new Date(2026, 9, 6));
    expect(event.current.end).toEqual(new Date(2026, 9, 9));
    expect(event.current.startDate).toBe('2026-10-06');
    expect(event.current.endDate).toBe('2026-10-09');
  });

  it('does not mutate the controlled task objects', () => {
    const items = tasks();
    const harness = mount(items);
    harness.date('b', '2026-10-06', '2026-10-09');
    expect(items[1].start).toBe('2026-10-05');
    expect(items[1].end).toBe('2026-10-08');
    expect(harness.gantt.items()[1].start).toBe('2026-10-05');
  });

  it('rejects readOnly, disabled, and unknown-task edits', () => {
    const readOnly = mount(tasks(), { readonly: true });
    expect(readOnly.date('b', '2026-10-06', '2026-10-09')).toBe(false);
    expect(readOnly.dateRejected.at(-1)?.reason).toBe('readonly');
    TestBed.resetTestingModule();

    const disabled = mount(tasks(), { disabled: true });
    expect(disabled.date('b', '2026-10-06', '2026-10-09')).toBe(false);
    expect(disabled.dateRejected.at(-1)?.reason).toBe('disabled');
    TestBed.resetTestingModule();

    const unknown = mount(tasks());
    expect(unknown.date('nope', '2026-10-06', '2026-10-09')).toBe(false);
    expect(unknown.dateRejected.at(-1)?.reason).toBe('unknown-task');
    expect(unknown.dateRejected.at(-1)?.task).toBeNull();
  });

  it('rejects locked tasks as disabled', () => {
    const items = tasks();
    items[1].locked = true;
    const harness = mount(items);
    expect(harness.date('b', '2026-10-06', '2026-10-09')).toBe(false);
    expect(harness.dateRejected.at(-1)?.reason).toBe('disabled');
  });

  it('rejects inverted and unreadable dates', () => {
    const harness = mount(tasks());
    expect(harness.date('b', '2026-10-09', '2026-10-08')).toBe(false);
    expect(harness.dateRejected.at(-1)?.reason).toBe('invalid-date');
    expect(harness.date('b', '2026-02-30', '2026-03-02')).toBe(false);
    expect(harness.dateRejected.at(-1)?.reason).toBe('invalid-date');
  });

  it('rejects resizing a milestone but allows moving it', () => {
    const harness = mount(tasks());
    expect(harness.date('m', '2026-10-10', '2026-10-12', 'resize')).toBe(false);
    expect(harness.dateRejected.at(-1)?.reason).toBe('milestone');

    expect(harness.date('m', '2026-10-11', '2026-10-14', 'move')).toBe(true);
    const event = harness.dateChanged.at(-1) as GanttTaskDateChangeEvent<Task>;
    expect(event.current.startDate).toBe('2026-10-11');
    expect(event.current.endDate).toBe('2026-10-11');
  });

  it('rejects a successor moved before its predecessor and the reverse order', () => {
    const harness = mount(tasks());
    expect(harness.date('b', '2026-10-02', '2026-10-05')).toBe(false);
    const forward = harness.dateRejected.at(-1);
    expect(forward?.reason).toBe('dependency-violation');
    expect(forward?.dependencyId).toBe('a');
    expect(harness.dateChanged).toHaveLength(0);

    expect(harness.date('a', '2026-10-06', '2026-10-08')).toBe(false);
    const reverse = harness.dateRejected.at(-1);
    expect(reverse?.reason).toBe('dependency-violation');
    expect(reverse?.dependencyId).toBe('b');
  });

  it('reports unchanged dates as a rejection (documented contract)', () => {
    const harness = mount(tasks());
    expect(harness.date('b', '2026-10-05', '2026-10-08')).toBe(false);
    expect(harness.dateChanged).toHaveLength(0);
    expect(harness.dateRejected.at(-1)?.reason).toBe('unchanged');
  });

  it('moves and resizes one day with Alt+Arrow and Alt+Shift+Arrow', () => {
    const harness = mount(tasks());
    harness.key('b', 'ArrowRight', { altKey: true });
    const moved = harness.dateChanged.at(-1) as GanttTaskDateChangeEvent<Task>;
    expect(moved.reason).toBe('keyboard');
    expect(moved.mode).toBe('move');
    expect(moved.current.startDate).toBe('2026-10-06');
    expect(moved.current.endDate).toBe('2026-10-09');

    harness.key('b', 'ArrowRight', { altKey: true, shiftKey: true });
    const resized = harness.dateChanged.at(-1) as GanttTaskDateChangeEvent<Task>;
    expect(resized.reason).toBe('keyboard');
    expect(resized.mode).toBe('resize');
    expect(resized.current.startDate).toBe('2026-10-05');
    expect(resized.current.endDate).toBe('2026-10-09');
  });

  it('snaps a rejected drag back to the controlled range', () => {
    const harness = mount(tasks());
    const bar = harness.injectBar('b');
    const item = {
      origin: { task: harness.gantt.items()[1], taskId: 'b', milestone: false },
      start: new Date(2026, 9, 2),
      end: new Date(2026, 9, 5),
    };
    (
      harness.gantt as unknown as {
        onDragStarted(event: unknown): void;
        onDragEnded(event: unknown): void;
      }
    ).onDragStarted({ item });
    (
      harness.gantt as unknown as {
        onDragEnded(event: unknown): void;
      }
    ).onDragEnded({ item });
    harness.render();

    expect(harness.dateChanged).toHaveLength(0);
    expect(harness.dateRejected.at(-1)?.reason).toBe('dependency-violation');
    expect(bar.getAttribute('data-gantt-task-id')).toBe('b');
    expect(
      harness.gantt.items().find((task) => task.id === 'b')?.start
    ).toBe('2026-10-05');
  });
});

describe('GanttComponent — progress changes', () => {
  it('emits accepted progress changes', () => {
    const harness = mount(tasks());
    expect(harness.progress('b', 0.6)).toBe(true);
    const event = harness.progressChanged.at(-1) as GanttTaskProgressChangeEvent<Task>;
    expect(event.taskId).toBe('b');
    expect(event.previous).toBe(0.4);
    expect(event.current).toBe(0.6);
    expect(event.reason).toBe('control');
  });

  it('rejects out-of-range progress, readOnly, disabled, and unknown tasks', () => {
    const harness = mount(tasks());
    expect(harness.progress('b', 1.5)).toBe(false);
    expect(harness.progressRejected.at(-1)?.reason).toBe('invalid-progress');
    expect(harness.progress('b', -0.1)).toBe(false);
    expect(harness.progressRejected.at(-1)?.reason).toBe('invalid-progress');
    expect(harness.progress('nope', 0.5)).toBe(false);
    expect(harness.progressRejected.at(-1)?.reason).toBe('unknown-task');
    TestBed.resetTestingModule();

    const readOnly = mount(tasks(), { readonly: true });
    expect(readOnly.progress('b', 0.6)).toBe(false);
    expect(readOnly.progressRejected.at(-1)?.reason).toBe('readonly');
    TestBed.resetTestingModule();

    const disabled = mount(tasks(), { disabled: true });
    expect(disabled.progress('b', 0.6)).toBe(false);
    expect(disabled.progressRejected.at(-1)?.reason).toBe('disabled');
  });

  it('reports unchanged progress as a rejection (documented contract)', () => {
    const harness = mount(tasks());
    expect(harness.progress('b', 0.4)).toBe(false);
    expect(harness.progressChanged).toHaveLength(0);
    expect(harness.progressRejected.at(-1)?.reason).toBe('unchanged');
  });

  it('steps progress by 10% with ] and [', () => {
    const harness = mount(tasks());
    harness.key('b', ']');
    expect(harness.progressChanged.at(-1)?.current).toBe(0.5);
    harness.key('b', '[');
    expect(harness.progressChanged.at(-1)?.current).toBe(0.3);

    harness.key('a', '[');
    expect(harness.progressChanged.at(-1)?.current).toBe(0.1);
  });
});
