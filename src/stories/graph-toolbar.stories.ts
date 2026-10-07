import type { Meta, StoryObj } from '@storybook/angular';
import { GraphToolbarComponent } from 'src/graph/components/graph-toolbar/graph-toolbar.component';
import type { GraphValidationIssue } from 'src/graph/validation';
import './setup';
import { getComponentMeta } from './utils';

const ISSUES: GraphValidationIssue[] = [
  { code: 'missing-input', path: 'nodes[0].inputs.value', message: 'Required input is not connected', nodeId: 'log-1' },
  { code: 'missing-parameter', path: 'nodes[1].parameters.code', message: 'Code node has no code', nodeId: 'code-1' },
];

const component = getComponentMeta<GraphToolbarComponent>([]);
const meta: Meta<GraphToolbarComponent> = {
  title: 'Graph/Panels/Toolbar',
  component: GraphToolbarComponent,
  ...component,
  argTypes: {
    ...component.argTypes,
    validationIssues: { control: false, table: { disable: true } },
  },
};
export default meta;
type Story = StoryObj<GraphToolbarComponent>;

export const readyToRun: Story = {
  args: { workflowId: 'demo-workflow', canRun: true },
};

export const running: Story = {
  args: { workflowId: 'demo-workflow', canRun: true, isRunning: true },
};

export const invalidGraph: Story = {
  args: {
    workflowId: 'demo-workflow',
    canRun: true,
    invalid: true,
    validationIssues: ISSUES,
  },
};

export const backendUnavailable: Story = {
  args: { workflowId: 'demo-workflow', canRun: false },
};

export const afterRun: Story = {
  args: { workflowId: 'demo-workflow', canRun: true, hasRun: true },
};
