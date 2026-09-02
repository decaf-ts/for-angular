/** @module for-angular/graph/document/GraphDiagramAdapter
 * @summary Canonical graph adapter: document <-> ng-diagram model bridge (DECAF-50 §4.12).
 * @description The adapter is the ONLY component translating between the canonical
 * `GraphWorkflowDocument` store and the ng-diagram canvas. Projection is a pure function
 * of (document, catalogue reader). Every canvas gesture becomes a document command and
 * the diagram is always re-projected from the store output — never the reverse.
 * Positions commit on drag-end only; the viewport stays in the document's `ui` block;
 * constructor references never reach the canvas; canvas-only artifacts (ghost nodes,
 * selection, run overlays) are projected from the document without constructor copies.
 */
import { isDevMode, type Injector } from '@angular/core';
import { ValidationError } from '@decaf-ts/db-decorators';
import {
  initializeModel,
  type Edge,
  type ModelAdapter,
  type Node,
} from 'ng-diagram';
import type {
  GraphConnectionRule,
  GraphEndpoint,
  GraphEdgeInstance,
  GraphJsonValue,
  GraphNodeInstance,
  GraphPortDefinition,
  GraphPortManifest,
  GraphValueSchema,
  GraphWorkflowDocument,
} from '@decaf-ts/ui-decorators/graph';
import { PortDirection } from '@decaf-ts/ui-decorators/graph';
import type {
  ConditionExpression,
  ExprValue,
  GraphResolvedNodeManifest,
  SwitchCase,
  SwitchCaseCondition,
  SwitchNodeMetadata,
} from '@decaf-ts/integrations/graph/shared';
import type {
  GraphBoundaryNodeData,
  GraphRendererNodeData,
} from '../types';
import type { GraphNodeManifestReader } from '../catalog/GraphNodeCatalogReader';
import {
  GRAPH_DOCUMENT_WORKFLOW_NODE_ID,
  graphCanvasViewportOf,
  graphEndpointNodeId,
  graphEndpointPortOf,
  graphJsonValueCloneOf,
  graphWorkflowDocumentViewportOf,
  graphWorkflowNodeOf,
} from './GraphDocumentSelectors';
import type { GraphDocumentCommand, GraphNodeInstancePatch } from './GraphDocumentCommands';
import { applyGraphDocumentCommand } from './GraphDocumentCommands';
import {
  GRAPH_CANVAS_GHOST_PREFIX,
  isGraphGhostCanvasId,
  isGraphNodeGhost,
  type NgDiagramMutation,
} from './GraphDocumentMutation';
import { graphDocumentCommandsFromDiagramMutation, graphEngineEdgeIdOf } from './GraphDiagramMutationTranslator';

const GRAPH_CANVAS_DEFAULT_POSITION_STEP = 190;

/** Static ports of the input-boundary node (mirrors the legacy `GraphInputValueNode`). */
const GRAPH_INPUT_BOUNDARY_PORTS = [
  {
    property: 'value',
    path: 'value',
    direction: PortDirection.OUTPUT,
    name: 'value',
    label: 'value',
    required: false,
    hidden: false,
  },
] as const;

/** Boundary template key (mirrors `graphInputBoundaryDefinition.kind` = 'value'). */
const GRAPH_INPUT_BOUNDARY_TEMPLATE_KEY = 'value';

/**
 * Legacy-compatible view of the projected canvas node data.
 */
export type GraphDiagramCanvasNodeData = GraphRendererNodeData;

/**
 * Legacy-compatible view of the projected canvas input-boundary data.
 */
export type GraphDiagramCanvasBoundaryData = GraphBoundaryNodeData;

/**
 * Pure canvas projection of a document plus its catalogue.
 */
export interface GraphCanvasProjection {
  nodes: Node[];
  edges: Edge[];
  metadata: { viewport?: { x: number; y: number; scale: number } };
  nodeIds: string[];
  edgeIds: string[];
  boundaryNodeIds: string[];
}


function legacyIconNameOf(manifest: GraphResolvedNodeManifest | null): string | undefined {
  const icon = manifest?.display?.icon as { type?: string; name?: string; url?: string } | undefined;
  if (!icon) return undefined;
  if (icon.type === 'catalogue' && typeof icon.name === 'string' && icon.name) return icon.name;
  if (icon.type === 'url' && typeof icon.url === 'string' && icon.url) return icon.url;
  return undefined;
}

