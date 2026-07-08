import { Injectable, inject, signal, computed } from '@angular/core';
import { GRAPH_HISTORY_LIMIT } from '../tokens/graph-configuration.tokens';
import type { GraphWorkflowSnapshot } from '@decaf-ts/ui-decorators/graph';

export interface GraphHistoryEntry {
  snapshot: GraphWorkflowSnapshot;
  label: string;
  timestamp: number;
}

interface WorkflowHistory {
  entries: GraphHistoryEntry[];
  cursor: number;
}

@Injectable({ providedIn: 'root' })
export class GraphHistoryService {
  private readonly limit = inject(GRAPH_HISTORY_LIMIT);
  private readonly histories = new Map<string, WorkflowHistory>();
  private readonly activeWorkflowId = signal<string | null>(null);

  readonly canUndo = computed(() => {
    const id = this.activeWorkflowId();
    if (!id) return false;
    const h = this.histories.get(id);
    return !!h && h.cursor > 0;
  });

  readonly canRedo = computed(() => {
    const id = this.activeWorkflowId();
    if (!id) return false;
    const h = this.histories.get(id);
    return !!h && h.cursor < h.entries.length - 1;
  });

  setActiveWorkflow(workflowId: string): void {
    this.activeWorkflowId.set(workflowId);
  }

  push(workflowId: string, snapshot: GraphWorkflowSnapshot, label = 'change'): void {
    let h = this.histories.get(workflowId);
    if (!h) {
      h = { entries: [], cursor: -1 };
      this.histories.set(workflowId, h);
    }

    const entry: GraphHistoryEntry = {
      snapshot: this.cloneSnapshot(snapshot),
      label,
      timestamp: Date.now(),
    };

    if (h.cursor < h.entries.length - 1) {
      h.entries = h.entries.slice(0, h.cursor + 1);
    }

    h.entries.push(entry);

    if (h.entries.length > this.limit) {
      h.entries.shift();
    }

    h.cursor = h.entries.length - 1;
    this.activeWorkflowId.set(workflowId);
  }

  undo(workflowId: string): GraphHistoryEntry | undefined {
    const h = this.histories.get(workflowId);
    if (!h || h.cursor <= 0) return undefined;
    h.cursor--;
    return h.entries[h.cursor];
  }

  redo(workflowId: string): GraphHistoryEntry | undefined {
    const h = this.histories.get(workflowId);
    if (!h || h.cursor >= h.entries.length - 1) return undefined;
    h.cursor++;
    return h.entries[h.cursor];
  }

  canUndoFor(workflowId: string): boolean {
    const h = this.histories.get(workflowId);
    return !!h && h.cursor > 0;
  }

  canRedoFor(workflowId: string): boolean {
    const h = this.histories.get(workflowId);
    return !!h && h.cursor < h.entries.length - 1;
  }

  current(workflowId: string): GraphHistoryEntry | undefined {
    const h = this.histories.get(workflowId);
    if (!h || h.cursor < 0) return undefined;
    return h.entries[h.cursor];
  }

  clear(workflowId: string): void {
    this.histories.delete(workflowId);
  }

  clearAll(): void {
    this.histories.clear();
  }

  setLimit(_limit: number): void {
    throw new Error('setLimit not supported when limit is injected via GRAPH_HISTORY_LIMIT token');
  }

  private cloneSnapshot(snapshot: GraphWorkflowSnapshot): GraphWorkflowSnapshot {
    if (typeof globalThis.structuredClone === 'function') {
      try {
        return globalThis.structuredClone(snapshot);
      } catch {
        // fall through
      }
    }
    return JSON.parse(JSON.stringify(snapshot)) as GraphWorkflowSnapshot;
  }
}
