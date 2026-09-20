import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { GRAPH_AUTOSAVE_DEBOUNCE_MS } from '../tokens/graph-configuration.tokens';
import { GraphAutoSaveService } from './GraphAutoSaveService';
import { GraphSaveService } from './GraphSaveService';
import type { GraphWorkflowSnapshot } from '@decaf-ts/ui-decorators/graph';

/** Canonical snapshot wrapper (`{ document, editor?, metadata? }`). */
function makeSnapshot(): GraphWorkflowSnapshot {
  return {
    document: {
      id: 'wf1',
      name: 'Workflow',
      inputs: [],
      outputs: [],
      nodes: [],
      edges: [],
    },
  };
}

/** Canonical wrapper with an editor block (`{ document, editor?, metadata? }`). */
function makeSnapshotWithEditor(): GraphWorkflowSnapshot {
  return {
    ...makeSnapshot(),
    editor: { duplicateCounts: { text: 1 }, diagramMetadata: { viewport: { x: 0, y: 0, scale: 1 } } },
  };
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
    saveService = jest
      .spyOn(svc, 'saveDocument')
      .mockResolvedValue({ workflowId: 'wf1', savedAt: '2024-01-01' });
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

  it('save-posts the canonical wrapper derived from the document store snapshot', fakeAsync(() => {
    autoSave.setEnabled(true);
    autoSave.onMutation('wf1', makeSnapshot());
    tick(100);

    expect(saveService).toHaveBeenCalledWith(
      'wf1',
      expect.objectContaining({
        document: expect.objectContaining({ id: 'wf1', nodes: [] }),
      }),
    );
  }));

  it('save-posts the canonical wrapper verbatim (editor block preserved)', fakeAsync(() => {
    autoSave.setEnabled(true);
    autoSave.onMutation('wf1', makeSnapshotWithEditor());
    tick(100);

    expect(saveService).toHaveBeenCalledTimes(1);
    const [, posted] = saveService.mock.calls[0] as [string, GraphWorkflowSnapshot];
    expect(posted.document).toBeDefined();
    expect(posted.document.id).toBe('wf1');
    expect(posted.editor).toEqual({ duplicateCounts: { text: 1 }, diagramMetadata: { viewport: { x: 0, y: 0, scale: 1 } } });
  }));
});