function numberOrFallback(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function positionOf(node: GraphNodeInstance, index: number): { x: number; y: number } {
  const stored = node.ui?.position;
  if (stored && Number.isFinite(stored.x) && Number.isFinite(stored.y)) {
    return { x: stored.x, y: stored.y };
  }
  return {
    x: 380 + index * GRAPH_CANVAS_DEFAULT_POSITION_STEP,
    y: [130, 70, 280][index % 3],
  };
}

function portDirectionOf(port: GraphPortManifest): PortDirection {
  switch (port.direction) {
    case 'output':
      return PortDirection.OUTPUT;
    case 'connection':
      return PortDirection.CONNECTION;
    default:
      return PortDirection.INPUT;
  }
}

function portSchemaTypeOf(schema: GraphValueSchema | undefined): string | undefined {
  if (!schema) return undefined;
  switch (schema.type) {
    case 'number':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'enum':
      return 'options';
    case 'string':
      return 'text';
    default:
      return undefined;
  }
}

/**
 * Maps a resolved manifest port into the legacy-canvas port definition shape so the
 * existing ng-diagram node templates keep rendering documents. Static ports carry the
 * legacy `connectionRules` DSL (checked on the canvas, never the security gate);
 * dynamic ports stay rules-free (always visible, like the legacy switch case ports).
 */
export function graphCanvasPortDefinitionOf(
  port: GraphPortManifest,
  dynamic = false
): GraphPortDefinition {
  const definition: GraphPortDefinition = {
    property: port.id,
    path: port.id,
    direction: portDirectionOf(port),
    name: port.id,
    label: port.label || port.id,
    required: port.required === true,
    hidden: port.hidden === true,
  };
  const schemaType = portSchemaTypeOf(port.schema);
  if (schemaType !== undefined) definition.type = schemaType;
  const policy = port.connectionPolicy;
  if (policy && !dynamic) {
    const rules: GraphConnectionRule = {};
    if (policy.allowSelf !== undefined) rules['allowSelf'] = policy.allowSelf;
    if (policy.allowMultiple !== undefined) rules['allowMultiple'] = policy.allowMultiple;
    if (policy.allowedNodeKinds !== undefined) rules['allowedKinds'] = policy.allowedNodeKinds;
    if (policy.blockedNodeKinds !== undefined) rules['blockedKinds'] = policy.blockedNodeKinds;
    if (policy.maxConnections !== undefined) rules['maxConnections'] = policy.maxConnections;
    if (Object.keys(rules).length) definition.connectionRules = rules;
  }
  return definition;
}

/**
 * Projected switch metadata block selector: reads the canonical
 * `parameters["switch"]` block, then the decorated-metadata residual
 * `metadata["switch"]` block (executor parity — `SwitchGraphNodeExecutor`), and
 * finally falls back to legacy residual shapes (`switchMetadata` param and the
 * bare `cases` param) for documents converted from old snapshots.
 */
function switchBlockOf(node: GraphNodeInstance): Record<string, unknown> | undefined {
  const switchValue = node.parameters['switch'];
  if (switchValue && typeof switchValue === 'object' && !Array.isArray(switchValue)) {
    return switchValue as Record<string, unknown>;
  }
  const decoratedMetadata = node.metadata?.['switch'];
  if (decoratedMetadata && typeof decoratedMetadata === 'object' && !Array.isArray(decoratedMetadata)) {
    return decoratedMetadata as Record<string, unknown>;
  }
  const legacyMetadata = node.parameters['switchMetadata'];
  if (legacyMetadata && typeof legacyMetadata === 'object' && !Array.isArray(legacyMetadata)) {
    return legacyMetadata as Record<string, unknown>;
  }
  const legacyCases = node.parameters['cases'];
  if (Array.isArray(legacyCases)) {
    return { cases: legacyCases, defaultPort: 'default', hasDefault: undefined };
  }
  return undefined;
}

function switchMetadataOfNode(
  node: GraphNodeInstance,
  resolved: GraphResolvedNodeManifest
): SwitchNodeMetadata | undefined {
  if (node.kind !== 'core.flow.switch') return undefined;
  const block = switchBlockOf(node) ?? {};
  const casesValue = block['cases'];
  const casesRaw = Array.isArray(casesValue) ? casesValue : [];
  const hasDefaultAttr = block['hasDefault'] === true;
  // Explicit block keys win over the resolved port shape: the switch editor's
  // own toggle (§4.4.5) may demote `hasDefault` while a legacy static `default`
  // output keeps residing in the manifest.
  const blockCarriesHasDefault = typeof block['hasDefault'] === 'boolean';
  const hasDefault = blockCarriesHasDefault
    ? hasDefaultAttr
    : resolved.outputs.some((port) => port.id === 'default');
  const defaultPortAttr = block['defaultPort'];
  const cases = casesRaw.map((item, index) => {
    const record = (item ?? {}) as Record<string, unknown>;
    const outputPort = typeof record['outputPort'] === 'string' ? record['outputPort'] : `case-${index}`;
    const label = typeof record['label'] === 'string' ? record['label'] : `Case ${index + 1}`;
    return canonicalSwitchCaseMetadataOf(record, label, outputPort);
  });
  return { cases, defaultPort: typeof defaultPortAttr === 'string' && defaultPortAttr ? defaultPortAttr : 'default', hasDefault };
}

function canonicalSwitchCaseMetadataOf(
  record: Record<string, unknown>,
  fallbackLabel: string,
  fallbackPortId: string
): SwitchCase {
  const id = typeof record['id'] === 'string' && record['id'] ? record['id'] : fallbackPortId;
  const outputPort =
    typeof record['outputPort'] === 'string' && record['outputPort'] ? record['outputPort'] : fallbackPortId;
  // The canonical `SwitchCaseCondition` nests under the case item's
  // `condition` field (§4.4.5); legacy flat items (`mode`/`code`/`op` on the
  // item itself) keep reading for documents converted from old snapshots.
  const nestedCondition = record['condition'];
  const mode = typeof record['mode'] === 'string' ? record['mode'] : 'graphical';
  const condition: SwitchCaseCondition =
    nestedCondition && typeof nestedCondition === 'object' && !Array.isArray(nestedCondition)
      ? (nestedCondition as SwitchCaseCondition)
      : mode === 'code'
        ? { type: 'code', code: typeof record['code'] === 'string' ? record['code'] : '' }
        : canonicalConditionExpressionOf(record);
  return { id, label: fallbackLabel, condition, outputPort };
}

function canonicalConditionExpressionOf(record: Record<string, unknown>): ConditionExpression {
  const op = typeof record['op'] === 'string' ? record['op'] : 'eq';
  switch (op) {
    case 'and':
      return { op: 'and', conditions: canonicalConditionsOf(record['conditions']) };
    case 'or':
      return { op: 'or', conditions: canonicalConditionsOf(record['conditions']) };
    case 'not':
      return {
        op: 'not',
        condition: canonicalConditionExpressionOf((record['condition'] ?? {}) as Record<string, unknown>),
      };
    case 'exists':
      return { op: 'exists', value: canonicalExprValueOf(record['value']) };
    default:
      return {
        op: 'eq',
        left: canonicalExprValueOf(record['left']),
        right: canonicalExprValueOf(record['right']),
      };
  }
}

function canonicalConditionsOf(value: unknown): ConditionExpression[] {
  return (Array.isArray(value) ? value : []).map((item, index) =>
    canonicalConditionExpressionOf((item ?? {}) as Record<string, unknown>)
  );
}

function canonicalExprValueOf(value: unknown): ExprValue {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { const: graphJsonValueCloneOf(value as GraphJsonValue) };
  }
  const record = value as Record<string, unknown>;
  if (typeof record['path'] === 'string') {
    return typeof record['step'] === 'string'
      ? { step: record['step'], path: record['path'] }
      : { path: record['path'] };
  }
  return { const: record['const'] };
}

