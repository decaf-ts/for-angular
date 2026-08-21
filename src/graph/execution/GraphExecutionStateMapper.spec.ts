/**
 * @module for-angular/graph/execution/GraphExecutionStateMapper.spec
 * @summary Unit tests for the graph execution event-to-state mapper.
 */
import { GraphExecutionEventType } from '@decaf-ts/integrations/graph/shared';

import type {
  GraphEdgeExecutionStateMap,
  GraphNodeExecutionStateMap,
} from '../types';
import { GraphExecutionStateMapper } from './GraphExecutionStateMapper';

describe('GraphExecutionStateMapper', () => {
  let mapper: GraphExecutionStateMapper;
  let nodes: GraphNodeExecutionStateMap;
  let edges: GraphEdgeExecutionStateMap;

  beforeEach(() => {
    mapper = new GraphExecutionStateMapper();
    nodes = {};
    edges = {};
  });

  function event(type: GraphExecutionEventType, extra: Record<string, unknown> = {}) {
    return {
      id: 'e1',
      sequence: 1,
      runId: 'r1',
      workflowId: 'w1',
      type,
      timestamp: new Date('2024-01-01T00:00:00Z'),
      path: [],
      ...extra,
    } as any;
  }

  it('maps node.started to running status', () => {
    mapper.apply(
      event(GraphExecutionEventType.NODE_STARTED, { nodeId: 'n1' }),
      nodes,
      edges
    );
    expect(nodes['n1'].status).toBe('running');
    expect(nodes['n1'].startedAt).toBeDefined();
  });

  it('maps node.completed to succeeded status with outputs', () => {
    mapper.apply(
      event(GraphExecutionEventType.NODE_COMPLETED, {
        nodeId: 'n1',
        payload: { outputs: { sum: 3 } },
      }),
      nodes,
      edges
    );
    expect(nodes['n1'].status).toBe('succeeded');
    expect(nodes['n1'].outputs?.['sum']).toBe(3);
    expect(nodes['n1'].finishedAt).toBeDefined();
  });

  it('maps node.failed to failed status with error', () => {
    mapper.apply(
      event(GraphExecutionEventType.NODE_FAILED, {
        nodeId: 'n1',
        error: { name: 'Error', message: 'boom' },
      }),
      nodes,
      edges
    );
    expect(nodes['n1'].status).toBe('failed');
    expect(nodes['n1'].error?.message).toBe('boom');
  });

  it('maps node.cacheHit to cached status with fromCache flag', () => {
    mapper.apply(
      event(GraphExecutionEventType.NODE_CACHE_HIT, { nodeId: 'n1' }),
      nodes,
      edges
    );
    expect(nodes['n1'].status).toBe('cached');
    expect(nodes['n1'].fromCache).toBe(true);
  });

  it('maps node.pinned and node.unpinned', () => {
    mapper.apply(
      event(GraphExecutionEventType.NODE_PINNED, { nodeId: 'n1' }),
      nodes,
      edges
    );
    expect(nodes['n1'].pinned).toBe(true);
    mapper.apply(
      event(GraphExecutionEventType.NODE_UNPINNED, { nodeId: 'n1' }),
      nodes,
      edges
    );
    expect(nodes['n1'].pinned).toBe(false);
  });

  it('maps loop iteration events', () => {
    mapper.apply(
      event(GraphExecutionEventType.LOOP_ITERATION_STARTED, {
        nodeId: 'loop1',
        iteration: 2,
      }),
      nodes,
      edges
    );
    expect(nodes['loop1'].loop?.currentIteration).toBe(2);
    mapper.apply(
      event(GraphExecutionEventType.LOOP_ITERATION_COMPLETED, {
        nodeId: 'loop1',
      }),
      nodes,
      edges
    );
    expect(nodes['loop1'].loop?.completedIterations).toBe(1);
  });

  it('maps edge.valueRouted to edge state', () => {
    mapper.apply(
      event(GraphExecutionEventType.EDGE_VALUE_ROUTED, {
        edgeId: 'e1',
        payload: { value: 42 },
      }),
      nodes,
      edges
    );
    expect(edges['e1'].status).toBe('succeeded');
    expect(edges['e1'].lastValue).toBe(42);
    expect(edges['e1'].updatedAt).toBeDefined();
  });

  describe('DECAF-48 node.stateChanged', () => {
    it('maps running visual state to status + visualState and records startedAt', () => {
      mapper.apply(
        event(GraphExecutionEventType.NODE_STATE_CHANGED, {
          nodeId: 'n1',
          payload: { state: 'running', runId: 'r1', workflowId: 'w1' },
        }),
        nodes,
        edges
      );
      expect(nodes['n1'].status).toBe('running');
      expect(nodes['n1'].visualState).toBe('running');
      expect(nodes['n1'].startedAt).toBeDefined();
      expect(nodes['n1'].finishedAt).toBeUndefined();
    });

    it('maps blocked visual state without recording timestamps', () => {
      mapper.apply(
        event(GraphExecutionEventType.NODE_STATE_CHANGED, {
          nodeId: 'n1',
          payload: { state: 'blocked' },
        }),
        nodes,
        edges
      );
      expect(nodes['n1'].status).toBe('blocked');
      expect(nodes['n1'].visualState).toBe('blocked');
      expect(nodes['n1'].startedAt).toBeUndefined();
      expect(nodes['n1'].finishedAt).toBeUndefined();
    });

    it('maps idle visual state to status + visualState', () => {
      mapper.apply(
        event(GraphExecutionEventType.NODE_STATE_CHANGED, {
          nodeId: 'n1',
          payload: { state: 'idle' },
        }),
        nodes,
        edges
      );
      expect(nodes['n1'].status).toBe('idle');
      expect(nodes['n1'].visualState).toBe('idle');
    });

    it('records finishedAt on succeeded and preserves the original startedAt', () => {
      mapper.apply(
        event(GraphExecutionEventType.NODE_STATE_CHANGED, {
          nodeId: 'n1',
          payload: { state: 'running' },
        }),
        nodes,
        edges
      );
      const startedAt = nodes['n1'].startedAt;
      mapper.apply(
        event(GraphExecutionEventType.NODE_STATE_CHANGED, {
          nodeId: 'n1',
          payload: { state: 'succeeded' },
          timestamp: new Date('2024-01-01T00:01:00Z'),
        }),
        nodes,
        edges
      );
      expect(nodes['n1'].status).toBe('succeeded');
      expect(nodes['n1'].visualState).toBe('succeeded');
      expect(nodes['n1'].startedAt).toBe(startedAt);
      expect(nodes['n1'].finishedAt).toBe('2024-01-01T00:01:00.000Z');
    });

    it('maps failed visual state to status + visualState and records finishedAt', () => {
      mapper.apply(
        event(GraphExecutionEventType.NODE_STATE_CHANGED, {
          nodeId: 'n1',
          payload: { state: 'failed' },
        }),
        nodes,
        edges
      );
      expect(nodes['n1'].status).toBe('failed');
      expect(nodes['n1'].visualState).toBe('failed');
      expect(nodes['n1'].finishedAt).toBeDefined();
    });

    it('maps skipped visual state to status + visualState and records finishedAt', () => {
      mapper.apply(
        event(GraphExecutionEventType.NODE_STATE_CHANGED, {
          nodeId: 'n1',
          payload: { state: 'skipped' },
        }),
        nodes,
        edges
      );
      expect(nodes['n1'].status).toBe('skipped');
      expect(nodes['n1'].visualState).toBe('skipped');
      expect(nodes['n1'].finishedAt).toBeDefined();
    });

    it('ignores stateChanged events without a state payload', () => {
      mapper.apply(
        event(GraphExecutionEventType.NODE_STATE_CHANGED, { nodeId: 'n1', payload: { runId: 'r' } }),
        nodes,
        edges
      );
      expect(nodes['n1'].status).toBeUndefined();
      expect(nodes['n1'].visualState).toBeUndefined();
      expect(nodes['n1'].startedAt).toBeUndefined();
    });
  });

  describe('DECAF-48 edge.stateChanged', () => {
    it('maps running visual state to status + visualState without updatedAt', () => {
      mapper.apply(
        event(GraphExecutionEventType.EDGE_STATE_CHANGED, {
          edgeId: 'e1',
          payload: { state: 'running' },
        }),
        nodes,
        edges
      );
      expect(edges['e1'].status).toBe('running');
      expect(edges['e1'].visualState).toBe('running');
      expect(edges['e1'].updatedAt).toBeUndefined();
    });

    it('maps blocked visual state (waiting on upstream nodes)', () => {
      mapper.apply(
        event(GraphExecutionEventType.EDGE_STATE_CHANGED, {
          edgeId: 'e1',
          payload: { state: 'blocked' },
        }),
        nodes,
        edges
      );
      expect(edges['e1'].status).toBe('blocked');
      expect(edges['e1'].visualState).toBe('blocked');
    });

    it('maps succeeded visual state and records updatedAt', () => {
      mapper.apply(
        event(GraphExecutionEventType.EDGE_STATE_CHANGED, {
          edgeId: 'e1',
          payload: { state: 'succeeded' },
        }),
        nodes,
        edges
      );
      expect(edges['e1'].status).toBe('succeeded');
      expect(edges['e1'].visualState).toBe('succeeded');
      expect(edges['e1'].updatedAt).toBeDefined();
    });

    it('maps failed visual state and records updatedAt', () => {
      mapper.apply(
        event(GraphExecutionEventType.EDGE_STATE_CHANGED, {
          edgeId: 'e1',
          payload: { state: 'failed' },
          timestamp: new Date('2024-01-01T00:02:00Z'),
        }),
        nodes,
        edges
      );
      expect(edges['e1'].status).toBe('failed');
      expect(edges['e1'].visualState).toBe('failed');
      expect(edges['e1'].updatedAt).toBe('2024-01-01T00:02:00.000Z');
    });

    it('ignores stateChanged events without a state payload', () => {
      mapper.apply(
        event(GraphExecutionEventType.EDGE_STATE_CHANGED, { edgeId: 'e1', payload: { runId: 'r' } }),
        nodes,
        edges
      );
      expect(edges['e1'].status).toBeUndefined();
      expect(edges['e1'].visualState).toBeUndefined();
      expect(edges['e1'].updatedAt).toBeUndefined();
    });
  });

  describe('DECAF-48 node.skipped / node.cacheHit', () => {
    it('maps node.skipped to skipped status + visualState with finishedAt', () => {
      mapper.apply(
        event(GraphExecutionEventType.NODE_SKIPPED, { nodeId: 'n1' }),
        nodes,
        edges
      );
      expect(nodes['n1'].status).toBe('skipped');
      expect(nodes['n1'].visualState).toBe('skipped');
      expect(nodes['n1'].finishedAt).toBeDefined();
    });

    it('maps node.cacheHit to cached status with succeeded visual state', () => {
      mapper.apply(
        event(GraphExecutionEventType.NODE_CACHE_HIT, { nodeId: 'n1' }),
        nodes,
        edges
      );
      expect(nodes['n1'].status).toBe('cached');
      expect(nodes['n1'].visualState).toBe('succeeded');
      expect(nodes['n1'].fromCache).toBe(true);
    });
  });

  describe('DECAF-48 workflow.failed marks unexecuted elements skipped', () => {
    beforeEach(() => {
      mapper.apply(
        event(GraphExecutionEventType.NODE_STATE_CHANGED, {
          nodeId: 'done',
          payload: { state: 'succeeded' },
        }),
        nodes,
        edges
      );
      mapper.apply(
        event(GraphExecutionEventType.NODE_STATE_CHANGED, {
          nodeId: 'running',
          payload: { state: 'running' },
        }),
        nodes,
        edges
      );
      mapper.apply(
        event(GraphExecutionEventType.NODE_STATE_CHANGED, {
          nodeId: 'blocked',
          payload: { state: 'blocked' },
        }),
        nodes,
        edges
      );
      mapper.apply(
        event(GraphExecutionEventType.NODE_STATE_CHANGED, {
          nodeId: 'failing',
          payload: { state: 'failed' },
        }),
        nodes,
        edges
      );
      mapper.apply(
        event(GraphExecutionEventType.EDGE_STATE_CHANGED, {
          edgeId: 'routed',
          payload: { state: 'succeeded' },
        }),
        nodes,
        edges
      );
      mapper.apply(
        event(GraphExecutionEventType.EDGE_STATE_CHANGED, {
          edgeId: 'blocked',
          payload: { state: 'blocked' },
        }),
        nodes,
        edges
      );
    });

    it('fades nodes that never reached a terminal state', () => {
      mapper.apply(
        event(GraphExecutionEventType.WORKFLOW_FAILED),
        nodes,
        edges
      );
      expect(nodes['done'].status).toBe('succeeded');
      expect(nodes['running'].status).toBe('skipped');
      expect(nodes['blocked'].status).toBe('skipped');
      expect(nodes['failing'].status).toBe('failed');
    });

    it('fades edges that never reached a terminal state but keeps routed/succeeded edges', () => {
      mapper.apply(
        event(GraphExecutionEventType.WORKFLOW_FAILED),
        nodes,
        edges
      );
      expect(edges['routed'].status).toBe('succeeded');
      expect(edges['blocked'].status).toBe('skipped');
    });

    it('keeps cached and skipped nodes intact (terminal statuses)', () => {
      mapper.apply(
        event(GraphExecutionEventType.NODE_CACHE_HIT, { nodeId: 'cached' }),
        nodes,
        edges
      );
      mapper.apply(
        event(GraphExecutionEventType.NODE_SKIPPED, { nodeId: 'wasSkipped' }),
        nodes,
        edges
      );
      mapper.apply(
        event(GraphExecutionEventType.WORKFLOW_FAILED),
        nodes,
        edges
      );
      expect(nodes['cached'].status).toBe('cached');
      expect(nodes['wasSkipped'].status).toBe('skipped');
    });
  });

  it('preserves existing state across multiple events', () => {
    mapper.apply(
      event(GraphExecutionEventType.NODE_STARTED, { nodeId: 'n1' }),
      nodes,
      edges
    );
    mapper.apply(
      event(GraphExecutionEventType.NODE_COMPLETED, {
        nodeId: 'n1',
        payload: { outputs: { x: 1 } },
      }),
      nodes,
      edges
    );
    expect(nodes['n1'].startedAt).toBeDefined();
    expect(nodes['n1'].status).toBe('succeeded');
    expect(nodes['n1'].outputs?.['x']).toBe(1);
  });

  it('ignores events without nodeId or edgeId', () => {
    mapper.apply(
      event(GraphExecutionEventType.WORKFLOW_STARTED),
      nodes,
      edges
    );
    expect(Object.keys(nodes)).toHaveLength(0);
    expect(Object.keys(edges)).toHaveLength(0);
  });
});
