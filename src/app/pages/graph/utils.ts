import { Injector } from '@angular/core';
import { initializeModel } from 'ng-diagram';
import { graphDefinitionOf, graphLeafPortsOf, PortDirection } from '@decaf-ts/ui-decorators/graph';
import { countPortsByDirection, titleFromDefinition } from '../../../graph/utils';
import type { GraphDemoEdgeBlueprint, GraphDemoEdgeData, GraphDemoNodeData } from '../../../graph/types';
import { GRAPH_DEMO_EDGES, GRAPH_DEMO_NODES, type GraphDemoNodeConstructor } from './example-nodes';

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
      modelClass: ctor,
      expanded: false,
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
    totalInputs: definitions.reduce(
      (total, item) => total + countPortsByDirection(PortDirection.INPUT, graphLeafPortsOf(item.definition.ports)),
      0
    ),
    totalOutputs: definitions.reduce(
      (total, item) => total + countPortsByDirection(PortDirection.OUTPUT, graphLeafPortsOf(item.definition.ports)),
      0
    ),
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

  return initializeModel(
    {
      nodes,
      edges,
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
