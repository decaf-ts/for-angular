/**
 * @module for-angular/graph/execution/GraphInspectionStore.spec
 * @summary Unit tests for the node I/O inspection store (DECAF-48 §4.6/Req-8).
 */
import type { GraphNodeInspectionPayload, GraphVisualState } from '@decaf-ts/integrations/graph/shared';

import { graphInspection } from './GraphInspectionStore';

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
