/** @module for-angular/graph/document/GraphDocumentCommands
 * @summary Graph workflow document command union for the Angular canonical store (DECAF-50 §4.12).
 * @description Every semantic canvas interaction becomes a {@link GraphDocumentCommand} dispatched to the
 * `GraphWorkflowDocumentStore`. Commands are the sole accepted mutation path; the adapter
 * re-projects the diagram from the stored document, never the reverse.
 */
import { ValidationError } from '@decaf-ts/db-decorators';
import type {
  GraphEdgeInstance,
  GraphEndpoint,
  GraphInputBinding,
  GraphJsonValue,
  GraphLoopConfiguration,
  GraphNodeInstance,
  GraphOutputBinding,
  GraphWorkflowDocument,
  GraphWorkflowViewport,
} from '@decaf-ts/ui-decorators/graph';
import {
  assertGraphWorkflowDocumentValid,
  isGraphEndpoint,
  isGraphInputBinding,
} from '@decaf-ts/ui-decorators/graph';

/**
 * Shallow patch describing a node change. `id`/`kind` cannot change (they are node
 * identity); `size` merges into the node's `ui.size` block.
 */
export interface GraphNodeInstancePatch {
  label?: string;
  parameters?: Record<string, GraphJsonValue>;
  inputBindings?: Record<string, GraphInputBinding>;
  outputBindings?: Record<string, GraphOutputBinding>;
  disabled?: boolean;
  metadata?: Record<string, GraphJsonValue>;
  loop?: GraphLoopConfiguration;
  size?: { width?: number; height?: number };
}

/**
 * Command union for every legal workflow document mutation.
 */
export type GraphDocumentCommand =
  | { type: 'node.add'; node: GraphNodeInstance }
  | { type: 'node.remove'; nodeId: string }
  | { type: 'node.update'; nodeId: string; patch: GraphNodeInstancePatch }
  | { type: 'node.move'; nodeId: string; position: { x: number; y: number } }
  | { type: 'node.moves'; moves: { nodeId: string; position: { x: number; y: number } }[] }
  | { type: 'node.resize'; nodeId: string; size: { width?: number; height?: number } }
  | { type: 'edge.add'; edge: GraphEdgeInstance }
  | { type: 'edge.remove'; edgeId: string }
  | { type: 'edge.removes'; edgeIds: string[] }
  | { type: 'viewport.set'; viewport: GraphWorkflowViewport }
  | { type: 'document.replace'; document: GraphWorkflowDocument }
  | { type: 'document.reset' };

const GRAPH_DOCUMENT_COMMAND_TYPES = [
  'node.add',
  'node.remove',
  'node.update',
  'node.move',
  'node.moves',
  'node.resize',
  'edge.add',
  'edge.remove',
  'edge.removes',
  'viewport.set',
  'document.replace',
  'document.reset',
] as const;

/** The closed set of document command type names (`node.*`, `edge.*`, `viewport.set`, `document.*`). */
export type GraphDocumentCommandType = (typeof GRAPH_DOCUMENT_COMMAND_TYPES)[number];

/**
 * Ports commands strictly by type name (canvas event payloads never widen the union).
 */
export function isGraphDocumentCommand(value: unknown): value is GraphDocumentCommand {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return (GRAPH_DOCUMENT_COMMAND_TYPES as readonly string[]).includes(
    String((value as Record<string, unknown>)['type'])
  );
}

/**
 * Strict command type list (ordered), for adapters and tests to reason over.
 */
export const GRAPH_DOCUMENT_COMMAND_TYPE_LIST: readonly GraphDocumentCommandType[] =
  GRAPH_DOCUMENT_COMMAND_TYPES;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function isPoint(value: unknown): value is { x: number; y: number } {
  return (
    !!value &&
    typeof value === 'object' &&
    typeof (value as { x?: unknown }).x === 'number' &&
    Number.isFinite((value as { x?: unknown }).x) &&
    typeof (value as { y?: unknown }).y === 'number' &&
    Number.isFinite((value as { y?: unknown }).y)
  );
}

function isSize(value: unknown): value is { width?: number; height?: number } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const width = (value as { width?: unknown }).width;
  const height = (value as { height?: unknown }).height;
  return (
    (width === undefined || typeof width === 'number') &&
    (height === undefined || typeof height === 'number')
  );
}

function assertValidPatch(patch: GraphNodeInstancePatch): void {
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
    throw new ValidationError('Node patch must be an object.');
  }
  if (
    patch.inputBindings !== undefined &&
    Object.values(patch.inputBindings).some((binding) => !isGraphInputBinding(binding))
  ) {
    throw new ValidationError('Node patch carries a malformed input binding.');
  }
  if (
    patch.parameters !== undefined &&
    typeof patch.parameters !== 'object'
  ) {
    throw new ValidationError('Node patch parameters must be a JSON-value record.');
  }
}

function describeDocument(document: unknown): string {
  const id = (document as Record<string, unknown>)?.['id'];
  return typeof id === 'string' ? id : '<missing document>';
}

