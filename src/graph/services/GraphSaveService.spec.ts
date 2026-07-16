import { TestBed } from '@angular/core/testing';
import { GRAPH_BACKEND_URL } from '../execution/GraphExecutionService';
import { GraphSaveService } from './GraphSaveService';
import type { GraphWorkflowSnapshot } from '@decaf-ts/ui-decorators/graph';

function makeSnapshot(): GraphWorkflowSnapshot {
  return { state: { nodes: [], edges: [] } } as unknown as GraphWorkflowSnapshot;
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
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    TestBed.configureTestingModule({
      providers: [
        GraphSaveService,
        { provide: GRAPH_BACKEND_URL, useValue: 'http://localhost:3000' },
      ],
    });
    service = TestBed.inject(GraphSaveService);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('sends PUT request to backend and returns result', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue(
      mockResponse(JSON.stringify({ workflowId: 'wf1', savedAt: '2024-01-01' }), 200),
    ) as unknown as typeof globalThis.fetch;

    const result = await service.save('wf1', makeSnapshot());

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://localhost:3000/graph/workflow/wf1',
      expect.objectContaining({ method: 'PUT' }),
    );
    expect(result.workflowId).toBe('wf1');
  });

  it('sets saving signal during save', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue(
      mockResponse(JSON.stringify({ workflowId: 'wf1', savedAt: '2024-01-01' }), 200),
    ) as unknown as typeof globalThis.fetch;

    expect(service.isSaving()).toBe(false);
    const promise = service.save('wf1', makeSnapshot());
    expect(service.isSaving()).toBe(true);
    await promise;
    expect(service.isSaving()).toBe(false);
  });

  it('throws on non-OK response', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue(
      mockResponse('Internal error', 500),
    ) as unknown as typeof globalThis.fetch;

    await expect(service.save('wf1', makeSnapshot())).rejects.toThrow(/Graph save failed/);
  });
});
