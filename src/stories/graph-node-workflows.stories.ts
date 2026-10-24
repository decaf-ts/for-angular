/**
 * @module for-angular/stories/graph-node-workflows
 * @summary Storybook stories that play real workflows for each functional graph node kind (req 13).
 * @description Mounts the canonical {@link GraphPage} against a running as-graph
 * backend, one story per built-in functional node kind. Each story opens the
 * demo fixture that exercises the kind, so the Play control runs the real
 * execution backend and the node inspection panes show the run inputs/outputs.
 * Input/output boundary kinds (`value` / `result`) are deliberately excluded.
 *
 * Backend: start the fixed as-graph backend (the fixture registry must be
 * present) and point Storybook at it with `?graphBackend=…` (default
 * `http://localhost:3000`) and `?engine=local|mastra|dagster` (default
 * `local`). Stories without a runnable fixture are still listed and explain the
 * integration they need mocked.
 */
import type { Meta, StoryObj } from '@storybook/angular';
import { GraphPage } from 'src/app/pages/graph/graph.page';
import { GRAPH_BACKEND_URL } from 'diagrams/src/lib/graph/execution/GraphExecutionService';
import './setup';
import { getComponentMeta } from './utils';

/** Default backend origin used when the Storybook URL carries no `graphBackend` parameter. */
const DEFAULT_BACKEND_URL = 'http://localhost:3000';

/**
 * Resolves the story-time backend origin and engine from the Storybook URL so a
 * reviewer can target any environment without rebuilding the bundle.
 */
function storyBackendUrl(): string {
  if (typeof location === 'undefined') return DEFAULT_BACKEND_URL;
  return new URLSearchParams(location.search).get('graphBackend') || DEFAULT_BACKEND_URL;
}

/** Resolves the `?engine=` Storybook parameter. */
function storyEngine(): string {
  if (typeof location === 'undefined') return 'local';
  return new URLSearchParams(location.search).get('engine') || 'local';
}

/** One per-kind story definition: the fixture that exercises the kind and how to play it. */
interface NodeWorkflowSpec {
  /** Canonical node kind discriminator. */
  kind: string;
  /** Palette category the node belongs to. */
  category: string;
  /** Demo fixture workflow that exercises the kind; omitted when no fixture exists yet. */
  fixture?: string;
  /** Sample value the reviewer types into the run form before pressing Play. */
  sampleInputs?: string;
  /** Whether the fixture can execute on the backend engine named by `engine`. */
  runnable: boolean;
  /** Engine override; defaults to the `?engine=` parameter. */
  engine?: string;
  /** Honest reason the story cannot play yet. */
  limitation?: string;
}

/**
 * Every built-in functional node kind (input/output boundary kinds excluded),
 * mapped to the fixture that exercises it. Kept as explicit story metadata so
 * the catalogue and the fixtures can be reviewed together.
 */
const NODE_WORKFLOWS: NodeWorkflowSpec[] = [
  {
    kind: 'core.agent',
    category: 'Agent',
    fixture: 'fixture-chat-agent',
    engine: 'mastra',
    runnable: false,
    limitation:
      'Mastra-only AI node: the fixture is seeded but the model connection must be mocked (or a real Mastra provider configured) before it can play.',
  },
  { kind: 'core.flow.break', category: 'Flow Control', fixture: 'fixture-foreach-break', sampleInputs: 'items = [1, 2, 3]', runnable: true },
  { kind: 'core.flow.delay', category: 'Flow Control', fixture: 'fixture-webhook-form', runnable: true },
  { kind: 'core.flow.errorBoundary', category: 'Flow Control', fixture: 'fixture-error-boundary', sampleInputs: 'n = boom', runnable: true },
  { kind: 'core.flow.humanApproval', category: 'Flow Control', fixture: 'fixture-human-approval', sampleInputs: 'n = ticket-42', runnable: true },
  { kind: 'core.flow.if', category: 'Flow Control', fixture: 'fixture-if-switch', sampleInputs: 'n = 7', runnable: true },
  { kind: 'core.flow.log', category: 'Flow Control', fixture: 'fixture-manual-log', runnable: true },
  { kind: 'core.flow.merge', category: 'Flow Control', runnable: false, limitation: 'No demo fixture yet; the merge join is not exercised by the published fixture registry.' },
  { kind: 'core.flow.parallel', category: 'Flow Control', runnable: false, limitation: 'No demo fixture yet; parallel fan-out is not exercised by the published fixture registry.' },
  { kind: 'core.flow.return', category: 'Flow Control', runnable: false, limitation: 'No demo fixture yet; sub-workflow return is not exercised by the published fixture registry.' },
  { kind: 'core.flow.switch', category: 'Flow Control', fixture: 'fixture-if-switch', sampleInputs: 'n = 7', runnable: true },
  { kind: 'core.loop.foreach', category: 'Loop', fixture: 'fixture-foreach-break', sampleInputs: 'items = [1, 2, 3]', runnable: true },
  { kind: 'core.loop.until', category: 'Loop', fixture: 'fixture-loops-while-until', sampleInputs: 'state = {"n": 0}', runnable: true },
  { kind: 'core.loop.while', category: 'Loop', fixture: 'fixture-loops-while-until', sampleInputs: 'state = {"n": 0}', runnable: true },
  {
    kind: 'core.trigger.chat',
    category: 'Trigger',
    fixture: 'fixture-chat-agent',
    engine: 'mastra',
    runnable: false,
    limitation:
      'Chat trigger feeds the Mastra-only agent fixture: the chat/model connection must be mocked before it can play.',
  },
  { kind: 'core.trigger.event', category: 'Trigger', fixture: 'fixture-event-map', runnable: true },
  { kind: 'core.trigger.form', category: 'Trigger', fixture: 'fixture-webhook-form', runnable: true },
  { kind: 'core.trigger.manual', category: 'Trigger', fixture: 'fixture-manual-log', runnable: true },
  { kind: 'core.trigger.schedule', category: 'Trigger', fixture: 'fixture-schedule-code', runnable: true },
  { kind: 'core.trigger.webhook', category: 'Trigger', fixture: 'fixture-webhook-form', runnable: true },
  { kind: 'core.utility.code', category: 'Utility', fixture: 'fixture-schedule-code', runnable: true },
  { kind: 'core.utility.log', category: 'Utility', fixture: 'fixture-manual-log', runnable: true },
  { kind: 'core.utility.map', category: 'Utility', fixture: 'fixture-event-map', runnable: true },
];

