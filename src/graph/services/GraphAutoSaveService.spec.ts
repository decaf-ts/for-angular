import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { GRAPH_AUTOSAVE_DEBOUNCE_MS } from '../tokens/graph-configuration.tokens';
import { GraphAutoSaveService } from './GraphAutoSaveService';
import { GraphSaveService } from './GraphSaveService';
import type { GraphWorkflowSnapshot } from '@decaf-ts/ui-decorators/graph';

function makeSnapshot(): GraphWorkflowSnapshot {
  return { state: { nodes: [], edges: [] } } as unknown as GraphWorkflowSnapshot;
}

describe('GraphAutoSaveService', () => {
  let autoSave: GraphAutoSaveService;
  let saveService: jest.SpyInstance;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        GraphAutoSaveService,
        GraphSaveService,
        { provide: GRAPH_AUTOSAVE_DEBOUNCE_MS, useValue: 100 },
      ],
    });
    autoSave = TestBed.inject(GraphAutoSaveService);
    const svc = TestBed.inject(GraphSaveService);
    saveService = jest.spyOn(svc, 'save').mockResolvedValue({ workflowId: 'wf1', savedAt: '2024-01-01' });
  });

  afterEach(() => {
    saveService.mockRestore();
  });

  it('does nothing when disabled', fakeAsync(() => {
    autoSave.onMutation('wf1', makeSnapshot());
    tick(200);
    expect(saveService).not.toHaveBeenCalled();
  }));

  it('debounces mutations when enabled', fakeAsync(() => {
    autoSave.setEnabled(true);

    autoSave.onMutation('wf1', makeSnapshot());
    autoSave.onMutation('wf1', makeSnapshot());
    autoSave.onMutation('wf1', makeSnapshot());

    expect(saveService).not.toHaveBeenCalled();

    tick(100);
    expect(saveService).toHaveBeenCalledTimes(1);
  }));

  it('flushes pending save immediately', fakeAsync(() => {
    autoSave.setEnabled(true);
    autoSave.onMutation('wf1', makeSnapshot());

    autoSave.flush();
    expect(saveService).toHaveBeenCalledTimes(1);
  }));

  it('cancels pending save when disabled', fakeAsync(() => {
    autoSave.setEnabled(true);
    autoSave.onMutation('wf1', makeSnapshot());

    autoSave.setEnabled(false);
    tick(200);
    expect(saveService).not.toHaveBeenCalled();
  }));
});
