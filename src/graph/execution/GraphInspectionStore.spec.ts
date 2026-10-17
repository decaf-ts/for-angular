/**
 * @module for-angular/graph/execution/GraphInspectionStore.spec
 * @summary Unit tests for the node I/O inspection store (DECAF-48 §4.6/Req-8).
 */
import type { GraphNodeInspectionPayload } from '@decaf-ts/as-graph/shared';
import { GraphExecutionEventType, GraphVisualState } from '@decaf-ts/as-graph/shared';

import {
  graphInspection,
  graphInspectionPayloadsFromRunEvents,
  type GraphInspectionRunEvent,
} from './GraphInspectionStore';

function payload(nodeId: string, extra: Partial<GraphNodeInspectionPayload> = {}): GraphNodeInspectionPayload {
  return {
    runId: 'r1',
    workflowId: 'w1',
    nodeId,
    state: 'succeeded' as GraphVisualState,
    inputs: { data: 'Hello' },
    outputs: { result: 3 },
    ...extra,
  };
}

describe('GraphInspectionStore', () => {
  beforeEach(() => {
    graphInspection.reset();
  });

  afterEach(() => {
    graphInspection.reset();
  });

  it('set stores a payload keyed by nodeId', () => {
    graphInspection.set(payload('SplitTextCodeNode'));
    expect(graphInspection.inspections()['SplitTextCodeNode']).toMatchObject({
      nodeId: 'SplitTextCodeNode',
      state: 'succeeded',
    });
  });

  it('set overwrites the payload for the same node', () => {
    graphInspection.set(payload('n1', { outputs: { result: 1 } }));
    graphInspection.set(payload('n1', { outputs: { result: 2 } }));
    expect(graphInspection.inspections()['n1']).toMatchObject({ outputs: { result: 2 } });
  });

  it('setMany stores every payload and merges with existing entries', () => {
    graphInspection.set(payload('a'));
    graphInspection.setMany([payload('b'), payload('c')]);
    expect(Object.keys(graphInspection.inspections())).toHaveLength(3);
  });

  it('setMany ignores empty batches', () => {
    graphInspection.set(payload('a'));
    graphInspection.setMany([]);
    expect(Object.keys(graphInspection.inspections())).toHaveLength(1);
  });

  it('has returns whether a node produced an inspection payload', () => {
    graphInspection.set(payload('n1'));
    expect(graphInspection.has('n1')).toBe(true);
    expect(graphInspection.has('nope')).toBe(false);
  });

  it('open / openPayload resolves the payload for the opened node', () => {
    graphInspection.set(payload('n1', { inputs: { data: 'x' } }));
    graphInspection.open('n1');
    expect(graphInspection.openNodeId()).toBe('n1');
    expect(graphInspection.openPayload()).toMatchObject({ nodeId: 'n1', inputs: { data: 'x' } });
    expect(graphInspection.isOpen()).toBe(true);
  });

  it('isOpen is false when nothing is open', () => {
    expect(graphInspection.isOpen()).toBe(false);
    graphInspection.open('missing');
    expect(graphInspection.isOpen()).toBe(true);
    expect(graphInspection.openPayload()).toBeNull();
  });

  it('close clears the open node id but keeps the stored payloads', () => {
    graphInspection.set(payload('n1'));
    graphInspection.open('n1');
    graphInspection.close();
    expect(graphInspection.openNodeId()).toBeNull();
    expect(graphInspection.openPayload()).toBeNull();
    expect(graphInspection.has('n1')).toBe(true);
  });

  it('toggle opens a closed node and closes an opened one', () => {
    graphInspection.set(payload('n1'));
    graphInspection.set(payload('n2'));
    graphInspection.toggle('n1');
    expect(graphInspection.openNodeId()).toBe('n1');
    graphInspection.toggle('n1');
    expect(graphInspection.openNodeId()).toBeNull();
    graphInspection.toggle('n2');
    expect(graphInspection.openNodeId()).toBe('n2');
  });

  it('toggle switches from one node to another', () => {
    graphInspection.set(payload('n1'));
    graphInspection.set(payload('n2'));
    graphInspection.toggle('n1');
    graphInspection.toggle('n2');
    expect(graphInspection.openNodeId()).toBe('n2');
  });

  it('reset clears stored payloads and the open node id', () => {
    graphInspection.set(payload('n1'));
    graphInspection.open('n1');
    graphInspection.reset();
    expect(graphInspection.inspections()).toEqual({});
    expect(graphInspection.openNodeId()).toBeNull();
    expect(graphInspection.isOpen()).toBe(false);
  });
});

