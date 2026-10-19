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
