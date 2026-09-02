/** @module for-angular/graph/document/GraphWorkflowDocumentStore
 * @summary Root-scoped store holding the canonical graph workflow document (DECAF-50 §4.12).
 * @description Canonical-only after the P7 cutover (§4.12/§4.14): this store is the single
 * source of truth; every semantic mutation dispatches a {@link GraphDocumentCommand} and
 * the canvas diagram is always reconciled from the stored document, never the other way
 * around. The legacy decorated-root snapshot pipeline only seeds the store at session
 * start (spec §4.11 lossless conversion).
 */
import { Injectable, signal, type Signal, type WritableSignal } from '@angular/core';
import { InternalError, ValidationError } from '@decaf-ts/db-decorators';
import type {
  GraphEdgeInstance,
  GraphJsonValue,
  GraphNodeInstance,
  GraphNodeManifest,
  GraphWorkflowDocument,
  GraphWorkflowViewport,
} from '@decaf-ts/ui-decorators/graph';
import {
  applyGraphDocumentCommand,
  type GraphDocumentCommand,
  type GraphNodeInstancePatch,
} from './GraphDocumentCommands';
import { graphNodeInstanceFromManifest } from './GraphNodePaletteFactory';

/** Position of a node in the workflow diagram `{x, y}` (DECAF-50 §4.12). */
export interface GraphPosition {
  x: number;
  y: number;
}
/** Current version or 0 when no document was set yet. */
function incrementVersion(version: number): number {
  return version + 1;
}

/**
 * Detects a legacy canvas badge artifact node (§4.12 cutover): the legacy
 * decorated-root canvas draws workflow input ports as draggable `graph-input-value-node`
 * badges (`input-{port}` … `input-{port}-{n}` for duplicates), and the sanctioned
 * legacy→canonical conversion (§4.11) carried them into `document.nodes` with the
 * fallback kind equal to their own id. The canonical document models those ports in
 * `document.inputs` (§4.4.3 "workflow-owned"), and the canvas adapter reprojects its
 * own boundary badges from the ports — so a badge node and every view-only edge bound
 * to it are duplicate canvas artifacts, not executable nodes (§4.4.1). The adapter
 * translates stale `node:input-{port}` endpoints back to the port anyway, so dropping
 * them keeps the canvas view identical.
 */
function isLegacyInputBoundaryArtifact(node: GraphNodeInstance, portIds: ReadonlySet<string>): boolean {
  if (typeof node.kind !== 'string' || node.kind !== node.id || !node.id.startsWith('input-')) return false;
  const role = (node.parameters as Record<string, GraphJsonValue> | undefined)?.['role'];
  return role === 'input' && portIds.has(node.id.slice('input-'.length));
}

/**
 * Drops legacy boundary badge artifacts (and dangling view-only edges) from a
 * canonical document before it lands in the store. Passes through any document
 * that carries no badge; the unchanged reference keeps allocation-free paths.
 */
function dropLegacyBoundaryArtifacts(document: GraphWorkflowDocument, operation: string): GraphWorkflowDocument {
  const portIds = new Set<string>(document.inputs.map((port) => port.id));
  const artifactIds = new Set<string>(
    document.nodes.filter((node) => isLegacyInputBoundaryArtifact(node, portIds)).map((node) => node.id)
  );
  if (!artifactIds.size) return document;
  const nodes = document.nodes.filter((node) => !artifactIds.has(node.id));
  const edges = document.edges.filter(
    (edge) =>
      (edge.source.scope !== 'node' || !artifactIds.has(edge.source.nodeId)) &&
      (edge.target.scope !== 'node' || !artifactIds.has(edge.target.nodeId))
  );
  return { ...document, nodes, edges };
}

/** Id given by the stale legacy canvas to the positional clone of a relation edge (§4.11). */
const legacySyntheticEdgeId = /^edge-\d+$/;

