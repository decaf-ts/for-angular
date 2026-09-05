/** @module for-angular/graph/document/GraphDiagramMutationTranslator
 * @summary Pure diagram-mutation → graph-document-command translation (DECAF-50 §4.12).
 * @description Encodes the command-only mutation policy: ng-diagram canvas gestures
 * map onto graph workflow document commands; optimistic connection validation is a
 * client-side convenience and never the security gate. Translated commands are
 * dispatched to `GraphWorkflowDocumentStore` and the canvas is re-projected from the
 * refreshed document, never the reverse.
 */
import { ValidationError } from '@decaf-ts/db-decorators';
import type {
  GraphEdgeInstance,
  GraphEndpoint,
  GraphJsonValue,
  GraphNodeInstance,
  GraphPortManifest,
  GraphWorkflowDocument,
} from '@decaf-ts/ui-decorators/graph';
import type { GraphResolvedNodeManifest } from '@decaf-ts/ui-decorators/graph';
import type { GraphNodeManifestReader } from '../catalog/GraphNodeCatalogReader';
import {
  isGraphNodeGhost,
  type GraphDiagramEdgePayload,
  type NgDiagramMutation,
} from './GraphDocumentMutation';
import {
  graphEndpointNodeId,
  graphEndpointPortOf,
  graphJsonValueCloneOf,
  graphWorkflowNodeOf,
  graphWorkflowPortInstanceOf,
} from './GraphDocumentSelectors';
import { applyGraphDocumentCommand, type GraphDocumentCommand } from './GraphDocumentCommands';
import {
  graphNodeInstanceSeedId,
  graphNodeParameterDefaultsOf,
  graphUniqueNodeIdOf,
} from './GraphNodePaletteFactory';

const GRAPH_CANVAS_BOUNDARY_NODE_PREFIX = 'input-';
const GRAPH_DEFAULT_PORT_ID = 'value';

function graphUniqueEdgeIdOf(document: GraphWorkflowDocument, seed: string): string {
  const ids = new Set(document.edges.map((edge) => edge.id));
  if (!ids.has(seed)) return seed;
  let counter = 2;
  let candidate = `${seed}-${counter}`;
  while (ids.has(candidate)) {
    counter += 1;
    candidate = `${seed}-${counter}`;
  }
  return candidate;
}

/**
 * Builds the canonical `node.add` command for a node instance payload
 * (palette clicks, ghost replacements and auto-created members). Requires a
 * catalogue manifest for the payload's kind; defaults come from the manifest
 * parameters.
 */
export function graphNodeAddCommandOf(
  document: GraphWorkflowDocument,
  payload: {
    id: string;
    kind: string;
    label?: string;
    position: { x: number; y: number };
    parameters?: Record<string, GraphJsonValue>;
  },
  catalogue: GraphNodeManifestReader
): GraphDocumentCommand {
  const manifest = catalogue.get(payload.kind);
  if (!manifest) {
    throw new ValidationError(
      `Node kind '${payload.kind}' is not registered in the node catalogue.`
    );
  }
  const seedId = payload.id ?? graphNodeInstanceSeedId(payload.kind, payload.label);
  const defaults = graphNodeParameterDefaultsOf(manifest.parameters);
  const payloadParameters: Record<string, GraphJsonValue> =
    payload.parameters &&
    typeof payload.parameters === 'object' &&
    !Array.isArray(payload.parameters)
      ? (graphJsonValueCloneOf(payload.parameters) as Record<string, GraphJsonValue>)
      : {};
  const instance: GraphNodeInstance = {
    id: graphUniqueNodeIdOf(document, seedId),
    kind: payload.kind,
    label:
      typeof payload.label === 'string' && payload.label
        ? payload.label
        : typeof manifest.display.name === 'string'
          ? manifest.display.name
          : payload.kind,
    parameters: { ...defaults, ...payloadParameters },
    ui: { position: { x: payload.position.x, y: payload.position.y } },
  };
  return { type: 'node.add', node: instance };
}

/**
 * Resolves a canvas endpoint payload to a document `GraphEndpoint`: boundary
 * canvas ids (`input-${portId}`) map to workflow endpoints; node canvas ids map
 * to node endpoints; the port handle falls back to `'value'` like the legacy
 * pipeline did.
 */
