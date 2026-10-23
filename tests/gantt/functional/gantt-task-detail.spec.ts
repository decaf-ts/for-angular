/**
 * SAA-1065 (QA C1) — functional coverage of the packed `/gantt` task-detail
 * panel. The panel is driven by the consumer's `decafGanttTaskDetail` template
 * outlet and is only observable through a host component, so this suite mounts
 * one instead of creating the Gantt component directly.
 *
 * `@decaf-ts/for-angular/gantt` resolves to the extracted `npm pack` artifact
 * (see `tests/gantt/jest.config.cjs`), never the monorepo path aliases.
 */
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  GanttComponent,
  GanttTaskDetailDirective,
  type GanttConfig,
  type GanttTaskSelectionEvent,
} from '@decaf-ts/for-angular/gantt';

interface Task {
  id: string;
  title: string;
  start: string;
  end: string;
  progress: number;
}

function config(): GanttConfig<Task> {
  return {
    id: (task) => task.id,
    title: (task) => task.title,
    start: (task) => task.start,
    end: (task) => task.end,
    progress: (task) => task.progress,
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
    },
  ];
}

@Component({
  standalone: true,
  imports: [GanttComponent, GanttTaskDetailDirective],
  template: `
    <decaf-gantt
      [items]="items"
      [config]="config"
      [showToolbar]="false"
      (taskSelected)="selected.push($event)"
      (taskEditRequested)="edits.push($event)"
    >
      <ng-template decafGanttTaskDetail let-task let-title="title">
        <span class="projected-detail">{{ task.id }}:{{ title }}</span>
      </ng-template>
    </decaf-gantt>
  `,
})
class GanttDetailHostComponent {
  readonly items = tasks();
  readonly config = config();
  readonly selected: GanttTaskSelectionEvent<Task>[] = [];
  readonly edits: GanttTaskSelectionEvent<Task>[] = [];
}

interface DetailHarness {
  fixture: ComponentFixture<GanttDetailHostComponent>;
  host: GanttDetailHostComponent;
  element: HTMLElement;
  bar(taskId: string): HTMLElement;
  key(taskId: string, key: string): KeyboardEvent;
  panel(): HTMLElement | null;
}

function mount(): DetailHarness {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ imports: [GanttDetailHostComponent] });
  const fixture = TestBed.createComponent(GanttDetailHostComponent);
  const element = fixture.nativeElement as HTMLElement;
  fixture.detectChanges();

  const harness: DetailHarness = {
    fixture,
    host: fixture.componentInstance,
    element,
    bar(taskId) {
      const bar = document.createElement('span');
      bar.className = 'gantt-bar-content';
      bar.setAttribute('data-gantt-task-id', taskId);
      (element.querySelector('.dcf-gantt') as HTMLElement).appendChild(bar);
      fixture.detectChanges();
      return bar;
    },
    key(taskId, key) {
      const event = new KeyboardEvent('keydown', {
        key,
        bubbles: true,
        cancelable: true,
      });
      harness.bar(taskId).dispatchEvent(event);
      fixture.detectChanges();
      return event;
    },
    panel() {
      return element.querySelector<HTMLElement>('.dcf-gantt__detail');
    },
  };

  return harness;
}

describe('GanttComponent — task detail panel (packed artifact)', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('does not render the panel until a selected task requests detail', () => {
    const harness = mount();
    expect(harness.panel()).toBeNull();

    harness.key('b', 'Enter');
    expect(harness.host.selected.at(-1)?.taskId).toBe('b');
    expect(harness.panel()).toBeNull();
  });

  it('renders a role="dialog" panel on a selected task detail request', () => {
    const harness = mount();
    harness.key('b', 'Enter');
    harness.key('b', 'e');

    const panel = harness.panel();
    expect(panel).not.toBeNull();
    expect(panel?.getAttribute('role')).toBe('dialog');
    expect(panel?.getAttribute('aria-modal')).toBe('false');
    expect(panel?.getAttribute('aria-label')).toBe('Bravo');
    expect(
      panel?.querySelector('.dcf-gantt__detail-title')?.textContent?.trim()
    ).toBe('Bravo');
    expect(harness.host.edits.at(-1)?.taskId).toBe('b');
  });

  it('projects the consumer decafGanttTaskDetail template with its context', () => {
    const harness = mount();
    harness.key('b', 'e');

    const projected = harness.panel()?.querySelector('.projected-detail');
    expect(projected).not.toBeNull();
    expect(projected?.textContent?.trim()).toBe('b:Bravo');
  });

  it('closes the panel from the close button', () => {
    const harness = mount();
    harness.key('b', 'e');
    expect(harness.panel()).not.toBeNull();

    (
      harness.panel()?.querySelector(
        '.dcf-gantt__detail-close'
      ) as HTMLButtonElement
    ).click();
    harness.fixture.detectChanges();

    expect(harness.panel()).toBeNull();
  });

  it('closes the panel with Escape', () => {
    const harness = mount();
    harness.key('b', 'e');
    expect(harness.panel()).not.toBeNull();

    harness.key('b', 'Escape');
    expect(harness.panel()).toBeNull();
  });
});
