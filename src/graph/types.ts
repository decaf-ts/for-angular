import type { GraphNodeDefinition, GraphPortDefinition } from '@decaf-ts/ui-decorators/graph';
import type { GraphWorkflowDefinition } from '@decaf-ts/ui-decorators/graph';

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
