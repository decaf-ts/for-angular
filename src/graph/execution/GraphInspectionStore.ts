/**
 * @module for-angular/graph/execution/GraphInspectionStore
 * @summary Singleton signal store for node I/O inspection (DECAF-48 §4.6).
 * @description Holds the per-run node inspection payloads surfaced by
 * `GET /graph/results/:runId` and the currently-opened inspection node id.
 * The node template disambiguates double-clicks with `has(nodeId)`, and the
 * inspection panel renders the split view (right = inputs, left = outputs or
 * error) from the payload.
 */
import { computed, signal } from '@angular/core';

import type { GraphNodeInspectionPayload } from '@decaf-ts/integrations/graph/shared';

/**
 * Angular-signal store for node I/O inspection. Holds the per-node inspection
 * payloads for the current run (keyed by node id) plus the currently-opened
 * node, exposing derived `openPayload`/`isOpen` signals. The node template
 * disambiguates double-clicks with {@link has}, and the inspection panel
 * renders the split view (right = inputs, left = outputs or error) from the
 * open payload.
 */
class GraphInspectionStore {
  /** Per-node inspection payloads keyed by node id for the current run. */
  readonly inspections = signal<Record<string, GraphNodeInspectionPayload>>({});
  /** Id of the node currently shown in the inspection panel, or `null`. */
  readonly openNodeId = signal<string | null>(null);

  /**
   * Inspection payload of the currently-open node, or `null` when nothing is
   * open or the node has no payload yet.
   */
  readonly openPayload = computed<GraphNodeInspectionPayload | null>(() => {
    const nodeId = this.openNodeId();
    if (!nodeId) return null;
    return this.inspections()[nodeId] ?? null;
  });

  /** Whether the inspection panel is currently shown. */
  readonly isOpen = computed(() => this.openNodeId() !== null);

  /**
   * Records (or replaces) the inspection payload for a single node.
   * @param payload The engine's per-node result payload (DECAF-48 §4.6).
   */
  set(payload: GraphNodeInspectionPayload): void {
    this.inspections.update((current) => ({ ...current, [payload.nodeId]: payload }));
  }

  /**
   * Records multiple node payloads (e.g. the whole `GET /graph/results/:runId`
   * fold). No-op for an empty array.
   * @param payloads Inspection payloads to merge into the store.
   */
  setMany(payloads: GraphNodeInspectionPayload[]): void {
    if (!payloads.length) return;
    this.inspections.update((current) => {
      const next = { ...current };
      for (const payload of payloads) {
        next[payload.nodeId] = payload;
      }
      return next;
    });
  }

  /**
   * Whether a node has already executed (and therefore has a payload to show
   * on double-click). Nodes without payloads fall back to the edit modal.
   */
  has(nodeId: string): boolean {
    return this.inspections()[nodeId] != null;
  }

  /** Opens the inspection panel for the given node. */
  open(nodeId: string): void {
    this.openNodeId.set(nodeId);
  }

  /** Closes the inspection panel. */
  close(): void {
    this.openNodeId.set(null);
  }

  /**
   * Toggles the panel for a node: opens it when closed or showing another
   * node, closes it when already showing this node.
   * @param nodeId Node whose panel should be flipped.
   */
  toggle(nodeId: string): void {
    this.openNodeId.update((current) => (current === nodeId ? null : nodeId));
  }

  /** Clears all payloads and closes the panel for the next run. */
  reset(): void {
    this.inspections.set({});
    this.openNodeId.set(null);
  }
}

/** Singleton shared by the page wiring, node template, and inspection panel. */
export const graphInspection = new GraphInspectionStore();
