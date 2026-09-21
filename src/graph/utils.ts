import { Injector } from '@angular/core';
import { ValidationError } from '@decaf-ts/db-decorators';
import { Constructor } from '@decaf-ts/decoration';
import { Model } from '@decaf-ts/decorator-validation';
import {
  graphDecoratedWorkflowCompiler,
  graphDefinitionOf,
  graphJsonParser,
  graphJsonSerializer,
  graphLeafPortsOf,
  graphWorkflowDefinitionOf,
  PortDirection,
  type GraphJsonValue,
  type GraphNodeInstance,
  type GraphNodeKind,
  type GraphNodeManifest,
  type GraphPortDefinition,
  type GraphSnapshotEditorState,
  type GraphWorkflowSnapshot,
} from '@decaf-ts/ui-decorators/graph';
import type { SwitchNodeMetadata, SwitchCase } from '@decaf-ts/ui-decorators/graph';
import type { GraphNodeDefinition } from '@decaf-ts/ui-decorators/graph';
import { initializeModel, type ModelAdapter } from 'ng-diagram';
import {
  graphCanvasPortDefinitionOf,
  graphWorkflowDocumentCanvasModelOf,
} from './document/GraphDiagramAdapter';
import { hydrateGraphWorkflowDocumentValues } from './document/GraphNodeValueHydration';
import type { GraphNodeManifestReader } from './catalog';
import type {
  GraphBoundaryNodeData,
  GraphCanvasNodeBlueprint,
  GraphDemoNodeData,
  GraphRendererNodeData,
  GraphRendererSummary,
  GraphRendererSummaryItem,
  GraphRendererViewModel,
} from './types';

export interface GraphRendererSnapshotState {
  duplicateCounts: Record<string, number>;
  diagramMetadata: Record<string, unknown>;
}

/** Per-node editor state mirrored from canonical `GraphNodeInstance` port blocks. */
export interface GraphNodeInstanceState {
  portModes: Record<string, 'port' | 'value'>;
  values: Record<string, unknown>;
  outputSplits: string[];
  metadata?: SwitchNodeMetadata;
}

export function titleFromDefinition(definitionName: string): string {
  return definitionName
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function resolvePortPath(port: { path?: string; property: string }): string {
  return port.path || port.property;
}

function readNestedValue(values: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((current, segment) => {
    if (current && typeof current === 'object' && segment in (current as Record<string, unknown>)) {
      return (current as Record<string, unknown>)[segment];
    }
    return undefined;
  }, values);
}

function cloneJson<T>(value: T): T {
  if (value === undefined) return value;
  if (typeof globalThis.structuredClone === 'function') {
    try {
      return globalThis.structuredClone(value);
    } catch {
      // fall through to JSON clone for values containing functions
    }
  }
  return JSON.parse(JSON.stringify(value)) as T;
}

function cloneNodeArray<T>(value: T): T {
  if (value === undefined) return value;
  if (Array.isArray(value)) {
    return value.map((entry) => cloneNodeArray(entry)) as T;
  }
  if (value && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      if (typeof entry === 'function') {
        result[key] = entry;
      } else {
        result[key] = cloneNodeArray(entry);
      }
    }
    return result as T;
  }
  return value;
}

function toRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function readModelState(model: ModelAdapter) {
  const parsed = JSON.parse(model.toJSON()) as {
    nodes?: unknown[];
    edges?: unknown[];
    metadata?: Record<string, unknown>;
  };

  return {
    nodes: Array.isArray(parsed.nodes) ? parsed.nodes : [],
    edges: Array.isArray(parsed.edges) ? parsed.edges : [],
    metadata: toRecord(parsed.metadata),
  };
}

export function countPortsByDirection(direction: PortDirection, ports: GraphDemoNodeData['ports']) {
  return ports.filter((port) => port.direction === direction).length;
}

/**
 * Metadata-only definition of the workflow input-value boundary badge (R2-1):
 * the backend `GraphInputValueNode` class is no longer frontend-reachable, so the
 * boundary's kind/ports/display are declared here as serializable metadata only —
 * no class, constructor, or function participates.
 */
