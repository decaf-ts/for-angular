import { Component, signal } from '@angular/core';
import { IonContent } from '@ionic/angular/standalone';
import {
  GanttBarDirective,
  GanttComponent,
  type GanttConfig,
} from '@decaf-ts/for-angular/gantt';
import { HeaderComponent } from 'src/app/components/header/header.component';

interface DemoTask {
  id: string;
  title: string;
  start: string;
  end: string;
  progress: number;
  parentId?: string;
  dependencies?: string[];
  milestone?: boolean;
}

const INITIAL_TASKS: DemoTask[] = [
  {
    id: 'discovery',
    title: 'Discovery and compatibility gate',
    start: '2026-10-05',
    end: '2026-10-09',
    progress: 1,
  },
  {
    id: 'adapter',
    title: 'Typed Gantt adapter',
    start: '2026-10-12',
    end: '2026-10-20',
    progress: 0.65,
    parentId: 'discovery',
    dependencies: ['discovery'],
  },
  {
    id: 'mapping',
    title: 'Task and dependency mapping',
    start: '2026-10-14',
    end: '2026-10-23',
    progress: 0.4,
    parentId: 'discovery',
    dependencies: ['adapter'],
  },
  {
    id: 'theme',
    title: 'Theme adapter and stylesheet isolation',
    start: '2026-10-21',
    end: '2026-10-27',
    progress: 0.2,
    dependencies: ['adapter'],
  },
  {
    id: 'review',
    title: 'Compatibility review',
    start: '2026-10-28',
    end: '2026-10-28',
    progress: 0,
    milestone: true,
    dependencies: ['mapping', 'theme'],
  },
];

type GanttTask = DemoTask;

@Component({
  selector: 'app-gantt-page',
  imports: [IonContent, HeaderComponent, GanttComponent, GanttBarDirective],
  templateUrl: './gantt.page.html',
  styleUrl: './gantt.page.scss',
})
export class GanttPage {
  protected readonly tasks = signal<GanttTask[]>(INITIAL_TASKS);
  protected readonly selectedId = signal<string | null>(null);
  protected readonly readOnly = signal(false);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly viewType = signal<'day' | 'week' | 'month' | 'quarter' | 'year'>(
    'week'
  );
  protected readonly lastEvent = signal('No Gantt event yet.');

  protected readonly config: GanttConfig<GanttTask> = {
    id: (task) => task.id,
    title: (task) => task.title,
    start: (task) => task.start,
    end: (task) => task.end,
    progress: (task) => task.progress,
    parent: (task) => task.parentId,
    dependencies: (task) => task.dependencies,
    milestone: (task) => Boolean(task.milestone),
    editable: () => true,
  };

  protected onSelected(event: { taskId: string }): void {
    this.selectedId.set(event.taskId);
    this.lastEvent.set(`taskSelected: ${event.taskId}`);
  }

  protected onEditRequested(event: { taskId: string }): void {
    this.lastEvent.set(`taskEditRequested: ${event.taskId}`);
  }

  protected onDateChanged(event: {
    taskId: string;
    current: { startDate: string | null; endDate: string | null };
    mode: string;
  }): void {
    if (!event.current.startDate || !event.current.endDate) {
      return;
    }
    this.tasks.update((tasks) =>
      tasks.map((task) =>
        task.id === event.taskId
          ? {
              ...task,
              start: event.current.startDate as string,
              end: event.current.endDate as string,
            }
          : task
      )
    );
    this.lastEvent.set(
      `taskDateChanged: ${event.taskId} ${event.current.startDate} -> ${event.current.endDate} (${event.mode})`
    );
  }

  protected onDateRejected(event: { taskId: string; reason: string }): void {
    this.lastEvent.set(`taskDateChangeRejected: ${event.taskId} ${event.reason}`);
  }

  protected onProgressChanged(event: { taskId: string; current: number }): void {
    this.tasks.update((tasks) =>
      tasks.map((task) =>
        task.id === event.taskId ? { ...task, progress: event.current } : task
      )
    );
    this.lastEvent.set(
      `taskProgressChanged: ${event.taskId} ${Math.round(event.current * 100)}%`
    );
  }

  protected onProgressRejected(event: { taskId: string; reason: string }): void {
    this.lastEvent.set(
      `taskProgressChangeRejected: ${event.taskId} ${event.reason}`
    );
  }

  protected onViewTypeChange(viewType: 'day' | 'week' | 'month' | 'quarter' | 'year'): void {
    this.viewType.set(viewType);
    this.lastEvent.set(`viewTypeChange: ${viewType}`);
  }

  protected onRetry(): void {
    this.error.set(null);
    this.lastEvent.set('retryRequested');
  }

  protected reset(): void {
    this.tasks.set(INITIAL_TASKS);
    this.selectedId.set(null);
    this.readOnly.set(false);
    this.loading.set(false);
    this.error.set(null);
    this.viewType.set('week');
    this.lastEvent.set('Gantt demo reset.');
  }

  protected toggleReadOnly(): void {
    this.readOnly.update((value) => !value);
  }

  protected toggleLoading(): void {
    this.loading.update((value) => !value);
  }

  protected toggleError(): void {
    this.error.update((value) =>
      value ? null : 'The timeline could not be loaded. Try again.'
    );
  }
}
