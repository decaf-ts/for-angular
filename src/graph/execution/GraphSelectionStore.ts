import { signal } from '@angular/core';

class GraphSelectionStore {
  readonly selectedNodeIds = signal<Set<string>>(new Set());

  setSelected(ids: string[]) {
    this.selectedNodeIds.set(new Set(ids));
  }

  toggleSelected(id: string) {
    this.selectedNodeIds.update((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  clear() {
    this.selectedNodeIds.set(new Set());
  }
}

export const graphSelection = new GraphSelectionStore();