const graphInputBoundaryDefinition: GraphNodeDefinition = {
  name: 'GraphInputValueNode',
  tag: 'graph-input-value-node',
  kind: 'value',
  category: 'Boundary',
  color: '#0f766e',
  icon: 'ti-circle-plus',
  labels: ['workflow', 'input', 'value'],
  width: 72,
  height: 32,
  ports: [
    {
      property: 'value',
      path: 'value',
      direction: PortDirection.OUTPUT,
      name: 'value',
      label: 'value',
      required: false,
      hidden: false,
      connectionRules: { allowMultiple: true },
    } as GraphPortDefinition,
  ],
  graph: {
    metadata: {
      title: 'Workflow input value',
      description: 'Reusable canvas value node representing a workflow input.',
    },
  },
} as unknown as GraphNodeDefinition;

/**
 * Static port of the output-boundary badge (the n8n result analog, D2/G3-09):
 * a single `value` **input** handle so workflow-output edges project as
 * port→port connections instead of being dropped.
 */
const graphOutputBoundaryPorts: GraphPortDefinition[] = [
  {
    property: 'value',
    path: 'value',
    direction: PortDirection.INPUT,
    name: 'value',
    label: 'value',
    required: false,
    hidden: false,
  } as GraphPortDefinition,
];

function resolveGraphReference(ref: unknown) {
  if (typeof ref === 'function') {
    return graphDefinitionOf(ref as never);
  }

  return undefined;
}

function buildBoundaryNode(
  property: string,
  port: GraphRendererViewModel['workflow']['inputs'][number],
  index: number,
  duplicateIndex: number,
  workflowName: string,
  value: unknown
): GraphCanvasNodeBlueprint<GraphBoundaryNodeData> {
  return {
    id: `input-${property}${duplicateIndex > 0 ? `-${duplicateIndex}` : ''}`,
    type: graphInputBoundaryDefinition.kind,
    position: {
      x: 40,
      y: 120 + index * 120 + duplicateIndex * 22,
    },
    size: {
      width: 72,
      height: 32,
    },
    resizable: false,
    draggable: true,
    autoSize: false,
    data: {
      title: port.label,
      kind: graphInputBoundaryDefinition.kind,
      role: 'input',
      property,
      sourceClass: workflowName,
      sourcePort: property,
      duplicateIndex,
      isPrimary: duplicateIndex === 0,
      value,
      ports: graphInputBoundaryDefinition.ports,
      expanded: false,
    },
  };
}

/**
 * Resolves the declared default value of a workflow port definition the same way
 * the manifest/workflow compilers do: element props, then `prop.value`, then the
 * validation metadata's `defaultValue`. `GraphPortDefinition` itself carries no
 * `defaultValue` (that lives on the document port instance), so the definition's
 * nested metadata is the only source.
 */
function resolvePortDefaultValue(port: GraphPortDefinition): unknown {
  return port.element?.['props']?.['value'] ?? port.prop?.['value'] ?? port.validation?.['defaultValue'];
}

/**
 * Builds the canvas output-boundary badge for one workflow output port
 * (D2/G3-09). Mirrors {@link buildBoundaryNode} for the result role: the
 * badge carries a real `value` input handle and is positioned opposite the
 * input badges.
 */
function buildOutputBoundaryNode(
  property: string,
  port: GraphPortDefinition,
  index: number,
  workflowName: string
): GraphCanvasNodeBlueprint<GraphBoundaryNodeData> {
  return {
    id: `output-${property}`,
    type: graphInputBoundaryDefinition.kind,
    position: {
      x: 980,
      y: 120 + index * 120,
    },
    size: {
      width: 72,
      height: 32,
    },
    resizable: false,
    draggable: true,
    autoSize: false,
    data: {
      title: port.label ?? property,
      kind: graphInputBoundaryDefinition.kind,
      role: 'output',
      property,
      sourceClass: workflowName,
      sourcePort: property,
      duplicateIndex: 0,
      isPrimary: true,
      value: resolvePortDefaultValue(port),
      ports: graphOutputBoundaryPorts,
      expanded: false,
    },
  };
}

