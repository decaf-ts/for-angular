import { TestBed } from '@angular/core/testing';
import { GraphMutationDetectorService } from './GraphMutationDetectorService';
import { GraphAutoSaveService } from './GraphAutoSaveService';
import { GraphHistoryService } from './GraphHistoryService';
import { GraphSaveService } from './GraphSaveService';
import { GraphWorkflowDocumentStore } from '../document/GraphWorkflowDocumentStore';
import { GRAPH_BACKEND_URL } from '../execution/GraphExecutionService';
import type {
  GraphWorkflowDocument,
  GraphWorkflowSnapshot,
  LegacyGraphWorkflowSnapshot,
} from '@decaf-ts/ui-decorators/graph';

/** Minimal canonical document held by the document store (§4.11/§4.12). */
function makeDocument(): GraphWorkflowDocument {
  return {
    id: 'wf1',
    name: 'Workflow',
    inputs: [],
    outputs: [],
    nodes: [
      {
        id: 'wf1-node-1',
        kind: 'core.noop',
        label: 'Node 1',
        parameters: {},
        ui: { position: { x: 0, y: 0 } },
      },
    ],
    edges: [],
  };
}

/** Full legacy persisted snapshot convertible by `graphWorkflowSnapshotFromLegacy`. */
function makeLegacySnapshot(): LegacyGraphWorkflowSnapshot {
  return {
    version: 1,
    definition: {
      name: 'Workflow',
      tag: 'wf1',
      kind: 'workflow',
      inputs: [],
      outputs: [],
      nodes: [],
      relations: [],
    },
    state: {
      inputs: [],
      outputs: [],
      nodes: [],
      edges: [],
      ui: {},
      metadata: {},
    },
  } as unknown as LegacyGraphWorkflowSnapshot;
}

describe('GraphMutationDetectorService', () => {
  let detector: GraphMutationDetectorService;
  let autoSave: GraphAutoSaveService;
  let history: GraphHistoryService;
  let documentStore: GraphWorkflowDocumentStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        GraphMutationDetectorService,
        GraphAutoSaveService,
        GraphHistoryService,
        GraphSaveService,
        GraphWorkflowDocumentStore,
        { provide: GRAPH_BACKEND_URL, useValue: 'http://localhost:3000' },
      ],
    });
    detector = TestBed.inject(GraphMutationDetectorService);
    autoSave = TestBed.inject(GraphAutoSaveService);
    history = TestBed.inject(GraphHistoryService);
    documentStore = TestBed.inject(GraphWorkflowDocumentStore);
  });

  it('records a canonical history entry from the document store when auto-save is off', () => {
    documentStore.initialize(makeDocument());
    detector.configure('wf1', () => makeLegacySnapshot());

    detector.recordMutation('node-position');

    expect(history.canUndoFor('wf1')).toBe(false);
    const current = history.current('wf1');
    expect(current).toBeDefined();
    const snapshot = current?.snapshot as GraphWorkflowSnapshot;
    expect(snapshot.document).toEqual(makeDocument());
    // The legacy builder only contributes editor-only state; the document
    // itself always comes from the store (canonical-only path, §4.11).
    expect(snapshot.editor).toBeDefined();
  });

  it('routes the canonical store snapshot to auto-save when enabled', () => {
    documentStore.initialize(makeDocument());
    detector.configure('wf1', () => makeLegacySnapshot());
    autoSave.setEnabled(true);

    const spy = jest.spyOn(autoSave, 'onMutation');
    detector.recordMutation('edge-connect');

    expect(spy).toHaveBeenCalledWith(
      'wf1',
      expect.objectContaining({ document: makeDocument() }),
    );
    expect(history.current('wf1')).toBeUndefined();
  });

  it('still records the document when the legacy snapshot builder returns null', () => {
    documentStore.initialize(makeDocument());
    detector.configure('wf1', () => null);

    detector.recordMutation('node-crud');

    const current = history.current('wf1');
    expect(current).toBeDefined();
    const snapshot = current?.snapshot as GraphWorkflowSnapshot;
    expect(snapshot).toEqual({ document: makeDocument() });
  });

  it('does nothing when not configured', () => {
    documentStore.initialize(makeDocument());

    detector.recordMutation('node-position');
    expect(history.current('wf1')).toBeUndefined();
  });

  it('does nothing when the document store has no document', () => {
    detector.configure('wf1', () => makeLegacySnapshot());
    autoSave.setEnabled(true);
    const spy = jest.spyOn(autoSave, 'onMutation');

    detector.recordMutation('node-position');

    expect(spy).not.toHaveBeenCalled();
    expect(history.current('wf1')).toBeUndefined();
  });
});