describe('graphInspectionPayloadsFromRunEvents (SAA-829 event-derived inspection fold)', () => {
  const RUN = 'run-9';
  const WF = 'wf-9';

  /** Builds a run envelope shaped like the stored `result.events` entries. */
  function event(
    type: GraphExecutionEventType,
    nodeId?: string,
    extra: { payload?: unknown; error?: unknown } = {},
  ): GraphInspectionRunEvent {
    return { type, ...(nodeId !== undefined ? { nodeId } : {}), ...extra };
  }

  it('returns an empty list for empty and undefined event logs', () => {
    expect(graphInspectionPayloadsFromRunEvents(RUN, WF, [])).toEqual([]);
    expect(graphInspectionPayloadsFromRunEvents(RUN, WF, undefined)).toEqual([]);
  });

  it('ignores events that carry no nodeId', () => {
    const payloads = graphInspectionPayloadsFromRunEvents(RUN, WF, [
      event(GraphExecutionEventType.WORKFLOW_STARTED),
      event(GraphExecutionEventType.GRAPH_RUN_LOG, undefined, {
        payload: { level: 'info', message: 'run started' },
      }),
      event(GraphExecutionEventType.WORKFLOW_COMPLETED),
    ]);
    expect(payloads).toEqual([]);
  });

  it('derives a running node from node.started and node.queued', () => {
    const payloads = graphInspectionPayloadsFromRunEvents(RUN, WF, [
      event(GraphExecutionEventType.NODE_STARTED, 'n1'),
      event(GraphExecutionEventType.NODE_QUEUED, 'n2'),
    ]);
    expect(payloads).toEqual([
      { runId: RUN, workflowId: WF, nodeId: 'n1', state: GraphVisualState.RUNNING, inputs: {} },
      { runId: RUN, workflowId: WF, nodeId: 'n2', state: GraphVisualState.RUNNING, inputs: {} },
    ]);
  });

  it('carries the node.stateChanged state through verbatim', () => {
    const payloads = graphInspectionPayloadsFromRunEvents(RUN, WF, [
      event(GraphExecutionEventType.NODE_STATE_CHANGED, 'n1', {
        payload: { state: GraphVisualState.BLOCKED },
      }),
    ]);
    expect(payloads[0]).toMatchObject({ nodeId: 'n1', state: GraphVisualState.BLOCKED });
  });

  it('folds node.output outputs, defaulting the state to idle when no lifecycle event preceded it', () => {
    const payloads = graphInspectionPayloadsFromRunEvents(RUN, WF, [
      event(GraphExecutionEventType.NODE_OUTPUT, 'n1', { payload: { outputs: { value: 42 } } }),
    ]);
    expect(payloads).toEqual([
      {
        runId: RUN,
        workflowId: WF,
        nodeId: 'n1',
        state: GraphVisualState.IDLE,
        inputs: {},
        outputs: { value: 42 },
      },
    ]);
  });

  it('derives a succeeded node with outputs from node.completed', () => {
    const payloads = graphInspectionPayloadsFromRunEvents(RUN, WF, [
      event(GraphExecutionEventType.NODE_COMPLETED, 'n1', {
        payload: { outputs: { upper: 'HELLO' } },
      }),
    ]);
    expect(payloads).toEqual([
      {
        runId: RUN,
        workflowId: WF,
        nodeId: 'n1',
        state: GraphVisualState.SUCCEEDED,
        inputs: {},
        outputs: { upper: 'HELLO' },
      },
    ]);
  });

  it('derives a succeeded node without outputs from node.cacheHit', () => {
    const payloads = graphInspectionPayloadsFromRunEvents(RUN, WF, [
      event(GraphExecutionEventType.NODE_CACHE_HIT, 'n1'),
    ]);
    expect(payloads).toEqual([
      { runId: RUN, workflowId: WF, nodeId: 'n1', state: GraphVisualState.SUCCEEDED, inputs: {} },
    ]);
  });

  it('derives a skipped node from node.skipped', () => {
    const payloads = graphInspectionPayloadsFromRunEvents(RUN, WF, [
      event(GraphExecutionEventType.NODE_SKIPPED, 'n1'),
    ]);
    expect(payloads).toEqual([
      { runId: RUN, workflowId: WF, nodeId: 'n1', state: GraphVisualState.SKIPPED, inputs: {} },
    ]);
  });

  it('derives a failed node and its structured error from node.failed', () => {
    const error = { name: 'Error', message: 'boom', code: 'E_BOOM' };
    const payloads = graphInspectionPayloadsFromRunEvents(RUN, WF, [
      event(GraphExecutionEventType.NODE_FAILED, 'n1', { error }),
    ]);
    expect(payloads).toEqual([
      { runId: RUN, workflowId: WF, nodeId: 'n1', state: GraphVisualState.FAILED, inputs: {}, error },
    ]);
  });

  it('uses the terminal event as the node state when a full lifecycle is present', () => {
    const payloads = graphInspectionPayloadsFromRunEvents(RUN, WF, [
      event(GraphExecutionEventType.NODE_STARTED, 'n1'),
      event(GraphExecutionEventType.NODE_OUTPUT, 'n1', {
        payload: { outputs: { intermediate: true } },
      }),
      event(GraphExecutionEventType.NODE_COMPLETED, 'n1', {
        payload: { outputs: { upper: 'HELLO' } },
      }),
    ]);
    expect(payloads).toEqual([
      {
        runId: RUN,
        workflowId: WF,
        nodeId: 'n1',
        state: GraphVisualState.SUCCEEDED,
        inputs: {},
        outputs: { upper: 'HELLO' },
      },
    ]);
  });

  it('derives one payload per node, keeping the first-seen node order', () => {
    const payloads = graphInspectionPayloadsFromRunEvents(RUN, WF, [
      event(GraphExecutionEventType.NODE_STARTED, 'b'),
      event(GraphExecutionEventType.NODE_STARTED, 'a'),
      event(GraphExecutionEventType.NODE_COMPLETED, 'b', { payload: { outputs: { ok: true } } }),
      event(GraphExecutionEventType.NODE_FAILED, 'a', { error: { name: 'Error', message: 'x' } }),
    ]);
    expect(payloads.map((item) => item.nodeId)).toEqual(['b', 'a']);
    expect(payloads[0]).toMatchObject({
      nodeId: 'b',
      state: GraphVisualState.SUCCEEDED,
      outputs: { ok: true },
    });
    expect(payloads[1]).toMatchObject({ nodeId: 'a', state: GraphVisualState.FAILED });
    expect(payloads[1].error).toEqual({ name: 'Error', message: 'x' });
  });

  it('best-effort: inputs stay an empty record because node events omit routed inputs', () => {
    const payloads = graphInspectionPayloadsFromRunEvents(RUN, WF, [
      event(GraphExecutionEventType.NODE_COMPLETED, 'n1', {
        payload: { inputs: { text: 'ignored' }, outputs: { ok: true } },
      }),
    ]);
    expect(payloads[0].inputs).toEqual({});
  });
});