export function buildMemberNode(
  ctor: unknown,
  index: number,
  fallbackId?: string,
  fallbackLabel?: string
): GraphCanvasNodeBlueprint<GraphRendererNodeData> {
  const definition = graphDefinitionOf(ctor as never);
  const metadata = (definition.graph?.metadata || {}) as Record<string, unknown>;
  const nodeId = fallbackId || definition.name;
  const label = fallbackLabel || String(metadata['title'] ?? titleFromDefinition(definition.name));

  const switchMeta = metadata['switch'] as SwitchNodeMetadata | undefined;
  const hasSwitchCases = switchMeta && Array.isArray(switchMeta.cases) && switchMeta.cases.length > 0;
  const hasDefault = switchMeta?.hasDefault === true;
  const defaultPortName = switchMeta?.defaultPort ?? 'default';

  let ports: GraphPortDefinition[] = [...definition.ports];
  let height = definition.height ?? 96;

  if (hasSwitchCases && switchMeta) {
    const casePortNames = new Set(switchMeta.cases.map((c: SwitchCase) => c.outputPort));
    const caseOutputPorts: GraphPortDefinition[] = switchMeta.cases.map((c: SwitchCase) => ({
      property: c.outputPort,
      name: c.label,
      direction: PortDirection.OUTPUT,
      label: c.label,
      required: false,
      hidden: false,
      path: c.outputPort,
    }));
    // Remove both the default port and any case ports that are already declared
    // as static @output on the class (prevents duplicate port rendering).
    const nonDefaultNonCasePorts = ports.filter(
      (p) => p.property !== defaultPortName && !casePortNames.has(p.property)
    );
    const defaultPort = ports.find((p) => p.property === defaultPortName);
    ports = [...nonDefaultNonCasePorts, ...caseOutputPorts];
    if (hasDefault && defaultPort) {
      ports.push(defaultPort);
    }
    height = Math.max(height, 140 + switchMeta.cases.length * 24);
  }

  return {
    id: nodeId,
    type: definition.kind,
    position: {
      x: 380 + index * 190,
      y: [130, 70, 280][index % 3],
    },
    size: {
      width: definition.width ?? 96,
      height,
    },
    resizable: false,
    draggable: true,
    autoSize: false,
    data: {
      title: label,
      description: String(metadata['description'] ?? ''),
      kind: definition.kind,
      category: definition.category,
      color: definition.effectiveColor ?? definition.color,
      icon: definition.effectiveIcon ?? definition.icon,
      labels: definition.labels,
      ports,
      sourceClass: definition.name,
      modelClass: ctor as never,
      expanded: false,
      switchMetadata: switchMeta,
    },
  };
}

/** A manifest-only palette entry (§4.14): display-ready metadata derived from a `GraphNodeManifest`, never a constructor. */
export interface GraphPaletteEntry {
  manifest: GraphNodeManifest;
  name: string;
  kind: string;
  title: string;
  description: string;
  category?: string;
  color?: string;
  icon?: string;
}

function graphPaletteIconNameOf(manifest: GraphNodeManifest): string | undefined {
  const icon = manifest.display?.icon as { type?: string; name?: string; url?: string } | undefined;
  if (!icon) return undefined;
  if (icon.type === 'catalogue' && typeof icon.name === 'string' && icon.name) return icon.name;
  if (icon.type === 'url' && typeof icon.url === 'string' && icon.url) return icon.url;
  return undefined;
}

/**
 * Build the manifest-only palette entries the editor palette renders after
 * the P7 cutover (§4.14): node constructors never participate in discovery.
 */
export function graphPaletteEntriesOf(manifests: GraphNodeManifest[]): GraphPaletteEntry[] {
  return manifests
    .filter((manifest) => !!manifest && typeof manifest.kind === 'string' && !!manifest.kind)
    .map((manifest) => {
      const display = manifest.display;
      const name = typeof display?.name === 'string' && display.name ? display.name : manifest.kind;
      return {
        manifest,
        name,
        kind: manifest.kind,
        title: name,
        description: typeof display?.description === 'string' ? display.description : '',
        category: typeof display?.category === 'string' ? display.category : undefined,
        color: typeof display?.color === 'string' ? display.color : undefined,
        icon: graphPaletteIconNameOf(manifest),
      };
    })
    .sort((left, right) => left.title.localeCompare(right.title));
}

/**
 * Standalone manifest-backed canvas blueprint for palette/ghost-added nodes
 * (§4.14): a manifest drives every editor-affecting property (ports, size,
 * display data); no constructor runs in the browser.
 */