/**
 * Switch port-surface parity (§4.4.5): the doc's `parameters["switch"].hasDefault`
 * owns the static `default` output port's presence on the canvas — `hasDefault:false`
 * omits it exactly like the shared switch class's `applyMetadata`. Explicit block
 * keys win over the manifest's static port so the switch editor's toggle actually
 * demotes the port.
 */
function switchPortSurfaceResolvedOf(
  node: GraphNodeInstance,
  resolved: GraphResolvedNodeManifest
): GraphResolvedNodeManifest {
  if (node.kind !== 'core.flow.switch') return resolved;
  const block = switchBlockOf(node) ?? {};
  const hasDefault =
    typeof block['hasDefault'] === 'boolean'
      ? block['hasDefault'] === true
      : resolved.outputs.some((port) => port.id === 'default');
  if (hasDefault) return resolved;
  return { ...resolved, outputs: resolved.outputs.filter((port) => port.id !== 'default') };
}

function dataPortsOf(
  node: GraphNodeInstance,
  resolved: GraphResolvedNodeManifest
): GraphPortDefinition[] {
  if (node.kind === 'graph.ghost') return [];
  const staticIds = new Set<string>();
  for (const list of [resolved.inputs, resolved.outputs, resolved.connections ?? []]) {
    for (const port of list) staticIds.add(port.id);
  }
  const ports: GraphPortDefinition[] = [];
  for (const list of [resolved.inputs, resolved.outputs, resolved.connections ?? []]) {
    for (const port of list) {
      ports.push(graphCanvasPortDefinitionOf(port, !staticIds.has(port.id)));
    }
  }
  return ports;
}

function canvasDataOf(node: GraphNodeInstance, resolved: GraphResolvedNodeManifest): GraphDiagramCanvasNodeData {
  const display = resolved.display ?? ({} as Record<string, unknown>);
  const data: GraphDiagramCanvasNodeData = {
    title: node.label || String(display.name ?? node.kind),
    description: typeof display.description === 'string' ? display.description : '',
    kind: node.kind,
    category: typeof display.category === 'string' ? display.category : undefined,
    color: typeof display.color === 'string' ? display.color : undefined,
    icon: legacyIconNameOf(resolved),
    labels: Array.isArray(display.labels) ? [...display.labels] : [],
    ports: dataPortsOf(node, switchPortSurfaceResolvedOf(node, resolved)),
    sourceClass: typeof display.name === 'string' ? display.name : node.kind,
  };
  const ghostParent = graphGhostParentIdOf(node);
  if (ghostParent !== undefined) data.ghostParentId = ghostParent;
  if (node.kind === 'graph.ghost') data.isGhost = true;
  const expanded = node.ui?.expanded;
  if (expanded !== undefined) data.expanded = expanded;
  const switchMetadata = switchMetadataOfNode(node, resolved);
  if (switchMetadata) data.switchMetadata = switchMetadata;
  return data;
}

function graphGhostParentIdOf(node: GraphNodeInstance): string | undefined {
  const sources: Record<string, unknown>[] = [node.metadata ?? {}, node.parameters];
  for (const source of sources) {
    const value = source['ghostParentId'];
    if (typeof value === 'string' && value) return value;
  }
  return undefined;
}

