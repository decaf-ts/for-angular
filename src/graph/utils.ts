import { Injector } from '@angular/core';
import { Constructor } from '@decaf-ts/decoration';
import { Model } from '@decaf-ts/decorator-validation';
import {
  graphDefinitionOf,
  graphLeafPortsOf,
  graphWorkflowDefinitionOf,
  graphWorkflowSnapshotFromJSON,
  graphWorkflowSnapshotInputValuesOf,
  graphWorkflowSnapshotOf,
  graphWorkflowSnapshotToJSON,
  PortDirection,
  type GraphWorkflowSnapshot,
} from '@decaf-ts/ui-decorators/graph';
import { initializeModel, type ModelAdapter } from 'ng-diagram';
import { GraphInputValueNode } from './nodes/boundary-nodes';
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
    return globalThis.structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value)) as T;
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

function readDuplicateCountsFromNodes(nodes: unknown[]) {
  const counts = new Map<string, number>();

  for (const node of nodes) {
    if (!node || typeof node !== 'object') continue;
    const data = toRecord((node as Record<string, unknown>)['data']);
    if (data['role'] !== 'input') continue;

    const property = String(data['property'] || '');
    if (!property) continue;
    counts.set(property, (counts.get(property) || 0) + 1);
  }

  return Array.from(counts.entries()).reduce<Record<string, number>>((acc, [property, count]) => {
    acc[property] = Math.max(0, count - 1);
    return acc;
  }, {});
}

export function countPortsByDirection(direction: PortDirection, ports: GraphDemoNodeData['ports']) {
  return ports.filter((port) => port.direction === direction).length;
}

const graphInputBoundaryDefinition = graphDefinitionOf(GraphInputValueNode as never);
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
      width: 240,
      height: 130,
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
      modelClass: GraphInputValueNode as never,
      expanded: false,
    },
  };
}

