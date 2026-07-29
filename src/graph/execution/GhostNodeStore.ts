import { signal } from '@angular/core';

class GhostNodeStore {
  /** ID of the foreach node whose ghost + was clicked; null when no ghost is pending. */
  readonly pendingParentId = signal<string | null>(null);

  requestAddNode(parentNodeId: string) {
    this.pendingParentId.set(parentNodeId);
  }

  consume(): string | null {
    const id = this.pendingParentId();
    this.pendingParentId.set(null);
    return id;
  }

  clear() {
    this.pendingParentId.set(null);
  }
}

export const ghostNodeStore = new GhostNodeStore();