function graphEdgeEndpointPairKey(edge: GraphEdgeInstance): string {
  const keyOf = (endpoint: GraphEdgeInstance['source']): string =>
    endpoint.scope === 'node'
      ? `node:${endpoint.nodeId}:${endpoint.port}`
      : `workflow:${endpoint.port}`;
  return `${keyOf(edge.source)}->${keyOf(edge.target)}`;
}

/**
 * Canonical identity invariant (DECAF-50 §4.10): the document carries at most one
 * edge per endpoint pair. The stale legacy canvas recorded the same relation both
 * as the document's engine edge and as a positional canvas clone (`edge-{n}`, §4.11);
 * deduplicate by endpoint pair, preferring document-derived ids over those clones.
 * Passes through edge-unique documents unchanged (allocation-free path).
 */
function dropDuplicateEdges(document: GraphWorkflowDocument, operation: string): GraphWorkflowDocument {
  const preserved: GraphEdgeInstance[] = [];
  const firstByPair = new Map<string, number>();
  for (const edge of document.edges) {
    const key = graphEdgeEndpointPairKey(edge);
    const existing = firstByPair.get(key);
    if (existing === undefined) {
      firstByPair.set(key, preserved.length);
      preserved.push(edge);
      continue;
    }
    if (legacySyntheticEdgeId.test(edge.id) && !legacySyntheticEdgeId.test(preserved[existing].id)) {
      preserved[existing] = edge;
    }
  }
  if (preserved.length === document.edges.length) return document;
  return { ...document, edges: preserved };
}

/**
 * Root-scoped store holding the canonical {@link GraphWorkflowDocument}
 * (DECAF-50 §4.12): signal-based document/version/dirty state with command
 * application, structural validation on every write, and legacy-artifact
 * cleanup on initialize.
 */
@Injectable({ providedIn: 'root' })
export class GraphWorkflowDocumentStore {
  private readonly documentSignal = signal<GraphWorkflowDocument | null>(null);
  private readonly versionSignal = signal(0);
  private readonly dirtySignal = signal(false);

  /**
   * Seeds the store with the first document of a session. Invalid documents throw
   * a Decaf ValidationError before any state lands in the store.
   */
  initialize(document: GraphWorkflowDocument): void {
    const prepared = dropDuplicateEdges(dropLegacyBoundaryArtifacts(document, 'initialize'), 'initialize');
    this.assertValidShape(prepared, 'initialize');
    this.documentSignal.set(prepared);
    this.versionSignal.set(1);
    this.dirtySignal.set(false);
  }

  /**
   * Replaces the document (load/undo/restore) and marks the store dirty.
   */
  replace(document: GraphWorkflowDocument): void {
    const prepared = dropDuplicateEdges(dropLegacyBoundaryArtifacts(document, 'replace'), 'replace');
    this.assertValidShape(prepared, 'replace');
    this.documentSignal.set(prepared);
    this.versionSignal.update(incrementVersion);
    this.dirtySignal.set(false);
  }

  /** Returns the last accepted document (undefined when not initialized). */
  document(): GraphWorkflowDocument | undefined {
    return this.documentSignal() ?? undefined;
  }

  /** Consecutive document version, incremented on every accepted mutation. */
  version(): number {
    return this.versionSignal();
  }

  /** True after any mutation since the last save/reset. */
  isDirty(): boolean {
    return this.dirtySignal();
  }

  /** Mutable signals powering Angular compositions (document/version/dirty). */
  get signals(): {
    readonly document: Signal<GraphWorkflowDocument | null>;
    readonly version: WritableSignal<number>;
    readonly dirty: WritableSignal<boolean>;
  } {
    return {
      document: this.documentSignal,
      version: this.versionSignal,
      dirty: this.dirtySignal,
    };
  }

  /**
   * Returns a deep clone of the stored document. Save/history/autosave must read
   * only from the store, never rebuild from the decorated root (spec §4.12).
   */
  snapshot(): GraphWorkflowDocument {
    const document = this.documentSignal();
    if (!document) {
      throw new InternalError('Graph document store has no document; initialize or load one first.');
    }
    return JSON.parse(JSON.stringify(document)) as GraphWorkflowDocument;
  }