function graphDocumentEndpointOf(
  document: GraphWorkflowDocument,
  payload: { nodeId: string; port?: string }
): GraphEndpoint {
  if (payload.nodeId.startsWith(GRAPH_CANVAS_BOUNDARY_NODE_PREFIX)) {
    const boundaryPortId = payload.nodeId.slice(GRAPH_CANVAS_BOUNDARY_NODE_PREFIX.length);
    if (!graphWorkflowPortInstanceOf(document, boundaryPortId, 'input')) {
      throw new ValidationError(
        `Workflow input boundary '${payload.nodeId}' does not reference a declared workflow input port.`
      );
    }
    return { scope: 'workflow', port: boundaryPortId };
  }
  const node = graphWorkflowNodeOf(document, payload.nodeId);
  if (!node) {
    throw new ValidationError(
      `Canvas node '${payload.nodeId}' is not part of the workflow document.`
    );
  }
  const port =
    typeof payload.port === 'string' && payload.port ? payload.port : GRAPH_DEFAULT_PORT_ID;
  return { scope: 'node', nodeId: payload.nodeId, port };
}

/**
 * Computes the legacy-parity engine edge id
 * `${sourceNodeId}:${sourcePort}->${targetNodeId}:${targetPort}` with the
 * `$workflow` sentinel for boundary endpoints.
 */
export function graphEngineEdgeIdOf(source: GraphEndpoint, target: GraphEndpoint): string {
  return `${graphEndpointNodeId(source)}:${graphEndpointPortOf(source)}->${graphEndpointNodeId(target)}:${graphEndpointPortOf(target)}`;
}

function resolvedPortOf(
  resolved: GraphResolvedNodeManifest,
  portId: string,
  direction: 'input' | 'output' | 'connection'
): GraphPortManifest | undefined {
  const lists =
    direction === 'input'
      ? resolved.inputs
      : direction === 'output'
        ? resolved.outputs
        : resolved.connections ?? [];
  return lists.find((port) => port.id === portId);
}

function resolvedPortDirectionOf(
  resolved: GraphResolvedNodeManifest | undefined,
  portId: string
): 'input' | 'output' | 'connection' | undefined {
  if (!resolved) return undefined;
  for (const direction of ['input', 'output', 'connection'] as const) {
    if (resolvedPortOf(resolved, portId, direction)) return direction;
  }
  return undefined;
}

interface GraphEdgeManifestView {
  source: GraphEndpoint;
  sourcePort: string;
  sourcePortPolicy: GraphPortManifest['connectionPolicy'];
  target: GraphEndpoint;
  targetPort: string;
  targetPortPolicy: GraphPortManifest['connectionPolicy'];
  targetNodeKind: string | undefined;
  targetPortCategory: string | undefined;
  type: GraphEdgeInstance['type'];
}

function graphEdgeManifestViewOf(
  document: GraphWorkflowDocument,
  source: GraphEndpoint,
  target: GraphEndpoint,
  catalogue: GraphNodeManifestReader
): GraphEdgeManifestView {
  const sourceNode =
    source.scope === 'node' ? graphWorkflowNodeOf(document, source.nodeId) : undefined;
  const targetNode =
    target.scope === 'node' ? graphWorkflowNodeOf(document, target.nodeId) : undefined;
  if (source.scope === 'node' && !sourceNode) {
    throw new ValidationError(
      `Edge source node '${source.nodeId}' is not part of the workflow document.`
    );
  }
  if (target.scope === 'node' && !targetNode) {
    throw new ValidationError(
      `Edge target node '${target.nodeId}' is not part of the workflow document.`
    );
  }
  const sourceResolved =
    sourceNode && !isGraphNodeGhost(sourceNode) ? catalogue.resolve(sourceNode) : undefined;
  const targetResolved =
    targetNode && !isGraphNodeGhost(targetNode) ? catalogue.resolve(targetNode) : undefined;
  const sourcePort = graphEndpointPortOf(source);
  const targetPort = graphEndpointPortOf(target);
  const sourceDirection = resolvedPortDirectionOf(sourceResolved, sourcePort);
  const targetDirection = resolvedPortDirectionOf(targetResolved, targetPort);
  if (sourceDirection === 'input') {
    throw new ValidationError(
      `Edge source port '${sourcePort}' of node '${graphEndpointNodeId(source)}' must be an output or connection port.`
    );
  }
  if (targetDirection === 'output') {
    throw new ValidationError(
      `Edge target port '${targetPort}' of node '${graphEndpointNodeId(target)}' must be an input or connection port.`
    );
  }
  if (sourceResolved && sourceDirection === undefined) {
    throw new ValidationError(
      `Port '${sourcePort}' does not exist on node '${graphEndpointNodeId(source)}'.`
    );
  }
  if (targetResolved && targetDirection === undefined) {
    throw new ValidationError(
      `Port '${targetPort}' does not exist on node '${graphEndpointNodeId(target)}'.`
    );
  }
  const sourcePortPolicy = sourceResolved
    ? resolvedPortOf(
        sourceResolved,
        sourcePort,
        sourceDirection === 'connection' ? 'connection' : 'output'
      )
    : undefined;
  const targetPortPolicy = targetResolved
    ? resolvedPortOf(
        targetResolved,
        targetPort,
        targetDirection === 'connection' ? 'connection' : 'input'
      )
    : undefined;
  const targetPortManifest = targetResolved
    ? [...targetResolved.inputs, ...(targetResolved.connections ?? [])].find(
        (port) => port.id === targetPort
      )
    : undefined;
  const type =
    sourceDirection === 'connection' || targetDirection === 'connection' ? 'connection' : 'data';
  return {
    source,
    sourcePort,
    sourcePortPolicy: sourcePortPolicy?.connectionPolicy,
    target,
    targetPort,
    targetPortPolicy: targetPortPolicy?.connectionPolicy,
    targetNodeKind: targetNode?.kind,
    targetPortCategory: targetPortManifest?.category,
    type,
  };
}

