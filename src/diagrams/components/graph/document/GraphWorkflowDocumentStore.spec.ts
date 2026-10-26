/**
 * @module for-angular/graph/document/GraphWorkflowDocumentStore.spec
 * @summary `arrange()` auto-layout commit-path contract (DECAF-50 §4.12).
 * @description Auto-arrange must reuse the drag-end commit path: it snapshots the
 * document, lazily loads the shared layout engine (mocked here so elkjs is never
 * loaded), and dispatches the returned positions as exactly one `node.moves` command
 * — one version bump, one history step. A second arrange over an already-laid-out
 * document is a no-op.
 */
import { GraphLayoutMode, type GraphWorkflowDocument } from '@decaf-ts/as-graph/shared';
import { GraphWorkflowDocumentStore } from './GraphWorkflowDocumentStore';
import { computeGraphWorkflowLayout } from './GraphWorkflowLayoutLoader';

jest.mock('./GraphWorkflowLayoutLoader', () => ({
  computeGraphWorkflowLayout: jest.fn(),
}));

const layoutMock = computeGraphWorkflowLayout as jest.MockedFunction<
  typeof computeGraphWorkflowLayout
>;

/** Minimal canonical document with two positioned member nodes. */
function documentOf(): GraphWorkflowDocument {
  return {
    id: 'wf-arrange',
    name: 'Arrange workflow',
    inputs: [],
    outputs: [],
    nodes: [
      {
        id: 'node-1',
        kind: 'core.flow.log',
        label: 'Log',
        parameters: {},
        ui: { position: { x: 0, y: 0 } },
      },
      {
        id: 'node-2',
        kind: 'core.utility.code',
        label: 'Code',
        parameters: {},
        ui: { position: { x: 10, y: 10 } },
      },
    ],
    edges: [],
  };
}

/** A store seeded with the canonical arrange fixture. */
function seededStore(): GraphWorkflowDocumentStore {
  const store = new GraphWorkflowDocumentStore();
  store.initialize(documentOf());
  return store;
}

describe('GraphWorkflowDocumentStore.arrange (DECAF-50 §4.12)', () => {
  beforeEach(() => {
    layoutMock.mockReset();
  });

  it('returns false and dispatches nothing when no document is loaded', async () => {
    const store = new GraphWorkflowDocumentStore();
    const dispatch = jest.spyOn(store, 'dispatchCommand');

    await expect(store.arrange()).resolves.toBe(false);

    expect(dispatch).not.toHaveBeenCalled();
    expect(layoutMock).not.toHaveBeenCalled();
  });

  it('commits every returned position through exactly one node.moves command', async () => {
    layoutMock.mockResolvedValue({
      nodes: {
        'node-1': { x: 100, y: 200 },
        'node-2': { x: 300, y: 400 },
      },
    });
    const store = seededStore();
    const versionBefore = store.version();
    const dispatch = jest.spyOn(store, 'dispatchCommand');

    await expect(store.arrange()).resolves.toBe(true);

    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith({
      type: 'node.moves',
      moves: [
        { nodeId: 'node-1', position: { x: 100, y: 200 } },
        { nodeId: 'node-2', position: { x: 300, y: 400 } },
      ],
    });
    // One command for the whole arrange: exactly one version bump.
    expect(store.version()).toBe(versionBefore + 1);
    const nodes = store.document()!.nodes;
    expect(nodes.find((node) => node.id === 'node-1')!.ui!.position).toEqual({ x: 100, y: 200 });
    expect(nodes.find((node) => node.id === 'node-2')!.ui!.position).toEqual({ x: 300, y: 400 });
  });

  it('forwards the caller options to the shared layout engine', async () => {
    layoutMock.mockResolvedValue({ nodes: { 'node-1': { x: 5, y: 5 } } });
    const store = seededStore();

    await store.arrange({ mode: GraphLayoutMode.COMPACTNESS });

    expect(layoutMock).toHaveBeenCalledTimes(1);
    expect(layoutMock.mock.calls[0][1]).toEqual({ mode: GraphLayoutMode.COMPACTNESS });
  });

  it('lays out a snapshot, never the live stored document', async () => {
    layoutMock.mockImplementation(async (document) => {
      document.nodes[0].ui = { position: { x: 999, y: 999 } };
      return { nodes: {} };
    });
    const store = seededStore();

    await store.arrange();

    expect(store.document()!.nodes[0].ui!.position).toEqual({ x: 0, y: 0 });
  });

  it('returns false and dispatches nothing when the computed layout matches the committed positions', async () => {
    layoutMock.mockResolvedValue({
      nodes: {
        'node-1': { x: 0, y: 0 },
        'node-2': { x: 10, y: 10 },
      },
    });
    const store = seededStore();
    const versionBefore = store.version();
    const dispatch = jest.spyOn(store, 'dispatchCommand');

    await expect(store.arrange()).resolves.toBe(false);

    expect(dispatch).not.toHaveBeenCalled();
    expect(store.version()).toBe(versionBefore);
  });

  it('is idempotent: a second arrange over the laid-out document moves nothing', async () => {
    layoutMock.mockResolvedValue({
      nodes: {
        'node-1': { x: 100, y: 200 },
        'node-2': { x: 300, y: 400 },
      },
    });
    const store = seededStore();

    await expect(store.arrange()).resolves.toBe(true);
    const versionAfterFirst = store.version();

    await expect(store.arrange()).resolves.toBe(false);
    expect(store.version()).toBe(versionAfterFirst);
  });
});

