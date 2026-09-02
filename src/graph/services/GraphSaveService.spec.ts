import { TestBed } from '@angular/core/testing';
import { GRAPH_BACKEND_URL } from '../execution/GraphExecutionService';
import { GraphSaveService } from './GraphSaveService';
import { GraphWorkflowDocumentStore } from '../document/GraphWorkflowDocumentStore';
import type {
  GraphNodeInstance,
  GraphWorkflowDocument,
  GraphWorkflowSnapshot,
} from '@decaf-ts/ui-decorators/graph';

/**
 * Minimal canonical workflow document (DECAF-50 §4.4): the executable
 * semantic truth posted by {@link GraphSaveService.saveDocument}.
 */
function makeDocument(id = 'wf1'): GraphWorkflowDocument {
  return {
    id,
    name: 'Workflow',
    inputs: [],
    outputs: [],
    nodes: [
      {
        id: `${id}-node-1`,
        kind: 'core.noop',
        label: 'Node 1',
        parameters: {},
        ui: { position: { x: 10, y: 20 } },
      },
    ],
    edges: [],
  };
}

/** Canonical snapshot wrapper (`{ document, editor?, metadata? }`, §4.4/§4.11). */
function makeSnapshot(id = 'wf1'): GraphWorkflowSnapshot {
  return { document: makeDocument(id) };
}

function mockResponse(body: string, status: number) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    text: () => Promise.resolve(body),
    json: () => Promise.resolve(JSON.parse(body)),
  };
}

describe('GraphSaveService', () => {
  let service: GraphSaveService;
  let documentStore: GraphWorkflowDocumentStore;
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    TestBed.configureTestingModule({
      providers: [
        GraphSaveService,
        GraphWorkflowDocumentStore,
        { provide: GRAPH_BACKEND_URL, useValue: 'http://localhost:3000' },
      ],
    });
    service = TestBed.inject(GraphSaveService);
    documentStore = TestBed.inject(GraphWorkflowDocumentStore);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('PUTs the canonical wrapper to /graph/workflows/:id and returns the save result', async () => {
    const fetchMock = jest.fn().mockResolvedValue(
      mockResponse(JSON.stringify({ workflowId: 'wf1', savedAt: '2024-01-01' }), 200),
    );
    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;

    const snapshot = makeSnapshot();
    const result = await service.saveDocument('wf1', snapshot);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3000/graph/workflows/wf1',
      expect.objectContaining({
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      }),
    );
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(String(init.body))).toEqual(snapshot);
    expect(result.workflowId).toBe('wf1');
    expect(result.savedAt).toBe('2024-01-01');
  });

  it('saves the exact document store snapshot through the canonical route', async () => {
    const fetchMock = jest.fn().mockResolvedValue(
      mockResponse(JSON.stringify({ workflowId: 'wf1', savedAt: '2024-01-01' }), 200),
    );
    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;

    documentStore.initialize(makeDocument());
    const added: GraphNodeInstance = {
      id: 'wf1-node-2',
      kind: 'core.noop',
      label: 'Node 2',
      parameters: { literal: 'edited' },
      ui: { position: { x: 30, y: 40 } },
    };
    documentStore.addNode(added);

    await service.saveDocument('wf1', { document: documentStore.snapshot() });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const payload = JSON.parse(String(init.body)) as GraphWorkflowSnapshot;
    expect(payload.document.nodes.map((node) => node.id)).toEqual([
      'wf1-node-1',
      'wf1-node-2',
    ]);
    expect(payload.document.nodes[1].parameters).toEqual({ literal: 'edited' });
  });

  it('sets saving signal during save', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue(
      mockResponse(JSON.stringify({ workflowId: 'wf1', savedAt: '2024-01-01' }), 200),
    ) as unknown as typeof globalThis.fetch;

    expect(service.isSaving()).toBe(false);
    const promise = service.saveDocument('wf1', makeSnapshot());
    expect(service.isSaving()).toBe(true);
    await promise;
    expect(service.isSaving()).toBe(false);
  });

  it('throws a Decaf InternalError on non-OK response', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue(
      mockResponse('Internal error', 500),
    ) as unknown as typeof globalThis.fetch;

    await expect(service.saveDocument('wf1', makeSnapshot())).rejects.toThrow(
      /Graph canonical save failed: 500/,
    );
  });

  it('loads the persisted canonical wrapper and resolves null on 404', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(mockResponse('Not found', 404))
      .mockResolvedValueOnce(mockResponse(JSON.stringify(makeSnapshot()), 200));
    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;

    await expect(service.loadDocument('wf1')).resolves.toBeNull();

    const loaded = await service.loadDocument('wf1');
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'http://localhost:3000/graph/workflows/wf1',
      expect.objectContaining({ method: 'GET', credentials: 'include' }),
    );
    expect(loaded?.document.id).toBe('wf1');
  });

  it('posts only the canonical wrapper shape (no legacy state/definition keys on the wire)', async () => {
    const fetchMock = jest.fn().mockResolvedValue(
      mockResponse(JSON.stringify({ workflowId: 'wf1', savedAt: '2024-01-01' }), 200),
    );
    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;

    await service.saveDocument('wf1', makeSnapshot());

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const payload = JSON.parse(String(init.body)) as Record<string, unknown>;
    expect('document' in payload).toBe(true);
    expect('state' in payload).toBe(false);
    expect('definition' in payload).toBe(false);
  });
});
