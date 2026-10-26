/**
 * @module for-angular/graph/capabilities/GraphEngineCapabilityStore
 * @summary Signal store holding the served engine capability state
 * (SAA-197 / Deliverable 3).
 * @description Root-singleton store owning the capability manifest, the load
 * lifecycle status, the classified failure, the selected engine id, and the
 * currently listed workflows. The service is the only writer; UI components
 * read through the service's exposed signals. Store writes validate the
 * manifest contract strictly and raise decaf validation errors on violations.
 */
import { Injectable, signal } from "@angular/core";
import { ValidationError } from "@decaf-ts/db-decorators";
import type {
  GraphEngineCapabilityManifest,
  GraphEngineDescriptor,
  GraphEngineWorkflowSummary,
} from "./GraphEngineCapability";

/** Load lifecycle of the capability manifest in the store. */
export type GraphEngineCapabilityStatus =
  | "unloaded"
  | "loading"
  | "ready"
  | "degraded"
  | "failed";

/** Classification of a failed capability interaction. */
export type GraphEngineCapabilityFailureKind =
  | "backend-down"
  | "malformed-response";

/** A classified failure carried alongside degraded/failed statuses. */
export interface GraphEngineCapabilityFailure {
  /** The failure classification. */
  kind: GraphEngineCapabilityFailureKind;
  /** Human-readable failure message. */
  message: string;
}

/**
 * Signal store for the served engine capability state. Manifest writes are
 * validated (engines array, unique engine ids) and workflow state resets on
 * manifest or engine changes so stale catalogues never leak across engines.
 */
@Injectable({ providedIn: "root" })
export class GraphEngineCapabilityStore {
  /** The served manifest, or `null` before the first successful load. */
  private readonly manifestSignal =
    signal<GraphEngineCapabilityManifest | null>(null);
  /** The load lifecycle status. */
  private readonly statusSignal =
    signal<GraphEngineCapabilityStatus>("unloaded");
  /** The classified failure, when the status is degraded/failed. */
  private readonly failureSignal =
    signal<GraphEngineCapabilityFailure | null>(null);
  /** The user-selected engine id, or `null` until a manifest arrives. */
  private readonly selectedEngineIdSignal = signal<string | null>(null);
  /** The workflows listed for the selected engine. */
  private readonly workflowsSignal = signal<GraphEngineWorkflowSummary[]>([]);

  /**
   * Replaces the manifest after validating its contract, resets the workflow
   * list, and re-selects the default engine when the previous selection is no
   * longer advertised.
   *
   * @param manifest - The manifest received from the backend.
   * @throws {ValidationError} When the manifest is out of contract.
   */
  setManifest(manifest: GraphEngineCapabilityManifest): void {
    if (
      !manifest ||
      !Array.isArray(manifest.engines) ||
      typeof manifest.defaultEngineId !== "string"
    ) {
      throw new ValidationError(
        "Graph engine manifest received without an engines array or defaultEngineId.",
      );
    }
    const engineIds = new Set<string>();
    for (const engine of manifest.engines) {
      if (!engine || typeof engine.engineId !== "string" || !engine.engineId) {
        throw new ValidationError(
          "Graph engine manifest received an engine without a valid engineId.",
        );
      }
      if (engineIds.has(engine.engineId)) {
        throw new ValidationError(
          `Graph engine manifest received duplicate engineId '${engine.engineId}'.`,
        );
      }
      engineIds.add(engine.engineId);
    }
    this.manifestSignal.set(manifest);
    const selected = this.selectedEngineIdSignal();
    if (!selected || !engineIds.has(selected)) {
      this.selectedEngineIdSignal.set(manifest.defaultEngineId);
    }
    this.workflowsSignal.set([]);
  }

  /**
   * Replaces the lifecycle status; the failure is kept only for
   * degraded/failed statuses and cleared otherwise.
   *
   * @param status - The new lifecycle status.
   * @param failure - The classified failure, when applicable.
   */
  setStatus(
    status: GraphEngineCapabilityStatus,
    failure: GraphEngineCapabilityFailure | null = null,
  ): void {
    this.statusSignal.set(status);
    this.failureSignal.set(
      status === "degraded" || status === "failed" ? failure : null,
    );
  }

  /**
   * Replaces the listed workflows with a defensive copy.
   *
   * @param workflows - The workflow summaries to hold.
   */
  setWorkflows(workflows: GraphEngineWorkflowSummary[]): void {
    this.workflowsSignal.set([...workflows]);
  }

  /**
   * Selects an engine by id and clears the workflow list; unknown ids are
   * ignored.
   *
   * @param engineId - The engine id to select.
   */
  selectEngine(engineId: string): void {
    if (!this.engineIds().has(engineId)) return;
    this.selectedEngineIdSignal.set(engineId);
    this.workflowsSignal.set([]);
  }

  /**
   * All engine descriptors of the current manifest.
   *
   * @return {GraphEngineDescriptor[]} The engines, or an empty array.
   */
  engines(): GraphEngineDescriptor[] {
    return this.manifestSignal()?.engines ?? [];
  }

  /**
   * Looks up one engine descriptor by id.
   *
   * @param engineId - The engine id to look up.
   * @return The descriptor, or `undefined` when not advertised.
   */
  engine(engineId: string): GraphEngineDescriptor | undefined {
    return this.engines().find((engine) => engine.engineId === engineId);
  }

  /**
   * The descriptor of the currently selected engine.
   *
   * @return The descriptor, or `undefined` before any manifest load.
   */
  selectedEngine(): GraphEngineDescriptor | undefined {
    const selected = this.selectedEngineIdSignal();
    return selected ? this.engine(selected) : undefined;
  }

  /**
   * The workflows listed for the selected engine.
   *
   * @return {GraphEngineWorkflowSummary[]} The listed workflows.
   */
  workflows(): GraphEngineWorkflowSummary[] {
    return this.workflowsSignal();
  }

  /**
   * The classified failure, when the status is degraded/failed.
   *
   * @return The failure, or `null`.
   */
  failure(): GraphEngineCapabilityFailure | null {
    return this.failureSignal();
  }

  /**
   * The engine ids of the current manifest, for selection validation.
   *
   * @return {Set<string>} The advertised engine ids.
   */
  private engineIds(): Set<string> {
    return new Set(this.engines().map((engine) => engine.engineId));
  }

  /**
   * Raw signal bundle exposed to the service; the service re-exports these as
   * its public read API.
   */
  get signals() {
    return {
      manifest: this.manifestSignal,
      status: this.statusSignal,
      failure: this.failureSignal,
      selectedEngineId: this.selectedEngineIdSignal,
      workflows: this.workflowsSignal,
    };
  }
}