function endpointTargetPortIdsOf(document: GraphWorkflowDocument, edgeId: string, endpoint: GraphEndpoint, context: string): void {
  if (!isGraphEndpoint(endpoint)) {
    throw new ValidationError(`Edge '${edgeId}' ${context} endpoint is not a valid GraphEndpoint.`);
  }
  if (endpoint.scope === 'workflow') {
    const declared = [...document.inputs, ...document.outputs].some(
      (port) => port.id === endpoint.port
    );
    if (!declared) {
      throw new ValidationError(
        `Edge '${edgeId}' ${context} references workflow port '${endpoint.port}' that is not declared on the document.`
      );
    }
    return;
  }
  const node = document.nodes.find((candidate) => candidate.id === endpoint.nodeId);
  if (!node) {
    throw new ValidationError(
      `Edge '${edgeId}' ${context} references node '${endpoint.nodeId}' which is not part of the document.`
    );
  }
  if (typeof endpoint.port !== 'string' || !endpoint.port) {
    throw new ValidationError(
      `Edge '${edgeId}' ${context} node endpoint must reference a non-empty port identifier.`
    );
  }
}

/**
 * Pure reducer: returns the next immutable document for a command.
 * Validation failures throw a Decaf {@link ValidationError}, never a runtime
 * `Error`.
 */
