import { ActivatedRoute } from '@angular/router';
import type { Meta, StoryObj } from '@storybook/angular';
import type { GraphRunRow } from 'src/app/services/graph-list/graph-list.service';
import { GraphListService } from 'src/app/services/graph-list/graph-list.service';
import { WorkflowExecutionListPage } from 'src/app/pages/graph/executions/workflow-execution-list.page';
import { GraphRunClient } from 'src/graph/runs/GraphRunClient';
import './setup';
import { getComponentMeta } from './utils';

const RUNS: GraphRunRow[] = [
  {
    runId: 'run-1',
    workflowId: 'text-pipeline-workflow',
    status: 'completed',
    createdAt: '2026-01-02T00:00:00.000Z',
    finishedAt: '2026-01-02T00:00:12.000Z',
  },
  {
    runId: 'run-2',
    workflowId: 'text-pipeline-workflow',
    status: 'failed',
    createdAt: '2026-01-02T01:00:00.000Z',
    finishedAt: '2026-01-02T01:00:03.000Z',
  },
  {
    runId: 'run-3',
    workflowId: 'text-pipeline-workflow',
    status: 'running',
    createdAt: '2026-01-02T02:00:00.000Z',
    startedAt: '2026-01-02T02:00:01.000Z',
  },
];

const component = getComponentMeta<WorkflowExecutionListPage>([], 'page', {}, [
  {
    provide: ActivatedRoute,
    useValue: {
      snapshot: { paramMap: { get: () => 'text-pipeline-workflow' } },
    },
  },
  {
    provide: GraphListService,
    useValue: {
      listWorkflows: async () => [],
      listRuns: async () => RUNS,
    },
  },
  {
    provide: GraphRunClient,
    useValue: { createRun: async () => ({ runId: 'run-4' }) },
  },
]);
const meta: Meta<WorkflowExecutionListPage> = {
  title: 'Graph/Workflow Execution List',
  component: WorkflowExecutionListPage,
  ...component,
};
export default meta;
type Story = StoryObj<WorkflowExecutionListPage>;

/** The execution list for a workflow with completed, failed, and running runs. */
export const executions: Story = {};
