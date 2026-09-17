/**
 * @module for-angular/graph/execution/GhostNodeStore.spec
 * @summary PR-H node-side add-connector contract (DECAF-50 §4.23 G3-29).
 * @description Proves the singleton store carries both insertion modes: the
 * foreach ghost parent id and the node-side add-connector source (G3-29). Each
 * `consume*` clears its pending value so one click creates at most one node.
 */
import { ghostNodeStore } from './GhostNodeStore';

describe('GhostNodeStore (G3-29 node-side add source)', () => {
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
