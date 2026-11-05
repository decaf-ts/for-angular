/**
 * @module for-angular/stories/graph-node-configs
 * @summary Storybook stories that show every functional node kind's configuration screen (req 13).
 * @description Mounts {@link GraphNodeEditModalComponent} once per built-in
 * functional node kind, fed from the shipped manifest snapshot, so each node's
 * declared configuration fields (and its port defaults) are reviewable in
 * isolation. Input/output boundary kinds are excluded. Nodes whose execution
 * depends on an external integration are called out in the story description;
 * their connection values are placeholders, never live credentials.
 */
import type { Meta, StoryObj } from '@storybook/angular';
import {
  PortDirection,
  type GraphNodeInstance,
  type GraphNodeManifest,
  type GraphParameterDefinition,
} from '@decaf-ts/as-graph/shared';
import { GraphNodeEditModalComponent } from 'src/diagrams/components/graph/components/graph-node-edit-modal/graph-node-edit-modal.component';
import { GRAPH_BUILT_IN_NODE_MANIFEST_SNAPSHOT } from 'src/diagrams/components/graph/catalog/GraphNodeManifestSnapshot';
import type { GraphDemoNodeData } from 'src/diagrams/components/graph/types';
import './setup';
import { getComponentMeta } from './utils';

/** A single canonical port declaration from a node manifest. */
type ManifestPort = GraphNodeManifest['inputs'][number];

/** The node-face port shape rendered by {@link GraphNodeEditModalComponent}. */
type DemoPort = GraphDemoNodeData['ports'][number];

/** Manifest kinds that need a mocked external connection before they can be played. */
const EXTERNAL_INTEGRATION_KINDS: Record<string, string> = {
  'core.agent': 'Mastra model provider (LLM connection mocked; response time simulated).',
};

/**
 * Projects a canonical manifest port into the diagram node-face port shape the
 * edit modal renders.
 */
function portOf(port: ManifestPort): DemoPort {
  const schema = port.schema as { type?: string; name?: string } | undefined;
  return {
    property: port.id,
    name: port.id,
    label: port.label ?? port.id,
    direction: port.direction === 'output' ? PortDirection.OUTPUT : PortDirection.INPUT,
    type: (schema?.type ?? schema?.name ?? 'text') as DemoPort['type'],
    required: Boolean(port.required),
    hidden: Boolean((port as { hidden?: boolean }).hidden),
  } as DemoPort;
}

/** Builds the node-face data the edit modal expects from a manifest. */
function nodeDataOf(manifest: GraphNodeManifest): GraphDemoNodeData {
  return {
    title: manifest.display.name,
    description: manifest.display.description ?? '',
    kind: manifest.kind,
    category: manifest.display.category,
    labels: manifest.display.labels ?? [],
    ports: [...manifest.inputs, ...manifest.outputs].map(portOf),
    sourceClass: manifest.kind,
  };
}

/**
 * Keeps only the parameters that are not port-backed: port defaults are edited
 * through the port fields, not duplicated as configuration rows.
 */
function configParametersOf(manifest: GraphNodeManifest): GraphParameterDefinition[] {
  const portIds = new Set([...manifest.inputs, ...manifest.outputs].map((port) => port.id));
  return (manifest.parameters ?? []).filter((parameter) => !portIds.has(parameter.id));
}

