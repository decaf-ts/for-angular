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
