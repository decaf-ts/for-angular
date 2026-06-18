import { Component, Injector, computed, effect, inject, input, runInInjectionContext, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, type AbstractControl, type FormGroup } from '@angular/forms';
import { Constructor } from '@decaf-ts/decoration';
import { Model, ModelBuilder } from '@decaf-ts/decorator-validation';
import {
  NgDiagramBackgroundComponent,
  NgDiagramComponent,
  NgDiagramMinimapComponent,
  NgDiagramNodeTemplateMap,
  provideNgDiagram,
} from 'ng-diagram';
import { ContainerComponent } from 'src/app/components/container/container.component';
import { GraphBoundaryNodeTemplateComponent } from './boundary-node-template.component';
import { buildGraphRendererModel, buildGraphRendererViewModel } from './adapter';
import { GraphNodeTemplateComponent } from './graph-node-template.component';
import {
  buildWorkflowInputFields,
  buildWorkflowInputForm,
  buildWorkflowInputModelClass,
  type WorkflowInputFieldDefinition,
} from './workflow-inputs';
import type { GraphRendererViewModel } from './types';
import { graphWorkflowDefinitionOf } from '@decaf-ts/ui-decorators/graph';

@Component({
  selector: 'app-graph-renderer',
  standalone: true,
  imports: [
    ContainerComponent,
    ReactiveFormsModule,
    NgDiagramComponent,
    NgDiagramBackgroundComponent,
    NgDiagramMinimapComponent,
  ],
  providers: [provideNgDiagram()],
  templateUrl: './graph-renderer.component.html',
  styleUrl: './graph-renderer.component.scss',
})
export class GraphRendererComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly injector = inject(Injector);
  private readonly duplicateCounts = signal<Record<string, number>>({});
  private readonly workflowInputValues = signal<Record<string, unknown>>({});
  readonly workflowInputForm = signal<FormGroup>(this.formBuilder.group({}));
  readonly model = signal<ReturnType<typeof buildGraphRendererModel> | null>(null);

  readonly graphRoot = input.required<unknown>();

  readonly nodeTemplateMap = new NgDiagramNodeTemplateMap([
    ['workflow', GraphNodeTemplateComponent],
    ['pipeline', GraphNodeTemplateComponent],
    ['node', GraphNodeTemplateComponent],
    ['value', GraphBoundaryNodeTemplateComponent],
  ]);

  readonly workflowRootClass = computed(() => this.resolveGraphRoot(this.graphRoot()));

  readonly workflowDefinition = computed(() => graphWorkflowDefinitionOf(this.workflowRootClass() as never));

  readonly workflowInputFields = computed<WorkflowInputFieldDefinition[]>(() =>
    buildWorkflowInputFields(this.workflowDefinition(), this.workflowInputValues())
  );

  readonly workflowInputModelClass = computed(() =>
    buildWorkflowInputModelClass(this.workflowDefinition())
  );

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
    buildGraphRendererViewModel(
      this.workflowRootClass() as never,
      this.workflowInputValues(),
      this.duplicateCounts()
    )
  );

  readonly rootTitle = computed(() =>
    String(this.workflowDefinition().graph?.metadata?.['title'] ?? this.workflowDefinition().tag)
  );

  readonly hasFormErrors = computed(() => this.workflowInputForm().invalid);

  constructor() {
    effect((onCleanup) => {
      const workflow = this.workflowDefinition();
      const form = buildWorkflowInputForm(workflow);
      this.workflowInputForm.set(form);
      this.workflowInputValues.set(form.getRawValue() as Record<string, unknown>);

      const subscription = form.valueChanges.subscribe((value) => {
        this.workflowInputValues.set((value ?? {}) as Record<string, unknown>);
      });

      onCleanup(() => subscription.unsubscribe());
    });

    effect(() => {
      const root = this.workflowRootClass() as never;
      const inputValues = this.workflowInputValues();
      const duplicateCounts = this.duplicateCounts();
      runInInjectionContext(this.injector, () => {
        this.model.set(
          buildGraphRendererModel(root, this.injector, inputValues, duplicateCounts)
        );
      });
    });
  }

  duplicateInput(property: string) {
    this.duplicateCounts.update((current) => ({
      ...current,
      [property]: (current[property] || 0) + 1,
    }));
  }

  controlFor(property: string): AbstractControl | null {
    return this.workflowInputForm().get(property);
  }

  fieldErrors(field: WorkflowInputFieldDefinition): string[] {
    const control = this.controlFor(field.property);
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
    return this.workflowInputFields().find((field) => field.property === property)?.label || property;
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

  workflowOutputValue() {
    return 'pending run result';
  }

  private resolveGraphRoot(root: unknown): Constructor<Model> {
    if (typeof root === 'function') {
      return root as Constructor<Model>;
    }

    if (root instanceof Model) {
      return root.constructor as Constructor<Model>;
    }

    return ModelBuilder.builder<Model & Record<string, unknown>>()
      .setName('GeneratedGraphRoot')
      .build();
  }
}
