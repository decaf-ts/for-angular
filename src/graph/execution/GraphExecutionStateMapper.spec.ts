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