function graphPortEdgeCountOf(
  document: GraphWorkflowDocument,
  endpoint: GraphEndpoint,
  portId: string,
  side: 'source' | 'target'
): number {
  const isBoundary = endpoint.scope === 'workflow';
  const expectedNodeId = endpoint.scope === 'node' ? endpoint.nodeId : null;
  const expectedPort = isBoundary ? portId : null;
  return document.edges.filter((edge) => {
    const candidate = edge[side];
    return candidate.scope === 'workflow'
      ? expectedPort !== null && candidate.port === expectedPort
      : expectedNodeId !== null &&
        candidate.nodeId === expectedNodeId &&
        candidate.port === portId;
  }).length;
}

/**
 * Optimistic, client-side connection-policy checks for a candidate edge. The
 * backend remains the security gate; this only projects the same limits the
 * resolved manifests declare so the canvas never enters an inconsistent state.
 */
function assertGraphEdgeManifestConnectionPolicy(
  document: GraphWorkflowDocument,
  view: GraphEdgeManifestView
): void {
  const selfPairing =
    view.source.scope === 'node' &&
    view.target.scope === 'node' &&
    view.source.nodeId === view.target.nodeId;
  if (selfPairing && view.sourcePortPolicy?.allowSelf !== true) {
    throw new ValidationError(
      `Connection policy rejects self-connections on port '${view.sourcePort}' of node '${view.source.scope === 'node' ? view.source.nodeId : GRAPH_DEFAULT_PORT_ID}'.`
    );
  }
  const blockedKinds = view.sourcePortPolicy?.blockedNodeKinds;
  if (view.targetNodeKind && blockedKinds?.length && blockedKinds.includes(view.targetNodeKind)) {
    throw new ValidationError(
      `Connection policy blocks node kind '${view.targetNodeKind}' on port '${view.sourcePort}'.`
    );
  }
  const allowedKinds = view.sourcePortPolicy?.allowedNodeKinds;
  if (view.targetNodeKind && allowedKinds?.length && !allowedKinds.includes(view.targetNodeKind)) {
    throw new ValidationError(
      `Connection policy allows only [${allowedKinds.join(', ')}] on port '${view.sourcePort}'; node kind '${view.targetNodeKind}' is not allowed.`
    );
  }
  const allowedCategories = view.sourcePortPolicy?.allowedPortCategories;
  if (allowedCategories?.length) {
    if (!view.targetPortCategory || !allowedCategories.includes(view.targetPortCategory)) {
      throw new ValidationError(
        `Connection policy restricts port '${view.sourcePort}' to categories [${allowedCategories.join(', ')}] and target port '${view.targetPort}' does not match.`
      );
    }
  }
  if (
    view.sourcePortPolicy?.allowMultiple === false &&
    graphPortEdgeCountOf(document, view.source, view.sourcePort, 'source') > 0
  ) {
    throw new ValidationError(
      `Connection policy allows only one edge from port '${view.sourcePort}'.`
    );
  }
  if (
    view.targetPortPolicy?.allowMultiple === false &&
    graphPortEdgeCountOf(document, view.target, view.targetPort, 'target') > 0
  ) {
    throw new ValidationError(
      `Connection policy allows only one edge into port '${view.targetPort}'.`
    );
  }
  const maxConnections = view.sourcePortPolicy?.maxConnections;
  if (
    maxConnections !== undefined &&
    graphPortEdgeCountOf(document, view.source, view.sourcePort, 'source') >= maxConnections
  ) {
    throw new ValidationError(
      `Connection policy allows at most ${maxConnections} connections on port '${view.sourcePort}'.`
    );
  }
  const targetMaxConnections =
    view.targetPortPolicy?.maxConnections;
  if (
    targetMaxConnections !== undefined &&
    graphPortEdgeCountOf(document, view.target, view.targetPort, 'target') >= targetMaxConnections
  ) {
    throw new ValidationError(
      `Connection policy allows at most ${targetMaxConnections} incoming connections on port '${view.targetPort}'.`
    );
  }
}

