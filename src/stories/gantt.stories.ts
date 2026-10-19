import type { Meta, StoryObj } from '@storybook/angular';
import { fn } from 'storybook/test';
import {
  GanttBarDirective,
  GanttComponent,
  GanttEmptyDirective,
  GanttTaskDetailDirective,
  type GanttConfig,
} from '@decaf-ts/for-angular/gantt';
import './setup';
import { getComponentMeta } from './utils';

interface DemoTask {
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

const CONFIG: GanttConfig<DemoTask> = {
  id: (task) => task.id,
  title: (task) => task.title,
  start: (task) => task.start,
  end: (task) => task.end,
  progress: (task) => task.progress,
  parent: (task) => task.parentId,
  dependencies: (task) => task.dependencies,
  milestone: (task) => Boolean(task.milestone),
  editable: (task) => !task.locked,
  tooltip: (task) => `${task.title} (${task.progress * 100}%)`,
};

const TASKS: DemoTask[] = [
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
  {
    id: 'docs',
    title: 'Install documentation',
    start: '2026-10-26',
    end: '2026-10-30',
    progress: 0,
    dependencies: ['theme'],
    locked: true,
  },
];

const TEMPLATE = `
<decaf-gantt
  [items]="items"
  [config]="config"
  [selectedId]="selectedId"
  [readonly]="readonlyState"
  [disabled]="disabled"
  [loading]="loading"
  [error]="error"
  [viewType]="viewType"
  [label]="label"
  (viewTypeChange)="viewTypeChange($event)"
  (taskSelected)="taskSelected($event)"
  (taskEditRequested)="taskEditRequested($event)"
  (taskDateChanged)="taskDateChanged($event)"
  (taskDateChangeRejected)="taskDateChangeRejected($event)"
  (taskProgressChanged)="taskProgressChanged($event)"
  (taskProgressChangeRejected)="taskProgressChangeRejected($event)"
  (retryRequested)="retryRequested()"
>
  <ng-template
    decafGanttBar
    let-task
    let-selected="selected"
    let-milestone="milestone"
    let-progressPercent="progressPercent"
  >
    <span style="font-size:0.7rem;">
      {{ task.title }} · {{ progressPercent }}%{{ selected ? ' · selected' : '' }}{{ milestone ? ' · milestone' : '' }}
    </span>
  </ng-template>
  <ng-template decafGanttTaskDetail let-task>
    <div style="display:flex;flex-direction:column;gap:0.35rem;">
      <strong>{{ task.title }}</strong>
      <span style="font-size:0.8rem;opacity:0.75;">
        {{ task.start }} to {{ task.end }} · {{ task.progress * 100 }}% complete
      </span>
      <p style="margin:0;font-size:0.8rem;">
        Replace this projected template with a Decaf model form or renderer.
      </p>
    </div>
  </ng-template>
  <ng-template decafGanttEmpty>
    <p style="margin:0;">This project has no scheduled tasks yet.</p>
  </ng-template>
</decaf-gantt>
`;

const component = getComponentMeta<GanttComponent<DemoTask>>([
  GanttComponent,
  GanttBarDirective,
  GanttTaskDetailDirective,
  GanttEmptyDirective,
]);

const meta: Meta<GanttComponent<DemoTask>> = {
  title: 'Components/Gantt',
  component: GanttComponent,
  ...component,
  argTypes: {
    ...component.argTypes,
    config: { control: false, table: { disable: true } },
    items: { control: false, table: { disable: true } },
    viewTypeLabels: { control: false, table: { disable: true } },
  },
  args: {
    items: TASKS,
    config: CONFIG,
    selectedId: 'adapter',
    readonlyState: false,
    disabled: false,
    loading: false,
    error: null,
    viewType: 'week',
    label: 'Delivery timeline',
    viewTypeChange: fn(),
    taskSelected: fn(),
    taskEditRequested: fn(),
    taskDateChanged: fn(),
    taskDateChangeRejected: fn(),
    taskProgressChanged: fn(),
    taskProgressChangeRejected: fn(),
    retryRequested: fn(),
  } as Meta<GanttComponent<DemoTask>>['args'],
  render: (args) => ({
    props: args,
    template: TEMPLATE,
  }),
};
export default meta;

type Story = StoryObj<GanttComponent<DemoTask>>;

export const Default: Story = {};

export const Empty: Story = {
  args: {
    items: [],
  },
};

export const ReadOnly: Story = {
  args: {
    readonlyState: true,
    selectedId: 'adapter',
  } as Story['args'],
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};

export const Loading: Story = {
  args: {
    loading: true,
  },
};

export const ErrorState: Story = {
  args: {
    error: 'The timeline could not be loaded. Try again.',
  },
};

export const Milestones: Story = {
  args: {
    viewType: 'month',
  },
};

export const Dependencies: Story = {
  args: {
    viewType: 'month',
    selectedId: 'review',
  },
};
