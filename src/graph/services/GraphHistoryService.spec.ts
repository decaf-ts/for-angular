import { TestBed } from '@angular/core/testing';
import { GRAPH_HISTORY_LIMIT } from '../tokens/graph-configuration.tokens';
import { GraphHistoryService } from './GraphHistoryService';
import type { GraphWorkflowSnapshot } from '@decaf-ts/ui-decorators/graph';

function makeSnapshot(id: string): GraphWorkflowSnapshot {
  return {
    state: {
      nodes: [{ id } as never],
      edges: [],
    },
  } as unknown as GraphWorkflowSnapshot;
}

describe('GraphHistoryService', () => {
  let service: GraphHistoryService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        GraphHistoryService,
        { provide: GRAPH_HISTORY_LIMIT, useValue: 3 },
      ],
    });
    service = TestBed.inject(GraphHistoryService);
  });

  it('pushes and undoes snapshots', () => {
    service.push('wf1', makeSnapshot('a'), 'change1');
    service.push('wf1', makeSnapshot('b'), 'change2');

    expect(service.canUndoFor('wf1')).toBe(true);

    const undone = service.undo('wf1');
    expect(undone?.label).toBe('change1');

    expect(service.canUndoFor('wf1')).toBe(false);
    expect(service.undo('wf1')).toBeUndefined();
  });

  it('redoes previously undone snapshots', () => {
    service.push('wf1', makeSnapshot('a'), 'change1');
    service.push('wf1', makeSnapshot('b'), 'change2');

    service.undo('wf1');
    expect(service.canRedoFor('wf1')).toBe(true);

    const redone = service.redo('wf1');
    expect(redone?.label).toBe('change2');

    expect(service.canRedoFor('wf1')).toBe(false);
    expect(service.redo('wf1')).toBeUndefined();
  });

  it('truncates redo stack on push after undo', () => {
    service.push('wf1', makeSnapshot('a'), 'change1');
    service.push('wf1', makeSnapshot('b'), 'change2');
    service.push('wf1', makeSnapshot('c'), 'change3');

    service.undo('wf1'); // cursor at 'change2'
    service.undo('wf1'); // cursor at 'change1'

    service.push('wf1', makeSnapshot('d'), 'change4');

    expect(service.canRedoFor('wf1')).toBe(false);
    const current = service.current('wf1');
    expect(current?.label).toBe('change4');
  });

  it('enforces the configured limit (FIFO eviction)', () => {
    service.push('wf1', makeSnapshot('a'), 'change1');
    service.push('wf1', makeSnapshot('b'), 'change2');
    service.push('wf1', makeSnapshot('c'), 'change3');
    service.push('wf1', makeSnapshot('d'), 'change4');

    expect(service.canUndoFor('wf1')).toBe(true);
    let entry = service.undo('wf1');
    expect(entry?.label).toBe('change3');

    service.undo('wf1');
    service.undo('wf1');
    expect(service.canUndoFor('wf1')).toBe(false);
  });

  it('supports multiple workflows concurrently', () => {
    service.push('wf1', makeSnapshot('a1'), 'change1');
    service.push('wf2', makeSnapshot('b1'), 'change1');

    expect(service.canUndoFor('wf1')).toBe(false);
    expect(service.canUndoFor('wf2')).toBe(false);

    service.push('wf1', makeSnapshot('a2'), 'change2');
    service.push('wf2', makeSnapshot('b2'), 'change2');

    expect(service.canUndoFor('wf1')).toBe(true);
    expect(service.canUndoFor('wf2')).toBe(true);

    const undone1 = service.undo('wf1');
    const undone2 = service.undo('wf2');
    expect(undone1?.label).toBe('change1');
    expect(undone2?.label).toBe('change1');
  });

  it('clears history for a specific workflow', () => {
    service.push('wf1', makeSnapshot('a'), 'change1');
    service.push('wf2', makeSnapshot('b'), 'change1');

    service.clear('wf1');
    expect(service.canUndoFor('wf1')).toBe(false);
    expect(service.canUndoFor('wf2')).toBe(false);

    service.push('wf2', makeSnapshot('c'), 'change2');
    expect(service.canUndoFor('wf2')).toBe(true);
  });

  it('clears all histories', () => {
    service.push('wf1', makeSnapshot('a'), 'change1');
    service.push('wf1', makeSnapshot('b'), 'change2');
    service.push('wf2', makeSnapshot('c'), 'change1');

    service.clearAll();
    expect(service.canUndoFor('wf1')).toBe(false);
    expect(service.canUndoFor('wf2')).toBe(false);
  });
});
