import { Constructor } from '@decaf-ts/decoration';
import { Model } from '@decaf-ts/decorator-validation';
import { Injector } from '@angular/core';
import { initializeModel } from 'ng-diagram';
import {
  graphDefinitionOf,
  graphWorkflowDefinitionOf,
  PortDirection,
} from '@decaf-ts/ui-decorators/graph';
import {
  GRAPH_DEMO_EDGES,
  GRAPH_DEMO_NODES,
  type GraphDemoNodeConstructor,
} from './example-nodes';
import { GraphInputValueNode } from './boundary-nodes';
import type {
  GraphBoundaryNodeData,
  GraphCanvasNodeBlueprint,
  GraphDemoEdgeBlueprint,
  GraphDemoEdgeData,
  GraphDemoNodeData,
  GraphRendererNodeData,
  GraphRendererSummary,
  GraphRendererSummaryItem,
  GraphRendererViewModel,
} from './types';

export interface GraphDemoSummaryItem {
  kind: string;
  label: string;
  count: number;
  category?: string;
  color?: string;
  description?: string;
}

export interface GraphDemoOrderedNode {
  name: string;
  kind: string;
  label: string;
  category?: string;
  color?: string;
  description?: string;
}

export interface GraphDemoEdgeSummaryItem {
  label: string;
  sourceClass: string;
  targetClass: string;
}

export interface GraphDemoSummary {
  totalNodes: number;
  totalEdges: number;
  totalInputs: number;
  totalOutputs: number;
  items: GraphDemoSummaryItem[];
  orderedNodes: GraphDemoOrderedNode[];
  edgeLabels: GraphDemoEdgeSummaryItem[];
}

function titleFromDefinition(definitionName: string): string {
  return definitionName
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function buildNode(ctor: GraphDemoNodeConstructor, index: number) {
  const definition = graphDefinitionOf(ctor as never);
  const metadata = (definition.graph?.metadata || {}) as Record<string, unknown>;

  return {
    id: definition.name,
    type: definition.kind,
    position: {
      x: 80 + index * 320,
      y: index % 2 === 0 ? 120 : 80,
    },
    size: {
      width: definition.width ?? 300,
      height: definition.height ?? 220,
    },
    resizable: false,
    draggable: true,
    autoSize: false,
    data: {
      title: String(metadata['title'] ?? titleFromDefinition(definition.name)),
      description: String(metadata['description'] ?? ''),
      kind: definition.kind,
      category: definition.category,
      color: definition.color,
      icon: definition.icon,
      labels: definition.labels,
      ports: definition.ports,
      sourceClass: definition.name,
    } satisfies GraphDemoNodeData,
  };
}

export function getGraphDemoDefinitions() {
  return GRAPH_DEMO_NODES.map((ctor, index) => {
    const definition = graphDefinitionOf(ctor as never);
    const metadata = (definition.graph?.metadata || {}) as Record<string, unknown>;

    return {
      ctor,
      definition,
      position: {
        x: 80 + index * 320,
        y: index % 2 === 0 ? 120 : 80,
      },
      metadata,
    };
  });
}

export function getGraphDemoOrderedDefinitions() {
  const definitions = getGraphDemoDefinitions();
  const byName = new Map(definitions.map((item) => [item.definition.name, item] as const));
  const incoming = new Set(GRAPH_DEMO_EDGES.map((edge) => edge.targetClass));
  const outgoing = new Map<string, (typeof GRAPH_DEMO_EDGES)[number][]>();

  for (const edge of GRAPH_DEMO_EDGES) {
    const current = outgoing.get(edge.sourceClass) || [];
    current.push(edge);
    outgoing.set(edge.sourceClass, current);
  }

  const roots = definitions.filter((item) => !incoming.has(item.definition.name));
  const ordered: typeof definitions = [];
  const visited = new Set<string>();

  const visit = (name: string) => {
    if (visited.has(name)) return;
    const current = byName.get(name);
    if (!current) return;

    visited.add(name);
    ordered.push(current);

    for (const edge of outgoing.get(name) || []) {
      visit(edge.targetClass);
    }
  };

  for (const root of roots) {
    visit(root.definition.name);
  }

  for (const definition of definitions) {
    visit(definition.definition.name);
  }

  return ordered;
}

export function getGraphDemoSummary(): GraphDemoSummary {
  const definitions = getGraphDemoDefinitions();
  const orderedDefinitions = getGraphDemoOrderedDefinitions();
  const itemsByKind = new Map<string, GraphDemoSummaryItem>();

  for (const { definition, metadata } of definitions) {
    const current = itemsByKind.get(definition.kind);
    const next: GraphDemoSummaryItem = current
      ? {
          ...current,
          count: current.count + 1,
        }
      : {
          kind: definition.kind,
          label: String(metadata['title'] ?? definition.tag ?? definition.name),
          count: 1,
          category: definition.category,
          color: definition.color,
          description: String(metadata['description'] ?? ''),
        };

    itemsByKind.set(definition.kind, next);
  }

  return {
    totalNodes: definitions.length,
    totalEdges: GRAPH_DEMO_EDGES.length,
    totalInputs: definitions.reduce((total, item) => total + countPortsByDirection(PortDirection.INPUT, item.definition.ports), 0),
    totalOutputs: definitions.reduce((total, item) => total + countPortsByDirection(PortDirection.OUTPUT, item.definition.ports), 0),
    items: Array.from(itemsByKind.values()),
    orderedNodes: orderedDefinitions.map(({ definition, metadata }) => ({
      name: definition.name,
      kind: definition.kind,
      label: String(metadata['title'] ?? definition.tag ?? definition.name),
      category: definition.category,
      color: definition.color,
      description: String(metadata['description'] ?? ''),
    })),
    edgeLabels: (GRAPH_DEMO_EDGES as readonly GraphDemoEdgeBlueprint[]).map((edge) => ({
      label: String(edge.label ?? edge.sourcePort),
      sourceClass: edge.sourceClass,
      targetClass: edge.targetClass,
    })),
  };
}

export function buildGraphDemoModel(injector?: Injector) {
  const definitions = getGraphDemoOrderedDefinitions();
  const nodes = definitions.map(({ ctor }, index) => buildNode(ctor, index));
  const nodesByName = new Map(nodes.map((node) => [node.data.sourceClass, node] as const));

  const edges = GRAPH_DEMO_EDGES.map((edge, index) => {
    const source = nodesByName.get(edge.sourceClass);
    const target = nodesByName.get(edge.targetClass);

    if (!source || !target) {
      throw new Error(`Graph edge references unknown node: ${edge.sourceClass} -> ${edge.targetClass}`);
    }

    return {
      id: `edge-${index}`,
      source: source.id,
      target: target.id,
      sourcePort: edge.sourcePort,
      targetPort: edge.targetPort,
      data: {
        label: edge.label,
      } satisfies GraphDemoEdgeData,
    };
  });

  return initializeModel({
    nodes,
    edges,
    metadata: {
      viewport: {
        x: 0,
        y: 0,
        scale: 1,
      },
    },
  }, injector);
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
    },
  };
}