/**
 * Builds an `edge.add` document command from a canvas edge payload: resolves
 * node ports to canonical endpoints (folding workflow-boundary handles) and
 * enforces the target port's connection policy before emitting the command.
 */
export function graphEdgeAddCommandOf(
  working: GraphWorkflowDocument,
  payload: GraphDiagramEdgePayload,
  catalogue: GraphNodeManifestReader
): GraphDocumentCommand {
  const source = graphDocumentEndpointOf(working, {
    nodeId: payload.sourceNodeId,
    port: payload.sourcePort,
  });
  const target = graphDocumentEndpointOf(working, {
    nodeId: payload.targetNodeId,
    port: payload.targetPort,
  });
  if (target.scope === 'workflow') {
    throw new ValidationError('Workflow-boundary targets do not appear on the canvas.');
  }
  const view = graphEdgeManifestViewOf(working, source, target, catalogue);
  assertGraphEdgeManifestConnectionPolicy(working, view);
  const edge: GraphEdgeInstance = {
    id: graphUniqueEdgeIdOf(working, graphEngineEdgeIdOf(source, target)),
    type: view.type,
    source,
    target,
  };
  if (typeof payload.label === 'string' && payload.label) edge.label = payload.label;
  return { type: 'edge.add', edge };
}

/**
 * Translates a canvas mutation into document commands for the store dispatcher.
 * Pure: the returned list is applied by the caller against the SAME document;
 * invalid optimistic connections throw a Decaf `ValidationError` before any
 * command is returned.
 */
export function graphDocumentCommandsFromDiagramMutation(
  document: GraphWorkflowDocument,
  mutation: NgDiagramMutation,
  catalogue: GraphNodeManifestReader
): GraphDocumentCommand[] {
  switch (mutation.type) {
    case 'node-added':
      return [graphNodeAddCommandOf(document, { ...mutation.node }, catalogue)];
    case 'nodes-removed': {
      const commands: GraphDocumentCommand[] = [];
      const seen = new Set<string>();
      for (const nodeId of mutation.nodeIds) {
        if (seen.has(nodeId)) continue;
        seen.add(nodeId);
        const node = graphWorkflowNodeOf(document, nodeId);
        if (!node || isGraphNodeGhost(node)) continue;
        commands.push({ type: 'node.remove', nodeId });
      }
      return commands;
    }
    case 'nodes-moved': {
      const moves: { nodeId: string; position: { x: number; y: number } }[] = [];
      for (const move of mutation.nodes) {
        const node = graphWorkflowNodeOf(document, move.nodeId);
        if (!node) continue;
        const committed = node.ui?.position;
        if (
          committed &&
          committed.x === move.position.x &&
          committed.y === move.position.y
        ) {
          continue;
        }
        moves.push({ nodeId: move.nodeId, position: { x: move.position.x, y: move.position.y } });
      }
      return moves.length ? [{ type: 'node.moves', moves }] : [];
    }
    case 'node-resized': {
      const node = graphWorkflowNodeOf(document, mutation.node.nodeId);
      if (!node || isGraphNodeGhost(node)) return [];
      const committed = node.ui?.size;
      if (
        committed &&
        (committed.width ?? 0) === (mutation.node.size.width ?? 0) &&
        (committed.height ?? 0) === (mutation.node.size.height ?? 0)
      ) {
        return [];
      }
      return [
        {
          type: 'node.resize',
          nodeId: mutation.node.nodeId,
          size: { width: mutation.node.size.width, height: mutation.node.size.height },
        },
      ];
    }
    case 'edges-added': {
      const commands: GraphDocumentCommand[] = [];
      let working: GraphWorkflowDocument = document;
      for (const payload of mutation.edges) {
        const command = graphEdgeAddCommandOf(working, payload, catalogue);
        commands.push(command);
        const next = applyGraphDocumentCommand(working, command);
        if (!next) {
          throw new ValidationError('Graph edge additions must preserve the workflow document.');
        }
        working = next;
      }
      return commands;
    }
    case 'edges-removed': {
      const edgeIds: string[] = [];
      const seen = new Set<string>();
      for (const edgeId of mutation.edgeIds) {
        if (seen.has(edgeId)) continue;
        seen.add(edgeId);
        edgeIds.push(edgeId);
      }
      return edgeIds.length ? [{ type: 'edge.removes', edgeIds }] : [];
    }
    case 'viewport-changed':
      // Viewport changes are canvas-local; the document commits them only when a
      // command is issued (drag-end/restore/save), never per wheel/pan event.
      return [];
    default:
      throw new ValidationError(
        `Unknown ng-diagram mutation '${String((mutation as { type?: unknown }).type ?? 'unknown')}'.`
      );
  }
}