/**
 * Builds the Storybook story for one node kind: opens its fixture on the
 * canonical editor/runner page and documents how to play it.
 */
function nodeWorkflowStory(spec: NodeWorkflowSpec): StoryObj<GraphPage> {
  const fixture = spec.fixture;
  const engine = spec.engine ?? storyEngine();
  const sample = spec.sampleInputs
    ? `Enter \`${spec.sampleInputs}\` in the workflow inputs, then press **Play**.`
    : 'Press **Play** — the fixture needs no manual inputs.';
  const limitation = spec.limitation ? `\n\n**Not playable yet:** ${spec.limitation}` : '';
  const nestedNote =
    spec.kind === 'core.flow.break'
      ? ' The break node runs inside the loop body; open the loop node and expand its body nodes to review the break node\'s own run inputs and outputs.'
      : '';
  return {
    name: spec.kind,
    args: {
      ...(fixture
        ? { operation: 'read', workflowId: fixture, engine }
        : { operation: 'create', engine }),
      runAllowed: spec.runnable,
    },
    parameters: {
      docs: {
        description: {
          story: fixture
            ? `Runs the real \`${fixture}\` workflow, which exercises \`${spec.kind}\`. ${sample} ` +
              `The run console and the node inspection panes show the per-node inputs and outputs.` +
              ` Backend: \`?graphBackend=\` (default \`${DEFAULT_BACKEND_URL}\`), engine \`${engine}\`.` +
              nestedNote +
              limitation
            : `Opens the authoring canvas so \`${spec.kind}\` can be added from the node palette.` +
              limitation,
        },
      },
    },
  };
}

const component = getComponentMeta<GraphPage>(
  [],
  'page',
  {},
  [{ provide: GRAPH_BACKEND_URL, useFactory: storyBackendUrl }]
);

const meta: Meta<GraphPage> = {
  title: 'Graph/Node Workflows',
  component: GraphPage,
  ...component,
  argTypes: {
    ...component.argTypes,
    operation: { control: 'select', options: ['demo', 'create', 'read', 'update'] },
    engine: { control: 'select', options: ['local', 'mastra', 'dagster'] },
  },
  parameters: {
    ...component.parameters,
    docs: {
      description: {
        component:
          'One story per functional built-in node kind (input/output boundary kinds excluded). ' +
          'Each story opens the demo fixture that exercises the kind on the real graph page, so ' +
          'Play executes the as-graph backend and the inspection panes show the run inputs/outputs. ' +
          'Start the backend first, then open a story with `?graphBackend=http://localhost:3011&engine=local`.',
      },
    },
  },
};
export default meta;

type Story = StoryObj<GraphPage>;

export const agent: Story = nodeWorkflowStory(NODE_WORKFLOWS[0]);
export const flowBreak: Story = nodeWorkflowStory(NODE_WORKFLOWS[1]);
export const flowDelay: Story = nodeWorkflowStory(NODE_WORKFLOWS[2]);
export const flowErrorBoundary: Story = nodeWorkflowStory(NODE_WORKFLOWS[3]);
export const flowHumanApproval: Story = nodeWorkflowStory(NODE_WORKFLOWS[4]);
export const flowIf: Story = nodeWorkflowStory(NODE_WORKFLOWS[5]);
export const flowLog: Story = nodeWorkflowStory(NODE_WORKFLOWS[6]);
export const flowMerge: Story = nodeWorkflowStory(NODE_WORKFLOWS[7]);
export const flowParallel: Story = nodeWorkflowStory(NODE_WORKFLOWS[8]);
export const flowReturn: Story = nodeWorkflowStory(NODE_WORKFLOWS[9]);
export const flowSwitch: Story = nodeWorkflowStory(NODE_WORKFLOWS[10]);
export const loopForeach: Story = nodeWorkflowStory(NODE_WORKFLOWS[11]);
export const loopUntil: Story = nodeWorkflowStory(NODE_WORKFLOWS[12]);
export const loopWhile: Story = nodeWorkflowStory(NODE_WORKFLOWS[13]);
export const triggerChat: Story = nodeWorkflowStory(NODE_WORKFLOWS[14]);
export const triggerEvent: Story = nodeWorkflowStory(NODE_WORKFLOWS[15]);
export const triggerForm: Story = nodeWorkflowStory(NODE_WORKFLOWS[16]);
export const triggerManual: Story = nodeWorkflowStory(NODE_WORKFLOWS[17]);
export const triggerSchedule: Story = nodeWorkflowStory(NODE_WORKFLOWS[18]);
export const triggerWebhook: Story = nodeWorkflowStory(NODE_WORKFLOWS[19]);
export const utilityCode: Story = nodeWorkflowStory(NODE_WORKFLOWS[20]);
export const utilityLog: Story = nodeWorkflowStory(NODE_WORKFLOWS[21]);
export const utilityMap: Story = nodeWorkflowStory(NODE_WORKFLOWS[22]);