/**
 * Projects a document ghost node into the canvas ghost data shape. Ghost nodes
 * carry no constructor reference: the template data is built from the instance
 * metadata (`ghostParentId`) and the ghost-marker kind.
 */
function graphGhostCanvasDataOf(node: GraphNodeInstance): GraphRendererNodeData {
  return {
    title: 'Add node',
    description: 'Click + to add a node to the loop body',
    kind: 'graph.ghost',
    labels: [],
    ports: [],
    sourceClass: 'GraphGhostNode',
    ghostParentId: graphGhostParentIdOf(node),
    isGhost: true,
    expanded: node.ui?.expanded ?? false,
  } as GraphRendererNodeData;
}

/**
 * Fallback manifest view for document-carried ghost nodes (they have no kind
 * registration; the ghost node template only requires display/size info).
 */
function ghostNodeSizeOf(node: GraphNodeInstance): { width: number; height: number } {
  return {
    width: node.ui?.size?.width ?? 56,
    height: node.ui?.size?.height ?? 56,
  };
}

/**
 * Builds the canvas-only virtual ghost node plus its two mandatory containment
 * edges for a `core.loop.foreach` member that has no document-carried ghost yet.
 */
function graphVirtualGhostNodeOf(
  loopNode: GraphNodeInstance,
  ghostId: string,
  index: number,
  loopSize?: { width: number; height: number }
): { node: Node; edges: Edge[] } | undefined {
  const position = positionOf(loopNode, index);
  const size = loopSize ?? { width: 120, height: 140 };
  const ghostPosition = {
    x: position.x + size.width + 80,
    y: position.y + size.height / 2 - 28,
  };
  const ghostNode = {
    id: ghostId,
    type: 'graph.ghost',
    position: ghostPosition,
    size: { width: 56, height: 56 },
    resizable: false,
    draggable: true,
    autoSize: false,
    data: {
      title: 'Add node',
      description: 'Click + to add a node to the loop body',
      kind: 'graph.ghost',
      labels: [],
      ports: [],
      sourceClass: 'GraphGhostNode',
      ghostParentId: loopNode.id,
      isGhost: true,
      expanded: false,
    } as GraphRendererNodeData,
  } as Node;
  const inEdge = {
    id: `edge-ghost-in-${loopNode.id}`,
    type: 'graph-edge',
    source: loopNode.id,
    sourcePort: 'item',
    target: ghostId,
    targetPort: 'in',
    data: graphCanvasEdgeDataOf({
      id: `edge-ghost-in-${loopNode.id}`,
      type: 'connection',
      source: { scope: 'node', nodeId: loopNode.id, port: 'item' },
      target: { scope: 'node', nodeId: ghostId, port: 'in' },
      metadata: { mandatory: true },
      label: 'item',
    }),
  } as Edge;
  const outEdge = {
    id: `edge-ghost-out-${loopNode.id}`,
    type: 'graph-edge',
    source: ghostId,
    sourcePort: 'out',
    target: loopNode.id,
    targetPort: 'loop',
    data: graphCanvasEdgeDataOf({
      id: `edge-ghost-out-${loopNode.id}`,
      type: 'connection',
      source: { scope: 'node', nodeId: ghostId, port: 'out' },
      target: { scope: 'node', nodeId: loopNode.id, port: 'loop' },
      metadata: { mandatory: true },
      label: 'loop',
    }),
  } as Edge;
  return { node: ghostNode, edges: [inEdge, outEdge] };
}

/**
 * Maps a document node id to the canvas node id it projects as (boundary mapping).
 */
function canvasNodeIdFromEndpoint(
  endpoint: GraphEndpoint,
  document: GraphWorkflowDocument
): string | undefined {
  if (endpoint.scope === 'workflow') {
    const port = document.inputs.find((candidate) => candidate.id === endpoint.port);
    return port ? `input-${port.id}` : undefined;
  }
  const node = document.nodes.find((candidate) => candidate.id === endpoint.nodeId);
  return node ? node.id : undefined;
}

function canvasConnectionPortOf(endpoint: GraphEndpoint): string {
  return endpoint.scope === 'workflow' ? 'value' : graphEndpointPortOf(endpoint);
}

function canvasEdgeLabelOf(edge: GraphEdgeInstance): string | undefined {
  return typeof edge.label === 'string' ? edge.label : undefined;
}

/**
 * Canonical edge metadata projected into the canvas runtime's edge data block.
 * `mandatory` marks the loop ghost/structural edges that the canvas guards from
 * deletion; the engine keeps carrying it inside document edge metadata (§4.12).
 */
function canvasEdgeMandatoryOf(edge: GraphEdgeInstance): boolean {
  return edge.metadata?.['mandatory'] === true;
}

function graphCanvasEdgeDataOf(
  edge: GraphEdgeInstance
): { label?: string; engineEdgeId?: string; mandatory?: boolean } {
  const data: { label?: string; engineEdgeId?: string; mandatory?: boolean } = {
    label: canvasEdgeLabelOf(edge),
    engineEdgeId: graphEngineEdgeIdOf(edge.source, edge.target),
  };
  if (canvasEdgeMandatoryOf(edge)) data.mandatory = true;
  return data;
}