export function buildManifestMemberNode(
  entry: GraphPaletteEntry,
  index: number,
  fallbackId?: string,
  fallbackLabel?: string
): GraphCanvasNodeBlueprint<GraphRendererNodeData> {
  const display = entry.manifest.display;
  const inputs = entry.manifest.inputs ?? [];
  const outputs = entry.manifest.outputs ?? [];
  const connections = entry.manifest.connections ?? [];
  const staticIds = new Set([...inputs, ...outputs, ...connections].map((port) => port.id));
  const ports: GraphPortDefinition[] = [
    ...inputs,
    ...outputs,
    ...connections,
  ].map((port) => graphCanvasPortDefinitionOf(port, !staticIds.has(port.id)));
  const width = typeof display?.width === 'number' ? display.width : 96;
  const height = typeof display?.height === 'number' ? display.height : 96;

  return {
    id: fallbackId ?? entry.kind,
    type: entry.kind,
    position: {
      x: 380 + index * 190,
      y: [130, 70, 280][index % 3],
    },
    size: {
      width,
      height,
    },
    resizable: false,
    draggable: true,
    autoSize: false,
    data: {
      title: fallbackLabel ?? entry.title,
      description: entry.description,
      kind: entry.kind,
      category: entry.category,
      color: entry.color,
      icon: entry.icon,
      labels: Array.isArray(display?.labels) ? [...display.labels] : [],
      ports,
      sourceClass: entry.name,
      expanded: false,
    },
  };
}

function mergeNodeRuntimeState<
  T extends {
    [key: string]: unknown;
    id: string;
    data?: Record<string, unknown>;
    position?: Record<string, unknown>;
    size?: Record<string, unknown>;
  },
>(next: T, previous?: T): T {
  if (!previous) return next;

  return {
    ...previous,
    ...next,
    position: (previous.position as Record<string, unknown> | undefined) ?? next.position,
    size: next.size,
    data: {
      ...(previous.data || {}),
      ...(next.data || {}),
      expanded: (previous.data?.['expanded'] ?? next.data?.['expanded']) as unknown,
      pinned: (previous.data?.['pinned'] ?? next.data?.['pinned']) as unknown,
    },
  };
}

function mergeEdgeRuntimeState<T extends { [key: string]: unknown; id: string; data?: Record<string, unknown> }>(
  next: T,
  previous?: T
): T {
  if (!previous) return next;

  return {
    ...previous,
    ...next,
    data: {
      ...(previous.data || {}),
      ...(next.data || {}),
    },
  };
}

function resolveWorkflowNodeId(
  ref: unknown,
  nodeLookup: Map<string, GraphCanvasNodeBlueprint<GraphRendererNodeData>>
): string | undefined {
  if (!ref) return undefined;
  if (typeof ref === 'string') {
    return nodeLookup.get(ref)?.id;
  }

  if (typeof ref === 'function') {
    const definition = resolveGraphReference(ref);
    if (definition) {
      return nodeLookup.get(definition.name)?.id ?? nodeLookup.get(definition.tag)?.id;
    }
  }

  if (typeof ref === 'object' && 'name' in (ref as Record<string, unknown>)) {
    const name = String((ref as Record<string, unknown>)['name']);
    return nodeLookup.get(name)?.id;
  }

  return undefined;
}

function resolveWorkflowEndpoint(
  reference: unknown,
  property: string | undefined,
  workflowName: string,
  nodeLookup: Map<string, GraphCanvasNodeBlueprint<GraphRendererNodeData>>,
  boundaryLookup: Map<string, GraphCanvasNodeBlueprint<GraphBoundaryNodeData>>
) {
  const normalizedReference =
    typeof reference === 'string'
      ? reference
      : typeof reference === 'function'
        ? resolveGraphReference(reference)?.name
        : undefined;

  if (normalizedReference === workflowName || normalizedReference === 'workflow' || normalizedReference === 'graph') {
    if (!property) {
      throw new Error('Workflow boundary relations require a port name.');
    }

    const boundary = boundaryLookup.get(property);
    if (!boundary) {
      throw new Error(`Unknown workflow boundary port: ${property}`);
    }

    return {
      nodeId: boundary.id,
      portId: 'value',
      boundary: true,
    };
  }

  const nodeId = resolveWorkflowNodeId(reference, nodeLookup);
  if (!nodeId) {
    throw new Error(`Unknown graph relation endpoint: ${String(reference)}`);
  }

  return {
    nodeId,
    portId: property || 'value',
    boundary: false,
  };
}

