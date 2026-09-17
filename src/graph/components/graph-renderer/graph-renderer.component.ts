import {
  Component,
  computed,
  effect,
  inject,
  Injector,
  input,
  output,
  runInInjectionContext,
  signal,
  untracked,
  ViewEncapsulation,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, type AbstractControl, type FormGroup } from '@angular/forms';
import { Constructor } from '@decaf-ts/decoration';
import { Model, ModelBuilder } from '@decaf-ts/decorator-validation';
import type { GraphNodeManifest, GraphWorkflowSnapshot, LegacyGraphWorkflowSnapshot } from '@decaf-ts/ui-decorators/graph';
import { graphWorkflowDefinitionOf, graphWorkflowDocumentFromLegacySnapshot } from '@decaf-ts/ui-decorators/graph';
import { IonSpinner } from '@ionic/angular/standalone';
import {
  createMiddlewares,
  NgDiagramBackgroundComponent,
  NgDiagramComponent,
  NgDiagramEdgeTemplateMap,
  NgDiagramMinimapComponent,
  NgDiagramNodeTemplateMap,
  provideNgDiagram,
  type EdgeDrawEndedEvent,
  type EdgeDrawnEvent,
  type Middleware,
  type NodeDragEndedEvent,
  type SelectionRemovedEvent,
} from 'ng-diagram';
import { GraphNodeCatalogService } from '../../catalog/GraphNodeCatalogService';
import {
  GraphWorkflowValidateClient,
  graphValidity,
} from '../../validation';
import { GRAPH_DEV_MODE } from '../../tokens/graph-configuration.tokens';
import {
  GraphDiagramAdapter,
  graphWorkflowDocumentBoundaryNodeIdsOf,
} from '../../document/GraphDiagramAdapter';
import { isGraphNodeGhost, type NgDiagramMutation } from '../../document/GraphDocumentMutation';
import { GraphWorkflowDocumentStore } from '../../document/GraphWorkflowDocumentStore';
import { ghostNodeStore } from '../../execution/GhostNodeStore';
import { graphSelection } from '../../execution/GraphSelectionStore';
import { GraphRendererViewModel } from '../../types';
import {
  buildGraphRendererModel,
  buildGraphRendererSnapshot,
  buildGraphRendererStateFromSnapshot,
  buildGraphRendererViewModel,
  graphPaletteEntriesOf,
  parseGraphRendererSnapshot,
  stringifyGraphRendererSnapshot,
  type GraphPaletteEntry
} from '../../utils';
import {
  buildWorkflowInputFields,
  buildWorkflowInputForm,
  normalizeWorkflowInputValues,
  WorkflowInputFieldDefinition,
} from '../../workflow-inputs';
import { GraphBoundaryNodeTemplateComponent } from '../boundary-node-template/boundary-node-template.component';
import { GraphEdgeTemplateComponent } from '../graph-edge-template/graph-edge-template.component';
import { GraphGhostNodeTemplateComponent } from '../graph-ghost-node-template/graph-ghost-node-template.component';
import { GraphLogsWidgetComponent } from '../graph-logs-widget/graph-logs-widget.component';
import { GraphNodeInspectionComponent, type GraphInspectionRunState, type GraphRunValidationIssue } from '../graph-node-inspection/graph-node-inspection.component';
import { GraphNodeTemplateComponent } from '../graph-node-template/graph-node-template.component';

@Component({
  selector: 'app-graph-renderer',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    NgDiagramComponent,
    NgDiagramBackgroundComponent,
    NgDiagramMinimapComponent,
    IonSpinner,
    GraphLogsWidgetComponent,
    GraphNodeInspectionComponent,
  ],
  providers: [provideNgDiagram()],
  templateUrl: './graph-renderer.component.html',
  styleUrl: './graph-renderer.component.scss',
  encapsulation: ViewEncapsulation.None,
})
/**
 * Rete.js-based canvas renderer for the graph editor: hosts the diagram,
 * binds it to the document store through the diagram adapter and mutation
 * translator, and exposes canvas snapshots for autosave/history.
 */