function buildMemberNode(
  ctor: GraphDemoNodeConstructor | unknown,
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

  if (
    normalizedReference === workflowName ||
    normalizedReference === 'workflow' ||
    normalizedReference === 'graph'
  ) {
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

export function getGraphWorkflowSummary<M extends Model>(
  model: GraphModelLike<M>
): GraphRendererSummary {
  const workflow = graphWorkflowDefinitionOf(model);
  const nodeDefinitions = workflow.nodes
    .map((entry) => entry.node)
    .filter((entry): entry is GraphDemoNodeConstructor => typeof entry === 'function')
    .map((ctor) => graphDefinitionOf(ctor as never));
  const inputBoundaryDefinition = graphInputBoundaryDefinition;
  const itemsByKind = new Map<string, GraphRendererSummaryItem>();

  const addKind = (
    kind: string,
    label: string,
    category?: string,
    color?: string,
    description?: string
  ) => {
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

  return {
    totalNodes: 1 + nodeDefinitions.length + workflow.inputs.length,
    totalEdges: workflow.relations?.length || 0,
    totalInputs: workflow.inputs.length,
    totalOutputs: workflow.outputs.length,
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
        typeof edge.source === 'function'
          ? resolveGraphReference(edge.source)?.name ?? 'workflow'
          : edge.source
      ),
      targetClass: String(
        typeof edge.target === 'function'
          ? resolveGraphReference(edge.target)?.name ?? 'workflow'
          : edge.target
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
  const inputLookup = new Map<string, GraphCanvasNodeBlueprint<GraphBoundaryNodeData>>();
  const memberNodes = new Map<string, GraphCanvasNodeBlueprint<GraphRendererNodeData>>();

  const inputs = workflow.inputs.flatMap((port, index) => {
    const copies = 1 + (duplicateInputs[port.property] || 0);
    return Array.from({ length: copies }, (_, duplicateIndex) => {
      const node = buildBoundaryNode(
        port.property,
        port,
        index,
        duplicateIndex,
        workflow.name,
        inputValues[port.property]
      );
      if (duplicateIndex === 0) {
        inputLookup.set(port.property, node);
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
  duplicateInputs: Record<string, number> = {}
) {
  const viewModel = buildGraphRendererViewModel(model, inputValues, duplicateInputs);
  return initializeModel(
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
}
type GraphModelLike<M extends Model = Model> = Constructor<M> | M;
