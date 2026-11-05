import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  signal,
} from '@angular/core';
import type { Meta, StoryObj } from '@storybook/angular';
import {
  GanttComponent,
  type GanttConfig,
  type GanttTaskDateChangeEvent,
  type GanttTaskDateChangeRejectedEvent,
  type GanttTaskProgressChangeEvent,
  type GanttTaskProgressChangeRejectedEvent,
  type GanttTaskSelectionEvent,
} from '@decaf-ts/for-angular/gantt';
import './setup';

interface VerificationTask {
  id: string;
  title: string;
  start: string;
  end: string;
  progress: number;
  dependencies?: string[];
  milestone?: boolean;
}

const INITIAL_TASKS: VerificationTask[] = [
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

const VERIFICATION_CONFIG: GanttConfig<VerificationTask> = {
  id: (task) => task.id,
  title: (task) => task.title,
  start: (task) => task.start,
  end: (task) => task.end,
  progress: (task) => task.progress,
  dependencies: (task) => task.dependencies,
  milestone: (task) => Boolean(task.milestone),
  tooltip: (task) => `${task.title} tooltip`,
};

/**
 * Test-only host that records every adapter event and applies accepted changes
 * back to its controlled task list so Playwright can observe accepted moves,
 * rejections, and snap-back.
 */
@Component({
  selector: 'gantt-verification-host',
  standalone: true,
  imports: [GanttComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <decaf-gantt
      [items]="items()"
      [config]="config"
      [selectedId]="selectedId()"
      [readonly]="readonly()"
      [disabled]="disabled()"
      [loading]="loading()"
      [error]="error()"
      label="Verification timeline"
      (taskSelected)="onSelected($event)"
      (taskEditRequested)="onEditRequested($event)"
      (taskDateChanged)="onDateChanged($event)"
      (taskDateChangeRejected)="onDateRejected($event)"
      (taskProgressChanged)="onProgressChanged($event)"
      (taskProgressChangeRejected)="onProgressRejected($event)"
      (retryRequested)="onRetry()"
    />
    <pre data-gantt-events>{{ eventLog() }}</pre>
  `,
})
class GanttVerificationHost {
  readonly readonly = input(false);
  readonly disabled = input(false);
  readonly loading = input(false);
  readonly error = input<string | null>(null);

  readonly config = VERIFICATION_CONFIG;
  readonly items = signal<VerificationTask[]>(
    INITIAL_TASKS.map((task) => ({ ...task }))
  );
  readonly selectedId = signal<string | null>('b');
  readonly eventLog = computed(() => JSON.stringify(this.events()));

  private readonly events = signal<Record<string, unknown>[]>([]);

  onSelected(event: GanttTaskSelectionEvent<VerificationTask>): void {
    this.record('selected', { taskId: event.taskId });
  }

  onEditRequested(event: GanttTaskSelectionEvent<VerificationTask>): void {
    this.record('edit-requested', { taskId: event.taskId });
  }

  onDateChanged(event: GanttTaskDateChangeEvent<VerificationTask>): void {
    this.record('date-changed', {
      taskId: event.taskId,
      reason: event.reason,
      mode: event.mode,
      startDate: event.current.startDate,
      endDate: event.current.endDate,
      startIsDate: event.current.start instanceof Date,
      endIsDate: event.current.end instanceof Date,
      previousStartTime: event.previous.start?.getTime() ?? null,
      previousEndTime: event.previous.end?.getTime() ?? null,
      currentStartTime: event.current.start?.getTime() ?? null,
      currentEndTime: event.current.end?.getTime() ?? null,
    });
    this.items.update((items) =>
      items.map((task) =>
        task.id === event.taskId
          ? {
              ...task,
              start: event.current.startDate ?? task.start,
              end: event.current.endDate ?? task.end,
            }
          : task
      )
    );
  }

  onDateRejected(event: GanttTaskDateChangeRejectedEvent<VerificationTask>): void {
    this.record('date-rejected', {
      taskId: event.taskId,
      reason: event.reason,
      mode: event.mode,
      dependencyId: event.dependencyId ?? null,
    });
  }

  onProgressChanged(
    event: GanttTaskProgressChangeEvent<VerificationTask>
  ): void {
    this.record('progress-changed', {
      taskId: event.taskId,
      previous: event.previous,
      current: event.current,
      reason: event.reason,
    });
    this.items.update((items) =>
      items.map((task) =>
        task.id === event.taskId ? { ...task, progress: event.current } : task
      )
    );
  }

  onProgressRejected(
    event: GanttTaskProgressChangeRejectedEvent<VerificationTask>
  ): void {
    this.record('progress-rejected', {
      taskId: event.taskId,
      previous: event.previous,
      requested: event.requested,
      reason: event.reason,
    });
  }

  onRetry(): void {
    this.record('retry-requested', {});
  }

  private record(kind: string, payload: Record<string, unknown>): void {
    this.events.update((events) => [...events, { kind, ...payload }]);
  }
}

const meta: Meta<GanttVerificationHost> = {
  title: 'Tests/Gantt Verification',
  component: GanttVerificationHost,
  argTypes: {
    readonly: { control: 'boolean' },
    disabled: { control: 'boolean' },
    loading: { control: 'boolean' },
    error: { control: 'text' },
  },
  args: {
    readonly: false,
    disabled: false,
    loading: false,
    error: null,
  },
  render: (args) => ({
    props: args,
    template: `
      <gantt-verification-host
        [readonly]="readonly"
        [disabled]="disabled"
        [loading]="loading"
        [error]="error"
      />
    `,
  }),
};
export default meta;

type Story = StoryObj<GanttVerificationHost>;

export const Verification: Story = {};

export const VerificationReadOnly: Story = {
  args: { readonly: true },
};

export const VerificationDisabled: Story = {
  args: { disabled: true },
};

export const VerificationLoading: Story = {
  args: { loading: true },
};

export const VerificationError: Story = {
  args: { error: 'Verification timeline failed' },
};