export class GraphRendererComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly injector = inject(Injector);
  private readonly documentStore = inject(GraphWorkflowDocumentStore, { optional: true });
  private readonly catalogService = inject(GraphNodeCatalogService, { optional: true });
  private readonly validateClient = inject(GraphWorkflowValidateClient, { optional: true });
  /** Developer-mode chrome gate (G3-36): the raw snapshot textarea renders only in dev mode. */
  readonly devMode = inject(GRAPH_DEV_MODE);
  private readonly canvasAdapter = new GraphDiagramAdapter();
  private restoreOptions: { restore: boolean; applyViewport?: boolean } | null = null;
  private readonly duplicateCounts = signal<Record<string, number>>({});
  private readonly workflowInputValues = signal<Record<string, unknown>>({});
  private readonly snapshotJson = signal('');
  readonly workflowInputForm = signal<FormGroup>(this.formBuilder.group({}));
  readonly model = signal<ReturnType<typeof buildGraphRendererModel> | null>(null);
  private skipNextModelSync = false;
  /**
   * Highest document version already reconciled to the canvas. Reconcile runs
   * at most once per document version so render-cycle effect re-firing can
   * never enter a reconcile loop (the nodes/edges updates inside `reconcile`
   * would otherwise trigger another view refresh per cycle).
   */
  private reconciledVersion = -1;

  readonly graphRoot = input.required<unknown>();
  readonly outputs = input<Record<string, unknown> | null>(null);
  readonly availableNodes = input<GraphNodeManifest[]>([]);
  /** Run-result lifecycle of the last run (drives the split view's run panes, G3-12). */
  readonly runResultState = input<GraphInspectionRunState>('idle');
  /** Structured validation issues surfaced by the last run (G3-33). */
  readonly validationIssues = input<GraphRunValidationIssue[]>([]);

  /**
   * Editor validity projection (D5/G3-16..G3-18): the canvas/document
   * invalid state, the structured graph issues, and their readable label. The
   * renderer feeds the projection continuously as the document changes; the
   * toolbar/page read the same singleton to gate Run.
   */
  readonly graphValidityStatus = graphValidity.status;
  readonly graphValidityLabel = graphValidity.label;
  readonly graphIssues = graphValidity.issues;
  readonly graphInvalid = graphValidity.isInvalid;

  readonly nodeDragEnded = output<void>();
  readonly edgeDrawn = output<void>();
  readonly elementsRemoved = output<void>();
  /** Requests a run-result re-fetch from the page (split-view retry, G3-33). */
  readonly retryRunResult = output<void>();

  readonly portGuardMiddleware: Middleware = {
    name: 'port-guard',
    execute: async (context, next, _cancel) => {
      const actions = context.modelActionTypes;
      if (actions.includes('deletePortsBulk') && !actions.includes('deleteNodes')) {
        const update = context.initialUpdate;
        const cleaned = {
          ...update,
          nodesToUpdate: update.nodesToUpdate?.filter((n) => !('measuredPorts' in n && Object.keys(n).length <= 2)),
        };
        await next(cleaned);
        return;
      }
      await next();
    },
  };

  /**
   * Prevents deletion of mandatory edges (item→ghost→loop) and ghost nodes.
   */
  readonly mandatoryEdgeGuardMiddleware: Middleware = {
    name: 'mandatory-edge-guard',
    execute: async (context, next, _cancel) => {
      const actions = context.modelActionTypes;
      const update = context.initialUpdate;
      const diagram = this.model();

      // Filter out mandatory edges from deletion
      if (
        diagram &&
        update.edgesToRemove?.length &&
        (actions.includes('deleteEdges') || actions.includes('deleteElements') || actions.includes('deleteSelection'))
      ) {
        const allowedEdges = update.edgesToRemove.filter((edgeId: string) => {
          const edge = diagram.getEdges().find((e) => (e as { id: string }).id === edgeId) as
            | { data?: { mandatory?: boolean } }
            | undefined;
          return !edge?.data?.mandatory;
        });
        if (allowedEdges.length === 0 && update.edgesToRemove.length > 0) {
          // All edges were mandatory — strip edges from the update
          const { edgesToRemove, ...rest } = update;
          if (Object.keys(rest).length === 0 || (actions.includes('deleteEdges') && !actions.includes('deleteNodes'))) {
            return; // block entirely
          }
          await next(rest);
          return;
        }
        if (allowedEdges.length < update.edgesToRemove.length) {
          await next({ ...update, edgesToRemove: allowedEdges });
          return;
        }
      }

      // Filter out ghost nodes from deletion
      if (
        update.nodesToRemove?.length &&
        (actions.includes('deleteNodes') || actions.includes('deleteElements') || actions.includes('deleteSelection'))
      ) {
        const allowedNodes = update.nodesToRemove.filter((nodeId: string) => !nodeId.startsWith('ghost-'));
        if (allowedNodes.length === 0 && update.nodesToRemove.length > 0) {
          const { nodesToRemove, ...rest } = update;
          if (Object.keys(rest).length === 0 || (actions.includes('deleteNodes') && !actions.includes('deleteEdges'))) {
            return;
          }
          await next(rest);
          return;
        }
        if (allowedNodes.length < update.nodesToRemove.length) {
          await next({ ...update, nodesToRemove: allowedNodes });
          return;
        }
      }

      await next();
    },
  };

  readonly middlewares = createMiddlewares((defaults) => [
    ...defaults,
    this.portGuardMiddleware,
    this.mandatoryEdgeGuardMiddleware,
  ]);

  readonly nodeTemplateMap = new NgDiagramNodeTemplateMap([
    ['workflow', GraphNodeTemplateComponent],
    ['pipeline', GraphNodeTemplateComponent],
    ['node', GraphNodeTemplateComponent],
    ['core.loop.foreach', GraphNodeTemplateComponent],
    ['core.loop.while', GraphNodeTemplateComponent],
    ['core.loop.until', GraphNodeTemplateComponent],
    // Trigger nodes (DECAF-32 §22.2.1)
    ['core.trigger.manual', GraphNodeTemplateComponent],
    ['core.trigger.webhook', GraphNodeTemplateComponent],
    ['core.trigger.schedule', GraphNodeTemplateComponent],
    ['core.trigger.event', GraphNodeTemplateComponent],
    ['core.trigger.form', GraphNodeTemplateComponent],
    ['core.trigger.chat', GraphNodeTemplateComponent],
    // Flow-control nodes (DECAF-32 §22.2.2)
    ['core.flow.if', GraphNodeTemplateComponent],
    ['core.flow.switch', GraphNodeTemplateComponent],
    ['core.flow.parallel', GraphNodeTemplateComponent],
    ['core.flow.merge', GraphNodeTemplateComponent],
    ['core.flow.map', GraphNodeTemplateComponent],
    ['core.flow.delay', GraphNodeTemplateComponent],
    ['core.flow.errorBoundary', GraphNodeTemplateComponent],
    ['core.flow.humanApproval', GraphNodeTemplateComponent],
    ['core.flow.return', GraphNodeTemplateComponent],
    ['core.flow.code', GraphNodeTemplateComponent],
    ['core.flow.log', GraphNodeTemplateComponent],
    ['core.flow.break', GraphNodeTemplateComponent],
    // Utility node (DECAF-48 §4.4): the DECAF-50 demo fixture adds a text-log
    // node to the mandated canvas→run proof.
    ['core.utility.log', GraphNodeTemplateComponent],
    // Agent node (DECAF-32 §21.3)
    ['core.agent', GraphNodeTemplateComponent],
    ['value', GraphBoundaryNodeTemplateComponent],
    ['graph.ghost', GraphGhostNodeTemplateComponent],
  ]);

  /**
   * Edge template keyed by the `graph-edge` type set on every canvas edge by
   * {@link buildGraphRendererViewModel}. The `graph-edge` template applies the
   * run's visual state (running / blocked / succeeded / failed / skipped) to
   * the line (DECAF-48 §4.4).
   */
  readonly edgeTemplateMap = new NgDiagramEdgeTemplateMap([['graph-edge', GraphEdgeTemplateComponent]]);

  readonly workflowRootClass = computed(() => this.resolveGraphRoot(this.graphRoot()));

  readonly workflowDefinition = computed(() => graphWorkflowDefinitionOf(this.workflowRootClass() as never));

  readonly workflowInputFields = computed<WorkflowInputFieldDefinition[]>(() =>
    buildWorkflowInputFields(this.workflowDefinition(), this.workflowInputValues())
  );

  readonly viewModel = computed<GraphRendererViewModel>(() =>
    buildGraphRendererViewModel(this.workflowRootClass() as never, this.workflowInputValues(), this.duplicateCounts())
  );

  readonly rootTitle = computed(() =>
    String(this.workflowDefinition().graph?.metadata?.['title'] ?? this.workflowDefinition().tag)
  );

  readonly snapshotPreview = computed(() => this.snapshotJson());

  /**
   * Snapshot of the workflow-input form for a run (G3-13): the same form the
   * renderer builds and validates drives the run inputs, so a boundary edit and a
   * Run share one input source. Returns the normalized values, whether the form is
   * valid, and the structured validation messages when it is not.
   */
  workflowInputPayload(): {
    valid: boolean;
    inputs: Record<string, unknown>;
    errors: GraphRunValidationIssue[];
  } {
    const form = this.workflowInputForm();
    const values = normalizeWorkflowInputValues(
      this.workflowInputFields(),
      form.getRawValue() as Record<string, unknown>
    );
    const errors: GraphRunValidationIssue[] = [];
    for (const field of this.workflowInputFields()) {
      const control = form.get(field.controlName);
      if (!control || !control.errors) continue;
      for (const message of this.controlErrorMessages(field)) {
        errors.push({ path: field.path, message, code: 'workflow-input' });
      }
    }
    return { valid: form.valid, inputs: values, errors };
  }

  readonly paletteOpen = signal(false);
  /**
   * Palette search query (R6, DECAF-50 gate-4 follow-up): the node add list
   * filters its manifest entries by title, kind, and category as the user types.
   */
  readonly paletteQuery = signal('');
  /**
   * Manifest-driven palette entries (P7 cutover §4.14): entries derive from
   * {@link GraphNodeManifest}s through {@link graphPaletteEntriesOf} — no node
   * constructors participate in discovery.
   */
  readonly paletteEntries = computed(() => graphPaletteEntriesOf(this.availableNodes()));

  /**
   * Search-filtered palette entries (R6): the palette list renders these so the
   * search field filters the catalogue by title, kind, or category.
   */
  readonly filteredPaletteEntries = computed(() => {
    const query = this.paletteQuery().trim().toLowerCase();
    const entries = this.paletteEntries();
    if (!query) return entries;
    return entries.filter(
      (entry) =>
        entry.title.toLowerCase().includes(query) ||
        entry.kind.toLowerCase().includes(query) ||
        (entry.category ?? '').toLowerCase().includes(query)
    );
  });

  /** Whether the search query matched no catalogue entry (R6 empty state). */
  readonly paletteSearchEmpty = computed(
    () => this.paletteQuery().trim().length > 0 && this.filteredPaletteEntries().length === 0
  );

  /**
   * Live catalogue status (G3-26): the palette renders the catalogue's
   * loading/degraded/failed state instead of silently rendering an empty list.
   * A renderer without a catalogue service (isolated component tests) reports
   * `ready` so it never shows a spurious failure state.
   */
  readonly catalogStatus = computed(() => this.catalogService?.status() ?? 'ready');

  /** Structured failure of the last degraded/failed catalogue load (G3-27). */
  readonly catalogFailure = computed(() => this.catalogService?.failure() ?? null);

  /** Whether the palette has no entries at all, driving its empty state (G3-26). */
  readonly paletteEmpty = computed(() => this.paletteEntries().length === 0);

  /**
   * Human-readable catalogue status message (G3-26/G3-27): distinguishes a
   * backend that is down from one that answered out of contract, and reports the
   * fixture-only degraded fallback instead of a silently empty palette.
   */
  readonly catalogStatusMessage = computed<string>(() => {
    const failure = this.catalogFailure();
    switch (this.catalogStatus()) {
      case 'loading':
        return 'Loading the node catalogue…';
      case 'degraded':
        return failure?.kind === 'malformed-response'
          ? 'The node catalogue backend returned an unexpected response; showing the built-in nodes only.'
          : 'The node catalogue backend is unavailable; showing the built-in nodes only.';
      case 'failed':
        return failure?.message ?? 'The node catalogue could not be loaded.';
      case 'ready':
        return 'Node catalogue ready.';
      default:
        return 'The node catalogue has not loaded yet.';
    }
  });

  constructor() {
    effect((onCleanup) => {
      if (this.skipNextModelSync) {
        this.skipNextModelSync = false;
        return;
      }

      const workflow = this.workflowDefinition();
      const form = buildWorkflowInputForm(workflow);
      const fields = buildWorkflowInputFields(workflow, form.getRawValue() as Record<string, unknown>);
      this.workflowInputForm.set(form);
      this.workflowInputValues.set(normalizeWorkflowInputValues(fields, form.getRawValue() as Record<string, unknown>));

      const subscription = form.valueChanges.subscribe((value) => {
        const currentValues = (value ?? {}) as Record<string, unknown>;
        this.workflowInputValues.set(normalizeWorkflowInputValues(fields, currentValues));
      });

      onCleanup(() => subscription.unsubscribe());
    });

    effect(() => {
      // One-way doc ownership (§4.12): once the document store owns a canvas,
      // the decorated-root model never rebuilds it — the doc-driven reconcile
      // alone drives the canvas so gesture commit/store re-projection stays.
      if (this.documentStore?.document()) return;
      const root = this.workflowRootClass() as never;
      const inputValues = this.workflowInputValues();
      const duplicateCounts = this.duplicateCounts();
      const previousModel = untracked(() => this.model());
      runInInjectionContext(this.injector, () => {
        this.model.set(buildGraphRendererModel(root, this.injector, inputValues, duplicateCounts, previousModel));
      });
    });

    // Canonical document projection (§4.12): when the doc store owns a
    // document, the canvas reconciles to its projection; while it is empty, the
    // decorated-root canvas is used as the seed for the lossless conversion.
    // Dependencies are the doc document and the catalogue status; the reconcile
    // itself is version-gated inside {@link settleCanvasFromDocument} so the
    // same document version can never reconcile twice (render-cycle safety).
    effect(() => {
      void this.catalogService?.status?.();
      this.settleCanvasFromDocument();
    });

    // Continuous validity projection (D5/G3-16): every semantic document
    // change re-validates through `POST /graph/workflows/validate`, and the
    // result drives the canvas invalid state, the structured issue list, and the
    // Run gate. The read is untracked so the projection's own signal writes
    // can never re-enter this effect; `validateIfChanged` dedupes layout-only
    // edits by semantic hash.
    effect(() => {
      const document = this.documentStore?.document();
      const validateClient = this.validateClient;
      if (!document || !validateClient) return;
      untracked(() => {
        void graphValidity.validateIfChanged(document, validateClient);
      });
    });

    // Open palette when a ghost node + is clicked, or when a node-side add
    // connector is clicked (G3-29 n8n-look ruling).
    effect(() => {
      const pendingId = ghostNodeStore.pendingParentId();
      const pendingAdd = ghostNodeStore.pendingAddSource();
      if (pendingId || pendingAdd) {
        this.paletteOpen.set(true);
      }
    });
  }

  /**
   * Reloads the node catalogue from its source (G3-26 retry affordance): the
   * palette's failed state offers a retry so a transient backend failure is
   * recoverable without a page reload.
   */
  async reloadCatalogue(): Promise<void> {
    try {
      await this.catalogService?.refresh();
    } catch (error) {
      console.warn('[GraphRendererComponent] catalogue reload failed', error);
    }
  }

  onSelectionChanged(event: { selectedNodes?: { id: string }[] }) {
    graphSelection.setSelected((event.selectedNodes ?? []).map((n) => n.id));
  }

  /**
   * Canvas gestures become canonical document commands (§4.12): the canvas event
   * payload maps onto the {@link NgDiagramMutation}-shaped gesture and the
   * document store dispatches the translated commands; the doc-driven effect
   * then reconciles the canvas from the refreshed store output — never the
   * reverse. Palette/Autosave notifications still flow to the page for the
   * unsaved-changes indicator and the run history trigger.
   */
  onNodeDragEnded(event: NodeDragEndedEvent): void {
    // Drag-end commit policy (§4.12): positions commit when the gesture ends.
    if (event?.nodes?.length) {
      this.applyCanvasMutation({
        type: 'nodes-moved',
        nodes: event.nodes.map((node) => ({
          nodeId: node.id,
          position: { x: node.position.x, y: node.position.y },
        })),
      });
    }
    this.nodeDragEnded.emit();
  }

  onEdgeDrawn(event: EdgeDrawnEvent): void {
    if (event?.source?.id && event?.target?.id) {
      this.applyCanvasMutation({
        type: 'edges-added',
        edges: [
          {
            sourceNodeId: event.source.id,
            sourcePort: event.sourcePort,
            targetNodeId: event.target.id,
            targetPort: event.targetPort,
          },
        ],
      });
    }
    this.edgeDrawn.emit();
  }

  /**
   * Add-node on empty canvas (R5, supersedes G3-29/PR-H): when a connection
   * drag from an output port is released over empty canvas (no target), the
   * add-node palette opens; the node the user selects is placed at the drop point
   * and appears already connected from the drag's source output port into the new
   * node's first available input port. The node-side "+" button is gone.
   */
  onEdgeDrawEnded(event: EdgeDrawEndedEvent): void {
    if (event?.success) return;
    if (event?.reason !== 'noTarget') return;
    const sourceId = event?.source?.id;
    if (!sourceId || !event?.sourcePort) return;
    ghostNodeStore.requestAddNodeFrom(sourceId, event.sourcePort, {
      x: event.dropPosition?.x ?? 0,
      y: event.dropPosition?.y ?? 0,
    });
    this.paletteOpen.set(true);
  }

  onElementsRemoved(event: SelectionRemovedEvent): void {
    const edgeIds = (event?.deletedEdges ?? []).map((edge) => edge.id);
    const nodeIds = (event?.deletedNodes ?? []).map((node) => node.id);
    if (edgeIds.length) this.applyCanvasMutation({ type: 'edges-removed', edgeIds });
    if (nodeIds.length) this.applyCanvasMutation({ type: 'nodes-removed', nodeIds });
    this.elementsRemoved.emit();
  }

  /**
   * Dispatches one canvas gesture's canonical document commands through the
   * adapter (the only translator, §4.12) onto the document store. Guarded when
   * the store/catalogue are not ready and when an optimistic connection is
   * rejected: the canvas then silently keeps its gesture-local change out of
   * the document (the reconcile drops it), keeping the seed/failed state visible.
   */
  private applyCanvasMutation(mutation: NgDiagramMutation): void {
    const documentStore = this.documentStore;
    const current = documentStore?.document();
    const catalogue = this.catalogService?.reader();
    if (!documentStore || !current || !catalogue) return;
    try {
      const commands = this.canvasAdapter.commandsForDiagramMutation(current, mutation, catalogue);
      for (const command of commands) documentStore.dispatchCommand(command);
    } catch (error) {
      // Invalid optimistic connections stay canvas-local: the document keeps
      // its pre-gesture shape so the next reconcile drops the rejected edge.
      console.warn('[GraphRendererComponent] canvas mutation rejected', error);
    }
  }

  togglePalette() {
    this.paletteOpen.set(!this.paletteOpen());
  }

  closePalette() {
    ghostNodeStore.clear();
    this.paletteQuery.set('');
    this.paletteOpen.set(false);
  }

  /**
   * Applies the palette search query (R6): the node add list filters its
   * manifest entries by title/kind/category.
   */
  onPaletteQueryChange(value: string) {
    this.paletteQuery.set(value ?? '');
  }

  /** Clears the palette search query (R6). */
  clearPaletteQuery() {
    this.paletteQuery.set('');
  }

  /**
   * Adds a palette node through the canonical document pipeline (§4.4.4 §4.14):
   * the manifest drives the built instance (id/defaults/label), the store
   * dispatches `node.add`, the reconcile in the doc-driven effect renders it.
   * No node constructor participates in the editor path.
   *
   * Three insertion modes (G3-29 n8n-look ruling): a node-side add connector
   * places the new node beside its source and auto-connects it, a foreach ghost
   * inserts into the loop body, and the canvas-level "+ Add node" places an
   * unconnected node.
   */
  addNode(entry: GraphPaletteEntry) {
    const documentStore = this.documentStore;
    if (!documentStore) return;

    const existing = documentStore.document()?.nodes.length ?? 0;
    const offset = existing * 40;
    const ghostParentId = ghostNodeStore.consume();
    const addSource = ghostNodeStore.consumeAddSource();
    let position = { x: 420 + offset, y: 200 + offset };
    let label = entry.title;

    if (ghostParentId) {
      const ghostNode = this.model()
        ?.getNodes()
        .find((n: { id: string }) => n.id === `ghost-${ghostParentId}`);
      position = (ghostNode as { position?: { x: number; y: number } })?.position ?? position;
      label = `${entry.title} (${ghostParentId.startsWith('loop-') ? 'loop body' : 'materialized'})`;
    } else if (addSource) {
      // Add-node on empty canvas (R5, supersedes G3-29): a connection drag
      // released over empty canvas places the new node at the drop point and
      // connects the source output port into its first available input port.
      // A programmatic node-side request without a drop point places the new
      // node beside its source instead.
      if (addSource.position) {
        position = { x: addSource.position.x, y: addSource.position.y };
      } else {
        const sourceNode = this.model()
          ?.getNodes()
          .find((n: { id: string }) => n.id === addSource.nodeId) as
          | { position?: { x: number; y: number }; size?: { width?: number; height?: number } }
          | undefined;
        const sourcePosition = sourceNode?.position ?? position;
        const sourceWidth = sourceNode?.size?.width ?? 96;
        position = { x: sourcePosition.x + sourceWidth + 120, y: sourcePosition.y };
      }
    }

    const node = documentStore.addNodeFromManifest(entry.manifest, position, label);

    if (ghostParentId) {
      const inputPort = (entry.manifest.inputs ?? [])[0]?.id ?? 'value';
      const outputPort = (entry.manifest.outputs ?? [])[0]?.id ?? 'result';
      documentStore.addEdge({
        id: `${ghostParentId}:item->${node.id}:${inputPort}`,
        type: 'data',
        source: { scope: 'node', nodeId: ghostParentId, port: 'item' },
        target: { scope: 'node', nodeId: node.id, port: inputPort },
        label: 'item',
        metadata: { mandatory: true },
      });
      documentStore.addEdge({
        id: `${node.id}:${outputPort}->${ghostParentId}:loop`,
        type: 'data',
        source: { scope: 'node', nodeId: node.id, port: outputPort },
        target: { scope: 'node', nodeId: ghostParentId, port: 'loop' },
        label: 'loop',
        metadata: { mandatory: true },
      });
    } else if (addSource) {
      const inputPort = (entry.manifest.inputs ?? [])[0]?.id ?? 'value';
      documentStore.addEdge({
        id: `${addSource.nodeId}:${addSource.portId}->${node.id}:${inputPort}`,
        type: 'data',
        source: { scope: 'node', nodeId: addSource.nodeId, port: addSource.portId },
        target: { scope: 'node', nodeId: node.id, port: inputPort },
        label: inputPort,
      });
    } else if (entry.kind === 'core.loop.foreach') {
      // Foreach keeps the legacy ghost placeholder machinery (loop body add) so
      // the added node immediately shows its loop-body ghost on canvas.
      this.createForeachGhost(node.id);
    }
    this.paletteQuery.set('');
    this.paletteOpen.set(false);
  }

  /**
   * Creates the mandatory ghost/placeholder node between the foreach's `item`
   * output port and its `loop` connection port. The ghost has a + icon that
   * opens the palette when clicked. The item→ghost→loop edges are
   * non-deletable.
   */
  private createForeachGhost(foreachId: string) {
    const documentStore = this.documentStore;
    if (!documentStore) return;
    const foreachNode = documentStore.document()?.nodes.find((node) => node.id === foreachId);
    if (!foreachNode) return;
    const pos = foreachNode.ui?.position ?? { x: 0, y: 0 };
    const size = foreachNode.ui?.size ?? { width: 120, height: 140 };
    const width = size.width ?? 120;
    const height = size.height ?? 140;
    const ghostId = `ghost-${foreachId}`;
    const ghostPosition = { x: pos.x + width + 80, y: pos.y + height / 2 - 28 };
    documentStore.addNode({
      id: ghostId,
      kind: 'graph.ghost',
      label: 'Add node',
      ui: { position: ghostPosition, size: { width: 56, height: 56 } },
      parameters: { ghostParentId: foreachId },
    });
    documentStore.addEdge({
      id: `${foreachId}:item->${ghostId}:in`,
      type: 'data',
      source: { scope: 'node', nodeId: foreachId, port: 'item' },
      target: { scope: 'node', nodeId: ghostId, port: 'in' },
      label: 'item',
      metadata: { mandatory: true },
    });
    documentStore.addEdge({
      id: `${ghostId}:out->${foreachId}:loop`,
      type: 'data',
      source: { scope: 'node', nodeId: ghostId, port: 'out' },
      target: { scope: 'node', nodeId: foreachId, port: 'loop' },
      label: 'loop',
      metadata: { mandatory: true },
    });
  }

  /**
   * Called when a ghost node's + button is clicked. Opens the palette so the
   * user can pick a node to insert into the loop body.
   */
  onGhostAddNode(parentNodeId: string) {
    ghostNodeStore.requestAddNode(parentNodeId);
    this.paletteOpen.set(true);
  }

  controlFor(controlName: string): AbstractControl | null {
    return this.workflowInputForm().get(controlName);
  }

  fieldErrors(field: WorkflowInputFieldDefinition): string[] {
    const control = this.controlFor(field.controlName);
    if (!control || !control.errors || (!control.dirty && !control.touched)) return [];
    return this.controlErrorMessages(field);
  }

  /**
   * Validation messages for a field's control regardless of dirty/touched state
   * (used by the run gate so a pristine invalid form still reports why, G3-33).
   */
  private controlErrorMessages(field: WorkflowInputFieldDefinition): string[] {
    const control = this.controlFor(field.controlName);
    if (!control || !control.errors) return [];

    return Object.entries(control.errors).map(([key, value]) => {
      switch (key) {
        case 'required':
          return `${field.label} is required`;
        case 'minlength':
          return `${field.label} must be at least ${(value as { requiredLength?: number })?.requiredLength ?? 0} characters`;
        case 'maxlength':
          return `${field.label} must be at most ${(value as { requiredLength?: number })?.requiredLength ?? 0} characters`;
        case 'min':
          return `${field.label} must be greater than or equal to ${(value as { min?: unknown })?.min ?? 'the minimum value'}`;
        case 'max':
          return `${field.label} must be less than or equal to ${(value as { max?: unknown })?.max ?? 'the maximum value'}`;
        case 'pattern':
          return `${field.label} does not match the expected format`;
        case 'email':
          return `${field.label} must be a valid email address`;
        case 'enum':
          return `${field.label} must be one of the allowed values`;
        case 'step':
          return `${field.label} must use the configured step`;
        default:
          return `${field.label} is invalid`;
      }
    });
  }

  inputLabel(property: string) {
    return this.workflowInputFields().find((field) => field.path === property)?.label || property;
  }

  displayValue(value: unknown) {
    if (value === undefined || value === null || value === '') return 'empty';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (value instanceof Date) return value.toISOString();
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  workflowOutputValue(portProperty: string) {
    const outs = this.outputs();
    if (!outs) return 'pending run result';
    const value = outs[portProperty];
    return this.displayValue(value);
  }

  saveSnapshot() {
    const snapshot = this.buildSnapshot();
    if (snapshot) {
      this.snapshotJson.set(stringifyGraphRendererSnapshot(snapshot));
    }
  }

  buildSnapshot(): LegacyGraphWorkflowSnapshot | null {
    const diagram = this.model();
    if (!diagram) return null;
    return buildGraphRendererSnapshot(
      this.workflowRootClass() as never,
      diagram,
      this.workflowInputValues(),
      this.duplicateCounts()
    );
  }

  /**
   * Document-driven canvas reconcile (§4.12): when the canonical document store
   * owns a document, the canvas reconciles to its projection. While the store
   * is still empty, the decorated-root legacy canvas builds once and seeds the
   * store through the sanctioned lossless conversion (§4.11) so the demo graph
   * always starts as a canonical document.
   * The reconcile itself is version-gated: it runs at most once per store
   * document version, so render-cycle re-firing of the underlying effects can
   * never re-enter the reconcile loop.
   */
  private settleCanvasFromDocument(): void {
    const documentStore = this.documentStore;
    const document = documentStore?.document();
    const version = documentStore?.version?.() ?? 0;
    if (document && version <= this.reconciledVersion) return;
    if (!document || !documentStore) {
      const seedSnapshot = this.buildSnapshot();
      if (!seedSnapshot || !documentStore || documentStore.document()) return;
      const seeded = graphWorkflowDocumentFromLegacySnapshot(seedSnapshot);
      documentStore.initialize(seeded);
      return;
    }
    const catalogue = this.catalogService?.reader();
    if (!catalogue) return;
    // The fixture catalogue load is asynchronous: until every member kind is
    // registered, the projection would throw and permanently freeze the canvas
    // on its legacy seed. Defer and let the catalogue-ready effect retry.
    // Boundary badges are projected from `document.inputs`/`document.outputs`;
    // a lossless legacy snapshot may also carry one inside `document.nodes`
    // (unregistered as a member kind), which must not defer the reconcile.
    const boundaryNodeIds = graphWorkflowDocumentBoundaryNodeIdsOf(document);
    const missingKinds = document.nodes.filter(
      (node) => !isGraphNodeGhost(node) && !boundaryNodeIds.has(node.id) && !catalogue.get(node.kind)
    );
    if (missingKinds.length) return;
    const restoredOptions = this.restoreOptions;
    const previousModel = untracked(() => this.model());
    const diagram = this.canvasAdapter.reconcile(
      document,
      previousModel,
      catalogue,
      this.injector,
      restoredOptions ?? undefined
    );
    this.restoreOptions = null;
    this.reconciledVersion = version;
    this.skipNextModelSync = true;
    this.model.set(diagram as never);
  }

  /**
   * Reinstates a persisted canonical wrapper (`{ document, editor, metadata }`,
   * §4.10): the loaded document replaces the store's current one, and the next
   * reconcile applies the document positions/sizes/viewport verbatim
   * (restore mode; 12-step E2E steps 6–7).
   */
  restoreFromDocument(saved: GraphWorkflowSnapshot): void {
    const documentStore = this.documentStore;
    if (!documentStore || !saved?.document) return;
    documentStore.replace(saved.document);
    const duplicateCounts = saved.editor?.duplicateCounts;
    if (duplicateCounts) {
      this.duplicateCounts.set({ ...duplicateCounts });
    }
    this.restoreOptions = { restore: true, applyViewport: !!saved.document.ui?.viewport };
    this.settleCanvasFromDocument();
  }

  /**
   * Restores an undo/redo history entry (legacy or canonical snapshot; §4.11):
   * the canonical/legacy document converts into the doc store's replace path;
   * legacy entries restore directly through the snapshot machinery.
   */
  restoreFromSnapshot(snapshot: LegacyGraphWorkflowSnapshot): void {
    const restored = buildGraphRendererStateFromSnapshot(this.workflowRootClass() as never, snapshot, this.injector);
    const documentStore = this.documentStore;
    if (documentStore) {
      try {
        documentStore.replace(graphWorkflowDocumentFromLegacySnapshot(snapshot));
      } catch (error) {
        console.warn('[GraphRendererComponent] undo snapshot document conversion skipped', error);
      }
    }
    this.skipNextModelSync = true;
    this.workflowInputValues.set(restored.inputValues);
    this.duplicateCounts.set(restored.duplicateCounts);
    this.model.set(restored.diagram as never);
  }

  private setUpCanvasViewport(viewport: { x: number; y: number; zoom: number }) {
    const diagram = this.model();
    if (!diagram) return;
    diagram.updateMetadata({
      ...diagram.getMetadata(),
      viewport: { x: viewport.x, y: viewport.y, scale: viewport.zoom },
    } as never);
  }

  loadSnapshot() {
    const raw = this.snapshotJson().trim();
    if (!raw) return;

    const snapshot = parseGraphRendererSnapshot(raw, this.workflowRootClass() as never) as LegacyGraphWorkflowSnapshot;
    const restored = buildGraphRendererStateFromSnapshot(this.workflowRootClass() as never, snapshot, this.injector);

    this.skipNextModelSync = true;
    this.workflowInputValues.set(restored.inputValues);
    this.duplicateCounts.set(restored.duplicateCounts);
    this.model.set(restored.diagram as never);
  }

  snapshotValue() {
    return this.snapshotJson();
  }

  updateSnapshotValue(value: string) {
    this.snapshotJson.set(value);
  }

  private resolveGraphRoot(root: unknown): Constructor<Model> {
    if (typeof root === 'function') {
      return root as Constructor<Model>;
    }

    if (root instanceof Model) {
      return root.constructor as Constructor<Model>;
    }

    return ModelBuilder.builder<Model & Record<string, unknown>>().setName('GeneratedGraphRoot').build();
  }
}
