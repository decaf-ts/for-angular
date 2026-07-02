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

  reset() {
    this.nodeStates.set({});
    this.edgeStates.set({});
  }
}

export const graphExecutionState = new GraphExecutionStateStore();
