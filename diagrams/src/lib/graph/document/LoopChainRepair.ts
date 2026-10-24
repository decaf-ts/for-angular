/** @module for-angular/graph/document/LoopChainRepair
 * @summary Derives and repairs a foreach loop's ordered body chain from the canonical document.
 * @description The canvas represents a loop body as a mandatory chain
 * (`loop:item -> first -> ... -> last -> loop:loop`) plus any legacy ghost
 * artifacts. This module reads the surviving body order off that chain, and
 * produces the document commands that make the chain match a desired order, so
 * node additions, deletions, and legacy-ghost clean-up never leave a loop
 * broken. Ghosts and non-chain edges are never part of the result.
 */
import type {
  GraphEdgeInstance,
  GraphEndpoint,
  GraphNodeInstance,
  GraphWorkflowDocument,
} from '@decaf-ts/as-graph/shared';
import type { GraphDocumentCommand } from './GraphDocumentCommands';
import { isGraphNodeGhost } from './GraphDocumentMutation';

/** Canonical foreach kind whose body is represented by the canvas loop chain. */
export const GRAPH_FOREACH_LOOP_KIND = 'core.loop.foreach';
/** Output port routing each iteration into the loop body. */
export const GRAPH_LOOP_ITEM_PORT = 'item';
/** Connection input port the last body node routes back into. */
export const GRAPH_LOOP_CONNECTION_PORT = 'loop';

/** One surviving body node with the ports its chain edges bind. */
export interface GraphLoopBodyStep {
  nodeId: string;
  inputPort: string;
  outputPort: string;
}

function endpointNodeId(endpoint: GraphEndpoint | undefined): string | undefined {
  return endpoint?.scope === 'node' ? endpoint.nodeId : undefined;
}

function endpointPort(endpoint: GraphEndpoint | undefined): string | undefined {
  return endpoint?.scope === 'node' ? endpoint.port : undefined;
}

/** Deterministic canvas/document id for a loop-chain edge. */
export function graphLoopChainEdgeId(
  sourceNodeId: string,
  sourcePort: string,
  targetNodeId: string,
  targetPort: string
): string {
  return `${sourceNodeId}:${sourcePort}->${targetNodeId}:${targetPort}`;
}

function endpointPairKey(edge: Pick<GraphEdgeInstance, 'source' | 'target'>): string {
  return `${endpointNodeId(edge.source)}:${endpointPort(edge.source)}->${endpointNodeId(edge.target)}:${endpointPort(edge.target)}`;
}

/** Foreach loop ids present in the document. */
export function graphForeachLoopIdsOf(document: GraphWorkflowDocument): string[] {
  return document.nodes
    .filter((node) => node.kind === GRAPH_FOREACH_LOOP_KIND)
    .map((node) => node.id);
}

/**
 * Ordered loop body reached from the loop's `item` output. The walk follows the
 * canvas chain (`item -> first -> ... -> last -> loop`), never ghost nodes.
 *
 * @param outputPortHints - Output ports recovered from artifacts removed before
 * the walk (a legacy ghost took the body node's outgoing edge with it). Consulted
 * only when the surviving chain no longer records the body node's output port,
 * ahead of the generic `'result'` fallback.
 */
export function graphLoopBodyOrderOf(
  document: GraphWorkflowDocument,
  loopId: string,
  outputPortHints?: ReadonlyMap<string, string>
): GraphLoopBodyStep[] {
  const nodes = new Map<string, GraphNodeInstance>(
    document.nodes.map((node) => [node.id, node])
  );
  const isBodyNode = (nodeId: string | undefined): nodeId is string => {
    if (!nodeId) return false;
    const node = nodes.get(nodeId);
    return !!node && !isGraphNodeGhost(node);
  };
  const isChainEdge = (edge: GraphEdgeInstance): boolean =>
    edge.metadata?.['mandatory'] === true;
  const outgoing = (nodeId: string): GraphEdgeInstance[] =>
    document.edges.filter(
      (edge) => endpointNodeId(edge.source) === nodeId && isChainEdge(edge)
    );

  const first = document.edges.find(
    (edge) =>
      isChainEdge(edge) &&
      endpointNodeId(edge.source) === loopId &&
      endpointPort(edge.source) === GRAPH_LOOP_ITEM_PORT &&
      isBodyNode(endpointNodeId(edge.target))
  );
  if (!first) return [];

  const steps: GraphLoopBodyStep[] = [];
  const visited = new Set<string>();
  let currentId = endpointNodeId(first.target) as string;
  let inputPort = endpointPort(first.target) ?? 'value';

  while (isBodyNode(currentId) && !visited.has(currentId)) {
    visited.add(currentId);
    const next = outgoing(currentId).find((edge) => {
      const targetId = endpointNodeId(edge.target);
      if (targetId === loopId) return endpointPort(edge.target) === GRAPH_LOOP_CONNECTION_PORT;
      return isBodyNode(targetId) && !visited.has(targetId);
    });
    const outputPort =
      (next ? endpointPort(next.source) : undefined) ??
      outputPortHints?.get(currentId) ??
      'result';
    steps.push({ nodeId: currentId, inputPort, outputPort });
    if (!next) break;
    const targetId = endpointNodeId(next.target);
    if (!targetId || targetId === loopId) break;
    currentId = targetId;
    inputPort = endpointPort(next.target) ?? 'value';
  }

  return steps;
}