  /**
   * Applies a single document command and stores the resulting document.
   * `document.replace`/`document.reset` are always accepted; every other command
   * requires an initialized document.
   */
  dispatchCommand(command: GraphDocumentCommand): void {
    const current = this.documentSignal();
    const next = applyGraphDocumentCommand(current, command);
    if (next) {
      this.assertValidShape(next, command.type);
      this.documentSignal.set(next);
    } else {
      this.documentSignal.set(null);
    }
    this.versionSignal.update(incrementVersion);
    this.dirtySignal.set(true);
  }

  /** Adds a node through the canonical command pipeline. */
  addNode(node: GraphNodeInstance): void {
    this.dispatchCommand({ type: 'node.add', node });
  }

  /**
   * Adds a node from a palette manifest through the canonical command
   * pipeline (editor palette cutover, §4.14): the built instance carries
   * manifest defaults and a unique id; no node constructor is involved.
   */
  addNodeFromManifest(manifest: GraphNodeManifest, position: GraphPosition, label?: string): GraphNodeInstance {
    const command = graphNodeInstanceFromManifest(
      this.documentSignal() as GraphWorkflowDocument,
      manifest,
      position,
      label
    );
    if (command.type !== 'node.add') {
      throw new InternalError('Graph palette node factory produced a non-add command.');
    }
    this.dispatchCommand(command);
    return JSON.parse(JSON.stringify(command.node)) as GraphNodeInstance;
  }

  /** Removes a node and the edges touching it. */
  removeNode(nodeId: string): void {
    this.dispatchCommand({ type: 'node.remove', nodeId });
  }

  /** Shallow-merges a patch into node fields (except identity). */
  updateNode(nodeId: string, patch: GraphNodeInstancePatch): void {
    this.dispatchCommand({ type: 'node.update', nodeId, patch });
  }

  /** Commits a node's final canvas position (drag-end only). */
  moveNode(nodeId: string, position: GraphPosition): void {
    this.dispatchCommand({ type: 'node.move', nodeId, position });
  }

  /** Adds an edge (endpoints validated upstream by the adapter). */
  addEdge(edge: GraphEdgeInstance): void {
    this.dispatchCommand({ type: 'edge.add', edge });
  }

  /** Removes an edge. */
  removeEdge(edgeId: string): void {
    this.dispatchCommand({ type: 'edge.remove', edgeId });
  }

  /** Stores the diagram viewport inside the document's `ui.viewport` block. */
  setViewport(viewport: GraphWorkflowViewport): void {
    this.dispatchCommand({ type: 'viewport.set', viewport: { ...viewport } });
  }

  /** Clears the store back to its uninitialized state. */
  reset(): void {
    this.dispatchCommand({ type: 'document.reset' });
    this.dirtySignal.set(false);
  }

  private assertValidShape(document: GraphWorkflowDocument | null, operation: string): void {
    if (!document) {
      throw new ValidationError(`Graph store '${operation}' requires a document, none was given.`);
    }
    if (typeof document.id !== 'string' || !document.id || typeof document.name !== 'string') {
      throw new ValidationError(`Graph store '${operation}' received a document without a valid id/name.`);
    }
    if (
      !Array.isArray(document.inputs) ||
      !Array.isArray(document.outputs) ||
      !Array.isArray(document.nodes) ||
      !Array.isArray(document.edges)
    ) {
      throw new ValidationError(
        `Graph store '${operation}' received a document whose inputs/outputs/nodes/edges are not arrays.`
      );
    }
    const ids = new Set<string>();
    for (const node of document.nodes) {
      if (typeof node?.id !== 'string' || !node.id || typeof node.kind !== 'string') {
        throw new ValidationError(
          `Graph store '${operation}' received a node without a valid id/kind ('${String(node?.id)}').`
        );
      }
      if (ids.has(node.id)) {
        throw new ValidationError(`Graph store '${operation}' saw duplicate node id '${node.id}'.`);
      }
      ids.add(node.id);
    }
  }
}