function buildMemberNode(
  ctor: unknown,
  index: number,
  fallbackId?: string,
  fallbackLabel?: string
): GraphCanvasNodeBlueprint<GraphRendererNodeData> {
  const definition = graphDefinitionOf(ctor as never);
  const metadata = (definition.graph?.metadata || {}) as Record<string, unknown>;
  const nodeId = fallbackId || definition.name;
  const label = fallbackLabel || String(metadata['title'] ?? titleFromDefinition(definition.name));

  return {
    id: nodeId,
    type: definition.kind,
    position: {
      x: 380 + index * 270,
      y: index % 2 === 0 ? 130 : 70,
    },
    size: {
      width: definition.width ?? 300,
      height: definition.height ?? 220,
    },
    resizable: false,
    draggable: true,
    autoSize: false,
    data: {
      title: label,
      description: String(metadata['description'] ?? ''),
      kind: definition.kind,
      category: definition.category,
      color: definition.color,
      icon: definition.icon,
      labels: definition.labels,
      ports: definition.ports,
      sourceClass: definition.name,
      modelClass: ctor as never,
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
    size: (previous.size as Record<string, unknown> | undefined) ?? next.size,
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
  inputLookup: Map<string, GraphCanvasNodeBlueprint<GraphBoundaryNodeData>>
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

    const boundary = inputLookup.get(property);
    if (!boundary) {
      throw new Error(`Unknown workflow boundary port: ${property}`);
    }

    return {
      nodeId: boundary.id,
      portId: 'value',
    };
  }

  const nodeId = resolveWorkflowNodeId(reference, nodeLookup);
  if (!nodeId) {
    throw new Error(`Unknown graph relation endpoint: ${String(reference)}`);
  }

  return {
    nodeId,
    portId: property || 'value',
  };
}

export function getGraphWorkflowSummary<M extends Model>(model: GraphModelLike<M>): GraphRendererSummary {
  const workflow = graphWorkflowDefinitionOf(model);
  const nodeDefinitions = workflow.nodes
    .map((entry) => entry.node)
    .filter((entry): entry is Constructor<Model> => typeof entry === 'function')
    .map((ctor) => graphDefinitionOf(ctor as never));
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

export function buildGraphRendererViewModel<M extends Model>(
  model: GraphModelLike<M>,
  inputValues: Record<string, unknown> = {},
  duplicateInputs: Record<string, number> = {}
): GraphRendererViewModel {
  const workflow = graphWorkflowDefinitionOf(model);
  const workflowInputs: ReturnType<typeof graphLeafPortsOf> = graphLeafPortsOf(workflow.inputs);
  const inputLookup = new Map<string, GraphCanvasNodeBlueprint<GraphBoundaryNodeData>>();
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

  const nodes = workflow.nodes.map((entry, index) => {
    if (!entry.node || typeof entry.node !== 'function') {
      throw new Error(`Graph node entry ${entry.id} does not reference a decorated class.`);
    }

    const node = buildMemberNode(entry.node, index, entry.id, entry.label);
    memberNodes.set(entry.id, node);
    memberNodes.set(node.data.sourceClass, node);
    memberNodes.set(node.type, node);
    return node;
  });

  const edges = (workflow.relations || []).map((relation, index) => {
    const source = resolveWorkflowEndpoint(
      relation.source,
      relation.sourcePort,
      workflow.name,
      memberNodes,
      inputLookup
    );
    const targetIsWorkflow = (() => {
      const normalizedTarget =
        typeof relation.target === 'string'
          ? relation.target
          : typeof relation.target === 'function'
            ? resolveGraphReference(relation.target)?.name
            : undefined;
      return normalizedTarget === workflow.name || normalizedTarget === 'workflow' || normalizedTarget === 'graph';
    })();

    if (targetIsWorkflow) {
      return undefined;
    }

    const target = resolveWorkflowEndpoint(
      relation.target,
      relation.targetPort,
      workflow.name,
      memberNodes,
      inputLookup
    );

    return {
      id: `edge-${index}`,
      source: source.nodeId,
      target: target.nodeId,
      sourcePort: source.portId,
      targetPort: target.portId,
      data: {
        label: relation.label,
      },
    };
  });

  return {
    workflow,
    inputs,
    nodes,
    edges: edges.filter((edge): edge is NonNullable<typeof edge> => !!edge),
    workflowOutputs: workflow.outputs,
  };
}

export function buildGraphRendererModel<M extends Model>(
  model: GraphModelLike<M>,
  injector?: Injector,
  inputValues: Record<string, unknown> = {},
  duplicateInputs: Record<string, number> = {},
  previousModel?: ModelAdapter | null
) {
  const viewModel = buildGraphRendererViewModel(model, inputValues, duplicateInputs);
  const nextModel = initializeModel(
    {
      nodes: [...viewModel.inputs, ...viewModel.nodes],
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

export function buildGraphRendererSnapshot<M extends Model>(
  model: GraphModelLike<M>,
  diagram: ModelAdapter,
  inputValues: Record<string, unknown> = {},
  duplicateInputs: Record<string, number> = {}
): GraphWorkflowSnapshot {
  const state = readModelState(diagram);
  return graphWorkflowSnapshotOf(model as never, {
    inputs: inputValues,
    nodes: state.nodes as never[],
    edges: state.edges as never[],
    ui: {
      duplicateCounts: cloneJson(duplicateInputs),
      diagramMetadata: cloneJson(state.metadata),
    },
    metadata: {
      serializedAt: new Date().toISOString(),
    },
  });
}

export function buildGraphRendererStateFromSnapshot<M extends Model>(
  model: GraphModelLike<M>,
  snapshot: GraphWorkflowSnapshot,
  injector?: Injector
) {
  const snapshotUi = toRecord(snapshot.state.ui);
  const duplicateCounts = toRecord(snapshotUi['duplicateCounts']);
  const diagramMetadata = toRecord(snapshotUi['diagramMetadata']);
  const inputValues = graphWorkflowSnapshotInputValuesOf(snapshot);
  const diagram = initializeModel(
    {
      nodes: cloneJson(snapshot.state.nodes) as never[],
      edges: cloneJson(snapshot.state.edges) as never[],
      metadata: {
        ...diagramMetadata,
        viewport: {
          x: 0,
          y: 0,
          scale: 1,
          ...((diagramMetadata['viewport'] as Record<string, unknown>) || {}),
        },
      },
    },
    injector
  );

  return {
    diagram,
    inputValues,
    duplicateCounts: Object.keys(duplicateCounts).length
      ? (duplicateCounts as Record<string, number>)
      : readDuplicateCountsFromNodes(snapshot.state.nodes as never[]),
  };
}

export function parseGraphRendererSnapshot(
  json: string | GraphWorkflowSnapshot,
  model: GraphModelLike
): GraphWorkflowSnapshot {
  return graphWorkflowSnapshotFromJSON(json, model as never);
}

export function stringifyGraphRendererSnapshot(snapshot: GraphWorkflowSnapshot, space = 2) {
  return graphWorkflowSnapshotToJSON(snapshot, space);
}
type GraphModelLike<M extends Model = Model> = Constructor<M> | M;