/**
 * Purely projects the canonical document into the ng-diagram model blueprint.
 * Canvas-only containment artifacts (loop-body ghost nodes and their mandatory
 * in/out edges) are projected from the document without constructor copies.
 */
export function graphWorkflowDocumentCanvasModelOf(
  document: GraphWorkflowDocument,
  catalogue: GraphNodeManifestReader
): GraphCanvasProjection {
  const nodes: Node[] = [];
  const nodeIds: string[] = [];
  const boundaryNodeIds: string[] = [];

  // Workflow input boundary nodes (one per input port; legacy 'value' template).
  let boundaryIndex = 0;
  for (const port of document.inputs) {
    const boundaryId = `input-${port.id}`;
    nodeIds.push(boundaryId);
    boundaryNodeIds.push(boundaryId);
    const boundaryData: GraphDiagramCanvasBoundaryData = {
      title: port.label ?? port.id,
      kind: GRAPH_INPUT_BOUNDARY_TEMPLATE_KEY,
      role: 'input',
      property: port.id,
      sourceClass: document.name,
      sourcePort: port.id,
      duplicateIndex: 0,
      isPrimary: true,
      value: port.defaultValue ?? undefined,
      ports: [...GRAPH_INPUT_BOUNDARY_PORTS],
      expanded: false,
    };
    const boundaryNode = {
      id: boundaryId,
      type: GRAPH_INPUT_BOUNDARY_TEMPLATE_KEY,
      position: { x: 40, y: 120 + boundaryIndex * 120 },
      size: { width: 72, height: 32 },
      resizable: false,
      draggable: true,
      autoSize: false,
      data: boundaryData,
    } as Node;
    nodes.push(boundaryNode);
    boundaryIndex += 1;
  }

  // Member nodes (from the resolved manifest: static ports, dynamic ports, display).
  let index = 0;
  for (const node of document.nodes) {
    if (isGraphNodeGhost(node)) {
      // Ghost nodes (canvas-only artifacts carried by legacy round trips) project
      // verbatim from the document with the legacy ghost template.
      const ghostNode = {
        id: node.id,
        type: 'graph.ghost',
        position: positionOf(node, index),
        size: ghostNodeSizeOf(node),
        resizable: false,
        draggable: true,
        autoSize: false,
        data: graphGhostCanvasDataOf(node),
      } as Node;
      nodes.push(ghostNode);
      nodeIds.push(node.id);
      index += 1;
      continue;
    }
    const manifest = catalogue.get(node.kind);
    if (!manifest) {
      throw new ValidationError(
        `Node kind '${node.kind}' is not registered in the node catalogue.`
      );
    }
    const resolved = catalogue.resolve(node);
    const memberNode = {
      id: node.id,
      type: node.kind,
      position: positionOf(node, index),
      size: nodeUiSizeOf(node, resolved),
      resizable: false,
      draggable: true,
      autoSize: false,
      data: canvasDataOf(node, resolved),
    } as Node;
    nodes.push(memberNode);
    nodeIds.push(node.id);
    index += 1;
  }

  const edges: Edge[] = [];
  const edgeIds: string[] = [];
  for (const edge of document.edges) {
    // Workflow-boundary targets are materialized by the canvas engine only; the
    // canvas drops them, exactly like the legacy view-model did (§4.12/§4.13).
    if (edge.target.scope === 'workflow') continue;
    const sourceId = canvasNodeIdFromEndpoint(edge.source, document);
    const targetId = canvasNodeIdFromEndpoint(edge.target, document);
    if (!sourceId || !targetId) continue;
    const canvasEdge = {
      id: edge.id,
      type: 'graph-edge',
      source: sourceId,
      target: targetId,
      sourcePort: canvasConnectionPortOf(edge.source),
      targetPort: canvasConnectionPortOf(edge.target),
      data: graphCanvasEdgeDataOf(edge),
    } as Edge;
    edges.push(canvasEdge);
    edgeIds.push(edge.id);
  }

  // Loop-body containment ghosts (canvas-only containment artifacts) are projected
  // for every loop node still missing its dedicated ghost child in the document.
  const projectedNodeIds = new Set(nodeIds);
  for (const node of document.nodes) {
    const loopSize = ((node.ui?.size?.width || node.ui?.size?.height) ? {
      width: node.ui?.size?.width ?? 120,
      height: node.ui?.size?.height ?? 140,
    } : undefined) as { width: number; height: number } | undefined;
    if (node.kind !== 'core.loop.foreach') continue;
    const ghostId = `ghost-${node.id}`;
    if (projectedNodeIds.has(ghostId)) continue;
    const virtualGhost = graphVirtualGhostNodeOf(node, ghostId, index, loopSize ?? nodeUiSizeOf(node, catalogue.resolve(node)));
    if (!virtualGhost) continue;
    nodes.push(virtualGhost.node);
    nodeIds.push(virtualGhost.node.id);
    edges.push(...virtualGhost.edges);
    edgeIds.push(...virtualGhost.edges.map((edge) => edge.id));
  }

  return {
    nodes,
    edges,
    metadata: { viewport: graphCanvasViewportOf(document) },
    nodeIds,
    edgeIds,
    boundaryNodeIds,
  };
}

