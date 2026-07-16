import { TestBed } from '@angular/core/testing';
import { GraphMutationDetectorService } from './GraphMutationDetectorService';
import { GraphAutoSaveService } from './GraphAutoSaveService';
import { GraphHistoryService } from './GraphHistoryService';
import { GraphSaveService } from './GraphSaveService';
import { GRAPH_BACKEND_URL } from '../execution/GraphExecutionService';
import type { GraphWorkflowSnapshot } from '@decaf-ts/ui-decorators/graph';

function makeSnapshot(): GraphWorkflowSnapshot {
  return { state: { nodes: [], edges: [] } } as unknown as GraphWorkflowSnapshot;
}

describe('GraphMutationDetectorService', () => {
  let detector: GraphMutationDetectorService;
  let autoSave: GraphAutoSaveService;
  let history: GraphHistoryService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        GraphMutationDetectorService,
        GraphAutoSaveService,
        GraphHistoryService,
        GraphSaveService,
        { provide: GRAPH_BACKEND_URL, useValue: 'http://localhost:3000' },
      ],
    });
    detector = TestBed.inject(GraphMutationDetectorService);
    autoSave = TestBed.inject(GraphAutoSaveService);
    history = TestBed.inject(GraphHistoryService);
  });

  it('pushes to history when auto-save is off', () => {
    detector.configure('wf1', () => makeSnapshot());

    detector.recordMutation('node-position');

    expect(history.canUndoFor('wf1')).toBe(false);
    expect(history.current('wf1')).toBeDefined();
  });

  it('routes to auto-save when enabled', () => {
    detector.configure('wf1', () => makeSnapshot());
    autoSave.setEnabled(true);

    const spy = jest.spyOn(autoSave, 'onMutation');
    detector.recordMutation('edge-connect');

    expect(spy).toHaveBeenCalledWith('wf1', expect.any(Object));
    expect(history.current('wf1')).toBeUndefined();
  });

  it('does nothing when not configured', () => {
    detector.recordMutation('node-position');
    expect(history.current('wf1')).toBeUndefined();
  });

  it('does nothing when snapshot builder returns null', () => {
    detector.configure('wf1', () => null);
    detector.recordMutation('node-position');
    expect(history.current('wf1')).toBeUndefined();
  });
});
