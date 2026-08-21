import { signal } from '@angular/core';
import type {
  GraphEdgeExecutionStateMap,
  GraphNodeExecutionStateMap,
} from '../types';

class GraphExecutionStateStore {
  readonly nodeStates = signal<GraphNodeExecutionStateMap>({});
  readonly edgeStates = signal<GraphEdgeExecutionStateMap>({});
  readonly pinnedNodes = signal<Set<string>>(new Set());

  setNodeState(nodeId: string, state: Partial<Record<string, unknown>>) {
    this.nodeStates.update((current) => ({
      ...current,
      [nodeId]: { ...(current[nodeId] ?? { status: 'pending' }), ...state } as never,
    }));
  }

  setEdgeState(edgeId: string, state: Partial<Record<string, unknown>>) {
    this.edgeStates.update((current) => ({
      ...current,
      [edgeId]: { ...(current[edgeId] ?? { status: 'pending' }), ...state } as never,
    }));
  }

  togglePinned(nodeId: string) {
    this.pinnedNodes.update((current) => {
      const next = new Set(current);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }

  isPinned(nodeId: string): boolean {
    return this.pinnedNodes().has(nodeId);
  }

  /**
   * Seeds every known canvas node and edge with a `blocked` status at run
   * start. The engine never emits BLOCKED (DECAF-48 §4.4: it is derived
   * frontend-side); nodes/edges awaiting upstream completion are yellow until
   * a NODE_STATE_CHANGED / EDGE_STATE_CHANGED event overrides them.
   */
  markAllBlocked(nodeIds: string[], edges: { id: string; engineEdgeId?: string }[]) {
    for (const nodeId of nodeIds) {
      const current = this.nodeStates()[nodeId];
      if (!current || current.status === 'pending' || current.status === 'idle') {
        this.setNodeState(nodeId, { status: 'blocked', visualState: 'blocked' });
      }
    }
    for (const edge of edges) {
      // Register under both the canvas id and the engine plan-edge id so the
      // edge template (which resolves via `engineEdgeId`) sees the state.
      for (const edgeId of new Set([edge.id, edge.engineEdgeId])) {
        if (!edgeId) continue;
        const current = this.edgeStates()[edgeId];
        if (!current || current.status === 'pending' || current.status === 'idle') {
          this.setEdgeState(edgeId, { status: 'blocked', visualState: 'blocked' });
        }
      }
    }
  }

  reset() {
    this.nodeStates.set({});
    this.edgeStates.set({});
  }
}

export const graphExecutionState = new GraphExecutionStateStore();
