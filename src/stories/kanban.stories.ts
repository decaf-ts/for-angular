import type { Meta, StoryObj } from '@storybook/angular';
import { fn } from 'storybook/test';
import {
  DecafKanbanCardDirective,
  KanbanBoardComponent,
  type KanbanColumnConfig,
  type KanbanConfig,
} from '@decaf-ts/for-angular/kanban';
import './setup';
import { getComponentMeta } from './utils';

interface DemoTask {
  id: string;
  title: string;
  status: string;
  assignee: string;
}

const COLUMNS: KanbanColumnConfig[] = [
  { id: 'todo', title: 'To do', wipLimit: 5 },
  { id: 'doing', title: 'In progress', wipLimit: 2 },
  { id: 'review', title: 'Review' },
  { id: 'done', title: 'Done' },
];

const CONFIG: KanbanConfig<DemoTask> = {
  id: (task) => task.id,
  title: (task) => task.title,
  status: (task) => task.status,
  columns: COLUMNS,
};

const TASKS: DemoTask[] = [
  { id: 't-1', title: 'Draft Kanban API contract', status: 'todo', assignee: 'Ada' },
  { id: 't-2', title: 'Wire CDK drag/drop', status: 'todo', assignee: 'Grace' },
  { id: 't-3', title: 'Document keyboard move flow', status: 'todo', assignee: 'Linus' },
  { id: 't-4', title: 'Project card templates', status: 'doing', assignee: 'Ada' },
  { id: 't-5', title: 'Enforce WIP limits', status: 'doing', assignee: 'Grace' },
  { id: 't-6', title: 'Screen reader announcements', status: 'review', assignee: 'Linus' },
  { id: 't-7', title: 'Phase 2 bundle isolation', status: 'done', assignee: 'Ada' },
];

const TEMPLATE = `
<decaf-kanban-board
  [items]="items"
  [config]="config"
  [selectedId]="selectedId"
  [readonly]="readOnly"
  [disabled]="disabled"
  [loading]="loading"
  [error]="error"
  [filter]="filter"
  [showDragHandles]="showDragHandles"
  [label]="label"
  (taskMoved)="taskMoved($event)"
  (taskReordered)="taskReordered($event)"
  (taskSelected)="taskSelected($event)"
  (taskEditRequested)="taskEditRequested($event)"
  (taskMoveRejected)="taskMoveRejected($event)"
>
  <ng-template decafKanbanCard let-task let-column="column" let-index="index" let-selected="selected">
    <div style="display:flex;flex-direction:column;gap:0.25rem;">
      <strong style="font-size:0.9rem;">{{ task.title }}</strong>
      <span style="font-size:0.7rem;opacity:0.75;">
        {{ column.title }} · {{ task.assignee }} · #{{ index + 1 }}{{ selected ? ' · selected' : '' }}
      </span>
    </div>
  </ng-template>
</decaf-kanban-board>
`;

const component = getComponentMeta<KanbanBoardComponent<DemoTask>>([
  KanbanBoardComponent,
  DecafKanbanCardDirective,
]);

const meta: Meta<KanbanBoardComponent<DemoTask>> = {
  title: 'Components/Kanban',
  component: KanbanBoardComponent,
  ...component,
  argTypes: {
    ...component.argTypes,
    config: { control: false, table: { disable: true } },
    items: { control: false, table: { disable: true } },
    filter: { control: false, table: { disable: true } },
  },
  args: {
    items: TASKS,
    config: CONFIG,
    selectedId: 't-4',
    readOnly: false,
    disabled: false,
    loading: false,
    error: null,
    filter: null,
    showDragHandles: true,
    label: 'Sprint board',
    taskMoved: fn(),
    taskReordered: fn(),
    taskSelected: fn(),
    taskEditRequested: fn(),
    taskMoveRejected: fn(),
  },
  render: (args) => ({
    props: args,
    template: TEMPLATE,
  }),
};
export default meta;

type Story = StoryObj<KanbanBoardComponent<DemoTask>>;

export const Default: Story = {};

export const Empty: Story = {
  args: {
    items: [],
  },
};

export const ReadOnly: Story = {
  args: {
    readOnly: true,
    selectedId: 't-1',
  },
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
    error: 'The board could not be loaded. Try again.',
  },
};

export const WipLimitReached: Story = {
  args: {
    items: TASKS.map((task) =>
      task.id === 't-4' || task.id === 't-5'
        ? task
        : task.id === 't-1'
          ? { ...task, status: 'doing' }
          : task
    ),
  },
};

export const Filtered: Story = {
  args: {
    filter: (task: DemoTask) => task.assignee === 'Ada',
  },
};