export function getGraphWorkflowSummary<M extends Model>(model: GraphModelLike<M>): GraphRendererSummary {
  const workflow = graphWorkflowDefinitionOf(model);
  const nodeDefinitions = workflow.nodes.map((entry) =>
    typeof entry.node === 'function'
      ? graphDefinitionOf(entry.node as never)
      : {
          kind: entry.kind ?? 'node',
          name: entry.id,
          tag: entry.id,
          category: undefined,
          color: undefined,
          graph: { metadata: entry.metadata ?? {} },
        }
  );
  const inputBoundaryDefinition = graphInputBoundaryDefinition;
  const itemsByKind = new Map<string, GraphRendererSummaryItem>();

  const addKind = (kind: string, label: string, category?: string, color?: string, description?: string) => {
    const current = itemsByKind.get(kind);
    const next: GraphRendererSummaryItem = current
      ? {
          ...current,
          count: current.count + 1,
        }
      : {
          kind,
          label,
          count: 1,
          category,
          color,
          description,
        };

    itemsByKind.set(kind, next);
  };

  addKind(
    workflow.kind,
    String(workflow.graph?.metadata?.['title'] ?? workflow.tag),
    workflow.category,
    workflow.color,
    String(workflow.graph?.metadata?.['description'] ?? '')
  );

  for (const definition of nodeDefinitions) {
    const metadata = (definition.graph?.metadata || {}) as Record<string, unknown>;
    addKind(
      definition.kind,
      String(metadata['title'] ?? definition.tag ?? definition.name),
      definition.category,
      definition.color,
      String(metadata['description'] ?? '')
    );
  }

  addKind(
    inputBoundaryDefinition.kind,
    String(inputBoundaryDefinition.graph?.metadata?.['title'] ?? 'Workflow inputs'),
    inputBoundaryDefinition.category,
    inputBoundaryDefinition.color,
    String(inputBoundaryDefinition.graph?.metadata?.['description'] ?? '')
  );

  const workflowInputs = graphLeafPortsOf(workflow.inputs);
  const workflowOutputs = graphLeafPortsOf(workflow.outputs);

  return {
    totalNodes: 1 + nodeDefinitions.length + workflowInputs.length,
    totalEdges: workflow.relations?.length || 0,
    totalInputs: workflowInputs.length,
    totalOutputs: workflowOutputs.length,
    items: Array.from(itemsByKind.values()),
    orderedNodes: [
      {
        name: workflow.name,
        kind: workflow.kind,
        label: String(workflow.graph?.metadata?.['title'] ?? workflow.tag),
        category: workflow.category,
        color: workflow.color,
        description: String(workflow.graph?.metadata?.['description'] ?? ''),
      },
      ...nodeDefinitions.map((definition) => {
        const metadata = (definition.graph?.metadata || {}) as Record<string, unknown>;
        return {
          name: definition.name,
          kind: definition.kind,
          label: String(metadata['title'] ?? definition.tag ?? definition.name),
          category: definition.category,
          color: definition.color,
          description: String(metadata['description'] ?? ''),
        };
      }),
    ],
    edgeLabels: (workflow.relations || []).map((edge) => ({
      label: String(edge.label ?? edge.sourcePort ?? edge.targetPort ?? 'relation'),
      sourceClass: String(
        typeof edge.source === 'function' ? (resolveGraphReference(edge.source)?.name ?? 'workflow') : edge.source
      ),
      targetClass: String(
        typeof edge.target === 'function' ? (resolveGraphReference(edge.target)?.name ?? 'workflow') : edge.target
      ),
    })),
  };
}

/**
 * Kinds of kind-only workflow node entries whose manifest has not yet landed in
 * the catalogue (R2-1 metadata-only). The catalogue load is asynchronous, so the
 * renderer defers its seed and view-model projection while this is non-empty —
 * exactly like the doc-driven `settleCanvasFromDocument` reconcile — instead of
 * throwing from inside a computed/effect and destabilizing the page.
 */
export function graphWorkflowUnresolvedNodeKinds<M extends Model>(
  model: GraphModelLike<M>,
  manifests: GraphNodeManifest[] = []
): GraphNodeKind[] {
  const workflow = graphWorkflowDefinitionOf(model);
  const kinds = new Set(manifests.map((manifest) => manifest.kind));
  return workflow.nodes
    .filter((entry) => !(entry.node && typeof entry.node === 'function'))
    .map((entry) => entry.kind)
    .filter((kind): kind is GraphNodeKind => !!kind && !kinds.has(kind));
}

