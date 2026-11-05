import type { Meta, StoryObj } from '@storybook/angular';
import { fn } from 'storybook/test';
import {
  BacklogComponent,
  SprintBoardComponent,
  type ScrumConfig,
  type ScrumSprint,
} from '@decaf-ts/for-angular/scrum';
import { DecafKanbanCardDirective } from '@decaf-ts/for-angular/kanban';
import './setup';
import { getComponentMeta } from './utils';

interface DemoTask {
  id: string;
  title: string;
  status: string;
  sprintId: string | null;
  assignee: string;
}

const COLUMNS = [
  { id: 'todo', title: 'To do', wipLimit: 4 },
  { id: 'doing', title: 'In progress', wipLimit: 2 },
  { id: 'review', title: 'Review' },
  { id: 'done', title: 'Done' },
];

const SPRINTS: ScrumSprint[] = [
  { id: 'sprint-1', title: 'Sprint 1 — Now' },
  { id: 'sprint-2', title: 'Sprint 2 — Next' },
  { id: 'sprint-3', title: 'Sprint 3 — Later' },
];

const TASKS: DemoTask[] = [
  { id: 't-1', title: 'Refine backlog ordering rules', status: 'todo', sprintId: null, assignee: 'Ada' },
  { id: 't-2', title: 'Document sprint scoping contract', status: 'todo', sprintId: null, assignee: 'Grace' },
  { id: 't-3', title: 'Triage sprint assignment feedback', status: 'todo', sprintId: null, assignee: 'Linus' },
  { id: 't-4', title: 'Compose sprint board from Kanban', status: 'done', sprintId: 'sprint-1', assignee: 'Ada' },
  { id: 't-5', title: 'Reuse Kanban drag/drop mechanics', status: 'doing', sprintId: 'sprint-1', assignee: 'Grace' },
  { id: 't-6', title: 'Sprint selector keyboard flow', status: 'review', sprintId: 'sprint-1', assignee: 'Linus' },
  { id: 't-7', title: 'Typed sprint assignment events', status: 'todo', sprintId: 'sprint-1', assignee: 'Ada' },
];

const CONFIG: ScrumConfig<DemoTask> = {
  id: (task) => task.id,
  title: (task) => task.title,
  status: (task) => task.status,
  sprint: (task) => task.sprintId,
  columns: COLUMNS,
};

const SELECTOR = `
  <decaf-sprint-selector
    [sprints]="sprints"
    [selectedSprintId]="'sprint-1'"
    [disabled]="loading"
  />
`;

const BACKLOG = `
  <section aria-label="Backlog">
    <h3 style="margin:0 0 0.5rem;">Backlog</h3>
    <decaf-scrum-backlog
      [items]="items"
      [config]="config"
      [sprints]="sprints"
      [selectedId]="selectedId"
      [readonly]="readonly"
      [disabled]="disabled"
      [loading]="loading"
      [error]="error"
      [filter]="filter"
      label="Backlog"
      columnTitle="Backlog"
      (backlogReordered)="backlogReordered($event)"
      (backlogReorderRejected)="backlogReorderRejected($event)"
      (sprintAssignmentRequested)="sprintAssignmentRequested($event)"
      (sprintAssignmentRejected)="sprintAssignmentRejected($event)"
      (taskSelected)="taskSelected($event)"
      (taskEditRequested)="taskEditRequested($event)"
    />
  </section>
`;

const SPRINT_BOARD = `
  <section aria-label="Sprint board">
    <h3 style="margin:0 0 0.5rem;">Sprint board</h3>
    <decaf-scrum-sprint-board
      [items]="items"
      [config]="config"
      [sprintId]="'sprint-1'"
      [selectedId]="selectedId"
      [readonly]="readonly"
      [disabled]="disabled"
      [loading]="loading"
      [error]="error"
      [filter]="filter"
      label="Sprint board"
      (taskMoved)="taskMoved($event)"
      (taskReordered)="taskReordered($event)"
      (taskSelected)="taskSelected($event)"
      (taskEditRequested)="taskEditRequested($event)"
      (taskMoveRejected)="taskMoveRejected($event)"
    />
  </section>
`;

const BOTH_TEMPLATE = `
<div style="display:flex;flex-direction:column;gap:1rem;min-width:0;">
  ${SELECTOR}
  ${BACKLOG}
  ${SPRINT_BOARD}
</div>
`;

const BACKLOG_TEMPLATE = `
<div style="display:flex;flex-direction:column;gap:1rem;min-width:0;">
  ${SELECTOR}
  ${BACKLOG}
</div>
`;

const SPRINT_TEMPLATE = `
<div style="display:flex;flex-direction:column;gap:1rem;min-width:0;">
  ${SELECTOR}
  ${SPRINT_BOARD}
</div>
`;

const BOARD_HANDLERS = {
  taskMoved: fn(),
  taskReordered: fn(),
  taskMoveRejected: fn(),
};

const component = getComponentMeta<BacklogComponent<DemoTask>>([
  BacklogComponent,
  SprintBoardComponent,
  DecafKanbanCardDirective,
]);

const meta: Meta<BacklogComponent<DemoTask>> = {
  title: 'Components/Scrum',
  component: BacklogComponent,
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
    sprints: SPRINTS,
    selectedId: 't-5',
    readonly: false,
    disabled: false,
    loading: false,
    error: null,
    filter: null,
    backlogReordered: fn(),
    backlogReorderRejected: fn(),
    sprintAssignmentRequested: fn(),
    sprintAssignmentRejected: fn(),
    taskSelected: fn(),
    taskEditRequested: fn(),
  } as unknown as Meta<BacklogComponent<DemoTask>>['args'],
  render: (args) => ({
    props: { ...args, ...BOARD_HANDLERS },
    template: BOTH_TEMPLATE,
  }),
};
export default meta;

type Story = StoryObj<BacklogComponent<DemoTask>>;

export const Overview: Story = {};

export const Backlog: Story = {
  render: (args) => ({
    props: { ...args, ...BOARD_HANDLERS },
    template: BACKLOG_TEMPLATE,
  }),
};

export const SprintBoard: Story = {
  render: (args) => ({
    props: { ...args, ...BOARD_HANDLERS },
    template: SPRINT_TEMPLATE,
  }),
};

export const Empty: Story = {
  args: {
    items: [],
  },
};

export const ReadOnly: Story = {
  args: {
    readonly: true,
    selectedId: 't-1',
  } as unknown as Story['args'],
};

export const Loading: Story = {
  args: {
    loading: true,
  },
};

export const ErrorState: Story = {
  args: {
    error: 'The sprint could not be loaded. Try again.',
  },
};
