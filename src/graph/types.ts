import type { GraphNodeDefinition, GraphPortDefinition } from '@decaf-ts/ui-decorators/graph';
import type { GraphWorkflowDefinition } from '@decaf-ts/ui-decorators/graph';
import type { SwitchNodeMetadata } from '@decaf-ts/integrations/graph';

export interface GraphDemoNodeData {
  title: string;
  description: string;
  kind: string;
  category?: string;
  color?: string;
  icon?: string;
  labels: string[];
  ports: GraphPortDefinition[];
  sourceClass: string;
  modelClass?: unknown;
  expanded?: boolean;
  switchMetadata?: SwitchNodeMetadata;
}

export interface GraphDemoEdgeData {
  label?: string;
}

export interface GraphDemoNodeBlueprint {
  definition: GraphNodeDefinition;
  position: {
    x: number;
    y: number;
  };
}

export interface GraphDemoEdgeBlueprint {
  sourceClass: string;
  sourcePort: string;
  targetClass: string;
  targetPort: string;
  label?: string;
}

export interface GraphRendererNodeData {
  title: string;
  description: string;
  kind: string;
  category?: string;
  color?: string;
  icon?: string;
  labels: string[];
  ports: GraphPortDefinition[];
  sourceClass: string;
  modelClass?: unknown;
  expanded?: boolean;
  switchMetadata?: SwitchNodeMetadata;
}

export interface GraphBoundaryNodeData {
  title: string;
  kind: string;
  role: 'input' | 'output';
  property: string;
  sourceClass: string;
  sourcePort: string;
  duplicateIndex: number;
  isPrimary: boolean;
  value: unknown;
  ports: GraphPortDefinition[];
  modelClass?: unknown;
  expanded?: boolean;
}

export interface GraphCanvasNodeBlueprint<Data extends object = GraphRendererNodeData | GraphBoundaryNodeData> {
  id: string;
  type: string;
  position: {
    x: number;
    y: number;
  };
  size: {
    width: number;
    height: number;
  };
  resizable: false;
  draggable: true;
  autoSize: false;
  data: Data;
}

export interface GraphCanvasEdgeBlueprint {
  id: string;
  source: string;
  target: string;
  sourcePort: string;
  targetPort: string;
  data: {
    label?: string;
  };
}

export interface GraphRendererSummaryItem {
  kind: string;
  label: string;
  count: number;
  category?: string;
  color?: string;
  description?: string;
}

export interface GraphRendererOrderedNode {
  name: string;
  kind: string;
  label: string;
  category?: string;
  color?: string;
  description?: string;
}

export interface GraphRendererSummary {
  totalNodes: number;
  totalEdges: number;
  totalInputs: number;
  totalOutputs: number;
  items: GraphRendererSummaryItem[];
  orderedNodes: GraphRendererOrderedNode[];
  edgeLabels: {
    label: string;
    sourceClass: string;
    targetClass: string;
  }[];
}

export interface GraphRendererViewModel {
  workflow: GraphWorkflowDefinition;
  inputs: GraphCanvasNodeBlueprint<GraphBoundaryNodeData>[];
  nodes: GraphCanvasNodeBlueprint<GraphRendererNodeData>[];
  edges: GraphCanvasEdgeBlueprint[];
  workflowOutputs: GraphWorkflowDefinition['outputs'];
}

/**
 * Execution state for a single graph node, updated from GraphExecutionEvents.
 */
export interface GraphNodeUiExecutionState {
  status: string;
  startedAt?: string;
  finishedAt?: string;
  progress?: unknown;
  outputs?: Record<string, unknown>;
  error?: { name: string; message: string; stack?: string; code?: string };
  fromCache?: boolean;
  pinned?: boolean;
  pinnable?: boolean;
  loop?: {
    currentIteration?: number;
    completedIterations?: number;
    maxIterations?: number;
  };
}

/**
 * Execution state for a single graph edge, updated from EDGE_VALUE_ROUTED events.
 */
export interface GraphEdgeUiExecutionState {
  status: string;
  lastValue?: unknown;
  updatedAt?: string;
}

/**
 * Map of node id -> execution state, maintained by the renderer.
 */
export type GraphNodeExecutionStateMap = Record<string, GraphNodeUiExecutionState>;

/**
 * Map of edge id -> execution state, maintained by the renderer.
 */
export type GraphEdgeExecutionStateMap = Record<string, GraphEdgeUiExecutionState>;
