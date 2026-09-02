/** @module for-angular/graph/document/GraphDocumentMutation
 * @summary Canvas-side diagram mutation payloads translated by the canonical graph adapter.
 * @description ng-diagram mutates its local model on every user gesture. The canonical
 * pipeline (`GraphDiagramAdapter.applyDiagramMutation` and
 * `graphDocumentCommandsFromDiagramMutation`) routes each gesture through graph workflow
 * document commands while rejecting invalid optimistic connections client-side (never
 * trusted as the backend gate, DECAF-50 §4.12).
 */
import type { GraphJsonValue } from '@decaf-ts/ui-decorators/graph';

/**
 * Endpoint reference on the canvas during a mutation.
 */
export interface GraphDiagramEndpointPayload {
  /** Canvas node id (`input-${port}` for workflow input boundaries, `$workflow` sentinel otherwise). */
  nodeId: string;
  /** Port id (falls back to the node's only port when omitted). */
  port?: string;
}

/**
 * A single edge drawn/handled on the canvas, expressed with stable graph endpoints.
 */
export interface GraphDiagramEdgePayload {
  sourceNodeId: string;
  sourcePort?: string;
  targetNodeId: string;
  targetPort?: string;
  label?: string;
}

/**
 * Final position of a node after a drag gesture ended (drag-end commit policy).
 */
export interface GraphDiagramNodeMove {
  nodeId: string;
  position: { x: number; y: number };
}

/**
 * Final size of a node after a resize gesture ended (resize-end commit policy).
 */
export interface GraphDiagramNodeResize {
  nodeId: string;
  size: { width?: number; height?: number };
}

/**
 * Viewport state after zoom/pan gestures (canvas shape `scale`).
 */
export interface GraphDiagramViewportPayload {
  x: number;
  y: number;
  scale: number;
}

/**
 * Mutation accepted by the adapter (`NgDiagramMutation` mirrors the ng-diagram
 * gesture set: palette drop, drag end, selection move, resize end, edge draw end,
 * element removal, clipboard paste, viewport change).
 */
export type NgDiagramMutation =
  | {
      type: 'node-added';
      node: {
        id: string;
        kind: string;
        label?: string;
        position: { x: number; y: number };
        parameters?: Record<string, GraphJsonValue>;
      };
    }
  | { type: 'nodes-removed'; nodeIds: string[] }
  | { type: 'nodes-moved'; nodes: GraphDiagramNodeMove[] }
  | { type: 'node-resized'; node: GraphDiagramNodeResize }
  | { type: 'edges-added'; edges: GraphDiagramEdgePayload[] }
  | { type: 'edges-removed'; edgeIds: string[] }
  | { type: 'viewport-changed'; viewport: GraphDiagramViewportPayload };

const GRAPH_DIAGRAM_MUTATION_TYPES = [
  'node-added',
  'nodes-removed',
  'nodes-moved',
  'node-resized',
  'edges-added',
  'edges-removed',
  'viewport-changed',
] as const;

/** The closed set of canvas mutation type names emitted by the diagram adapter. */
export type GraphDiagramMutationType = (typeof GRAPH_DIAGRAM_MUTATION_TYPES)[number];

/**
 * Mutation type list (ordered), for adapters and tests to reason over.
 */
export const GRAPH_DIAGRAM_MUTATION_TYPE_LIST: readonly GraphDiagramMutationType[] =
  GRAPH_DIAGRAM_MUTATION_TYPES;

/**
 * Canvas id prefix for ghost/placeholder nodes (loop body palette entries).
 */
export const GRAPH_CANVAS_GHOST_PREFIX = 'ghost-';

/**
 * Whether a canvas id references a ghost/placeholder node.
 */
export function isGraphGhostCanvasId(id: string): boolean {
  return id.startsWith(GRAPH_CANVAS_GHOST_PREFIX);
}

/**
 * Whether a document node is a ghost/placeholder (kind `graph.ghost`, canvas id
 * `ghost-${origin}` in legacy round trips).
 */
export function isGraphNodeGhost(node: { kind?: unknown; id: string }): boolean {
  return node.kind === 'graph.ghost' || isGraphGhostCanvasId(node.id);
}

/** Type guard narrowing canvas event payloads into the mutation union. */
export function isGraphDiagramMutation(value: unknown): value is NgDiagramMutation {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return (GRAPH_DIAGRAM_MUTATION_TYPES as readonly string[]).includes(
    String((value as Record<string, unknown>)['type'])
  );
}
