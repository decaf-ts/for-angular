import { signal } from '@angular/core';

/** Source descriptor for an add-node request (G3-29; R5 drag-to-canvas). */
export interface GraphNodeAddSource {
  /** Node whose output port opened the palette. */
  nodeId: string;
  /** Output port the new node is connected from. */
  portId: string;
  /**
   * Canvas position the connection drag was released at (R5): when present the
   * new node is placed at the drop point and auto-connected from the source
   * output port into the new node's first available input port.
   */
  position?: { x: number; y: number };
}

class GhostNodeStore {
  /** ID of the foreach node whose ghost + was clicked; null when no ghost is pending. */
  readonly pendingParentId = signal<string | null>(null);
  /**
   * Node-side add connector source (G3-29): the node + output port whose edge
   * connector opened the palette; null when no node-side add is pending.
   */
  readonly pendingAddSource = signal<GraphNodeAddSource | null>(null);
  /**
   * R2-3(5) (round-2): foreach ids that already hold at least one real loop
   * body node. A ghost for such a loop is faded out and only revealed while the
   * for-each loop (or the ghost itself) is hovered, so an empty loop keeps its
   * always-visible add affordance while a populated one does not clutter.
   */
  readonly loopBodyIds = signal<ReadonlySet<string>>(new Set());
  /** R2-3(5): foreach id currently hovered (reveals its ghost when populated). */
  readonly hoveredLoopId = signal<string | null>(null);
  /** R2-3(5): ghost id currently hovered (keeps it revealed while clicked). */
  readonly hoveredGhostId = signal<string | null>(null);

  /** Replaces the set of foreach ids that already hold a real loop body node. */
  setLoopBodyIds(ids: Iterable<string>): void {
    this.loopBodyIds.set(new Set(ids));
  }

  /** Whether the given foreach loop already holds a real loop body node. */
  hasLoopBody(parentNodeId: string): boolean {
    return this.loopBodyIds().has(parentNodeId);
  }

  requestAddNode(parentNodeId: string) {
    this.pendingParentId.set(parentNodeId);
  }

  /**
   * Requests a node-side add from a source node's output port (G3-29): the
   * palette then places the new node beside the source and auto-connects it.
   * @param nodeId The source node whose connector was clicked.
   * @param portId The source node's output port to connect from.
   */
  requestAddNodeFrom(nodeId: string, portId: string, position?: { x: number; y: number }) {
    this.pendingAddSource.set(
      position ? { nodeId, portId, position } : { nodeId, portId }
    );
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