/**
 * SAA-1363 reqs 10-12: loop ghosts are canvas-only. A legacy round trip may
 * still carry a `graph.ghost` node and its two mandatory edges; the store strips
 * them on initialize/replace and repairs a populated chain so it ends at
 * `loop:loop` instead of dangling at the removed ghost.
 */
import type { GraphEdgeInstance, GraphNodeInstance } from '@decaf-ts/as-graph/shared';
import { isGraphNodeGhost } from './GraphDocumentMutation';

function loopNodeOf(): GraphNodeInstance {
  return { id: 'loop-1', kind: 'core.loop.foreach', label: 'For each', parameters: {} };
}

function logNodeOf(id: string): GraphNodeInstance {
  return { id, kind: 'core.flow.log', label: id, parameters: {} };
}

function chainEdgeOf(
  id: string,
  source: string,
  sourcePort: string,
  target: string,
  targetPort: string
): GraphEdgeInstance {
  return {
    id,
    type: 'data',
    source: { scope: 'node', nodeId: source, port: sourcePort },
    target: { scope: 'node', nodeId: target, port: targetPort },
    label: targetPort,
    metadata: { mandatory: true },
  };
}

function legacyGhostNodeOf(): GraphNodeInstance {
  return {
    id: 'ghost-loop-1',
    kind: 'graph.ghost',
    label: 'Add node',
    parameters: { ghostParentId: 'loop-1' },
    ui: { position: { x: 300, y: 200 }, size: { width: 56, height: 56 } },
  };
}

/** Empty loop carrying the legacy document ghost and its containment edges. */
function legacyGhostDocument(): GraphWorkflowDocument {
  return {
    id: 'wf-legacy-ghost',
    name: 'Legacy ghost',
    inputs: [],
    outputs: [],
    nodes: [loopNodeOf(), legacyGhostNodeOf()],
    edges: [
      chainEdgeOf('legacy-in', 'loop-1', 'item', 'ghost-loop-1', 'in'),
      chainEdgeOf('legacy-out', 'ghost-loop-1', 'out', 'loop-1', 'loop'),
    ],
  };
}

/** Loop body `a` routed through the legacy ghost: item -> a -> ghost -> loop. */
function legacyPopulatedChainDocument(): GraphWorkflowDocument {
  return {
    id: 'wf-legacy-populated',
    name: 'Legacy populated',
    inputs: [],
    outputs: [],
    nodes: [loopNodeOf(), logNodeOf('a'), legacyGhostNodeOf()],
    edges: [
      chainEdgeOf('item-to-a', 'loop-1', 'item', 'a', 'value'),
      chainEdgeOf('a-to-ghost', 'a', 'value', 'ghost-loop-1', 'in'),
      chainEdgeOf('ghost-to-loop', 'ghost-loop-1', 'out', 'loop-1', 'loop'),
    ],
  };
}

