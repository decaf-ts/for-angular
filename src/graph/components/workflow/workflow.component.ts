import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  Injector,
  input,
  runInInjectionContext,
  signal,
  untracked,
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
  provideNgDiagram,
} from 'ng-diagram';
import { graphSelection } from '../../execution/GraphSelectionStore';
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
import { GraphHeaderbarComponent } from '../graph-headerbar/graph-headerbar.component';
import { GraphNodeTemplateComponent } from '../graph-node-template/graph-node-template.component';

@Component({
  selector: 'ngx-decaf-graph-workflow',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    NgDiagramComponent,
    NgDiagramBackgroundComponent,
    NgDiagramMinimapComponent,
    IonSpinner,
    GraphHeaderbarComponent,
  ],
  providers: [provideNgDiagram()],
  templateUrl: './workflow.component.html',
  styleUrl: './workflow.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GraphWorkflowComponent {
  /**
   * The root of the workflow graph, which can be a class constructor
   */
  graph = input.required<unknown>();

  title = input<string>();

  readonly graphTitle = computed(
    () => this.title() ?? String(this.workflowDefinition().graph?.metadata?.['title'] ?? this.workflowDefinition().tag)
  );

  private readonly formBuilder = inject(FormBuilder);
  private readonly injector = inject(Injector);
  private readonly duplicateCounts = signal<Record<string, number>>({});
  private readonly workflowInputValues = signal<Record<string, unknown>>({});
  private readonly snapshotJson = signal('');
  readonly workflowInputForm = signal<FormGroup>(this.formBuilder.group({}));
  readonly model = signal<ReturnType<typeof buildGraphRendererModel> | null>(null);
  readonly sidebarCollapsed = signal(true);
  readonly sidebarWidth = computed(() => (this.sidebarCollapsed() ? '42px' : '240px'));
  private skipNextModelSync = false;

  readonly outputs = input<Record<string, unknown> | null>(null);
  readonly availableNodes = input<unknown[]>([]);

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
    // Agent node (DECAF-32 §21.3)
    ['core.agent', GraphNodeTemplateComponent],
    ['value', GraphBoundaryNodeTemplateComponent],
  ]);

  readonly workflowRootClass = computed(() => this.resolveGraphRoot(this.graph()));

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

  ariaDescribedBy(field: WorkflowInputFieldDefinition): string {
    const meta = `graph-renderer-meta-${field.controlName}`;
    const errors = this.fieldErrors(field).length ? ` graph-renderer-errors-${field.controlName}` : '';
    return `${meta}${errors}`.trim();
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
    const diagram = this.model();
    if (!diagram) return;

    const snapshot = buildGraphRendererSnapshot(
      this.workflowRootClass() as never,
      diagram,
      this.workflowInputValues(),
      this.duplicateCounts()
    );
    this.snapshotJson.set(stringifyGraphRendererSnapshot(snapshot));
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