/** Ordered loop body for every foreach loop in the document. */
export function graphLoopBodyOrdersOf(
  document: GraphWorkflowDocument,
  outputPortHints?: ReadonlyMap<string, string>
): Map<string, GraphLoopBodyStep[]> {
  const orders = new Map<string, GraphLoopBodyStep[]>();
  for (const loopId of graphForeachLoopIdsOf(document)) {
    orders.set(loopId, graphLoopBodyOrderOf(document, loopId, outputPortHints));
  }
  return orders;
}

function chainEdge(
  sourceNodeId: string,
  sourcePort: string,
  targetNodeId: string,
  targetPort: string,
  label: string
): GraphEdgeInstance {
  return {
    id: graphLoopChainEdgeId(sourceNodeId, sourcePort, targetNodeId, targetPort),
    type: 'data',
    source: { scope: 'node', nodeId: sourceNodeId, port: sourcePort },
    target: { scope: 'node', nodeId: targetNodeId, port: targetPort },
    label,
    metadata: { mandatory: true },
  };
}

function desiredChainEdges(loopId: string, steps: GraphLoopBodyStep[]): GraphEdgeInstance[] {
  if (!steps.length) return [];
  const edges: GraphEdgeInstance[] = [];
  const first = steps[0];
  edges.push(
    chainEdge(loopId, GRAPH_LOOP_ITEM_PORT, first.nodeId, first.inputPort, GRAPH_LOOP_ITEM_PORT)
  );
  for (let index = 1; index < steps.length; index += 1) {
    const previous = steps[index - 1];
    const current = steps[index];
    edges.push(
      chainEdge(
        previous.nodeId,
        previous.outputPort,
        current.nodeId,
        current.inputPort,
        current.inputPort
      )
    );
  }
  const last = steps[steps.length - 1];
  edges.push(
    chainEdge(
      last.nodeId,
      last.outputPort,
      loopId,
      GRAPH_LOOP_CONNECTION_PORT,
      GRAPH_LOOP_CONNECTION_PORT
    )
  );
  return edges;
}

/**
 * Commands that make every foreach loop's canvas chain match the supplied body
 * order. Edges already matching an endpoint pair are left untouched, so the
 * repair is idempotent and never churns the document on a no-op pass.
 */
export function graphLoopChainCommandsFor(
  document: GraphWorkflowDocument,
  orders: Map<string, GraphLoopBodyStep[]>
): GraphDocumentCommand[] {
  const loopIds = new Set<string>([...graphForeachLoopIdsOf(document), ...orders.keys()]);
  const allPairs = new Set(document.edges.map((edge) => endpointPairKey(edge)));
  const commands: GraphDocumentCommand[] = [];

  for (const loopId of loopIds) {
    if (!document.nodes.some((node) => node.id === loopId)) continue;
    const steps = orders.get(loopId) ?? graphLoopBodyOrderOf(document, loopId);
    const bodyIds = new Set(steps.map((step) => step.nodeId));
    const desired = desiredChainEdges(loopId, steps);
    const desiredPairs = new Set(desired.map((edge) => endpointPairKey(edge)));

    const currentChain = document.edges.filter((edge) => {
      const sourceId = endpointNodeId(edge.source);
      const targetId = endpointNodeId(edge.target);
      if (sourceId === loopId && endpointPort(edge.source) === GRAPH_LOOP_ITEM_PORT) {
        return edge.metadata?.['mandatory'] === true;
      }
      if (targetId === loopId && endpointPort(edge.target) === GRAPH_LOOP_CONNECTION_PORT) {
        return edge.metadata?.['mandatory'] === true;
      }
      return (
        edge.metadata?.['mandatory'] === true &&
        !!sourceId &&
        !!targetId &&
        bodyIds.has(sourceId) &&
        bodyIds.has(targetId)
      );
    });

    for (const edge of currentChain) {
      if (!desiredPairs.has(endpointPairKey(edge))) {
        commands.push({ type: 'edge.remove', edgeId: edge.id });
      }
    }
    for (const edge of desired) {
      if (!allPairs.has(endpointPairKey(edge))) {
        commands.push({ type: 'edge.add', edge });
        allPairs.add(endpointPairKey(edge));
      }
    }
  }

  return commands;
}