function nodeUiSizeOf(
  node: GraphNodeInstance,
  resolved: GraphResolvedNodeManifest
): { width: number; height: number } {
  const display = resolved.display ?? ({} as Record<string, unknown>);
  return {
    width: node.ui?.size?.width ?? numberOrFallback(display['width'], 96),
    height: node.ui?.size?.height
      ?? projectedNodeHeightOf(node, resolved, numberOrFallback(display['height'], 96)),
  };
}

function projectedNodeHeightOf(
  node: GraphNodeInstance,
  resolved: GraphResolvedNodeManifest,
  fallback: number
): number {
  if (node.kind === 'core.flow.switch') {
    const casesValue = node.parameters['cases'];
    const caseCount = Array.isArray(casesValue) ? casesValue.length : 0;
    return caseCount > 0 ? 140 + caseCount * 24 : fallback;
  }
  return fallback;
}

/**
 * Translates a canvas mutation into document commands for the store dispatcher.
 * Pure: returns a command list the caller dispatches against the current document.
 */
export function diagramCommandsOf(
  document: GraphWorkflowDocument,
  mutation: NgDiagramMutation,
  catalogue: GraphNodeManifestReader
): GraphDocumentCommand[] {
  return graphDocumentCommandsFromDiagramMutation(document, mutation, catalogue);
}

/**
 * Reconciled node merge: preserve canvas-local runtime deltas (positions of
 * unchanged nodes, sizes between resize commits) while applying the projection.
 */
function reconcileNodeOf(
  current: Node,
  projected: Node,
  lastPositions: Map<string, { x: number; y: number }>
): Node {
  const prev = current as { position?: { x: number; y: number }; id: string };
  const lastPosition = lastPositions.get(prev.id);
  const preservePosition =
    lastPosition === undefined || (projected.position.x === lastPosition.x && projected.position.y === lastPosition.y);
  // Runtime node state (`measuredPorts`/`_internalId`/selection/z-index): ng-diagram
  // re-init loses otherwise-measured port geometry, so the reconcile carries it
  // onto the merged node for nodes whose id survives the document update.
  const runtimeNodeKeys = ['measuredPorts', '_internalId', 'selected', 'computedZIndex'] as const;
  const merged = preservePosition
    ? ({ ...projected } as Node)
    : ({ ...projected, position: prev.position ?? projected.position } as Node);
  for (const key of runtimeNodeKeys) {
    const value = (current as unknown as Record<string, unknown>)[key];
    if (value !== undefined) {
      (merged as unknown as Record<string, unknown>)[key] = value;
    }
  }
  const pinnedValue = (current as { data?: { pinned?: unknown } }).data?.['pinned'];
  if (pinnedValue !== undefined && pinnedValue !== null) {
    return {
      ...merged,
      data: { ...(merged as { data?: Record<string, unknown> }).data, pinned: pinnedValue },
    } as Node;
  }
  return merged;
}

/**
 * Finds the canvas edge that matches a projected edge by its endpoint pair
 * (source id/port and target id/port) but currently carries a different runtime
 * id. Renaming that canvas edge to the projected (document/engine) id closes the
 * divergence caused by ng-diagram's gesture-local edge ids (§4.12 stable
 * document/engine edge ids), instead of duplicating the connection.
 */
function canvasEdgeEndpointKeyOf(edge: Edge): string {
  const data = edge as { source?: string; target?: string; sourcePort?: string; targetPort?: string };
  return `${data.source ?? ''}:${data.sourcePort ?? ''}->${data.target ?? ''}:${data.targetPort ?? ''}`;
}

/**
 * Canonical graph adapter bridging the document store and the ng-diagram canvas.
 */
export class GraphDiagramAdapter {
  private lastDocument: GraphWorkflowDocument | null = null;
  private lastPositionSnapshot = new Map<string, { x: number; y: number }>();

  /**
   * Projects the document into a fresh ng-diagram model adapter.
   */
  toDiagram(
    document: GraphWorkflowDocument,
    catalogue: GraphNodeManifestReader,
    injector?: Injector
  ): ModelAdapter {
    const projection = graphWorkflowDocumentCanvasModelOf(document, catalogue);
    this.captureProjectedPositions(projection.nodes);
    this.lastDocument = document;
    return initializeModel(
      {
        nodes: projection.nodes,
        edges: projection.edges,
        metadata: projection.metadata,
      },
      injector
    );
  }

  /**
   * Applies a canvas mutation against a pure document reducer, returning the next
   * document. Invalid optimistic connections throw a Decaf {@link ValidationError}
   * (client-side convenience gate only — never the security gate, §4.12).
   */
  applyDiagramMutation(
    document: GraphWorkflowDocument,
    mutation: NgDiagramMutation,
    catalogue: GraphNodeManifestReader
  ): GraphWorkflowDocument {
    const commands = graphDocumentCommandsFromDiagramMutation(document, mutation, catalogue);
    let working: GraphWorkflowDocument = document;
    for (const command of commands) {
      const next = applyGraphDocumentCommand(working, command);
      if (!next) {
        throw new ValidationError('Graph document mutations must preserve the workflow document.');
      }
      working = next;
    }
    return working;
  }

