/**
 * @module for-angular/graph/capabilities/GraphEngineCapabilityService
 * @summary Facade service over the capability store and served manifest
 * (SAA-197 / Deliverable 3).
 * @description Single entry point UI uses for engine capabilities: loads and
 * refreshes the manifest, exposes the store's signals as read API, computes the
 * feature gates (`canBrowseWorkflows`, `canLookupWorkflow`) from the selected
 * engine's manifest rows, and lists/looks up workflows through the provided
 * {@link GraphEngineCapabilitySource}. Catalogue failures degrade the store
 * instead of throwing to the UI.
 */
import {
  Injectable,
  InjectionToken,
  computed,
  inject,
} from "@angular/core";
import type { GraphWorkflowDocument } from "@decaf-ts/as-graph/shared";
import {
  graphEngineFeatureVerdictOf,
  graphEngineSupportsFeature,
  type GraphEngineDescriptor,
  type GraphEngineFeatureVerdict,
  type GraphEngineWorkflowSummary,
} from "./GraphEngineCapability";
import {
  GRAPH_ENGINE_FEATURE_ALIASES,
  graphEngineActionGatesOf,
  graphEngineFeatureAllowed,
  type GraphEngineActionGates,
} from "./GraphEngineCapabilityGates";
import {
  GraphEngineCapabilityUnavailableError,
  GraphEngineWorkflowCatalogUnsupportedError,
  graphEngineCapabilityFailureOf,
  type GraphEngineCapabilitySource,
} from "./GraphEngineCapabilityApi";
import { GraphEngineCapabilityStore } from "./GraphEngineCapabilityStore";

/**
 * Provider token for the capability backend port. App config binds it to
 * {@link GraphEngineCapabilityApi}; hosts may provide a test double instead.
 */
export const GRAPH_ENGINE_CAPABILITY_SOURCE =
  new InjectionToken<GraphEngineCapabilitySource>(
    "GRAPH_ENGINE_CAPABILITY_SOURCE",
  );

/**
 * Root-singleton facade over {@link GraphEngineCapabilityStore} and the
 * provided capability source. All writes go through the store; derived signals
 * are the only state UI components should observe.
 */
@Injectable({ providedIn: "root" })
export class GraphEngineCapabilityService {
  /** The injected capability store. */
  private readonly store = inject(GraphEngineCapabilityStore);
  /** The provided capability source, when one is bound. */
  private readonly api = inject(GRAPH_ENGINE_CAPABILITY_SOURCE, {
    optional: true,
  });

  /** The served manifest signal, or `null` before the first load. */
  readonly manifest = this.store.signals.manifest;
  /** The manifest load lifecycle status signal. */
  readonly status = this.store.signals.status;
  /** The classified failure signal, when degraded/failed. */
  readonly failure = this.store.signals.failure;
  /** The workflows listed for the selected engine. */
  readonly workflows = this.store.signals.workflows;
  /** The selected engine id signal, or `null` before a manifest arrives. */
  readonly selectedEngineId = this.store.signals.selectedEngineId;

  /** All engine descriptors of the served manifest. */
  readonly engines = computed<GraphEngineDescriptor[]>(() =>
    this.store.engines(),
  );

  /** The descriptor of the currently selected engine. */
  readonly selectedEngine = computed<GraphEngineDescriptor | undefined>(
    () => this.store.selectedEngine(),
  );

  /** Human-readable label of the selected engine, for the toolbar. */
  readonly engineLabel = computed(
    () => this.store.selectedEngine()?.displayName ?? "",
  );

  /** Whether more than one engine is advertised (engine selection UI). */
  readonly canSelectEngine = computed(() => this.engines().length > 1);

  /**
   * Whether the selected engine natively advertises workflow browsing. Strict
   * `SUPPORTED` only: the workflow table prefers the engine catalogue when this
   * holds and falls back to the legacy `GET /graph/workflows` endpoint otherwise
   * (an explicit `NOT_SUPPORTED` verdict, an extension point, or no manifest).
   * The broader alias set keeps the decision backend-agnostic, so a backend that
   * names the feature `list` instead of `workflowList` still takes the catalogue.
   */
  readonly canBrowseWorkflows = computed(() =>
    graphEngineSupportsFeature(
      this.store.selectedEngine(),
      ...GRAPH_ENGINE_FEATURE_ALIASES.workflowList,
    ),
  );

  /** Whether the selected engine natively advertises workflow lookup. */
  readonly canLookupWorkflow = computed(() =>
    graphEngineSupportsFeature(
      this.store.selectedEngine(),
      ...GRAPH_ENGINE_FEATURE_ALIASES.workflowLookup,
    ),
  );

  /** Whether the selected engine allows creating a workflow. */
  readonly canCreateWorkflow = computed(() =>
    graphEngineFeatureAllowed(
      this.store.selectedEngine(),
      GRAPH_ENGINE_FEATURE_ALIASES.workflowCreate,
    ),
  );

  /** Whether the selected engine allows editing/saving a workflow. */
  readonly canUpdateWorkflow = computed(() =>
    graphEngineFeatureAllowed(
      this.store.selectedEngine(),
      GRAPH_ENGINE_FEATURE_ALIASES.workflowUpdate,
    ),
  );

  /** Whether the selected engine allows deleting a workflow. */
  readonly canDeleteWorkflow = computed(() =>
    graphEngineFeatureAllowed(
      this.store.selectedEngine(),
      GRAPH_ENGINE_FEATURE_ALIASES.workflowDelete,
    ),
  );

  /** Whether the selected engine allows running a workflow. */
  readonly canRunWorkflow = computed(() =>
    graphEngineFeatureAllowed(
      this.store.selectedEngine(),
      GRAPH_ENGINE_FEATURE_ALIASES.workflowRun,
    ),
  );

