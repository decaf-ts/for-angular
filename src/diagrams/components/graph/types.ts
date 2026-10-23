import type { SwitchNodeMetadata } from '@decaf-ts/as-graph/shared';
import type {
  GraphIconReference,
  GraphNodeDefinition,
  GraphNodePinState,
  GraphPortDefinition,
  GraphWorkflowDefinition,
} from '@decaf-ts/as-graph/shared';

interface GraphWorkflowsItem {
  id: GraphWorkflowsItemId;
  label: string;
  icon: string;
  group: 'primary' | 'secondary';
  count?: number;
}

type GraphWorkflowsActionId = 'add' | 'search' | 'filter' | 'toggle';
type GraphWorkflowsItemId = 'drafts' | 'running' | 'completed' | 'failed' | 'scheduled' | 'archived';
/**
 * Node data shape of the original demo canvas: manifest-derived display fields
 * plus the ports and source-class linkage the renderer and templates rely on.
 *
 * @property title - Display title of the node.
 * @property description - Manifest description shown in tooltips/inspection.
 * @property kind - Manifest node kind.
 * @property category - Optional manifest category used for badges/colors.
 * @property color - Optional manifest color override.
 * @property icon - Optional legacy icon identifier.
 * @property labels - Badge labels rendered on the node face.
 * @property ports - Port definitions of the node.
 * @property sourceClass - Constructor the node instance was created from.
 * @category Graph
 */
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
  /**
   * Manifest icon reference (D7/G3-25) carried verbatim so the template can
   * render `catalogue`/`url`/`data:` per reference type.
   */
  iconReference?: GraphIconReference;
  /**
   * Manifest-authoritative node corner radius in pixels (D1/G3-04).
   */
  cornerRadius?: number;
  /**
   * Manifest-authoritative node face silhouette (D1/G3-04).
   */
  shape?: string;
  /**
   * Document-carried UI data-pin state (D4, DECAF-50 §4.22), projected from
   * the node instance's `pinned` field. Present iff the node is pinned.
   */
  pinned?: GraphNodePinState;
  /**
   * Whether the node's manifest declares it pinnable (D4/G3-14); the pin
   * affordance renders only when this is not `false`.
   */
  pinnable?: boolean;
}
/**
 * Edge data shape of the original demo canvas.
 *
 * @property label - Optional display label.
 * @property engineEdgeId - Engine plan-edge id the canvas edge represents, when any.
 * @category Graph
 */
export interface GraphDemoEdgeData {
  label?: string;
  /** Engine plan-edge id (`source:sourcePort->target:targetPort`) that this
   *  canvas edge represents. The engine emits EDGE_STATE_CHANGED / EDGE_VALUE_ROUTED
   *  keyed by this id, so the edge template resolves visual state via it. */
  engineEdgeId?: string;
}
/**
 * Serializable recipe for placing one demo node on the canvas.
 *
 * @property definition - Manifest definition of the node kind.
 * @property position - Canvas position of the node.
 * @category Graph
 */
export interface GraphDemoNodeBlueprint {
  definition: GraphNodeDefinition;
  position: {
    x: number;
    y: number;
  };
}
/**
 * Serializable recipe for one canvas edge between class ports.
 *
 * @property sourceClass - Source node's source class.
 * @property sourcePort - Source port property.
 * @property targetClass - Target node's source class.
 * @property targetPort - Target port property.
 * @property label - Optional display label.
 * @category Graph
 */