function edgePairsOf(document: GraphWorkflowDocument): string[] {
  return document.edges
    .map((edge) => `${(edge.source as { nodeId: string }).nodeId}:${(edge.source as { port?: string }).port}->${(edge.target as { nodeId: string }).nodeId}:${(edge.target as { port?: string }).port}`)
    .sort();
}

describe('GraphWorkflowDocumentStore — legacy loop ghosts (SAA-1363 reqs 10-12)', () => {
  it('strips a legacy ghost node and its edges on initialize', () => {
    const store = new GraphWorkflowDocumentStore();
    store.initialize(legacyGhostDocument());

    const document = store.document()!;
    expect(document.nodes.some((node) => isGraphNodeGhost(node))).toBe(false);
    expect(document.nodes.map((node) => node.id)).toEqual(['loop-1']);
    expect(document.edges).toEqual([]);
    expect(store.version()).toBe(1);
    expect(store.isDirty()).toBe(false);
  });

  it('strips a legacy ghost node and its edges on replace', () => {
    const store = new GraphWorkflowDocumentStore();
    store.initialize(documentOf());
    const versionBefore = store.version();

    store.replace(legacyGhostDocument());

    const document = store.document()!;
    expect(document.nodes.some((node) => isGraphNodeGhost(node))).toBe(false);
    expect(document.edges).toEqual([]);
    expect(store.version()).toBe(versionBefore + 1);
    expect(store.isDirty()).toBe(false);
  });

  it('repairs a populated legacy chain to end at loop:loop on initialize', () => {
    const store = new GraphWorkflowDocumentStore();
    store.initialize(legacyPopulatedChainDocument());

    const document = store.document()!;
    expect(document.nodes.some((node) => isGraphNodeGhost(node))).toBe(false);
    expect(edgePairsOf(document)).toEqual(['a:value->loop-1:loop', 'loop-1:item->a:value']);
    const closing = document.edges.find(
      (edge) => edge.target.scope === 'node' && edge.target.nodeId === 'loop-1' && edge.target.port === 'loop'
    );
    expect(closing).toBeDefined();
    expect(closing!.source).toMatchObject({ scope: 'node', nodeId: 'a', port: 'value' });
    expect(document.edges.every((edge) => edge.metadata?.['mandatory'] === true)).toBe(true);
  });

  it('repairs a populated legacy chain to end at loop:loop on replace', () => {
    const store = new GraphWorkflowDocumentStore();
    store.initialize(documentOf());

    store.replace(legacyPopulatedChainDocument());

    const document = store.document()!;
    expect(edgePairsOf(document)).toEqual(['a:value->loop-1:loop', 'loop-1:item->a:value']);
    const closing = document.edges.find(
      (edge) => edge.target.scope === 'node' && edge.target.nodeId === 'loop-1' && edge.target.port === 'loop'
    );
    expect(closing).toBeDefined();
    expect(closing!.source).toMatchObject({ scope: 'node', nodeId: 'a', port: 'value' });
  });

  it('passes a ghost-free canonical chain through unchanged (idempotent load)', () => {
    const canonical: GraphWorkflowDocument = {
      id: 'wf-canonical',
      name: 'Canonical',
      inputs: [],
      outputs: [],
      nodes: [loopNodeOf(), logNodeOf('a')],
      edges: [
        chainEdgeOf('loop-1:item->a:value', 'loop-1', 'item', 'a', 'value'),
        chainEdgeOf('a:value->loop-1:loop', 'a', 'value', 'loop-1', 'loop'),
      ],
    };
    const store = new GraphWorkflowDocumentStore();

    store.initialize(canonical);
    const first = store.document()!;
    store.replace(first);

    expect(edgePairsOf(store.document()!)).toEqual(edgePairsOf(canonical));
    expect(store.document()!.edges).toHaveLength(2);
  });
});
