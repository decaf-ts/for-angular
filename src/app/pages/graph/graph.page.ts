import { Component, inject, signal, computed, isDevMode, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { IonContent } from '@ionic/angular/standalone';
import { GraphRendererComponent } from 'src/graph';
import {
  GraphExecutionService,
  GraphBackendUnavailableError,
} from 'src/graph';
import { graphExecutionState } from 'src/graph';
import type {
  GraphRunEventClientSubscriber,
} from 'src/graph';
import {
  GraphRunClient,
  GraphRunEventClient,
  GraphRunExecutionResult,
  graphRunState,
  GRAPH_RUN_STUCK_TIMEOUT_MS,
  graphRunCancelFailureMessageOf,
  graphRunDriftMessageOf,
  graphRunStuckMessageOf,
} from 'src/graph';
import {
  GraphWorkflowDocumentStore,
  graphWorkflowDocumentSemanticHashOf,
  graphWorkflowDocumentWithPinnedParameters,
  graphWorkflowSnapshotFromLegacy,
  graphWorkflowSnapshotToLegacy,
} from 'src/graph';
import type { GraphWorkflowDocument } from '@decaf-ts/ui-decorators/graph';
import {
  isGraphRunStatus,
  type GraphRunEventEnvelope,
} from '@decaf-ts/ui-decorators/graph';
import type { GraphRunLogEntry } from '@decaf-ts/ui-decorators/graph';
import { GraphToolbarComponent } from 'src/graph';
import { GraphSaveService } from 'src/graph';
import { GraphAutoSaveService } from 'src/graph';
import { GraphMutationDetectorService } from 'src/graph';
import type {
  GraphWorkflowSnapshot,
  LegacyGraphWorkflowSnapshot,
} from '@decaf-ts/ui-decorators/graph';
import { TextPipelineWorkflow } from './workflow-root';
import {
  GraphNodeCatalogService,
  GraphNodeCatalogCompositeSource,
  GRAPH_NODE_CATALOG_SOURCE,
  GRAPH_DEV_MODE,
  GraphWorkflowValidateClient,
  graphValidity,
  graphRunLog,
  graphInspection,
} from 'src/graph';
import type {
  GraphInspectionRunState,
  GraphRunValidationIssue,
} from 'src/graph';
import type { GraphNodeManifest } from '@decaf-ts/ui-decorators/graph';

@Component({
  selector: 'app-graph',
  standalone: true,
  imports: [
    IonContent,
    GraphRendererComponent,
    GraphToolbarComponent,
  ],
  providers: [
    GraphExecutionService,
    // Demo scope: the canonical source keeps the frontend fixtures (the demo
    // node kinds are not published to the backend) and merges live backend
    // extras into the catalogue.
    { provide: GRAPH_NODE_CATALOG_SOURCE, useExisting: GraphNodeCatalogCompositeSource },
    // The page hosts the catalogue service so the root-scoped default's
    // `providedIn: "root"` is overridden INSIDE this subtree: page-level
    // providers are invisible to the root injector, so without the explicit
    // page provider the service would instantiate against the app-level HTTP
    // binding and the demo's fixture kinds would never reach the palette.
    GraphNodeCatalogService,
    // G3-36: the developer-only raw snapshot textarea is gated behind the
    // Angular dev-mode flag, so the demo chrome is n8n-like in production
    // while developers keep the snapshot round-trip tool. Reading
    // `isDevMode()` avoids the `src/environments/environment` module-eval
    // `env.api.host` access, which throws when no `window.ENV` bootstrap is
    // present (the normal `npm run start:dev` condition).
    { provide: GRAPH_DEV_MODE, useFactory: () => isDevMode() },
  ],
  templateUrl: './graph.page.html',
  styleUrl: './graph.page.scss',
})
/**
 * Graph editor demo page (DECAF-50 canonical frontend): hosts the catalogue
 * service and composite source, the document store, run clients, and the
 * diagram renderer; wires mutations to history/autosave and drives the run
 * lifecycle UI.
 */
export class GraphPage implements OnInit, OnDestroy {
  /** Bounded backoff (ms) between run-result fetch attempts (G3-33). */
  private static readonly RUN_RESULT_RETRY_DELAYS_MS = [80, 160, 240, 320, 400, 480, 560, 640];

  readonly workflowRoot = TextPipelineWorkflow;
  readonly workflowId = 'text-pipeline-workflow';
  private readonly executionService = inject(GraphExecutionService);
  private readonly saveService = inject(GraphSaveService);
  private readonly autoSave = inject(GraphAutoSaveService);
  private readonly mutationDetector = inject(GraphMutationDetectorService);
  private readonly documentStore = inject(GraphWorkflowDocumentStore);
  private readonly runClient = inject(GraphRunClient);
  private readonly runEventClient = inject(GraphRunEventClient);
  private readonly validateClient = inject(GraphWorkflowValidateClient);
  private readonly catalogService = inject(GraphNodeCatalogService);
  private readonly runEventSubscribers = new Map<string, GraphRunEventClientSubscriber>();

  @ViewChild(GraphRendererComponent) renderer!: GraphRendererComponent;

  readonly isRunning = signal(false);
  readonly lastResult = signal<Record<string, unknown> | null>(null);
  readonly runError = signal<string | null>(null);
  readonly runStatus = signal<string>('idle');
  /** Run-result lifecycle for the split view's run panes (G3-12). */
  readonly runResultState = signal<GraphInspectionRunState>('idle');
  /** Structured validation issues surfaced by the run gate (G3-33). */
  readonly runValidationIssues = signal<GraphRunValidationIssue[]>([]);
  /** Whether a run-cancel request is in flight (G3-34). */
  readonly cancelRequested = signal(false);
  private runStuckTimer: ReturnType<typeof setTimeout> | null = null;
  readonly backendAvailable = this.executionService.backendAvailable;
  /**
   * Run gating (D5/G3-17): the toolbar can only start a run when the backend
   * is available and the editor's validity projection does not mark the graph
   * invalid. An invalid graph is never submittable.
   */
  readonly canRun = computed(
    () => this.backendAvailable() !== false && !graphValidity.isInvalid()
  );
  /** Editor validity projection (D5/G3-16..G3-18) for the toolbar + canvas. */
  readonly graphValidityStatus = graphValidity.status;
  readonly graphValidityIssues = graphValidity.issues;
  readonly graphInvalid = graphValidity.isInvalid;
  /** The palette is manifest-driven only (P7 cutover): no constructor node arrays. */
  readonly availableNodes = this.catalogService.manifests;

  readonly workflowOutputs = computed(() => {
    const result = this.lastResult();
    if (!result) return [];
    return Object.entries(result).map(([key, value]) => ({ key, value }));
  });

  private eventsSubscription?: { unsubscribe: () => void };

  ngOnInit(): void {
    void this.executionService.checkBackend();
    // One builder for both modes: legacy mode rebuilds from the decorated root
    // while canonical mode derives only editor-only state (document truth stays
    // in the document store, spec §4.11).
    this.mutationDetector.configure(this.workflowId, () => this.renderer?.buildSnapshot() ?? null);

    // Warm the live HTTP node catalogue backend (DECAF-50 §4.13): the palette
    // renders `GraphNodeManifest[]` from this source — constructor node arrays
    // are gone from the editor's discovery path (P7 cutover). Failure keeps
    // the fixture fallback's manifests through the composite source.
    void this.catalogService.load();

    // Reinstate the persisted canonical wrapper when one exists (§4.10): the
    // store is re-seeded from the saved document and the canvas reconciles to
    // it (12-step E2E steps 6–7).
    void this.catalogBackendWorkflowLoad();
  }

  /**
   * Loads the persisted canonical wrapper (`GET /graph/workflows/:workflowId`,
   * §4.10) and reinstates it when a save exists: store replace + canvas
   * re-projection through the canonical adapter. Load failures keep the
   * canvas-derived seed (fresh editor sessions).
   */
  private async catalogBackendWorkflowLoad(): Promise<void> {
    try {
      const saved = await this.saveService.loadDocument(this.workflowId);
      if (!saved?.document) return;
      this.renderer?.restoreFromDocument(saved);
    } catch {
      // Backend without a saved workflow: keep the canvas-derived document.
    }
  }

  ngOnDestroy() {
    this.eventsSubscription?.unsubscribe();
    this.teardownCanonicalRuns();
  }

  onNodeDragEnded(): void {
    this.mutationDetector.recordMutation('node-position');
  }

  onEdgeDrawn(): void {
    this.mutationDetector.recordMutation('edge-connect');
  }

  onElementsRemoved(): void {
    this.mutationDetector.recordMutation('edge-disconnect');
  }

  onRestoreSnapshot(snapshot: LegacyGraphWorkflowSnapshot | GraphWorkflowSnapshot): void {
    // Undo/redo (§4.11): canonical entries convert back to the legacy restore
    // shape; legacy entries restore directly.
    this.renderer?.restoreFromSnapshot(
      ('document' in snapshot) ? graphWorkflowSnapshotToLegacy(snapshot) : snapshot,
    );
  }

  /**
   * Canonical save (§4.11): the save posts the canonical snapshot wrapper
   * (`{ document, editor, metadata }`); the document always comes from the
   * store — never a rebuild from the decorated root — while `editor`/`metadata`
   * carry the live editor-only state for lossless round trips.
   */
  private async saveCanonicalDocument(): Promise<void> {
    if (!this.documentStore.document()) return;
    const liveDocument = this.documentStore.snapshot();
    const legacy = this.renderer?.buildSnapshot() ?? null;
    const canonical = legacy ? graphWorkflowSnapshotFromLegacy(legacy) : null;
    const payload = canonical
      ? { document: liveDocument, editor: canonical.editor, metadata: canonical.metadata }
      : { document: liveDocument };
    await this.saveService.saveDocument(this.workflowId, payload);
  }

  async onSaveWorkflow(): Promise<void> {
    // Canonical save is the only save path after the P7 cutover (§4.11).
    try {
      await this.saveCanonicalDocument();
    } catch (err) {
      this.runError.set(err instanceof Error ? err.message : String(err));
    }
  }

  /**
   * Canonical submission document for the demo's Run action (DECAF-50 §4.14
   * cutover): the run action runs the EXACT editor document unconditionally —
   * the live document store's own snapshot, with each pinned node's frozen
   * parameter values applied (D4 data pinning, §4.22) so downstream runs
   * reuse the values captured at pin time. No flag, no legacy conversion leg
   * remains in the run path.
   * @returns The canonical document to submit, or `null` when no canvas state
   *          is available yet.
   */
  private runSubmissionDocument(): GraphWorkflowDocument | null {
    const document = this.documentStore.document();
    if (!document) return null;
    return graphWorkflowDocumentWithPinnedParameters(document);
  }

  async runWorkflow() {
    this.isRunning.set(true);
    this.cancelRequested.set(false);
    this.clearRunStuckTimeout();
    this.runError.set(null);
    graphRunLog.reset();
    graphInspection.reset();
    graphRunState.reset();
    graphRunLog.setOpen(true);
    this.runResultState.set('idle');
    this.runValidationIssues.set([]);

    // Seed canvas member nodes/edges as BLOCKED (waiting on upstream deps).
    // The engine never emits BLOCKED (DECAF-48 §4.4); NODE_STATE_CHANGED /
    // EDGE_STATE_CHANGED transitions override these as the run progresses.
    // Input boundary nodes are excluded — the engine references workflow
    // inputs via plan-edge ids, not as engine nodes, so they stay neutral.
    const viewModel = this.renderer?.viewModel();
    if (viewModel) {
      const nodeIds = viewModel.nodes.map((node) => node.id);
      // Canvas edges carry the engine plan-edge id nested under `edge.data`
      // (buildGraphRendererViewModel), while the store's markAllBlocked reads
      // it top-level — map the shape so both the canvas id and the engine
      // plan-edge id get seeded as blocked (DECAF-48 §4.4).
      // Workflow-output boundary edges are excluded (mirroring the input
      // boundary nodes above): the engine surfaces the run's outputs through the
      // run result, never as an EDGE_STATE_CHANGED plan edge, so a boundary
      // edge must stay neutral instead of being seeded blocked forever.
      const outputBoundaryIds = new Set((viewModel.outputs ?? []).map((node) => node.id));
      const edges = viewModel.edges
        .filter((edge) => !outputBoundaryIds.has(edge.target))
        .map((edge) => ({
          id: edge.id,
          engineEdgeId: edge.data?.engineEdgeId,
        }));
      graphExecutionState.markAllBlocked(nodeIds, edges);
    }

    // G3-13: the run submits the renderer's own workflow-input form values —
    // the same form a boundary edit writes — never hardcoded demo inputs.
    const payload = this.renderer?.workflowInputPayload();
    if (payload && !payload.valid) {
      this.runValidationIssues.set(payload.errors);
      this.isRunning.set(false);
      return;
    }
    this.runValidationIssues.set([]);
    const inputs = payload?.inputs ?? {};

    const document = this.runSubmissionDocument();
    if (!document) {
      this.isRunning.set(false);
      return;
    }

    // D5/G3-17 pre-run gate: re-validate the exact document before
    // submission. An invalid graph is never submittable, and the backend's
    // structured issues surface on the page's run-validation signal.
    await graphValidity.validate(document, this.validateClient);
    if (graphValidity.isInvalid()) {
      this.runValidationIssues.set(graphValidity.issues());
      this.runResultState.set('idle');
      this.isRunning.set(false);
      return;
    }

    try {
      // Canonical Run action (spec §4.14/§4.18 cutover): the run action runs
      // the EXACT editor document unconditionally — the current
      // GraphWorkflowDocumentStore snapshot is submitted through POST
      // /graph/runs and the run's SSE stream drives the canvas until the
      // terminal event. The legacy legacy `/graph/execute` leg is gone.
      await this.runCanonicalWorkflow(document, inputs);
    } catch (err) {
      if (err instanceof GraphBackendUnavailableError) {
        this.backendAvailable.set(false);
      }
      this.runError.set(err instanceof Error ? err.message : String(err));
      this.isRunning.set(false);
    }
  }

  /**
   * Canonical run path (spec §4.14/§4.18 rollout step 5): the canonical
   * document is submitted through `POST /graph/runs`; the `202`'s `eventsUrl`
   * connects the run's SSE stream, whose stage events drive the canvas state
   * (the run state store folds) and whose terminal event triggers the
   * stored-result inspection fold.
   * @param document The run's own canonical workflow document.
   * @param inputs Inputs for the workflow run.
   */
  private async runCanonicalWorkflow(
    document: GraphWorkflowDocument,
    inputs: Record<string, unknown>,
  ): Promise<void> {
    const created = await this.runClient.createRun({ workflow: document, inputs });
    graphRunState.beginObservation({
      runId: created.runId,
      workflowId: created.workflowId,
      status: isGraphRunStatus(created.status) ? created.status : null,
    });
    this.armRunStuckTimeout(created.runId);
    const subscriber = this.runEventSubscriber(created.runId, document);
    this.runEventSubscribers.set(created.runId, subscriber);
    try {
      this.runEventClient.connect(
        { runId: created.runId, eventsUrl: created.eventsUrl },
        subscriber,
      );
    } catch (err) {
      this.runEventSubscribers.delete(created.runId);
      throw err;
    }
  }

  /**
   * Creates the per-run canonical stream subscriber. It folds every
   * replayed/live envelope into the run state store, routes the terminal
   * envelope into the stored-result fold (plus the run's SSE document
   * round-trip assertion), and surfaces backend-level stream failures via the
   * page's `runError` signal.
   * @param runId The run's id.
   * @param document The canonical document submitted to the run.
   */
  private runEventSubscriber(
    runId: string,
    document: GraphWorkflowDocument,
  ): GraphRunEventClientSubscriber {
    return {
      onEvent: (envelope: GraphRunEventEnvelope): void => {
        graphRunState.applyEvent(envelope);
        this.runStatus.set(envelope.type);
      },
      onTerminal: (envelope: GraphRunEventEnvelope): void => {
        void this.finishCanonicalRun(runId, document, envelope);
      },
      onError: (error: unknown): void => {
        // Stream-level failure (SSE reconnect budget exhausted; the polling
        // fallback keeps walking over HTTP). Non-fatal for the run itself; only
        // the legacy `/graph/execute` fetch path flips the banner.
        this.runError.set(error instanceof Error ? error.message : String(error));
      },
    };
  }

  /**
   * Folds a canonical run's terminal envelope: run-status signals, the
   * cancelled-run canvas demotion, the DECAF-48 §4.6 run-log console open,
   * then the DECAF-50 run's stored result (bounded retry for the engine's
   * finalize race after the terminal event) armed via the run state store's
   * {@link graphRunState.applyRunResult}, followed by the SSE document
   * round-trip assertion (the run's stored document must be the exact
   * document the client submitted).
   * @param runId The observed run's id.
   * @param document The canonical document submitted to the run.
   * @param envelope The canonical run's terminal envelope.
   */
  private async finishCanonicalRun(
    runId: string,
    document: GraphWorkflowDocument,
    envelope: GraphRunEventEnvelope,
  ): Promise<void> {
    this.clearRunStuckTimeout();
    this.runStatus.set(envelope.type);
    if (envelope.type === 'workflow.cancelled') {
      graphRunState.markRunCancelled();
      graphRunLog.recordLifecycle('cancelled', `Run '${runId}' was cancelled.`, {
        runId,
      });
    }
    if (
      envelope.type === 'workflow.completed' ||
      envelope.type === 'workflow.failed'
    ) {
      graphRunLog.setOpen(true);
    }

    this.runResultState.set('pending');
    const result = await this.fetchRunResultWithRetry(runId);
    this.runResultState.set(result ? 'ready' : 'failed');

    graphRunState.applyRunResult(result);
    if (result) {
      this.lastResult.set((result.outputs ?? null) as Record<string, unknown> | null);
      const submitted = graphWorkflowDocumentSemanticHashOf(document);
      const returned = graphWorkflowDocumentSemanticHashOf(result.document);
      if (submitted !== returned) {
        this.runError.set(graphRunDriftMessageOf(runId, submitted, returned));
      }
    }
    this.runEventClient.disconnect(runId);
    this.runEventSubscribers.delete(runId);
    this.cancelRequested.set(false);
    this.isRunning.set(false);
  }

  /**
   * Hardened run-result fetch (G3-33): the engine finalizes the stored result
   * asynchronously after the terminal event, so the fetch retries with a bounded
   * backoff schedule. Returns `null` once the schedule is exhausted.
   * @param runId The run whose stored result should be fetched.
   * @returns The stored run result, or `null` when none landed.
   */
  private async fetchRunResultWithRetry(runId: string): Promise<GraphRunExecutionResult | null> {
    let result = await this.runClient.fetchRunResult(runId);
    for (const delay of GraphPage.RUN_RESULT_RETRY_DELAYS_MS) {
      if (result) break;
      await new Promise((resolve) => setTimeout(resolve, delay));
      result = await this.runClient.fetchRunResult(runId);
    }
    return result;
  }

  /**
   * Re-fetches the last run's stored result when the split view renders its
   * failed empty state (G3-12/G3-33 retry affordance). Folds the result into
   * the run state store (inspection payloads) and refreshes the pane state.
   */
  async retryRunResult(): Promise<void> {
    const runId = graphRunState.runId();
    if (!runId) return;
    this.runResultState.set('pending');
    const result = await this.fetchRunResultWithRetry(runId);
    this.runResultState.set(result ? 'ready' : 'failed');
    graphRunState.applyRunResult(result);
    if (result) {
      this.lastResult.set((result.outputs ?? null) as Record<string, unknown> | null);
    }
  }

  /**
   * Forwards the toolbar's run-cancel intent (G3-34) into the run client.
   */
  onCancelWorkflow(): void {
    void this.cancelRun();
  }

  /**
   * Cancels the in-flight run (G3-34): `DELETE /graph/runs/:runId` is
   * idempotent for terminal runs. The terminal `workflow.cancelled` event still
   * arrives over SSE and drives the canvas demotion; this method only surfaces a
   * cancel failure so the user knows the run may still be live.
   */
  async cancelRun(): Promise<void> {
    const runId = graphRunState.runId();
    if (!runId || !this.isRunning() || this.cancelRequested()) return;
    this.cancelRequested.set(true);
    try {
      await this.runClient.cancelRun(runId);
    } catch (err) {
      this.cancelRequested.set(false);
      this.runError.set(graphRunCancelFailureMessageOf(runId, err));
    }
  }

  /**
   * Arms the stuck-run timeout (G3-34): a run that never produces a terminal
   * event would otherwise leave Start spinning "…" forever. When the window
   * elapses the run is cancelled and the user sees why.
   * @param runId The run to watch.
   */
  private armRunStuckTimeout(runId: string): void {
    this.clearRunStuckTimeout();
    this.runStuckTimer = setTimeout(() => {
      this.runStuckTimer = null;
      if (!this.isRunning()) return;
      const message = graphRunStuckMessageOf(runId, GRAPH_RUN_STUCK_TIMEOUT_MS);
      this.runError.set(message);
      graphRunLog.recordLifecycle('cancelled', message, { runId });
      void this.cancelRun();
    }, GRAPH_RUN_STUCK_TIMEOUT_MS);
  }

  /**
   * Clears the armed stuck-run timeout (G3-34) when the run reaches a terminal
   * event, is torn down, or a new run starts.
   */
  private clearRunStuckTimeout(): void {
    if (this.runStuckTimer !== null) {
      clearTimeout(this.runStuckTimer);
      this.runStuckTimer = null;
    }
  }

  /**
   * Tears down the canonical run's SSE subscriber map for the page teardown.
   */
  private teardownCanonicalRuns(): void {
    this.clearRunStuckTimeout();
    for (const runId of this.runEventSubscribers.keys()) {
      this.runEventClient.disconnect(runId);
      this.runEventSubscribers.delete(runId);
    }
  }
}
// trigger rebuild
