import { Component, inject, signal, computed, OnDestroy, OnInit, ViewChild } from '@angular/core';
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
} from 'src/graph';
import {
  GraphWorkflowDocumentStore,
  graphWorkflowDocumentSemanticHashOf,
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
  graphRunLog,
  graphInspection,
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
  readonly workflowRoot = TextPipelineWorkflow;
  readonly workflowId = 'text-pipeline-workflow';
  private readonly executionService = inject(GraphExecutionService);
  private readonly saveService = inject(GraphSaveService);
  private readonly autoSave = inject(GraphAutoSaveService);
  private readonly mutationDetector = inject(GraphMutationDetectorService);
  private readonly documentStore = inject(GraphWorkflowDocumentStore);
  private readonly runClient = inject(GraphRunClient);
  private readonly runEventClient = inject(GraphRunEventClient);
  private readonly catalogService = inject(GraphNodeCatalogService);
  private readonly runEventSubscribers = new Map<string, GraphRunEventClientSubscriber>();

  @ViewChild(GraphRendererComponent) renderer!: GraphRendererComponent;

  readonly isRunning = signal(false);
  readonly lastResult = signal<Record<string, unknown> | null>(null);
  readonly runError = signal<string | null>(null);
  readonly runStatus = signal<string>('idle');
  readonly backendAvailable = this.executionService.backendAvailable;
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
   * the live document store's own snapshot; no flag, no legacy conversion leg
   * remains in the run path.
   * @returns The canonical document to submit, or `null` when no canvas state
   *          is available yet.
   */
  private runSubmissionDocument(): GraphWorkflowDocument | null {
    return this.documentStore.document() ?? null;
  }

  async runWorkflow() {
    this.isRunning.set(true);
    this.runError.set(null);
    graphRunLog.reset();
    graphInspection.reset();
    graphRunState.reset();
    graphRunLog.setOpen(true);

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
      const edges = viewModel.edges.map((edge) => ({
        id: edge.id,
        engineEdgeId: edge.data?.engineEdgeId,
      }));
      graphExecutionState.markAllBlocked(nodeIds, edges);
    }

    const inputs: Record<string, unknown> = {
      count: 1,
      text: 'Hello\nWorld\nFoo\nBar\nBaz',
    };
    const document = this.runSubmissionDocument();
    if (!document) {
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
    this.runStatus.set(envelope.type);
    if (envelope.type === 'workflow.cancelled') {
      graphRunState.markRunCancelled();
    }
    if (
      envelope.type === 'workflow.completed' ||
      envelope.type === 'workflow.failed'
    ) {
      graphRunLog.setOpen(true);
    }

    let result: GraphRunExecutionResult | null = null;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const runResult = await this.runClient.fetchRunResult(runId);
      if (runResult || attempt === 4) {
        result = runResult;
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 80));
    }

    graphRunState.applyRunResult(result);
    if (result) {
      this.lastResult.set((result.outputs ?? null) as Record<string, unknown> | null);
      const submitted = graphWorkflowDocumentSemanticHashOf(document);
      const returned = graphWorkflowDocumentSemanticHashOf(result.document);
      if (submitted !== returned) {
        this.runError.set(
          `Run '${runId}' document round trip drifted: submitted hash '${submitted}' vs stored hash '${returned}'`,
        );
      }
    }
    this.runEventClient.disconnect(runId);
    this.runEventSubscribers.delete(runId);
    this.isRunning.set(false);
  }

  /**
   * Tears down the canonical run's SSE subscriber map for the page teardown.
   */
  private teardownCanonicalRuns(): void {
    for (const runId of this.runEventSubscribers.keys()) {
      this.runEventClient.disconnect(runId);
      this.runEventSubscribers.delete(runId);
    }
  }
}
// trigger rebuild
