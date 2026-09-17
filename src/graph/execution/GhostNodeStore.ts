import { signal } from '@angular/core';

/** Source descriptor for a node-side add connector click (G3-29). */
export interface GraphNodeAddSource {
  /** Node whose edge connector opened the palette. */
  nodeId: string;
  /** Output port the new node is connected from. */
  portId: string;
}

class GhostNodeStore {
  /** ID of the foreach node whose ghost + was clicked; null when no ghost is pending. */
  readonly pendingParentId = signal<string | null>(null);
  /**
   * Node-side add connector source (G3-29): the node + output port whose edge
   * connector opened the palette; null when no node-side add is pending.
   */
  readonly pendingAddSource = signal<GraphNodeAddSource | null>(null);

  requestAddNode(parentNodeId: string) {
    this.pendingParentId.set(parentNodeId);
  }

  /**
   * Requests a node-side add from a source node's output port (G3-29): the
   * palette then places the new node beside the source and auto-connects it.
   * @param nodeId The source node whose connector was clicked.
   * @param portId The source node's output port to connect from.
   */
  requestAddNodeFrom(nodeId: string, portId: string) {
    this.pendingAddSource.set({ nodeId, portId });
  }

  consume(): string | null {
    const id = this.pendingParentId();
    this.pendingParentId.set(null);
    return id;
  }

  /**
   * Consumes the pending node-side add source, clearing it so a single click
   * creates at most one connected node (G3-29).
   * @returns The pending source descriptor, or `null` when none is pending.
   */
  consumeAddSource(): GraphNodeAddSource | null {
    const source = this.pendingAddSource();
    this.pendingAddSource.set(null);
    return source;
  }

  clear() {
    this.pendingParentId.set(null);
    this.pendingAddSource.set(null);
  }
}

export const ghostNodeStore = new GhostNodeStore();