export function buildGraphRendererViewModel<M extends Model>(
  model: GraphModelLike<M>,
  inputValues: Record<string, unknown> = {},
  duplicateInputs: Record<string, number> = {},
  manifests: GraphNodeManifest[] = []
): GraphRendererViewModel {
  const workflow = graphWorkflowDefinitionOf(model);
  const workflowInputs: ReturnType<typeof graphLeafPortsOf> = graphLeafPortsOf(workflow.inputs);
  const workflowOutputs: ReturnType<typeof graphLeafPortsOf> = graphLeafPortsOf(workflow.outputs);
  const inputLookup = new Map<string, GraphCanvasNodeBlueprint<GraphBoundaryNodeData>>();
  const outputLookup = new Map<string, GraphCanvasNodeBlueprint<GraphBoundaryNodeData>>();
  const memberNodes = new Map<string, GraphCanvasNodeBlueprint<GraphRendererNodeData>>();

  const inputs = workflowInputs.flatMap((port, index) => {
    const portPath = resolvePortPath(port);
    const copies = 1 + (duplicateInputs[portPath] || 0);
    return Array.from({ length: copies }, (_, duplicateIndex) => {
      const node = buildBoundaryNode(
        portPath,
        port,
        index,
        duplicateIndex,
        workflow.name,
        readNestedValue(inputValues, portPath)
      );
      if (duplicateIndex === 0) {
        inputLookup.set(portPath, node);
      }
      return node;
    });
  });

  // Output-boundary badges (D2/G3-09): one per workflow output port, so the
  // workflow-output relations project as port→port connections in the legacy
  // decorated-root canvas exactly as they do in the doc-driven adapter.
  const outputs = workflowOutputs.map((port, index) => {
    const portPath = resolvePortPath(port);
    const node = buildOutputBoundaryNode(portPath, port, index, workflow.name);
    outputLookup.set(portPath, node);
    return node;
  });

  const nodes = workflow.nodes.map((entry, index) => {
    // R2-1 metadata-only: a workflow node entry may carry a decorated authoring
    // class (legacy authoring input) or only a kind. When only a kind is present
    // the canvas node is built from the serializable catalogue manifest — no node
    // class is imported, extended, or instantiated by the frontend.
    if (entry.node && typeof entry.node === 'function') {
      const node = buildMemberNode(entry.node, index, entry.id, entry.label);
      memberNodes.set(entry.id, node);
      memberNodes.set(node.data.sourceClass, node);
      memberNodes.set(node.type, node);
      return node;
    }

    const manifest = entry.kind ? manifests.find((candidate) => candidate.kind === entry.kind) : undefined;
    if (!manifest) {
      throw new Error(
        `Graph node entry ${entry.id} references kind '${entry.kind}' which is not in the node catalogue.`
      );
    }
    const paletteEntry = graphPaletteEntriesOf([manifest])[0];
    const node = buildManifestMemberNode(paletteEntry, index, entry.id, entry.label);
    memberNodes.set(entry.id, node);
    memberNodes.set(entry.kind ?? '', node);
    memberNodes.set(node.type, node);
    return node;
  });

  const edges = (workflow.relations || []).flatMap((relation, index) => {
    const source = resolveWorkflowEndpoint(
      relation.source,
      relation.sourcePort,
      workflow.name,
      memberNodes,
      inputLookup
    );
    const normalizedTarget =
      typeof relation.target === 'string'
        ? relation.target
        : typeof relation.target === 'function'
          ? resolveGraphReference(relation.target)?.name
          : undefined;
    const targetIsWorkflow =
      normalizedTarget === workflow.name || normalizedTarget === 'workflow' || normalizedTarget === 'graph';

    // Workflow-output relations bind the member output to the output-boundary
    // badge's `value` input port (D2/G3-09). An undeclared output port is
    // skipped (matching the doc-driven adapter's lenient projection) rather
    // than throwing inside the renderer's view-model computed.
    let target: ReturnType<typeof resolveWorkflowEndpoint>;
    if (targetIsWorkflow) {
      const boundary = relation.targetPort ? outputLookup.get(relation.targetPort) : undefined;
      if (!boundary) return [];
      target = { nodeId: boundary.id, portId: 'value', boundary: true };
    } else {
      target = resolveWorkflowEndpoint(
        relation.target,
        relation.targetPort,
        workflow.name,
        memberNodes,
        inputLookup
      );
    }

    return [
      {
        id: `edge-${index}`,
        type: 'graph-edge',
        source: source.nodeId,
        target: target.nodeId,
        sourcePort: source.portId,
        targetPort: target.portId,
        data: {
          label: relation.label,
          // The engine keys EDGE_STATE_CHANGED / EDGE_VALUE_ROUTED events by the
          // plan-edge id (`${sourceNodeId}:${sourcePort}->${targetNodeId}:${targetPort}`,
          // boundary resolved to `$workflow`). The canvas id is positional
          // (`edge-${index}`), so we carry the engine match key in data.
          engineEdgeId: `${
            source.boundary ? '$workflow' : source.nodeId
          }:${relation.sourcePort ?? source.portId}->${
            target.boundary ? '$workflow' : target.nodeId
          }:${relation.targetPort ?? target.portId}`,
        },
      },
    ];
  });

  return {
    workflow,
    inputs,
    outputs,
    nodes,
    edges,
    workflowOutputs: workflow.outputs,
  };
}