export function applyGraphDocumentCommand(
  document: GraphWorkflowDocument | null,
  command: GraphDocumentCommand
): GraphWorkflowDocument | null {
  switch (command.type) {
    case 'document.reset':
      return null;
    case 'document.replace': {
      const next = command.document;
      if (!next || typeof next !== 'object' || Array.isArray(next)) {
        throw new ValidationError('Graph document replacement requires a valid document object.');
      }
      if (!isNonEmptyString(next.id) || !isNonEmptyString(next.name)) {
        throw new ValidationError('Graph document replacement requires id and name.');
      }
      assertGraphWorkflowDocumentValid(next);
      return next;
    }
    default:
      break;
  }
  if (!document) {
    throw new ValidationError(
      `Document command '${command.type}' was dispatched before a document was set into the store.`
    );
  }
  switch (command.type) {
    case 'node.add': {
      const node = command.node;
      if (!node || typeof node !== 'object' || !isNonEmptyString(node.id) || !isNonEmptyString(node.kind)) {
        throw new ValidationError('Added graph node must carry an id and a kind.');
      }
      if (document.nodes.some((existing) => existing.id === node.id)) {
        throw new ValidationError(`Graph node '${node.id}' already exists in the workflow document.`);
      }
      return { ...document, nodes: [...document.nodes, node] };
    }
    case 'node.remove': {
      const { nodeId } = command;
      const filtered = document.nodes.filter((node) => node.id !== nodeId);
      if (filtered.length === document.nodes.length) {
        throw new ValidationError(`Graph node '${nodeId}' does not exist in the workflow document.`);
      }
      return {
        ...document,
        nodes: filtered,
        edges: document.edges.filter(
          (edge) =>
            (edge.source.scope !== 'node' || edge.source.nodeId !== nodeId) &&
            (edge.target.scope !== 'node' || edge.target.nodeId !== nodeId)
        ),
      };
    }
    case 'node.update': {
      const { nodeId, patch } = command;
      assertValidPatch(patch);
      const index = document.nodes.findIndex((node) => node.id === nodeId);
      if (index < 0) {
        throw new ValidationError(`Graph node '${nodeId}' does not exist in the workflow document.`);
      }
      const node = document.nodes[index];
      const { size: patchSize, ...patchRest } = patch;
      const merged: GraphNodeInstance = {
        ...node,
        ...patchRest,
        parameters: { ...node.parameters, ...(patch.parameters ?? {}) },
        inputBindings: node.inputBindings || patch.inputBindings
          ? {
              ...(node.inputBindings ?? {}),
              ...(patch.inputBindings ?? {}),
            }
          : undefined,
        outputBindings: node.outputBindings || patch.outputBindings
          ? {
              ...(node.outputBindings ?? {}),
              ...(patch.outputBindings ?? {}),
            }
          : undefined,
        metadata: node.metadata || patch.metadata
          ? {
              ...(node.metadata ?? {}),
              ...(patch.metadata ?? {}),
            }
          : undefined,
      };
      if (merged.inputBindings && !Object.keys(merged.inputBindings).length) delete merged.inputBindings;
      if (merged.outputBindings && !Object.keys(merged.outputBindings).length) delete merged.outputBindings;
      if (merged.metadata && !Object.keys(merged.metadata).length) delete merged.metadata;
      if (!isNonEmptyString(merged.id) || !isNonEmptyString(merged.kind)) {
        throw new ValidationError('Graph node update must preserve id and kind.');
      }
      if (typeof merged.parameters !== 'object' || merged.parameters === null) {
        throw new ValidationError('Graph node update must preserve a JSON parameters record.');
      }
      const size = patchSize;
      if (size && merged.ui && (size.width !== undefined || size.height !== undefined)) {
        const ui = merged.ui;
        merged.ui = {
          ...ui,
          size: { width: size.width ?? ui.size?.width, height: size.height ?? ui.size?.height },
        };
      } else if (size && !size.width && !size.height && merged.ui) {
        delete merged.ui.size;
      }
      const nodes = [...document.nodes];
      nodes[index] = merged;
      return { ...document, nodes };
    }
    case 'node.move': {
      const { nodeId, position } = command;
      if (!isNonEmptyString(nodeId)) {
        throw new ValidationError('Graph node move requires a node id.');
      }
      if (!isPoint(position)) {
        throw new ValidationError('Graph node move requires a numeric x/y position.');
      }
      const index = document.nodes.findIndex((node) => node.id === nodeId);
      if (index < 0) {
        throw new ValidationError(
          `Cannot move graph node '${nodeId}' because it does not exist in the workflow document.`
        );
      }
      const { ui, ...rest } = document.nodes[index];
      const nodes = [...document.nodes];
      nodes[index] = { ...rest, ui: { ...(ui ?? { position }), position } };
      return { ...document, nodes };
    }
    case 'node.moves': {
      const moves = Array.isArray(command.moves) ? command.moves : [];
      if (!moves.every((move) => isNonEmptyString(move.nodeId) && isPoint(move.position))) {
        throw new ValidationError('Graph node moves must carry node ids and finite positions.');
      }
      let next: GraphWorkflowDocument = document;
      for (const move of moves) {
        const moved = applyGraphDocumentCommand(next, {
          type: 'node.move',
          nodeId: move.nodeId,
          position: move.position,
        });
        if (!moved) {
          throw new ValidationError('Graph node moves must preserve the workflow document.');
        }
        next = moved;
      }
      return next;
    }
    case 'node.resize': {
      const { nodeId, size } = command;
      if (!isNonEmptyString(nodeId) || !isSize(size)) {
        throw new ValidationError('Graph node resize requires a node id and a numeric size.');
      }
      const index = document.nodes.findIndex((node) => node.id === nodeId);
      if (index < 0) {
        throw new ValidationError(
          `Cannot resize graph node '${nodeId}' because it does not exist in the workflow document.`
        );
      }
      const node = document.nodes[index];
      const ui = node.ui ?? { position: { x: 0, y: 0 } };
      const mergedSize = { width: size.width ?? ui.size?.width, height: size.height ?? ui.size?.height };
      const nodes = [...document.nodes];
      nodes[index] = { ...node, ui: { ...ui, size: mergedSize } };
      return { ...document, nodes };
    }
    case 'edge.add': {
      const edge = command.edge;
      if (!edge || typeof edge !== 'object') {
        throw new ValidationError('Graph edge add requires an edge payload.');
      }
      if (!isNonEmptyString(edge.id)) {
        throw new ValidationError(`Graph edge add requires a non-empty id.`);
      }
      if (edge.type !== 'data' && edge.type !== 'connection') {
        throw new ValidationError(
          `Graph edge '${edge.id}' type '${String(edge.type)}' is not a valid edge type (data or connection are allowed).`
        );
      }
      endpointTargetPortIdsOf(document, edge.id, edge.source, 'source');
      endpointTargetPortIdsOf(document, edge.id, edge.target, 'target');
      if (document.edges.some((existing) => existing.id === edge.id)) {
        throw new ValidationError(`Graph edge '${edge.id}' already exists in the workflow document.`);
      }
      return { ...document, edges: [...document.edges, edge] };
    }
    case 'edge.remove': {
      const filtered = document.edges.filter((edge) => edge.id !== command.edgeId);
      if (filtered.length === document.edges.length) {
        throw new ValidationError(`Graph edge '${command.edgeId}' does not exist in the workflow document.`);
      }
      return { ...document, edges: filtered };
    }
    case 'edge.removes': {
      const targetIds = Array.isArray(command.edgeIds) ? command.edgeIds : [];
      const nextIds = new Set(targetIds);
      if (!Array.isArray(command.edgeIds)) {
        throw new ValidationError('Graph edge removals must carry edge ids.');
      }
      for (const edgeId of nextIds) {
        if (!isNonEmptyString(edgeId)) {
          throw new ValidationError('Graph edge removals must carry edge ids.');
        }
        if (!document.edges.some((edge) => edge.id === edgeId)) {
          throw new ValidationError(`Graph edge '${edgeId}' does not exist in the workflow document.`);
        }
      }
      return { ...document, edges: document.edges.filter((edge) => !nextIds.has(edge.id)) };
    }
    case 'viewport.set': {
      const viewport = command.viewport;
      if (
        !viewport ||
        typeof viewport !== 'object' ||
        typeof viewport.x !== 'number' ||
        typeof viewport.y !== 'number' ||
        typeof viewport.zoom !== 'number' ||
        !Number.isFinite(viewport.x) ||
        !Number.isFinite(viewport.y) ||
        !Number.isFinite(viewport.zoom) ||
        viewport.zoom <= 0
      ) {
        throw new ValidationError('Graph diagram viewport must carry numeric x, y and zoom > 0.');
      }
      return { ...document, ui: { ...(document.ui ?? {}), viewport } };
    }
    default:
      throw new ValidationError(
        `Unknown graph document command '${String((command as { type: unknown }).type)}'.`
      );
  }
}

export type { GraphWorkflowViewport };
