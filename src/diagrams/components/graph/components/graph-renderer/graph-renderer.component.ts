import {
  AfterViewInit,
  Component,
  computed,
  effect,
  ElementRef,
  HostListener,
  inject,
  Injector,
  input,
  output,
  runInInjectionContext,
  signal,
  untracked,
  ViewChild,
  ViewEncapsulation,
} from '@angular/core';
import {
  FormBuilder,
  FormControl,
  ReactiveFormsModule,
  Validators,
  type AbstractControl,
  FormGroup,
} from '@angular/forms';
import { Constructor } from '@decaf-ts/decoration';
import { Model, ModelBuilder } from '@decaf-ts/decorator-validation';
import type {
  GraphNodeManifest,
  GraphPortDefinition,
  GraphWorkflowPortInstance,
  GraphWorkflowSnapshot,
} from '@decaf-ts/as-graph/shared';
import {
  graphNodeEndpointId,
  graphWorkflowDefinitionOf,
  PortDirection,
} from '@decaf-ts/as-graph/shared';
import { IonSpinner } from '@ionic/angular/standalone';
import {
  createMiddlewares,
  NgDiagramBackgroundComponent,
  NgDiagramComponent,
  NgDiagramEdgeTemplateMap,
  NgDiagramMinimapComponent,
  NgDiagramNodeTemplateMap,
  NgDiagramService,
  NgDiagramViewportService,
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
import { graphExecutionState } from '../../execution/GraphExecutionStateService';
import {
  graphForeachLoopIdsOf,
  graphLoopBodyOrderOf,
  graphLoopBodyOrdersOf,
  graphLoopChainCommandsFor,
  type GraphLoopBodyStep,
} from '../../document/LoopChainRepair';
import { graphRunLog } from '../../execution/GraphRunLogStore';
import { graphSelection } from '../../execution/GraphSelectionStore';
import { GraphRendererViewModel } from '../../types';
import {
  buildGraphRendererModel,
  buildGraphRendererSnapshot,
  buildGraphRendererViewModel,
  graphPaletteEntriesOf,
  graphWorkflowUnresolvedNodeKinds,
  parseGraphRendererSnapshot,
  stringifyGraphRendererSnapshot,
  type GraphPaletteEntry
} from '../../utils';
import {
  buildWorkflowInputFields,
  buildWorkflowInputFieldsFromPorts,
  normalizeWorkflowInputValues,
  WorkflowInputFieldDefinition,
} from '../../workflow-inputs';
import { GraphBoundaryNodeTemplateComponent } from '../boundary-node-template/boundary-node-template.component';
import { GraphEdgeTemplateComponent } from '../graph-edge-template/graph-edge-template.component';
import { GraphGhostNodeTemplateComponent } from '../graph-ghost-node-template/graph-ghost-node-template.component';
import { GraphLogsWidgetComponent } from '../graph-logs-widget/graph-logs-widget.component';
import { GraphNodeInspectionComponent, type GraphInspectionRunState, type GraphRunValidationIssue } from '../graph-node-inspection/graph-node-inspection.component';
import { GraphNodeTemplateComponent } from '../graph-node-template/graph-node-template.component';

const WORKFLOW_INPUT_DRAG_TYPE = 'application/x-graph-workflow-input';
const SIDE_PANEL_COLLAPSED_WIDTH = 48;
const SIDE_PANELS_STACK_BREAKPOINT = 1100;

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
export class GraphRendererComponent implements AfterViewInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly injector = inject(Injector);
  private readonly diagramService = inject(NgDiagramService, { optional: true });
  private readonly viewportService = inject(NgDiagramViewportService, { optional: true });
  private readonly documentStore = inject(GraphWorkflowDocumentStore, { optional: true });
  private readonly catalogService = inject(GraphNodeCatalogService, { optional: true });
  private readonly validateClient = inject(GraphWorkflowValidateClient, { optional: true });
  /** Developer-mode chrome gate (G3-36): the raw snapshot textarea renders only in dev mode. */
  readonly devMode = inject(GRAPH_DEV_MODE);
  private readonly canvasAdapter = new GraphDiagramAdapter();
  private restoreOptions: { restore: boolean; applyViewport?: boolean } | null = null;
  private fitTimer?: ReturnType<typeof setTimeout>;
  private readonly duplicateCounts = signal<Record<string, number>>({});
  private readonly workflowInputValues = signal<Record<string, unknown>>({});
  private readonly snapshotJson = signal('');
  /**
   * The run form's fields and `FormGroup` published together (G1/SAA-783): the
   * template renders `workflowInputFields()` and binds `workflowInputForm()`
   * from this single source, so the controls and the form's controls can never
   * momentarily disagree (a field whose control name is absent from the form
   * throws Angular's `_rawValidators` read on the null control).
   */
  private readonly workflowInputBinding = signal<{
    form: FormGroup;
    fields: WorkflowInputFieldDefinition[];
  }>({ form: this.formBuilder.group({}), fields: [] });
  readonly workflowInputForm = computed(() => this.workflowInputBinding().form);
  readonly model = signal<ReturnType<typeof buildGraphRendererModel> | null>(null);
  readonly inputsPanelCollapsed = signal(false);
  readonly outputsPanelCollapsed = signal(false);
  readonly inputsPanelWidth = signal(280);
  readonly outputsPanelWidth = signal(280);
  readonly draggingInputPath = signal<string | null>(null);
  readonly canvasDropActive = signal(false);
  /**
   * Viewport coordinates the add-node palette is anchored at when it was opened
   * from a loop ghost; null keeps the default button-anchored popup.
   */
  readonly paletteAnchor = signal<{ x: number; y: number } | null>(null);
  /** Palette root (button + popup): the outside-click close target (R2-3(5)). */
  @ViewChild('paletteRoot') private paletteRoot?: ElementRef<HTMLElement>;

  @ViewChild('inputsPanel') private inputsPanel?: ElementRef<HTMLElement>;

  @ViewChild('outputsPanel') private outputsPanel?: ElementRef<HTMLElement>;

  @ViewChild('canvasRoot') private canvasRoot?: ElementRef<HTMLElement>;

  /**
   * R4-3: the palette search input is focused as soon as the popup renders so a
   * keyboard-first user can start typing the node name immediately. The `@if`
   * around the popup recreates the input on each open, re-firing the setter.
   */
  @ViewChild('paletteSearch')
  set paletteSearchInput(ref: ElementRef<HTMLInputElement> | undefined) {
    if (ref) queueMicrotask(() => ref.nativeElement.focus());
  }
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
  /** Whether the last run reached a `workflow.failed` terminal (SAA-1361 D8). */
  readonly runFailed = input<boolean>(false);
  /** Human-readable run failure surfaced on the canvas (SAA-1361 D8). */
  readonly runError = input<string | null>(null);
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

  private readonly staticNodeTemplateMap = new NgDiagramNodeTemplateMap([
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
    ['core.flow.delay', GraphNodeTemplateComponent],
    ['core.flow.errorBoundary', GraphNodeTemplateComponent],
    ['core.flow.humanApproval', GraphNodeTemplateComponent],
    ['core.flow.return', GraphNodeTemplateComponent],
    ['core.flow.log', GraphNodeTemplateComponent],
    ['core.flow.break', GraphNodeTemplateComponent],
    // Utility nodes (DECAF-48 §4.4): the DECAF-50 demo fixture adds a text-log
    // node to the mandated canvas→run proof, and the Code/Map nodes are
    // reclassified out of `core.flow.*` (DECAF-50 R2).
    ['core.utility.code', GraphNodeTemplateComponent],
    ['core.utility.map', GraphNodeTemplateComponent],
    ['core.utility.log', GraphNodeTemplateComponent],
    // Agent node (DECAF-32 §21.3)
    ['core.agent', GraphNodeTemplateComponent],
    ['value', GraphBoundaryNodeTemplateComponent],
    ['graph.ghost', GraphGhostNodeTemplateComponent],
  ]);

  /**
   * Canvas template keyed by node type. Every catalogued kind the static map
   * does not name renders with the generic node template (SAA-836 U1), so
   * newly landed engine kinds — the mastra agent family in particular — stay
   * editable without a renderer change, while the boundary/ghost canvas
   * artifacts keep their dedicated templates.
   */
  readonly nodeTemplateMap = computed(() => {
    const map = new NgDiagramNodeTemplateMap(this.staticNodeTemplateMap);
    for (const manifest of this.availableNodes()) {
      if (manifest && typeof manifest.kind === 'string' && manifest.kind && !map.has(manifest.kind)) {
        map.set(manifest.kind, GraphNodeTemplateComponent);
      }
    }
    return map;
  });

  /**
   * Edge template keyed by the `graph-edge` type set on every canvas edge by
   * {@link buildGraphRendererViewModel}. The `graph-edge` template applies the
   * run's visual state (running / blocked / succeeded / failed / skipped) to
   * the line (DECAF-48 §4.4).
   */
  readonly edgeTemplateMap = new NgDiagramEdgeTemplateMap([['graph-edge', GraphEdgeTemplateComponent]]);

  readonly workflowRootClass = computed(() => this.resolveGraphRoot(this.graphRoot()));

  readonly workflowDefinition = computed(() => graphWorkflowDefinitionOf(this.workflowRootClass() as never));

  /**
   * Declared input ports of the loaded canonical document (G1/SAA-783). When a
   * document owns the canvas — every fixture catalog load — its own declared
   * inputs drive the run form; with no document (a bare decorated demo root)
   * the fallback is the decorated root's compiled ports.
   */
  private readonly declaredWorkflowInputPorts = computed<
    readonly GraphWorkflowPortInstance[] | null
  >(() => {
    const document = this.documentStore?.document();
    // A loaded document is authoritative even when it declares zero inputs:
    // never fall back to the decorated demo root's fields for a fixture that
    // takes no input.
    if (!document) return null;
    return document.inputs ?? [];
  });

  /**
   * Declared output ports of the loaded canonical document. The right-hand
   * "Run result" panel reads its labels from here so a fixture's outputs
   * (`collected`, …) match the keys the engine returns, instead of the
   * decorated demo root's ports.
   */
  private readonly declaredWorkflowOutputPorts = computed<
    readonly GraphPortDefinition[] | null
  >(() => {
    const outputs = this.documentStore?.document()?.outputs;
    if (!outputs || outputs.length === 0) return null;
    return outputs.map((port) => ({
      property: port.id,
      path: port.id,
      direction: PortDirection.OUTPUT,
      name: port.id,
      label: port.label ?? port.id,
      type: port.schema?.type,
      required: Boolean(port.required),
      hidden: false,
    }));
  });

  /**
   * Builds the run form's editable fields from whichever input source is
   * authoritative: the loaded document's declared ports when present, else the
   * decorated root's compiled ports.
   */
  private workflowInputFieldsFor(
    values?: Record<string, unknown>
  ): WorkflowInputFieldDefinition[] {
    const ports = this.declaredWorkflowInputPorts();
    if (!ports) return buildWorkflowInputFields(this.workflowDefinition(), values);
    const modelFields = buildWorkflowInputFields(this.workflowDefinition(), values);
    const modelFieldsByPath = new Map(modelFields.map((field) => [field.path, field]));
    return buildWorkflowInputFieldsFromPorts(ports, values).map((docField) => {
      const modelField =
        modelFieldsByPath.get(docField.path) ?? modelFieldsByPath.get(docField.property);
      if (!modelField) return docField;
      const validators = [...modelField.validators];
      if (docField.required && !modelField.required) validators.push(Validators.required);
      return {
        ...modelField,
        property: docField.property,
        path: docField.path,
        controlName: docField.controlName,
        label: docField.label || modelField.label,
        placeholder: docField.placeholder ?? modelField.placeholder,
        value: docField.value !== undefined ? docField.value : modelField.value,
        required: docField.required || modelField.required,
        validators,
      };
    });
  }

  /**
   * Builds the reactive form backing the served workflow inputs.
   *
   * @param fields - The workflow input field definitions to bind.
   * @returns A form group keyed by each field's control name.
   */
  private workflowInputFormForFields(fields: WorkflowInputFieldDefinition[]): FormGroup {
    return new FormGroup(
      Object.fromEntries(
        fields.map((field) => [
          field.controlName,
          new FormControl(field.value, {
            validators: field.validators,
            nonNullable: false,
          }),
        ])
      )
    );
  }

  readonly workflowInputFields = computed<WorkflowInputFieldDefinition[]>(
    () => this.workflowInputBinding().fields
  );

  readonly viewModel = computed<GraphRendererViewModel>(() => {
    // R2-1: the frontend knows no node classes; kind-only workflow entries
    // resolve their display from the metadata catalogue manifests. The catalogue
    // load is asynchronous, so while a kind-only entry's manifest has not landed
    // the projection stays empty and re-evaluates once the manifest signal
    // resolves — never throwing from inside the computed, which would abort the
    // page's change detection before the seed effect can run.
    const manifests = this.catalogService?.manifests?.() ?? [];
    if (graphWorkflowUnresolvedNodeKinds(this.workflowRootClass() as never, manifests).length) {
      const workflow = this.workflowDefinition();
      return { workflow, inputs: [], outputs: [], nodes: [], edges: [], workflowOutputs: workflow.outputs };
    }
    const viewModel = buildGraphRendererViewModel(
      this.workflowRootClass() as never,
      this.workflowInputValues(),
      this.duplicateCounts(),
      manifests
    );
    const declaredOutputs = this.declaredWorkflowOutputPorts();
    return declaredOutputs
      ? { ...viewModel, workflowOutputs: declaredOutputs as GraphRendererViewModel['workflowOutputs'] }
      : viewModel;
  });

  readonly rootTitle = computed(() =>
    String(this.workflowDefinition().graph?.metadata?.['title'] ?? this.workflowDefinition().tag)
  );

  readonly canvasFitPadding = computed<[number, number, number, number]>(() => {
    const stacked =
      typeof window !== 'undefined' && window.innerWidth <= SIDE_PANELS_STACK_BREAKPOINT;
    if (stacked) return [24, 24, 24, 24];
    const left = this.inputsPanelCollapsed()
      ? SIDE_PANEL_COLLAPSED_WIDTH
      : this.inputsPanelWidth();
    const right = this.outputsPanelCollapsed()
      ? SIDE_PANEL_COLLAPSED_WIDTH
      : this.outputsPanelWidth();
    const bottom = graphRunLog.open() && !graphRunLog.collapsed() ? 380 : 64;
    return [24, right + 24, bottom + 24, left + 24];
  });

  readonly diagramConfig = computed(() => ({
    zoom: { zoomToFit: { onInit: true, padding: this.canvasFitPadding() } },
  }));

  /**
   * Whether the canvas is showing a run (execution) rather than edit mode.
   * Loop add-node ghosts are editor affordances and must not be projected while
   * run state is on the canvas: they are not really part of the workflow.
   */
  readonly executionActive = computed(
    () =>
      this.runResultState() !== 'idle' ||
      Object.keys(graphExecutionState.nodeStates()).length > 0
  );

  /**
   * Inline offset for the palette popup when a loop ghost opened it, expressed
   * relative to the palette root (its positioned ancestor). Empty when the
   * palette is button-anchored. Placement is clamped/flipped to the viewport by
   * {@link paletteAnchorOffsetOf}.
   */
  readonly palettePopupStyle = computed<{ left?: string; top?: string }>(() => {
    const anchor = this.paletteAnchor();
    return anchor ? { left: `${anchor.x}px`, top: `${anchor.y}px` } : {};
  });

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
      // The authoritative input source (the loaded document's declared ports,
      // else the decorated root) rebuilds the form. Existing values — set by a
      // snapshot restore before the document load — seed the rebuilt controls,
      // so a rebuild never clobbers restored inputs. Reading the values
      // untracked keeps this effect from re-firing on every keystroke (the
      // form's own `valueChanges` publishes them).
      const currentValues = untracked(() => this.workflowInputValues());
      const fields = this.workflowInputFieldsFor(currentValues);
      const form = this.workflowInputFormForFields(fields);
      this.workflowInputBinding.set({ form, fields });
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
      // R2-1 metadata-only: when the workflow nodes carry only kinds (no node
      // classes), the canvas nodes are built from the serializable catalogue
      // manifests. Reading the signal makes the seed rebuild once the catalogue
      // resolves.
      const manifests = this.catalogService?.manifests?.() ?? [];
      // The catalogue load is asynchronous: while a kind-only entry's manifest
      // has not landed, defer the legacy seed and let this effect re-run once the
      // manifest signal resolves rather than throwing from inside the effect.
      if (graphWorkflowUnresolvedNodeKinds(this.workflowRootClass() as never, manifests).length) return;
      const previousModel = untracked(() => this.model());
      runInInjectionContext(this.injector, () => {
        this.model.set(
          buildGraphRendererModel(root, this.injector, inputValues, duplicateCounts, previousModel, manifests)
        );
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

    // R2-3(3): track which for-each loops already hold a real loop body node
    // (an `item` edge toward a node that is not the loop's own ghost), so the
    // loop's add-node ghost can fade out except while the loop is hovered.
    effect(() => {
      const document = this.documentStore?.document();
      const bodyIds = new Set<string>();
      for (const edge of document?.edges ?? []) {
        if (edge.source?.port !== 'item') continue;
        const sourceId = graphNodeEndpointId(edge.source);
        const targetId = graphNodeEndpointId(edge.target);
        if (!sourceId || !targetId) continue;
        if (targetId === `ghost-${sourceId}`) continue;
        bodyIds.add(sourceId);
      }
      ghostNodeStore.setLoopBodyIds(bodyIds);
    });

    // Open palette when a ghost node + is clicked, or when a node-side add
    // connector is clicked (G3-29 n8n-look ruling).
    effect(() => {
      const pendingId = ghostNodeStore.pendingParentId();
      const pendingAdd = ghostNodeStore.pendingAddSource();
      const anchor = ghostNodeStore.pendingAnchor();
      if (pendingId || pendingAdd) {
        this.paletteOpen.set(true);
      }
      this.paletteAnchor.set(this.paletteAnchorOffsetOf(anchor));
    });

    // Re-project once when the canvas enters/leaves run (execution) mode so the
    // editor-only loop ghosts are present in edit mode and absent during a run.
    let lastExecutionActive: boolean | undefined;
    effect(() => {
      const active = this.executionActive();
      if (active === lastExecutionActive) return;
      lastExecutionActive = active;
      untracked(() => {
        this.reconciledVersion = -1;
        this.settleCanvasFromDocument();
      });
    });

    effect(() => {
      this.inputsPanelCollapsed();
      this.outputsPanelCollapsed();
      this.inputsPanelWidth();
      this.outputsPanelWidth();
      graphRunLog.open();
      graphRunLog.collapsed();
      untracked(() => this.scheduleFitToViewport());
    });
  }

  /** Measures the side panels once the canvas view is available. */
  ngAfterViewInit(): void {
    this.measureSidePanels();
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
    // Capture each loop's ordered body before the removal so a deleted mid-loop
    // node can be spliced out and its surviving neighbours reconnected.
    const beforeDocument = this.documentStore?.document();
    const beforeOrders: Map<string, GraphLoopBodyStep[]> = beforeDocument
      ? graphLoopBodyOrdersOf(beforeDocument)
      : new Map();
    const edgeIds = (event?.deletedEdges ?? []).map((edge) => edge.id);
    const nodeIds = (event?.deletedNodes ?? []).map((node) => node.id);
    if (edgeIds.length) this.applyCanvasMutation({ type: 'edges-removed', edgeIds });
    if (nodeIds.length) this.applyCanvasMutation({ type: 'nodes-removed', nodeIds });
    this.repairLoopChains(beforeOrders);
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

  /**
   * Auto-arranges the workflow through the canonical drag-end commit path
   * (DECAF-50 §4.12): the document store computes the layout lazily and
   * commits it as one `node.moves` command — the same path a drag-end uses —
   * and the document-driven reconcile projects the result.
   * @returns {Promise<boolean>} true when at least one node moved.
   */
  async arrangeWorkflow(): Promise<boolean> {
    const documentStore = this.documentStore;
    if (!documentStore) return false;
    const arranged = await documentStore.arrange();
    if (typeof requestAnimationFrame !== 'undefined') {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    }
    await this.fitDiagramToViewport();
    return arranged;
  }

  /** Collapses or expands the workflow inputs side panel. */
  toggleInputsPanel(): void {
    this.inputsPanelCollapsed.update((collapsed) => !collapsed);
  }

  /** Collapses or expands the workflow outputs side panel. */
  toggleOutputsPanel(): void {
    this.outputsPanelCollapsed.update((collapsed) => !collapsed);
  }

  /**
   * Starts dragging a workflow input field onto the canvas.
   *
   * @param field - The input field being dragged.
   * @param event - The originating drag event carrying the data transfer.
   */
  onInputDragStart(field: WorkflowInputFieldDefinition, event: DragEvent): void {
    if (!event.dataTransfer) return;
    event.dataTransfer.effectAllowed = 'copy';
    event.dataTransfer.setData(WORKFLOW_INPUT_DRAG_TYPE, field.path);
    event.dataTransfer.setData('text/plain', field.path);
    this.draggingInputPath.set(field.path);
  }

  /** Clears the drag state when an input drag ends without a drop. */
  onInputDragEnd(): void {
    this.draggingInputPath.set(null);
    this.canvasDropActive.set(false);
  }

  /**
   * Accepts a workflow-input drag over the canvas, showing the drop affordance.
   *
   * @param event - The canvas drag-over event.
   */
  onCanvasDragOver(event: DragEvent): void {
    const types = event.dataTransfer?.types;
    if (!this.draggingInputPath() && !(types && Array.from(types).includes(WORKFLOW_INPUT_DRAG_TYPE))) {
      return;
    }
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
    this.canvasDropActive.set(true);
  }

  /**
   * Clears the drop affordance when the pointer leaves the canvas (ignoring
   * moves onto descendants).
   *
   * @param event - The canvas drag-leave event.
   */
  onCanvasDragLeave(event: DragEvent): void {
    const canvas = this.canvasRoot?.nativeElement;
    const next = event.relatedTarget as Node | null;
    if (canvas && next && canvas.contains(next)) return;
    this.canvasDropActive.set(false);
  }

  /**
   * Drops a dragged workflow input onto the canvas, placing its boundary node at
   * the pointer position.
   *
   * @param event - The canvas drop event carrying the dragged field path.
   */
  onCanvasDrop(event: DragEvent): void {
    event.preventDefault();
    this.canvasDropActive.set(false);
    const path =
      event.dataTransfer?.getData(WORKFLOW_INPUT_DRAG_TYPE) ||
      event.dataTransfer?.getData('text/plain') ||
      this.draggingInputPath();
    this.draggingInputPath.set(null);
    if (!path) return;
    const field = this.workflowInputFields().find(
      (candidate) =>
        candidate.path === path ||
        candidate.property === path ||
        candidate.controlName === path
    );
    if (!field) return;
    this.placeWorkflowInputBoundary(field, this.dropPositionOf(event));
  }

  /**
   * Adds an input boundary node for a field at the default canvas position.
   *
   * @param field - The input field to place on the canvas.
   */
  addInputToCanvas(field: WorkflowInputFieldDefinition): void {
    this.placeWorkflowInputBoundary(field, this.defaultInputPosition());
  }

  /**
   * Places the input boundary node for a field at the supplied flow position.
   *
   * @param field - The workflow input field to materialise.
   * @param position - The flow-space position for the boundary node.
   */
  private placeWorkflowInputBoundary(
    field: WorkflowInputFieldDefinition,
    position: { x: number; y: number }
  ): void {
    const documentStore = this.documentStore;
    const document = documentStore?.document();
    if (!documentStore || !document) return;
    const port = document.inputs.find(
      (input) => input.id === field.path || input.id === field.property
    );
    if (!port) return;
    documentStore.dispatchCommand({
      type: 'boundary.moves',
      moves: [{ nodeId: `input-${port.id}`, position }],
    });
    this.nodeDragEnded.emit();
  }

  /**
   * Converts a drop event's client coordinates into flow-space coordinates,
   * falling back to canvas-relative offsets when the viewport API is unavailable.
   *
   * @param event - The drop event.
   * @returns The flow-space drop position.
   */
  private dropPositionOf(event: DragEvent): { x: number; y: number } {
    const point = this.clientToFlowPosition(event.clientX, event.clientY);
    if (point) return point;
    const rect = this.canvasRoot?.nativeElement.getBoundingClientRect();
    return {
      x: Math.max(0, event.clientX - (rect?.left ?? 0)),
      y: Math.max(0, event.clientY - (rect?.top ?? 0)),
    };
  }

  /**
   * Default flow-space position for a newly added input boundary node.
   *
   * @returns The default position inside the padded viewport.
   */
  private defaultInputPosition(): { x: number; y: number } {
    const rect = this.canvasRoot?.nativeElement.getBoundingClientRect();
    const padding = this.canvasFitPadding();
    const point = rect
      ? this.clientToFlowPosition(rect.left + padding[3] + 80, rect.top + 160)
      : null;
    return point ?? { x: 120, y: 160 };
  }

  /**
   * Converts client coordinates into flow-space coordinates.
   *
   * @param clientX - The viewport x coordinate.
   * @param clientY - The viewport y coordinate.
   * @returns The flow-space point, or `null` before the diagram is initialised.
   */
  private clientToFlowPosition(
    clientX: number,
    clientY: number
  ): { x: number; y: number } | null {
    if (!this.viewportService || !this.diagramService?.isInitialized()) return null;
    try {
      const point = this.viewportService.clientToFlowPosition({ x: clientX, y: clientY });
      return { x: point.x, y: point.y };
    } catch {
      return null;
    }
  }

  /** Records the rendered width of each expanded side panel. */
  private measureSidePanels(): void {
    if (!this.inputsPanelCollapsed()) {
      const inputsWidth = this.inputsPanel?.nativeElement.getBoundingClientRect().width;
      if (inputsWidth && Math.abs(inputsWidth - this.inputsPanelWidth()) > 1) {
        this.inputsPanelWidth.set(inputsWidth);
      }
    }
    if (!this.outputsPanelCollapsed()) {
      const outputsWidth = this.outputsPanel?.nativeElement.getBoundingClientRect().width;
      if (outputsWidth && Math.abs(outputsWidth - this.outputsPanelWidth()) > 1) {
        this.outputsPanelWidth.set(outputsWidth);
      }
    }
  }

  /**
   * Debounces a fit-to-viewport pass after a layout change (panel toggles,
   * console open/close) so the canvas is measured before it is framed.
   */
  private scheduleFitToViewport(): void {
    if (typeof setTimeout === 'undefined') return;
    if (this.fitTimer) clearTimeout(this.fitTimer);
    this.fitTimer = setTimeout(() => {
      this.fitTimer = undefined;
      this.measureSidePanels();
      void this.fitDiagramToViewport();
    }, 300);
  }

  /** Frames the whole workflow inside the canvas, honouring the fit padding. */
  private async fitDiagramToViewport(): Promise<void> {
    if (!this.viewportService || !this.diagramService?.isInitialized()) return;
    try {
      await this.viewportService.zoomToFit({ padding: this.canvasFitPadding() });
    } catch {
      // A detached or not-yet-measured canvas rejects the fit; the next
      // layout change retries.
    }
  }

  /**
   * Converts a viewport-space pointer anchor into an offset relative to the
   * palette root (the popup's positioned ancestor), clamping and flipping the
   * 280x420 popup so it stays inside the viewport.
   */
  private paletteAnchorOffsetOf(
    anchor: { x: number; y: number } | null
  ): { x: number; y: number } | null {
    if (!anchor || typeof window === 'undefined') return null;
    const root = this.paletteRoot?.nativeElement;
    if (!root) return null;
    const rect = root.getBoundingClientRect();
    const width = 280;
    const height = 420;
    const margin = 12;
    const maxLeft = Math.max(margin, window.innerWidth - width - margin);
    const left = Math.min(Math.max(margin, anchor.x), maxLeft);
    const below = anchor.y + 8;
    const top =
      below + height > window.innerHeight - margin
        ? Math.max(margin, anchor.y - height - 8)
        : below;
    return { x: left - rect.left, y: top - rect.top };
  }

  togglePalette() {
    if (this.paletteOpen()) {
      this.closePalette();
      return;
    }
    this.paletteAnchor.set(null);
    this.paletteOpen.set(true);
  }

  closePalette() {
    ghostNodeStore.clear();
    this.paletteAnchor.set(null);
    this.paletteQuery.set('');
    this.paletteOpen.set(false);
  }

  /**
   * R2-3(5) (round-2): clicking outside the add-node popup closes it. The
   * pointerdown on the palette root (button + popup) is inside and never closes;
   * a pointerdown anywhere else in the document closes the open palette and clears
   * any pending add-node request so the next open starts clean.
   */
  @HostListener('document:pointerdown', ['$event'])
  onDocumentPointerDown(event: Event): void {
    if (!this.paletteOpen()) return;
    const root = this.paletteRoot?.nativeElement;
    const target = event.target as Node | null;
    if (root && target && root.contains(target)) return;
    this.closePalette();
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
    const label = entry.title;

    if (ghostParentId) {
      const ghostNode = this.model()
        ?.getNodes()
        .find((n: { id: string }) => n.id === `ghost-${ghostParentId}`);
      position = (ghostNode as { position?: { x: number; y: number } })?.position ?? position;
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
    const inputPort = (entry.manifest.inputs ?? [])[0]?.id ?? 'value';
    const outputPort = (entry.manifest.outputs ?? [])[0]?.id ?? 'result';

    if (ghostParentId) {
      // A loop ghost only exists for an empty loop: the added node becomes the
      // first body node and the ghost is not persisted anywhere. The canonical
      // chain is `for-each:item → added → for-each:loop`.
      this.appendNodeToLoop(documentStore, ghostParentId, node.id, inputPort, outputPort);
    } else if (addSource) {
      const loopId = this.loopContainingNode(addSource.nodeId);
      if (loopId) {
        // A node-side add from inside a loop body splices the new node after
        // its source instead of creating a parallel edge, so the loop chain
        // stays a single ordered path.
        this.insertNodeAfter(
          documentStore,
          loopId,
          addSource.nodeId,
          node.id,
          inputPort,
          outputPort
        );
      } else if (this.isForeachLoop(addSource.nodeId) && addSource.portId === 'item') {
        this.prependNodeToLoop(documentStore, addSource.nodeId, node.id, inputPort, outputPort);
      } else {
        documentStore.addEdge({
          id: `${addSource.nodeId}:${addSource.portId}->${node.id}:${inputPort}`,
          type: 'data',
          source: { scope: 'node', nodeId: addSource.nodeId, port: addSource.portId },
          target: { scope: 'node', nodeId: node.id, port: inputPort },
          label: inputPort,
        });
      }
    }
    this.paletteQuery.set('');
    this.paletteOpen.set(false);
  }

  /**
   * Whether the node is a foreach loop in the current document.
   *
   * @param nodeId - The node id to classify.
   * @returns `true` when the node is a canonical foreach loop.
   */
  private isForeachLoop(nodeId: string): boolean {
    const document = this.documentStore?.document();
    return !!document && graphForeachLoopIdsOf(document).includes(nodeId);
  }

  /**
   * Finds the foreach loop whose body currently contains a node.
   *
   * @param nodeId - The candidate body node id.
   * @returns The owning loop id, or `undefined` when the node is not in a loop body.
   */
  private loopContainingNode(nodeId: string): string | undefined {
    const document = this.documentStore?.document();
    if (!document) return undefined;
    for (const loopId of graphForeachLoopIdsOf(document)) {
      if (graphLoopBodyOrderOf(document, loopId).some((step) => step.nodeId === nodeId)) {
        return loopId;
      }
    }
    return undefined;
  }

  /**
   * Appends a node to the end of a loop's ordered body chain.
   *
   * @param documentStore - The store owning the workflow document.
   * @param loopId - The foreach loop to extend.
   * @param nodeId - The node entering the loop body.
   * @param inputPort - The body node's input port bound by the chain edge.
   * @param outputPort - The body node's output port bound by the chain edge.
   */
  private appendNodeToLoop(
    documentStore: GraphWorkflowDocumentStore,
    loopId: string,
    nodeId: string,
    inputPort: string,
    outputPort: string
  ): void {
    const document = documentStore.document();
    if (!document) return;
    const steps = [
      ...graphLoopBodyOrderOf(document, loopId),
      { nodeId, inputPort, outputPort },
    ];
    this.applyLoopBodyOrder(documentStore, loopId, steps);
  }

  /**
   * Prepends a node to the front of a loop's ordered body chain.
   *
   * @param documentStore - The store owning the workflow document.
   * @param loopId - The foreach loop to extend.
   * @param nodeId - The node entering the loop body.
   * @param inputPort - The body node's input port bound by the chain edge.
   * @param outputPort - The body node's output port bound by the chain edge.
   */
  private prependNodeToLoop(
    documentStore: GraphWorkflowDocumentStore,
    loopId: string,
    nodeId: string,
    inputPort: string,
    outputPort: string
  ): void {
    const document = documentStore.document();
    if (!document) return;
    const steps = [
      { nodeId, inputPort, outputPort },
      ...graphLoopBodyOrderOf(document, loopId),
    ];
    this.applyLoopBodyOrder(documentStore, loopId, steps);
  }

  /**
   * Inserts a node into a loop's body chain directly after another body node.
   *
   * @param documentStore - The store owning the workflow document.
   * @param loopId - The foreach loop to extend.
   * @param afterNodeId - The body node the new node follows.
   * @param nodeId - The node entering the loop body.
   * @param inputPort - The body node's input port bound by the chain edge.
   * @param outputPort - The body node's output port bound by the chain edge.
   */
  private insertNodeAfter(
    documentStore: GraphWorkflowDocumentStore,
    loopId: string,
    afterNodeId: string,
    nodeId: string,
    inputPort: string,
    outputPort: string
  ): void {
    const document = documentStore.document();
    if (!document) return;
    const steps = [...graphLoopBodyOrderOf(document, loopId)];
    const index = steps.findIndex((step) => step.nodeId === afterNodeId);
    const step = { nodeId, inputPort, outputPort };
    if (index >= 0) steps.splice(index + 1, 0, step);
    else steps.push(step);
    this.applyLoopBodyOrder(documentStore, loopId, steps);
  }

  /**
   * Makes a loop's canvas chain match the supplied body order.
   *
   * @param documentStore - The store owning the workflow document.
   * @param loopId - The foreach loop to rewrite.
   * @param steps - The desired ordered body steps.
   */
  private applyLoopBodyOrder(
    documentStore: GraphWorkflowDocumentStore,
    loopId: string,
    steps: GraphLoopBodyStep[]
  ): void {
    const document = documentStore.document();
    if (!document) return;
    for (const command of graphLoopChainCommandsFor(document, new Map([[loopId, steps]]))) {
      documentStore.dispatchCommand(command);
    }
  }

  /**
   * Regenerates every loop's ordered chain from the body order captured before
   * the removal, so deleting a mid-loop node reconnects its surviving
   * neighbours (a loop can never be left broken). A no-op pass dispatches
   * nothing and cannot churn the document.
   */
  private repairLoopChains(beforeOrders: Map<string, GraphLoopBodyStep[]>): void {
    const documentStore = this.documentStore;
    const document = documentStore?.document();
    if (!documentStore || !document) return;
    const surviving = new Set(document.nodes.map((node) => node.id));
    const orders = new Map<string, GraphLoopBodyStep[]>();
    for (const [loopId, steps] of beforeOrders) {
      if (!surviving.has(loopId)) continue;
      orders.set(
        loopId,
        steps.filter((step) => surviving.has(step.nodeId))
      );
    }
    for (const loopId of graphForeachLoopIdsOf(document)) {
      if (!orders.has(loopId)) {
        orders.set(loopId, graphLoopBodyOrderOf(document, loopId));
      }
    }
    for (const command of graphLoopChainCommandsFor(document, orders)) {
      documentStore.dispatchCommand(command);
    }
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

  buildSnapshot(): GraphWorkflowSnapshot | null {
    const diagram = this.model();
    if (!diagram) return null;
    return buildGraphRendererSnapshot(
      this.workflowRootClass() as never,
      diagram,
      this.workflowInputValues(),
      this.duplicateCounts(),
      {},
      this.availableNodes()
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
      documentStore.initialize(seedSnapshot.document);
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
      { ...(restoredOptions ?? {}), includeLoopGhosts: !untracked(() => this.executionActive()) }
    );
    this.restoreOptions = null;
    this.reconciledVersion = version;
    this.model.set(diagram as never);
    // A restored document without a persisted viewport (server fixtures, fresh
    // imports) uses its authored coordinates; frame them so the workflow is
    // visible instead of living below the initial pan offset. The diagram may
    // still be initializing when the document lands, so retry until measured.
    if (restoredOptions?.restore && !restoredOptions.applyViewport) {
      void this.fitRestoredDiagramWhenReady();
    }
  }

  /** Fits a restored document once ng-diagram has measured and initialized. */
  private async fitRestoredDiagramWhenReady(attempts = 20): Promise<void> {
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      if (this.viewportService && this.diagramService?.isInitialized()) {
        if (typeof requestAnimationFrame !== 'undefined') {
          await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
        }
        await this.fitDiagramToViewport();
        return;
      }
      await new Promise<void>((resolve) => setTimeout(resolve, 150));
    }
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
   * Restores an undo/redo history entry (canonical snapshot; §4.11): every
   * entry is the document-first wrapper (`{ document, editor?, metadata? }`,
   * §4.26 R2-2), so it restores through the same document path as a load.
   */
  restoreFromSnapshot(snapshot: GraphWorkflowSnapshot): void {
    this.restoreFromDocument(snapshot);
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

    const snapshot = parseGraphRendererSnapshot(raw);
    const inputValues = snapshot.metadata?.['inputValues'];
    if (inputValues && typeof inputValues === 'object') {
      this.workflowInputValues.set({ ...(inputValues as Record<string, unknown>) });
    }
    this.restoreFromDocument(snapshot);
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