export function buildGraphRendererModel<M extends Model>(
  model: GraphModelLike<M>,
  injector?: Injector,
  inputValues: Record<string, unknown> = {},
  duplicateInputs: Record<string, number> = {},
  previousModel?: ModelAdapter | null,
  manifests: GraphNodeManifest[] = []
) {
  const viewModel = buildGraphRendererViewModel(model, inputValues, duplicateInputs, manifests);
  const nextModel = initializeModel(
    {
      nodes: [...viewModel.inputs, ...viewModel.outputs, ...viewModel.nodes],
      edges: viewModel.edges,
      metadata: {
        viewport: {
          x: 0,
          y: 0,
          scale: 1,
        },
      },
    },
    injector
  );

  if (!previousModel) {
    return nextModel;
  }

  const previousNodes = new Map(previousModel.getNodes().map((node) => [node.id, node] as const));
  const previousEdges = new Map(previousModel.getEdges().map((edge) => [edge.id, edge] as const));

  nextModel.updateNodes((currentNodes) =>
    currentNodes.map((node) => mergeNodeRuntimeState(node as never, previousNodes.get(node.id) as never) as never)
  );
  nextModel.updateEdges((currentEdges) =>
    currentEdges.map((edge) => mergeEdgeRuntimeState(edge as never, previousEdges.get(edge.id) as never) as never)
  );
  nextModel.updateMetadata((currentMetadata) => ({
    ...cloneJson(previousModel.getMetadata()),
    ...currentMetadata,
    viewport: {
      ...(previousModel.getMetadata()?.viewport || {}),
      ...(currentMetadata.viewport || {}),
    },
  }));

  return nextModel;
}

/**
 * Builds the canonical document-first snapshot (`{ document, editor?, metadata? }`,
 * DECAF-50 §4.26 R2-2) from the decorated workflow root and the live canvas.
 *
 * The `document` is compiled through the sanctioned decorated-workflow authoring
 * compiler (§4.4 — an authoring input convenience, not engine retro-compat); the
 * `editor` block carries the canvas-only state (duplicate counts, diagram
 * metadata, per-node port configs) that the canonical document cannot express.
 * No legacy snapshot shape, version field, or legacy conversion participates.
 */
export function buildGraphRendererSnapshot<M extends Model>(
  model: GraphModelLike<M>,
  diagram: ModelAdapter,
  inputValues: Record<string, unknown> = {},
  duplicateInputs: Record<string, number> = {},
  instances: Record<string, GraphNodeInstance> = {},
  // eslint-disable-next-line @typescript-eslint/array-type -- JSDoc cannot parse readonly array syntax.
  manifests: ReadonlyArray<GraphNodeManifest> = []
): GraphWorkflowSnapshot {
  const state = readModelState(diagram);
  const positions: Record<string, { x: number; y: number }> = {};
  for (const node of state.nodes as Record<string, unknown>[]) {
    const nodeId = typeof node['id'] === 'string' ? (node['id'] as string) : undefined;
    const position = node['position'] as { x?: unknown; y?: unknown } | undefined;
    if (!nodeId || !position) continue;
    if (typeof position.x === 'number' && typeof position.y === 'number') {
      positions[nodeId] = { x: position.x, y: position.y };
    }
  }
  const diagramMetadata = toRecord(state.metadata);
  const viewportRaw = toRecord(diagramMetadata['viewport']);
  const viewport =
    typeof viewportRaw['x'] === 'number' && typeof viewportRaw['y'] === 'number'
      ? {
          x: viewportRaw['x'] as number,
          y: viewportRaw['y'] as number,
          zoom: typeof viewportRaw['scale'] === 'number' ? (viewportRaw['scale'] as number) : 1,
        }
      : undefined;

  const document = hydrateGraphWorkflowDocumentValues(
    graphDecoratedWorkflowCompiler(model, {
      positions,
      viewport,
    }),
    manifests
  );

  const nodeConfigs: Record<string, Record<string, unknown>> = {};
  for (const [nodeId, instance] of Object.entries(instances)) {
    nodeConfigs[nodeId] = nodeInstanceConfigOf(instance, state.edges as never[]);
  }

  const editor: GraphSnapshotEditorState = {
    duplicateCounts: cloneJson(duplicateInputs),
    diagramMetadata: cloneJson(diagramMetadata) as Record<string, GraphJsonValue>,
    nodeConfigs: cloneJson(nodeConfigs) as Record<string, GraphJsonValue>,
  };

  return {
    document,
    editor,
    metadata: {
      serializedAt: new Date().toISOString(),
      inputValues: cloneJson(inputValues) as Record<string, GraphJsonValue>,
    },
  };
}