  /**
   * Translates a canvas mutation into document commands for the store dispatcher.
   */
  commandsForDiagramMutation(
    document: GraphWorkflowDocument,
    mutation: NgDiagramMutation,
    catalogue: GraphNodeManifestReader
  ): GraphDocumentCommand[] {
    return graphDocumentCommandsFromDiagramMutation(document, mutation, catalogue);
  }

  /**
   * Reconciles the previous canvas model against the current document projection.
   * Runtime deltas (live drag/size between commits and canvas-only selection) survive
   * on same-id nodes; restore mode applies document positions/sizes/viewport verbatim.
   */
  reconcile(
    document: GraphWorkflowDocument,
    previousDiagram: ModelAdapter | null,
    catalogue: GraphNodeManifestReader,
    injector?: Injector,
    options?: { restore?: boolean; applyViewport?: boolean }
  ): ModelAdapter {
    if (!previousDiagram) {
      return this.toDiagram(document, catalogue, injector);
    }
    const projection = graphWorkflowDocumentCanvasModelOf(document, catalogue);
    const restore = options?.restore === true;

    const projectedNodeIds = new Set(projection.nodeIds);

    const currentNodes = previousDiagram.getNodes();
    const removedNodeIds = currentNodes
      .filter((node) => !projectedNodeIds.has(node.id))
      .map((node) => node.id);
    if (removedNodeIds.length) {
      previousDiagram.updateNodes(
        (nodes) => nodes.filter((node) => !removedNodeIds.includes(node.id)) as never
      );
    }

    previousDiagram.updateNodes((canvasNodes) => {
      const projectedById = new Map(projection.nodes.map((node) => [node.id, node]));
      const merged = canvasNodes.map((node) => {
        const projected = projectedById.get(node.id);
        if (!projected) return node as Node;
        if (restore) return projected;
        return reconcileNodeOf(node, projected, this.lastPositionSnapshot);
      });
      const currentIds = new Set(canvasNodes.map((node) => node.id));
      const added = projection.nodes.filter((projectionNode) => !currentIds.has(projectionNode.id));
      return [...merged, ...added] as never;
    });

    previousDiagram.updateEdges((canvasEdges) => {
      const projectedById = new Map(projection.edges.map((edge) => [edge.id, edge]));

      // Pass 1: canvas edges whose id already matches a projection edge carry
      // the projected semantic state while preserving the canvas' runtime record
      // state (`points`/`measuredLabels`/`_internalId`/selection). The edges'
      // runtime-measured labels are only recomputed inside ng-diagram's semantic
      // update middleware; a wholesale replacement would leave them recomputed
      // as never-measured and permanently hide the edge labels.
      const idMatched = new Set<string>();
      const slotForCanvasIndex = new Map<number, Edge>();
      const runtimeEdgeKeys = [
        'points',
        'measuredLabels',
        '_internalId',
        'selected',
        'computedZIndex',
        'sourcePosition',
        'targetPosition',
      ] as const;
      for (let index = 0; index < canvasEdges.length; index += 1) {
        const current = canvasEdges[index] as Edge & Record<string, unknown>;
        const canvasId = current.id;
        const projected = projectedById.get(canvasId);
        if (!projected) continue;
        const merged = { ...projected } as Edge;
        for (const key of runtimeEdgeKeys) {
          if (current[key] !== undefined) {
            (merged as unknown as Record<string, unknown>)[key] = current[key];
          }
        }
        slotForCanvasIndex.set(index, merged);
        idMatched.add(canvasId);
      }

      // Pass 2: canvas edges whose runtime id diverged from the document edge id
      // adopt the projected (document/engine) id when their endpoint pair matches;
      // the rename keeps the drawn edge rendered while stabilizing the id (§4.12).
      const usedProjectionIndex = new Set<number>();
      const renameForCanvasIndex = new Map<number, Edge>();
      const projectionByEndpoint = new Map<string, number>();
      projection.edges.forEach((edge, index) => {
        const key = canvasEdgeEndpointKeyOf(edge);
        if (!projectedById.has(edge.id) || !canvasEdges.some((candidate) => candidate.id === edge.id)) {
          if (!projectionByEndpoint.has(key)) projectionByEndpoint.set(key, index);
        }
      });
      for (let index = 0; index < canvasEdges.length; index += 1) {
        if (slotForCanvasIndex.has(index)) continue;
        const key = canvasEdgeEndpointKeyOf(canvasEdges[index]);
        const projectionIndex = projectionByEndpoint.get(key);
        if (projectionIndex === undefined) continue;
        const projectedEdge = projection.edges[projectionIndex];
        if (idMatched.has(projectedEdge.id)) continue;
        // The rename closes a re-init of the drawn edge, so the canvas edge's
        // own runtime record (`points`/`measuredLabels`/gesture id/selection)
        // must survive the projected record: ng-diagram would otherwise read
        // the projected edge as an unmeasured new edge and drop its drawn
        // geometry and labels (the projected record bypasses flowCore's
        // semantic update pipeline).
        const renamed = { ...projectedEdge } as Edge;
        const currentCanvasEdge = canvasEdges[index] as Edge & Record<string, unknown>;
        for (const key of runtimeEdgeKeys) {
          if (currentCanvasEdge[key] !== undefined) {
            (renamed as unknown as Record<string, unknown>)[key] = currentCanvasEdge[key];
          }
        }
        slotForCanvasIndex.set(index, renamed);
        usedProjectionIndex.add(projectionIndex);
      }

      // Pass 3: merge order — projected slots keep the canvas position in the
      // list; runtime edges the document no longer contains are dropped so the
      // diagram remains a pure projection of the document; doc-driven additions
      // append last.
      const merged: Edge[] = [];
      for (let index = 0; index < canvasEdges.length; index += 1) {
        const projected = slotForCanvasIndex.get(index);
        if (projected) merged.push(projected);
      }
      projection.edges.forEach((edge, index) => {
        if (idMatched.has(edge.id)) return;
        if (usedProjectionIndex.has(index)) return;
        merged.push(edge);
      });
      return merged as never;
    });

    if (options?.applyViewport === true) {
      previousDiagram.updateMetadata({ ...previousDiagram.getMetadata(), viewport: graphCanvasViewportOf(document) } as never);
    }

    this.captureProjectedPositions(projection.nodes);
    this.lastDocument = document;
    return previousDiagram;
  }

