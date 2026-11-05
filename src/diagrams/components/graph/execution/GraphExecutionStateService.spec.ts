/**
 * @module for-angular/graph/execution/GraphExecutionStateService.spec
 * @summary Unit tests for the shared execution-state store and its blocked seeding.
 */
import { graphExecutionState } from './GraphExecutionStateService';

describe('GraphExecutionStateService', () => {
  beforeEach(() => {
    graphExecutionState.reset();
  });

  afterEach(() => {
    graphExecutionState.reset();
  });

  it('seeds every given member node as blocked (waiting on upstream deps)', () => {
    graphExecutionState.markAllBlocked(['n1', 'n2'], []);
    expect(graphExecutionState.nodeStates()['n1']).toMatchObject({ status: 'blocked', visualState: 'blocked' });
    expect(graphExecutionState.nodeStates()['n2']).toMatchObject({ status: 'blocked', visualState: 'blocked' });
  });

  it('registers blocked state under both the canvas edge id and the engine plan-edge id', () => {
    graphExecutionState.markAllBlocked([], [
      { id: 'edge-0', engineEdgeId: 'SplitTextCodeNode:result->GraphForeachLoopNode:items' },
    ]);
    expect(graphExecutionState.edgeStates()['edge-0']).toMatchObject({ status: 'blocked', visualState: 'blocked' });
    expect(graphExecutionState.edgeStates()['SplitTextCodeNode:result->GraphForeachLoopNode:items']).toMatchObject({
      status: 'blocked',
      visualState: 'blocked',
    });
  });

  it('registers edges without an engineEdgeId under the canvas id only', () => {
    graphExecutionState.markAllBlocked([], [{ id: 'edge-1' }]);
    expect(graphExecutionState.edgeStates()['edge-1']).toMatchObject({ status: 'blocked' });
  });

  it('does not downgrade a node/edge that already left the pending/idle state', () => {
    graphExecutionState.setNodeState('n1', { status: 'running', visualState: 'running' });
    graphExecutionState.setNodeState('n2', { status: 'succeeded', visualState: 'succeeded' });
    graphExecutionState.setEdgeState('edge-2', { status: 'succeeded', visualState: 'succeeded' });

    graphExecutionState.markAllBlocked(['n1', 'n2'], [{ id: 'edge-2' }]);

    expect(graphExecutionState.nodeStates()['n1'].status).toBe('running');
    expect(graphExecutionState.nodeStates()['n2'].status).toBe('succeeded');
    expect(graphExecutionState.edgeStates()['edge-2'].status).toBe('succeeded');
  });

  it('seeds blocked only for nodes not yet tracked', () => {
    graphExecutionState.setNodeState('n1', { status: 'blocked' });
    graphExecutionState.markAllBlocked(['n1', 'n2'], []);
    expect(graphExecutionState.nodeStates()['n1']).toMatchObject({ status: 'blocked' });
    expect(graphExecutionState.nodeStates()['n2']).toMatchObject({ status: 'blocked' });
  });

  it('reset clears node and edge state maps', () => {
    graphExecutionState.markAllBlocked(['n1'], [{ id: 'edge-0', engineEdgeId: 'e:v' }]);
    graphExecutionState.reset();
    expect(graphExecutionState.nodeStates()).toEqual({});
    expect(graphExecutionState.edgeStates()).toEqual({});
  });

  it('togglePinned / isPinned round-trips a pinned node', () => {
    expect(graphExecutionState.isPinned('n1')).toBe(false);
    graphExecutionState.togglePinned('n1');
    expect(graphExecutionState.isPinned('n1')).toBe(true);
    graphExecutionState.togglePinned('n1');
    expect(graphExecutionState.isPinned('n1')).toBe(false);
  });
});
