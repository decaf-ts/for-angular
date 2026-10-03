import type { GraphRunLogEntry } from '@decaf-ts/as-graph/shared';
import type {
  Decorator,
  Meta,
  IStory,
  StoryObj,
} from '@storybook/angular';
import { GraphLogsWidgetComponent } from 'src/graph/components/graph-logs-widget/graph-logs-widget.component';
import {
  graphRunLog,
  type GraphLogFilterLevel,
  type GraphRunLogLifecycleKind,
} from 'src/graph/execution/GraphRunLogStore';
import './setup';
import { getComponentMeta } from './utils';

const RUN_ID = 'run-42';
const WORKFLOW_ID = 'demo-workflow';

function entry(
  level: GraphRunLogEntry['level'],
  message: string,
  offsetSeconds: number
): GraphRunLogEntry {
  return {
    level,
    message,
    timestamp: new Date(Date.now() + offsetSeconds * 1000).toISOString(),
    runId: RUN_ID,
    workflowId: WORKFLOW_ID,
    nodeId: 'code-1',
  };
}

const STREAMED: GraphRunLogEntry[] = [
  entry('debug', 'Resolving input bindings for code-1', 0),
  entry('info', 'Code node started', 1),
  entry('info', 'Processed 128 records', 2),
  entry('warn', 'Skipped 2 blank records', 3),
  entry('error', 'Failed to parse record 97', 4),
  entry('verbose', 'Heap usage 42.7 MB', 5),
];

type LifecycleSeed = { kind: GraphRunLogLifecycleKind; message: string };

const LIFECYCLE: LifecycleSeed[] = [
  { kind: 'created', message: `Run ${RUN_ID} created for workflow ${WORKFLOW_ID}` },
  { kind: 'validated', message: `Workflow ${WORKFLOW_ID} validated` },
  { kind: 'validation-issues', message: `Workflow ${WORKFLOW_ID} validation reported 2 issue(s)` },
];

function withLogs(
  entries: GraphRunLogEntry[],
  lifecycle: LifecycleSeed[],
  options: { open?: boolean; collapsed?: boolean; filter?: GraphLogFilterLevel } = {}
): Decorator {
  return (story: () => IStory): IStory => {
    graphRunLog.reset();
    graphRunLog.appendAll(entries);
    for (const line of lifecycle) {
      graphRunLog.recordLifecycle(line.kind, line.message, {
        runId: RUN_ID,
        workflowId: WORKFLOW_ID,
      });
    }
    graphRunLog.setOpen(options.open ?? true);
    graphRunLog.setCollapsed(options.collapsed ?? false);
    graphRunLog.setFilter(options.filter ?? 'verbose');
    return story();
  };
}

const component = getComponentMeta<GraphLogsWidgetComponent>([]);
const meta: Meta<GraphLogsWidgetComponent> = {
  title: 'Graph/Panels/Run Logs Widget',
  component: GraphLogsWidgetComponent,
  ...component,
};
export default meta;
type Story = StoryObj<GraphLogsWidgetComponent>;

export const closedHandle: Story = {
  decorators: [withLogs(STREAMED, LIFECYCLE, { open: false })],
};

export const openWithStreamedEntries: Story = {
  decorators: [withLogs(STREAMED, LIFECYCLE)],
};

export const openLifecycleOnly: Story = {
  decorators: [withLogs([], LIFECYCLE)],
};

export const openEmpty: Story = {
  decorators: [withLogs([], [])],
};

export const collapsed: Story = {
  decorators: [withLogs(STREAMED, LIFECYCLE, { collapsed: true })],
};

export const errorFilter: Story = {
  decorators: [withLogs(STREAMED, LIFECYCLE, { filter: 'error' })],
};

export const warningFilter: Story = {
  decorators: [withLogs(STREAMED, LIFECYCLE, { filter: 'warn' })],
};