export interface GraphDemoEdgeBlueprint {
  sourceClass: string;
  sourcePort: string;
  targetClass: string;
  targetPort: string;
  label?: string;
  /** Template key (`graph-edge`) selecting the run-state edge template. */
  type?: string;
}
/**
 * Node data shape consumed by {@link GraphNodeTemplateComponent}: manifest- and
 * instance-derived display data augmented with ghost, pinning, icon-reference,
 * shape and switch metadata used by the v2 renderer chrome.
 * @category Graph
 */
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
  /** ID of the foreach node this ghost belongs to (ghost nodes only). */
  ghostParentId?: string;
  /** Whether this node is a ghost/placeholder (non-deletable, no CRUD). */
  isGhost?: boolean;
  /**
   * Manifest icon reference (D7/G3-25) carried verbatim so the template can
   * render `catalogue`/`url`/`data:` per reference type.
   */
  iconReference?: GraphIconReference;
  /**
   * Manifest-authoritative node corner radius in pixels (D1/G3-04).
   */
  cornerRadius?: number;
  /**
   * Manifest-authoritative node face silhouette (D1/G3-04).
   */
  shape?: string;
  /**
   * Document-carried UI data-pin state (D4, DECAF-50 §4.22), projected from
   * the node instance's `pinned` field. Present iff the node is pinned.
   */
  pinned?: GraphNodePinState;
  /**
   * Whether the node's manifest declares it pinnable (D4/G3-14); the pin
   * affordance renders only when this is not `false`.
   */
  pinnable?: boolean;
}
/**
 * Node data shape consumed by {@link GraphBoundaryNodeTemplateComponent} for the
 * graph's input/output boundary nodes, including the carried value and
 * duplicate (split) bookkeeping.
 * @category Graph
 */
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
/**
 * Serializable `ng-diagram` node recipe: identity, geometry, interaction flags
 * and the typed data the template renders.
 *
 * @property id - Stable node id.
 * @property type - Template type key selecting the node template.
 * @property position - Canvas position.
 * @property size - Rendered size.
 * @property resizable / draggable / autoSize - Interaction flags (fixed size, draggable).
 * @property data - Typed node data.
 * @category Graph
 */
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
/**
 * Serializable `ng-diagram` edge recipe with the routed engine-edge id carried
 * in data for run-state rendering.
 * @category Graph
 */
export interface GraphCanvasEdgeBlueprint {
  id: string;
  /** Template key (`graph-edge`) selecting the run-state edge template. */
  type?: string;
  source: string;
  target: string;
  sourcePort: string;
  targetPort: string;
  data: {
    label?: string;
    engineEdgeId?: string;
  };
}
/**
 * One aggregated line of the workflow summary: node/edge kind with count and
 * display metadata.
 * @category Graph
 */
export interface GraphRendererSummaryItem {
  kind: string;
  label: string;
  count: number;
  category?: string;
  color?: string;
  description?: string;
}
/**
 * One entry of the summary's ordered node list (name, kind and display data).
 * @category Graph
 */
export interface GraphRendererOrderedNode {
  name: string;
  kind: string;
  label: string;
  category?: string;
  color?: string;
  description?: string;
}
/**
 * Aggregated workflow summary: totals, per-kind items, ordered node list and
 * the labeled edges between source/target classes.
 * @category Graph
 */
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
/**
 * Complete view model the graph renderer builds from a workflow model: the
 * workflow definition, boundary input/output nodes, member nodes, edges and the
 * workflow's declared outputs.
 * @category Graph
 */
export interface GraphRendererViewModel {
  workflow: GraphWorkflowDefinition;
  inputs: GraphCanvasNodeBlueprint<GraphBoundaryNodeData>[];
  outputs: GraphCanvasNodeBlueprint<GraphBoundaryNodeData>[];
  nodes: GraphCanvasNodeBlueprint<GraphRendererNodeData>[];
  edges: GraphCanvasEdgeBlueprint[];
  workflowOutputs: GraphWorkflowDefinition['outputs'];
}

/**
 * Execution state for a single graph node, updated from GraphExecutionEvents.
 */
export interface GraphNodeUiExecutionState {
  status: string;
  /** Frontend-safe visual state (DECAF-48 §4.4), when surfaced by the engine. */
  visualState?: string;
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
  /** Frontend-safe visual state (DECAF-48 §4.4), when surfaced by the engine. */
  visualState?: string;
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