  /**
   * Projects the document viewport into the canvas metadata (widget-mode).
   */
  documentViewportOf(document: GraphWorkflowDocument): { x: number; y: number; scale: number } {
    return graphCanvasViewportOf(document);
  }

  /**
   * Domains the doc's semantic viewport (`{x,y,zoom}`) for assertions and persistence.
   */
  documentViewportSemantic(document: GraphWorkflowDocument): { x: number; y: number; zoom: number } {
    return graphWorkflowDocumentViewportOf(document);
  }

  /**
   * Returns the document this adapter last projected (dev-mode assertions).
   */
  lastProjectedDocument(): GraphWorkflowDocument | null {
    return this.lastDocument;
  }

  /**
   * Resolves a document node by canvas id (dev-mode assertion helper).
   */
  resolveDocumentNode(document: GraphWorkflowDocument, nodeId: string): GraphNodeInstance | undefined {
    return graphWorkflowNodeOf(document, nodeId);
  }

  /**
   * Validates the canonical pipeline dev-mode invariants (§4.12): the canvas carries
   * exactly the nodes/edges the document projects, with matching ports, and every
   * engine edge id is stable. Called after each projection from the canonical gateway.
   */
  assertCanonicalPipelineInSync(
    document: GraphWorkflowDocument,
    diagram: ModelAdapter,
    catalogue: GraphNodeManifestReader,
    context: string
  ): void {
    if (!isDevMode()) return;
    const projection = graphWorkflowDocumentCanvasModelOf(document, catalogue);
    const currentNodes = diagram.getNodes();
    const currentEdges = diagram.getEdges();
    const canvasNodeIds = new Set(currentNodes.map((node) => node.id));
    const canvasEdgeIds = new Set(currentEdges.map((edge) => edge.id));
    const missingNodes = projection.nodeIds.filter((nodeId) => !canvasNodeIds.has(nodeId));
    const extraNodes = [...canvasNodeIds].filter((nodeId) => !projection.nodeIds.includes(nodeId));
    const missingEdges = projection.edgeIds.filter((edgeId) => !canvasEdgeIds.has(edgeId));
    const extraEdges = [...canvasEdgeIds].filter((edgeId) => !projection.edgeIds.includes(edgeId));
    const divergent: string[] = [];
    if (missingNodes.length) divergent.push(`missing nodes: ${missingNodes.join(', ')}`);
    if (extraNodes.length) divergent.push(`extra nodes: ${extraNodes.join(', ')}`);
    if (missingEdges.length) divergent.push(`missing edges: ${missingEdges.join(', ')}`);
    if (extraEdges.length) divergent.push(`extra edges: ${extraEdges.join(', ')}`);
    for (const projectedNode of projection.nodes) {
      const canvas = currentNodes.find((node) => node.id === projectedNode.id);
      if (!canvas) continue;
      const expectedPorts = (projectedNode as { data?: { ports?: unknown[] } }).data?.ports ?? [];
      const actualPorts = (canvas as { data?: { ports?: unknown[] } }).data?.ports ?? [];
      if (
        (expectedPorts as unknown[]).length !== (actualPorts as unknown[]).length &&
        !isGraphGhostCanvasId(projectedNode.id)
      ) {
        divergent.push(`port mismatch on node '${projectedNode.id}'`);
      }
      const expectedPosition = projectedNode.position;
      const actualPosition = canvas.position;
      if (
        expectedPosition &&
        actualPosition &&
        (Math.round(expectedPosition.x as number) !== Math.round(actualPosition.x as number) ||
          Math.round(expectedPosition.y as number) !== Math.round(actualPosition.y as number))
      ) {
        divergent.push(`position mismatch on node '${projectedNode.id}'`);
      }
    }
    if (divergent.length) {
      throw new ValidationError(
        `Canonical graph pipeline desync (${context}): ${divergent.join('; ')}.`
      );
    }
  }

  private captureProjectedPositions(nodes: Node[]): void {
    for (const node of nodes) {
      this.lastPositionSnapshot.set(node.id, { x: node.position.x, y: node.position.y });
    }
  }
}

export { GRAPH_DOCUMENT_WORKFLOW_NODE_ID };