/** Builds the args for one node kind's configuration story. */
function configStory(manifest: GraphNodeManifest): StoryObj<GraphNodeEditModalComponent> {
  const nodeInstance: GraphNodeInstance = {
    id: `${manifest.kind}-1`,
    kind: manifest.kind,
    parameters: {},
    inputBindings: {},
  } as GraphNodeInstance;
  const integration = EXTERNAL_INTEGRATION_KINDS[manifest.kind];
  return {
    name: manifest.kind,
    args: {
      nodeTitle: manifest.display.name,
      nodeId: nodeInstance.id,
      nodeData: nodeDataOf(manifest),
      nodeInstance,
      parameterDefs: configParametersOf(manifest),
    },
    parameters: {
      docs: {
        description: {
          story:
            `Configuration screen for \`${manifest.kind}\` (${manifest.display.name}). ` +
            `Editable configuration: ${configParametersOf(manifest).map((p) => `\`${p.id}\``).join(', ') || 'port defaults only'}.` +
            (integration ? ` External integration: ${integration}` : ' Self-contained: no external service required.'),
        },
      },
    },
  };
}

const MANIFEST_BY_KIND = new Map(
  GRAPH_BUILT_IN_NODE_MANIFEST_SNAPSHOT.map((manifest) => [manifest.kind, manifest])
);

/**
 * Reads a manifest by kind. The exports below cover every kind in the snapshot;
 * the lookup keeps the story declarations explicit and ordered by category.
 */
function manifestOf(kind: string): GraphNodeManifest {
  const manifest = MANIFEST_BY_KIND.get(kind);
  if (!manifest) {
    throw new Error(`Storybook node configuration story references unknown kind '${kind}'.`);
  }
  return manifest;
}

const component = getComponentMeta<GraphNodeEditModalComponent>([], 'modal');
const meta: Meta<GraphNodeEditModalComponent> = {
  title: 'Graph/Node Configurations',
  component: GraphNodeEditModalComponent,
  ...component,
  argTypes: {
    ...component.argTypes,
    nodeData: { control: false, table: { disable: true } },
    nodeInstance: { control: false, table: { disable: true } },
    parameterDefs: { control: false, table: { disable: true } },
  },
  parameters: {
    ...component.parameters,
    docs: {
      description: {
        component:
          'One story per functional built-in node kind (input/output boundary kinds excluded), ' +
          'showing the node edit modal with the kind\'s declared configuration fields. ' +
          'External-integration nodes use placeholder connection values with simulated latency; ' +
          'no live credentials are used.',
      },
    },
  },
};
export default meta;

type Story = StoryObj<GraphNodeEditModalComponent>;

export const agent: Story = configStory(manifestOf('core.agent'));
export const flowBreak: Story = configStory(manifestOf('core.flow.break'));
export const flowDelay: Story = configStory(manifestOf('core.flow.delay'));
export const flowErrorBoundary: Story = configStory(manifestOf('core.flow.errorBoundary'));
export const flowHumanApproval: Story = configStory(manifestOf('core.flow.humanApproval'));
export const flowIf: Story = configStory(manifestOf('core.flow.if'));
export const flowLog: Story = configStory(manifestOf('core.flow.log'));
export const flowMerge: Story = configStory(manifestOf('core.flow.merge'));
export const flowParallel: Story = configStory(manifestOf('core.flow.parallel'));
export const flowReturn: Story = configStory(manifestOf('core.flow.return'));
export const flowSwitch: Story = configStory(manifestOf('core.flow.switch'));
export const loopForeach: Story = configStory(manifestOf('core.loop.foreach'));
export const loopUntil: Story = configStory(manifestOf('core.loop.until'));
export const loopWhile: Story = configStory(manifestOf('core.loop.while'));
export const triggerChat: Story = configStory(manifestOf('core.trigger.chat'));
export const triggerEvent: Story = configStory(manifestOf('core.trigger.event'));
export const triggerForm: Story = configStory(manifestOf('core.trigger.form'));
export const triggerManual: Story = configStory(manifestOf('core.trigger.manual'));
export const triggerSchedule: Story = configStory(manifestOf('core.trigger.schedule'));
export const triggerWebhook: Story = configStory(manifestOf('core.trigger.webhook'));
export const utilityCode: Story = configStory(manifestOf('core.utility.code'));
export const utilityLog: Story = configStory(manifestOf('core.utility.log'));
export const utilityMap: Story = configStory(manifestOf('core.utility.map'));
