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
import type { GraphWorkflowSnapshot } from '@decaf-ts/ui-decorators/graph';
import { graphDefinitionOf, graphWorkflowDefinitionOf } from '@decaf-ts/ui-decorators/graph';
import { IonSpinner } from '@ionic/angular/standalone';
import {
  NgDiagramBackgroundComponent,
  NgDiagramComponent,
  NgDiagramMinimapComponent,
  NgDiagramNodeTemplateMap,
  NgDiagramEdgeTemplateMap,
  provideNgDiagram,
  createMiddlewares,
  type Middleware,
} from 'ng-diagram';
import { graphSelection } from '../../execution/GraphSelectionStore';
import { ghostNodeStore } from '../../execution/GhostNodeStore';
import { GraphRendererViewModel } from '../../types';
import {
  buildGraphRendererModel,
  buildGraphRendererSnapshot,
  buildGraphRendererStateFromSnapshot,
  buildGraphRendererViewModel,
  buildMemberNode,
  parseGraphRendererSnapshot,
  stringifyGraphRendererSnapshot,
} from '../../utils';
import {
  buildWorkflowInputFields,
  buildWorkflowInputForm,
  buildWorkflowInputModelClass,
  normalizeWorkflowInputValues,
  WorkflowInputFieldDefinition,
} from '../../workflow-inputs';
import { GraphBoundaryNodeTemplateComponent } from '../boundary-node-template/boundary-node-template.component';
import { GraphEdgeTemplateComponent } from '../graph-edge-template/graph-edge-template.component';
import { GraphGhostNodeTemplateComponent } from '../graph-ghost-node-template/graph-ghost-node-template.component';
import { GraphLogsWidgetComponent } from '../graph-logs-widget/graph-logs-widget.component';
import { GraphNodeInspectionComponent } from '../graph-node-inspection/graph-node-inspection.component';
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
    GraphEdgeTemplateComponent,
    GraphLogsWidgetComponent,
    GraphNodeInspectionComponent,
  ],
  providers: [provideNgDiagram()],
  templateUrl: './graph-renderer.component.html',
  styleUrl: './graph-renderer.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class GraphRendererComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly injector = inject(Injector);
  private readonly duplicateCounts = signal<Record<string, number>>({});
  private readonly workflowInputValues = signal<Record<string, unknown>>({});
  private readonly snapshotJson = signal('');
  readonly workflowInputForm = signal<FormGroup>(this.formBuilder.group({}));
  readonly model = signal<ReturnType<typeof buildGraphRendererModel> | null>(null);
  private skipNextModelSync = false;

  readonly graphRoot = input.required<unknown>();
  readonly outputs = input<Record<string, unknown> | null>(null);
  readonly availableNodes = input<unknown[]>([]);

  readonly nodeDragEnded = output<void>();
  readonly edgeDrawn = output<void>();
  readonly elementsRemoved = output<void>();

  readonly portGuardMiddleware: Middleware = {
    name: 'port-guard',
    execute: async (context, next, _cancel) => {
      const actions = context.modelActionTypes;
      if (actions.includes('deletePortsBulk') && !actions.includes('deleteNodes')) {
        const update = context.initialUpdate;
        const cleaned = {
          ...update,
          nodesToUpdate: update.nodesToUpdate?.filter(
            (n) => !('measuredPorts' in n && Object.keys(n).length <= 2)
          ),
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
      if (diagram && update.edgesToRemove?.length && (actions.includes('deleteEdges') || actions.includes('deleteElements') || actions.includes('deleteSelection'))) {
        const allowedEdges = update.edgesToRemove.filter((edgeId: string) => {
          const edge = diagram.getEdges().find((e) => (e as { id: string }).id === edgeId) as { data?: { mandatory?: boolean } } | undefined;
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
      if (update.nodesToRemove?.length && (actions.includes('deleteNodes') || actions.includes('deleteElements') || actions.includes('deleteSelection'))) {
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
  readonly edgeTemplateMap = new NgDiagramEdgeTemplateMap([
    ['graph-edge', GraphEdgeTemplateComponent],
  ]);

  readonly workflowRootClass = computed(() => this.resolveGraphRoot(this.graphRoot()));

  readonly workflowDefinition = computed(() => graphWorkflowDefinitionOf(this.workflowRootClass() as never));

  readonly workflowInputFields = computed<WorkflowInputFieldDefinition[]>(() =>
    buildWorkflowInputFields(this.workflowDefinition(), this.workflowInputValues())
  );

  readonly workflowInputModelClass = computed(() => buildWorkflowInputModelClass(this.workflowDefinition()));

  readonly workflowInputModel = computed(() =>
    (() => {
      const ModelClass = this.workflowInputModelClass();
      const instance = new ModelClass(this.workflowInputValues() as never);
      Object.assign(instance, this.workflowInputValues());
      return instance;
    })()
  );

  readonly workflowInputErrors = computed(() => {
    const model = this.workflowInputModel() as Model & { hasErrors?: () => unknown };
    return typeof model.hasErrors === 'function' ? model.hasErrors() : undefined;
  });

  readonly viewModel = computed<GraphRendererViewModel>(() =>
    buildGraphRendererViewModel(this.workflowRootClass() as never, this.workflowInputValues(), this.duplicateCounts())
  );

  readonly rootTitle = computed(() =>
    String(this.workflowDefinition().graph?.metadata?.['title'] ?? this.workflowDefinition().tag)
  );

  readonly hasFormErrors = computed(() => this.workflowInputForm().invalid);
  readonly snapshotPreview = computed(() => this.snapshotJson());

  readonly paletteOpen = signal(false);
  readonly paletteEntries = computed(() => {
    const nodes = this.availableNodes();
    return nodes.map((ctor) => {
      const definition = graphDefinitionOf(ctor as never);
      const metadata = (definition.graph?.metadata || {}) as Record<string, unknown>;
      return {
        ctor,
        name: definition.name,
        kind: definition.kind,
        title: String(metadata['title'] ?? definition.name),
        description: String(metadata['description'] ?? ''),
        category: definition.category,
        color: definition.color,
        icon: definition.icon,
      };
    });
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
      const root = this.workflowRootClass() as never;
      const inputValues = this.workflowInputValues();
      const duplicateCounts = this.duplicateCounts();
      const previousModel = untracked(() => this.model());
      runInInjectionContext(this.injector, () => {
        this.model.set(buildGraphRendererModel(root, this.injector, inputValues, duplicateCounts, previousModel));
      });
    });

    // Open palette when a ghost node + is clicked
    effect(() => {
      const pendingId = ghostNodeStore.pendingParentId();
      if (pendingId) {
        this.paletteOpen.set(true);
      }
    });
  }

  duplicateInput(property: string) {
    this.duplicateCounts.update((current) => ({
      ...current,
      [property]: (current[property] || 0) + 1,
    }));
  }

  onSelectionChanged(event: { selectedNodes?: { id: string }[] }) {
    graphSelection.setSelected((event.selectedNodes ?? []).map((n) => n.id));
  }

  onNodeDragEnded(): void {
    this.nodeDragEnded.emit();
  }

  onEdgeDrawn(): void {
    this.edgeDrawn.emit();
  }

  onElementsRemoved(): void {
    this.elementsRemoved.emit();
  }

  togglePalette() {
    this.paletteOpen.set(!this.paletteOpen());
  }

  closePalette() {
    this.paletteOpen.set(false);
  }

  addNode(ctor: unknown) {
    const diagram = this.model();
    if (!diagram) return;

    const existing = diagram.getNodes();
    const count = existing.length;
    const blueprint = buildMemberNode(ctor, count);
    const uniqueId = `${blueprint.data.sourceClass}-${Date.now()}`;
    const offset = count * 40;

    // If a ghost parent is set, replace the ghost with the selected node
    const ghostParentId = ghostNodeStore.consume();
    if (ghostParentId) {
      const ghostId = `ghost-${ghostParentId}`;
      const ghostNode = existing.find((n: { id: string }) => n.id === ghostId);
      const ghostPos = (ghostNode as { position?: { x: number; y: number } })?.position ?? { x: 420 + offset, y: 200 + offset };

      const newNode = {
        ...blueprint,
        id: uniqueId,
        position: ghostPos,
      } as never;

      const inputPort = blueprint.data.ports.find((p: { direction: string; property: string }) => p.direction === 'input');
      const outputPort = blueprint.data.ports.find((p: { direction: string; property: string }) => p.direction === 'output');

      // Remove ghost node + edges, add real node + new edges
      diagram.updateNodes((nodes) =>
        nodes.filter((n: { id: string }) => n.id !== ghostId).concat([newNode]) as never
      );
      diagram.updateEdges((edges) =>
        edges
          .filter((e: { id: string }) => e.id !== `edge-ghost-in-${ghostParentId}` && e.id !== `edge-ghost-out-${ghostParentId}`)
          .concat([
            { id: `edge-loop-in-${ghostParentId}-${uniqueId}`, source: ghostParentId, sourcePort: 'item', target: uniqueId, targetPort: inputPort?.property || 'value', data: { label: 'item', mandatory: true } } as never,
            { id: `edge-loop-out-${ghostParentId}-${uniqueId}`, source: uniqueId, sourcePort: outputPort?.property || 'result', target: ghostParentId, targetPort: 'loop', data: { label: 'loop', mandatory: true } } as never,
          ]) as never
      );

      this.paletteOpen.set(false);
      return;
    }

    const newNode = {
      ...blueprint,
      id: uniqueId,
      position: {
        x: 420 + offset,
        y: 200 + offset,
      },
    } as never;

    diagram.updateNodes((nodes) => [...nodes, newNode] as never);
    this.paletteOpen.set(false);

    // If this is a foreach node, auto-create the mandatory ghost node + edges
    if (blueprint.data.kind === 'core.loop.foreach') {
      this.createForeachGhost(diagram, uniqueId);
    }
  }

  /**
   * Creates the mandatory ghost/placeholder node between the foreach's `item`
   * output port and its `loop` connection port. The ghost has a + icon that
   * opens the palette when clicked. The item→ghost→loop edges are
   * non-deletable.
   */
  private createForeachGhost(diagram: ReturnType<typeof buildGraphRendererModel>, foreachId: string) {
    const foreachNode = diagram.getNodes().find((n: { id: string }) => n.id === foreachId);
    if (!foreachNode) return;
    const pos = (foreachNode as { position?: { x: number; y: number } }).position ?? { x: 0, y: 0 };
    const size = (foreachNode as { size?: { width: number; height: number } }).size ?? { width: 120, height: 140 };

    const ghostId = `ghost-${foreachId}`;
    const ghostNode = {
      id: ghostId,
      type: 'graph.ghost',
      position: {
        x: pos.x + size.width + 80,
        y: pos.y + size.height / 2 - 28,
      },
      size: { width: 56, height: 56 },
      resizable: false,
      draggable: true,
      autoSize: false,
      data: {
        title: 'Add node',
        description: 'Click + to add a node to the loop body',
        kind: 'graph.ghost',
        labels: [],
        ports: [],
        sourceClass: 'GraphGhostNode',
        ghostParentId: foreachId,
        isGhost: true,
      },
    } as never;

    const edge1 = {
      id: `edge-ghost-in-${foreachId}`,
      source: foreachId,
      sourcePort: 'item',
      target: ghostId,
      targetPort: 'in',
      data: { label: 'item', mandatory: true },
    } as never;

    const edge2 = {
      id: `edge-ghost-out-${foreachId}`,
      source: ghostId,
      sourcePort: 'out',
      target: foreachId,
      targetPort: 'loop',
      data: { label: 'loop', mandatory: true },
    } as never;

    diagram.updateNodes((nodes) => [...nodes, ghostNode] as never);
    diagram.updateEdges((edges) => [...edges, edge1, edge2] as never);
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
      this.duplicateCounts()
    );
  }

  restoreFromSnapshot(snapshot: GraphWorkflowSnapshot): void {
    const restored = buildGraphRendererStateFromSnapshot(this.workflowRootClass() as never, snapshot, this.injector);
    this.skipNextModelSync = true;
    this.workflowInputValues.set(restored.inputValues);
    this.duplicateCounts.set(restored.duplicateCounts);
    this.model.set(restored.diagram as never);
  }

  loadSnapshot() {
    const raw = this.snapshotJson().trim();
    if (!raw) return;

    const snapshot = parseGraphRendererSnapshot(raw, this.workflowRootClass() as never) as GraphWorkflowSnapshot;
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
