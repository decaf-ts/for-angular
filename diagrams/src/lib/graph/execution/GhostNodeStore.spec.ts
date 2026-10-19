/**
 * @module for-angular/graph/execution/GhostNodeStore.spec
 * @summary PR-H node-side add-connector contract (DECAF-50 §4.23 G3-29),
 * refined by G4-R5 (drag-to-empty-canvas drop position).
 * @description Proves the singleton store carries both insertion modes: the
 * foreach ghost parent id and the node-side add-connector source (G3-29), including
 * the R5 canvas drop position. Each `consume*` clears its pending value so one
 * click creates at most one node.
 */
import { ghostNodeStore } from './GhostNodeStore';

describe('GhostNodeStore (G3-29 node-side add source, R5 drop position)', () => {
  beforeEach(() => {
    ghostNodeStore.clear();
  });

  afterEach(() => {
    ghostNodeStore.clear();
  });

  it('records and consumes a node-side add source exactly once', () => {
    ghostNodeStore.requestAddNodeFrom('node-a', 'result');

    expect(ghostNodeStore.pendingAddSource()).toEqual({
      nodeId: 'node-a',
      portId: 'result',
    });

    expect(ghostNodeStore.consumeAddSource()).toEqual({
      nodeId: 'node-a',
      portId: 'result',
    });
    expect(ghostNodeStore.pendingAddSource()).toBeNull();
    expect(ghostNodeStore.consumeAddSource()).toBeNull();
  });

  it('carries the R5 empty-canvas drop position with the add source', () => {
    ghostNodeStore.requestAddNodeFrom('node-a', 'result', { x: 640, y: 320 });

    expect(ghostNodeStore.pendingAddSource()).toEqual({
      nodeId: 'node-a',
      portId: 'result',
      position: { x: 640, y: 320 },
    });
    expect(ghostNodeStore.consumeAddSource()).toEqual({
      nodeId: 'node-a',
      portId: 'result',
      position: { x: 640, y: 320 },
    });
  });

  it('keeps the foreach ghost parent independent from the add source', () => {
    ghostNodeStore.requestAddNode('loop-1');
    ghostNodeStore.requestAddNodeFrom('node-a', 'out');

    expect(ghostNodeStore.consume()).toBe('loop-1');
    // Consuming the ghost parent must not clear the add source.
    expect(ghostNodeStore.pendingAddSource()).toEqual({
      nodeId: 'node-a',
      portId: 'out',
    });
    expect(ghostNodeStore.consumeAddSource()).toEqual({ nodeId: 'node-a', portId: 'out' });
  });

  it('clear drops both pending values', () => {
    ghostNodeStore.requestAddNode('loop-1');
    ghostNodeStore.requestAddNodeFrom('node-a', 'out');

    ghostNodeStore.clear();

    expect(ghostNodeStore.pendingParentId()).toBeNull();
    expect(ghostNodeStore.pendingAddSource()).toBeNull();
  });
});

describe('GhostNodeStore (R2-3(5) loop-body + hover state)', () => {
  beforeEach(() => {
    ghostNodeStore.setLoopBodyIds([]);
    ghostNodeStore.hoveredLoopId.set(null);
    ghostNodeStore.hoveredGhostId.set(null);
  });

  afterEach(() => {
    ghostNodeStore.setLoopBodyIds([]);
    ghostNodeStore.hoveredLoopId.set(null);
    ghostNodeStore.hoveredGhostId.set(null);
  });

  it('has no loop body while the set is empty', () => {
    expect(ghostNodeStore.hasLoopBody('loop-1')).toBe(false);
  });

  it('records every populated loop id and reports membership', () => {
    ghostNodeStore.setLoopBodyIds(['loop-1', 'loop-2']);

    expect(ghostNodeStore.hasLoopBody('loop-1')).toBe(true);
    expect(ghostNodeStore.hasLoopBody('loop-2')).toBe(true);
    expect(ghostNodeStore.hasLoopBody('loop-3')).toBe(false);
  });

  it('replaces the previous set instead of merging into it', () => {
    ghostNodeStore.setLoopBodyIds(['loop-1', 'loop-2']);
    ghostNodeStore.setLoopBodyIds(['loop-2', 'loop-3']);

    expect(ghostNodeStore.hasLoopBody('loop-1')).toBe(false);
    expect(ghostNodeStore.hasLoopBody('loop-2')).toBe(true);
    expect(ghostNodeStore.hasLoopBody('loop-3')).toBe(true);
  });

  it('accepts any iterable and copies it into an immutable set', () => {
    const ids = new Set(['loop-1']);
    ghostNodeStore.setLoopBodyIds(ids);

    // mutating the source iterable after the replace-set call has no effect
    ids.add('loop-2');

    expect(ghostNodeStore.hasLoopBody('loop-1')).toBe(true);
    expect(ghostNodeStore.hasLoopBody('loop-2')).toBe(false);
    expect(ghostNodeStore.loopBodyIds()).toBeInstanceOf(Set);
  });

  it('carries the hovered loop and hovered ghost signals', () => {
    expect(ghostNodeStore.hoveredLoopId()).toBeNull();
    expect(ghostNodeStore.hoveredGhostId()).toBeNull();

    ghostNodeStore.hoveredLoopId.set('loop-1');
    ghostNodeStore.hoveredGhostId.set('ghost-loop-1');

    expect(ghostNodeStore.hoveredLoopId()).toBe('loop-1');
    expect(ghostNodeStore.hoveredGhostId()).toBe('ghost-loop-1');

    ghostNodeStore.hoveredLoopId.set(null);
    ghostNodeStore.hoveredGhostId.set(null);

    expect(ghostNodeStore.hoveredLoopId()).toBeNull();
    expect(ghostNodeStore.hoveredGhostId()).toBeNull();
  });
});