  /** Whether the selected engine allows streaming a run's live events. */
  readonly canStreamRunEvents = computed(() =>
    graphEngineFeatureAllowed(
      this.store.selectedEngine(),
      GRAPH_ENGINE_FEATURE_ALIASES.runEventStream,
    ),
  );

  /** Whether the selected engine allows resuming a run. */
  readonly canResumeWorkflow = computed(() =>
    graphEngineFeatureAllowed(
      this.store.selectedEngine(),
      GRAPH_ENGINE_FEATURE_ALIASES.workflowResume,
    ),
  );

  /** Every per-action gate projected from the selected engine. */
  readonly actionGates = computed<GraphEngineActionGates>(() =>
    graphEngineActionGatesOf(this.store.selectedEngine()),
  );

  /** Whether a manifest has loaded and the gates can be trusted. */
  readonly manifestReady = computed(
    () => this.store.signals.status() === "ready",
  );

  /**
   * Whether the last capability interaction degraded or failed, so the UI can
   * surface the store's `backend-down`/`malformed-response` failure visibly.
   */
  readonly degraded = computed(() => {
    const status = this.store.signals.status();
    return status === "degraded" || status === "failed";
  });

  /** Feature names the selected engine declares SUPPORTED, for chip display. */
  readonly capabilityChips = computed(() =>
    (this.store.selectedEngine()?.capabilities ?? [])
      .filter((capability) => capability.verdict === "SUPPORTED")
      .map((capability) => capability.feature),
  );

  /**
   * Loads the manifest once; a no-op when the store already holds one.
   *
   * @returns Resolves once the manifest is loaded (or the load failed).
   * @throws The backend error, so callers can react to load failures.
   */
  async load(): Promise<void> {
    if (this.store.signals.manifest()) return;
    await this.refresh();
  }

  /**
   * Reloads the manifest from the capability source.
   *
   * @returns Resolves once the manifest is stored and the status is ready.
   * @throws The classified backend error; the store is marked `failed`.
   */
  async refresh(): Promise<void> {
    this.store.setStatus("loading");
    try {
      const source = this.source();
      const manifest = await source.fetchManifest();
      this.store.setManifest(manifest);
      this.store.setStatus("ready");
    } catch (error) {
      this.store.setStatus("failed", graphEngineCapabilityFailureOf(error));
      throw error;
    }
  }

  /**
   * Whether the selected engine supports a feature by alias.
   *
   * @param aliases - Acceptable aliases of the queried feature.
   * @return {boolean} `true` when the feature resolves to `SUPPORTED`.
   */
  supports(...aliases: string[]): boolean {
    return graphEngineFeatureAllowed(this.store.selectedEngine(), aliases);
  }

  /**
   * Resolves the selected engine's verdict for a feature by alias, without
   * collapsing it to a boolean, so a caller can distinguish an explicit refusal
   * from an undeclared feature.
   *
   * @param aliases - Acceptable aliases of the queried feature.
   * @return The resolved verdict, or `undefined` when nothing matches.
   */
  featureVerdict(
    ...aliases: string[]
  ): GraphEngineFeatureVerdict | undefined {
    return graphEngineFeatureVerdictOf(this.store.selectedEngine(), aliases);
  }

  /**
   * Selects an engine by id and clears the workflow list.
   *
   * @param engineId - The engine id to select; unknown ids are ignored.
   */
  selectEngine(engineId: string): void {
    this.store.selectEngine(engineId);
  }

  /**
   * Lists an engine's workflows through the capability source and stores the
   * result. Unsupported catalogues and backend failures degrade to an empty
   * list instead of throwing.
   *
   * @param engineId - The engine to list; defaults to the selected engine.
   * @return {Promise<GraphEngineWorkflowSummary[]>} The listed workflows.
   */
  async listWorkflows(
    engineId: string = this.selectedEngineId() ?? "",
  ): Promise<GraphEngineWorkflowSummary[]> {
    if (!engineId || !this.canBrowseWorkflows()) {
      this.store.setWorkflows([]);
      return [];
    }
    try {
      const workflows = await this.source().listWorkflows(engineId);
      this.store.setWorkflows(workflows);
      return workflows;
    } catch (error) {
      this.store.setWorkflows([]);
      if (error instanceof GraphEngineWorkflowCatalogUnsupportedError) {
        return [];
      }
      this.store.setStatus("degraded", graphEngineCapabilityFailureOf(error));
      return [];
    }
  }

  /**
   * Fetches one workflow document from an engine's catalogue. Unsupported
   * catalogues and backend failures degrade to `undefined` instead of throwing.
   *
   * @param engineId - The engine to query.
   * @param workflowId - The workflow to look up.
   * @return The document, or `undefined` when unavailable.
   */
  async getWorkflow(
    engineId: string,
    workflowId: string,
  ): Promise<GraphWorkflowDocument | undefined> {
    if (!engineId || !workflowId) return undefined;
    try {
      return await this.source().getWorkflow(engineId, workflowId);
    } catch (error) {
      if (error instanceof GraphEngineWorkflowCatalogUnsupportedError) {
        return undefined;
      }
      this.store.setStatus("degraded", graphEngineCapabilityFailureOf(error));
      return undefined;
    }
  }

  /**
   * Resolves the provided capability source.
   *
   * @return The capability source.
   * @throws {GraphEngineCapabilityUnavailableError} When no source is provided.
   */
  private source(): GraphEngineCapabilitySource {
    if (!this.api) {
      throw new GraphEngineCapabilityUnavailableError(
        "manifest",
        "GRAPH_ENGINE_CAPABILITY_SOURCE was not provided",
      );
    }
    return this.api;
  }
}

export type { GraphEngineCapabilitySource };
