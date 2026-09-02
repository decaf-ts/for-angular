/** @module for-angular/graph/document/GraphDocumentSelectors
 * @summary Pure read helpers over the canonical graph workflow document (DECAF-50 §4.12).
 * @description The document store never leaks its own signal type; compositions read
 * documents via these pure helpers to mirror `GraphWorkflowDocumentReader` semantics
 * while supporting canvas projections and dev-mode assertions.
 */
import type {
  GraphEdgeInstance,
  GraphEndpoint,
  GraphJsonValue,
  GraphNodeInstance,
  GraphWorkflowDocument,
  GraphWorkflowPortInstance,
  GraphWorkflowViewport,
} from '@decaf-ts/ui-decorators/graph';

/**
 * Stable node id for workflow-boundary endpoints (legacy `$workflow` sentinel).
 */
export const GRAPH_DOCUMENT_WORKFLOW_NODE_ID = '$workflow';

/**
 * Canvas shape of the ng-diagram model viewport (`scale`, not `zoom`).
 */
export interface GraphCanvasViewport {
  x: number;
  y: number;
  scale: number;
}

/**
 * Returns all nodes of a document sorted deterministically for canvas previews.
 */
export function graphWorkflowNodesOf(document: GraphWorkflowDocument): GraphNodeInstance[] {
  return [...document.nodes].sort((a, b) => a.id.localeCompare(b.id));
}

/**
 * Returns a single node by id, or `undefined` when missing.
 */
export function graphWorkflowNodeOf(
  document: GraphWorkflowDocument,
  nodeId: string
): GraphNodeInstance | undefined {
  return document.nodes.find((node) => node.id === nodeId);
}

/**
 * Returns all edges of a document in stored order.
 */
export function graphWorkflowEdgesOf(document: GraphWorkflowDocument): GraphEdgeInstance[] {
  return [...document.edges];
}

/**
 * Returns all edges touching the given workflow-boundary or node id.
 */
export function graphWorkflowEdgesTouchedBy(
  document: GraphWorkflowDocument,
  nodeId: string
): GraphEdgeInstance[] {
  return document.edges.filter(
    (edge) =>
      (edge.source.scope === 'node' && edge.source.nodeId === nodeId) ||
      (edge.target.scope === 'node' && edge.target.nodeId === nodeId)
  );
}

/**
 * Returns the endpoint's stable engine node id (`$workflow` for boundary scope).
 */
export function graphEndpointNodeId(endpoint: GraphEndpoint): string {
  return endpoint.scope === 'workflow' ? GRAPH_DOCUMENT_WORKFLOW_NODE_ID : endpoint.nodeId;
}

/**
 * Returns the endpoint's port handle, mapped like `resolveWorkflowEndpoint` did in the
 * legacy pipeline (empty handle falls back to the generic `'value'` port).
 */
export function graphEndpointPortOf(endpoint: GraphEndpoint, fallback = 'value'): string {
  return typeof endpoint.port === 'string' && endpoint.port ? endpoint.port : fallback;
}

/**
 * Returns the document viewport (`{ x, y, zoom }` shape of `GraphWorkflowUiState`).
 */
export function graphWorkflowDocumentViewportOf(
  document: GraphWorkflowDocument
): GraphWorkflowViewport {
  const viewport = document.ui?.viewport;
  if (
    viewport &&
    Number.isFinite(viewport.x) &&
    Number.isFinite(viewport.y) &&
    Number.isFinite(viewport.zoom) &&
    viewport.zoom > 0
  ) {
    return { x: viewport.x, y: viewport.y, zoom: viewport.zoom };
  }
  return { x: 0, y: 0, zoom: 1 };
}

/**
 * Maps the document viewport into the canvas metadata viewport (`scale`, ng-diagram).
 */
export function graphCanvasViewportOf(document: GraphWorkflowDocument): GraphCanvasViewport {
  const viewport = graphWorkflowDocumentViewportOf(document);
  return { x: viewport.x, y: viewport.y, scale: viewport.zoom };
}

/**
 * Returns a workflow port declaration, or `undefined` when unknown.
 */
export function graphWorkflowPortInstanceOf(
  document: GraphWorkflowDocument,
  portId: string,
  direction: 'input' | 'output'
): GraphWorkflowPortInstance | undefined {
  const ports = direction === 'input' ? document.inputs : document.outputs;
  return ports.find((port) => port.id === portId);
}

/**
 * Deterministic JSON stringify with sorted object keys so documents hash.
 */
export function graphWorkflowDocumentStringify(document: unknown): string {
  return JSON.stringify(document, graphSortedJsonKeyOf);
}

function graphSortedJsonKeyOf(key: string, value: unknown): unknown {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).sort(([left], [right]) =>
        left.localeCompare(right)
      )
    );
  }
  return value;
}

/**
 * Deep clone of the document with the document-level and per-node `ui` blocks stripped.
 */
export function graphWorkflowDocumentWithoutUi(
  document: GraphWorkflowDocument
): GraphWorkflowDocument {
  const cloned = JSON.parse(JSON.stringify(document)) as GraphWorkflowDocument;
  const { ui, ...documentRest } = cloned;
  void ui;
  const nodes = documentRest.nodes.map((node) => {
    const { ui: nodeUi, ...nodeRest } = node;
    void nodeUi;
    return nodeRest;
  });
  return { ...documentRest, nodes };
}

/**
 * Stable hash of a document's semantic content (ui excluded). Used for the
 * restore-invariance and dev-mode assertions mandated by the spec (§4.12).
 */
export function graphWorkflowDocumentSemanticHashOf(document: GraphWorkflowDocument): string {
  const serialized = graphWorkflowDocumentStringify(graphWorkflowDocumentWithoutUi(document));
  let hash = 0x811c9dc5;
  for (let index = 0; index < serialized.length; index += 1) {
    hash ^= serialized.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/**
 * Clones a JSON-value record defensively.
 */
export function graphJsonValueCloneOf(value: GraphJsonValue | undefined): GraphJsonValue | undefined {
  return value === undefined ? undefined : (JSON.parse(JSON.stringify(value)) as GraphJsonValue);
}

/**
 * Clones a node instance so commands never leak store-local references.
 */
export function graphWorkflowNodeCloneOf(node: GraphNodeInstance): GraphNodeInstance {
  const clone: GraphNodeInstance = {
    ...node,
    parameters: { ...(node.parameters ?? {}) },
  };
  if (node.inputBindings) clone.inputBindings = { ...node.inputBindings };
  if (node.outputBindings) clone.outputBindings = { ...node.outputBindings };
  if (node.metadata) clone.metadata = { ...node.metadata };
  if (node.loop) clone.loop = JSON.parse(JSON.stringify(node.loop)) as typeof node.loop;
  if (node.ui) {
    const { size, ...uiRest } = node.ui;
    clone.ui = size ? { ...uiRest, size: { ...size } } : { ...uiRest };
  }
  return clone;
}