/** Per-node editor config carried in the canonical snapshot's `editor` block (port modes/values/splits). */
function nodeInstanceConfigOf(
  instance: GraphNodeInstance,
  edges: { source?: unknown; sourcePort?: unknown }[]
): Record<string, unknown> {
  const portModes: Record<string, 'port' | 'value'> = {};
  const values: Record<string, unknown> = {};
  for (const [portId, binding] of Object.entries(instance.inputBindings ?? {})) {
    if (binding?.mode === 'edge') {
      portModes[portId] = 'port';
      continue;
    }
    portModes[portId] = 'value';
    if (binding?.mode === 'literal') values[portId] = (binding as { value?: unknown }).value;
    else if (binding?.mode === 'expression')
      values[portId] = (binding as { expression?: unknown }).expression;
  }
  const outputSplits = edges
    .filter((edge) => edge.source === instance.id && typeof edge.sourcePort === 'string')
    .map((edge) => edge.sourcePort as string);
  return { portModes, values, outputSplits };
}

/**
 * Projects a canonical snapshot (`{ document, editor?, metadata? }`) into the
 * ng-diagram model the renderer restores. The document is projected through the
 * catalogue-backed adapter; the `editor` block restores the canvas-only state
 * (duplicate counts, viewport metadata) that the document does not carry.
 */
export function buildGraphRendererStateFromSnapshot<M extends Model>(
  model: GraphModelLike<M>,
  snapshot: GraphWorkflowSnapshot,
  catalogue: GraphNodeManifestReader,
  injector?: Injector
) {
  const editor = snapshot.editor ?? {};
  const duplicateCounts = toRecord(editor.duplicateCounts) as Record<string, number>;
  const diagramMetadata = toRecord(editor.diagramMetadata);
  const restoredNodeConfigs = toRecord(editor.nodeConfigs) as Record<string, GraphNodeInstanceState>;
  const projection = graphWorkflowDocumentCanvasModelOf(snapshot.document, catalogue);
  const viewport = toRecord(projection.metadata?.['viewport']);
  const diagram = initializeModel(
    {
      nodes: cloneNodeArray(projection.nodes) as never[],
      edges: cloneJson(projection.edges) as never[],
      metadata: {
        ...diagramMetadata,
        viewport: {
          x: 0,
          y: 0,
          scale: 1,
          ...viewport,
        },
      },
    },
    injector
  );

  return {
    diagram,
    inputValues: toRecord(snapshot.metadata?.['inputValues']),
    duplicateCounts,
    instanceConfigs: restoredNodeConfigs,
  };
}

/**
 * Parses the persisted canonical snapshot JSON (`{ document, editor?, metadata? }`,
 * §4.26 R2-2). The legacy `{ definition, state }` snapshot and its version
 * field are gone; only the canonical wrapper is accepted.
 */
export function parseGraphRendererSnapshot(
  json: string | GraphWorkflowSnapshot
): GraphWorkflowSnapshot {
  if (typeof json !== 'string') return json;
  const parsed = graphJsonParser(json);
  if (!parsed || typeof parsed !== 'object' || !('document' in (parsed as Record<string, unknown>))) {
    throw new ValidationError(
      'Serialized graph snapshot is not a canonical wrapper ({ document, editor?, metadata? }).'
    );
  }
  return parsed as GraphWorkflowSnapshot;
}

/** Serializes a canonical snapshot to its persisted JSON form (see {@link parseGraphRendererSnapshot}). */
export function stringifyGraphRendererSnapshot(snapshot: GraphWorkflowSnapshot, space = 2) {
  return graphJsonSerializer(snapshot, space);
}
type GraphModelLike<M extends Model = Model> = Constructor<M> | M;
