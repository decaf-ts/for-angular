/**
 * @module module:lib/components/model-builder/model-builder.component
 * @description Model-builder widget module (root entry point surface).
 * @summary Exposes `ModelBuilderComponent`, which authors a decaf model at
 * runtime (name, properties, validators, UI element and layout decorators) and,
 * in structured-output mode, derives the structured-output form fields from the
 * authored `properties()` definition and emits the S1 structured-output
 * definition the backend resolves through its decaf-model registry.
 *
 * @link {@link ModelBuilderComponent}
 */

import { Component, computed, EventEmitter, Input, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { OperationKeys } from '@decaf-ts/db-decorators';
import { Model, ModelBuilder } from '@decaf-ts/decorator-validation';
import {
  hideOn,
  uielement,
  uilayout,
  uilayoutprop,
  uilistmodel,
  uimodel,
  uiorder
} from '@decaf-ts/ui-decorators';
import {
  IonAccordion,
  IonAccordionGroup,
  IonButton,
  IonCheckbox,
  IonInput,
  IonItem,
  IonLabel,
  IonSelect,
  IonTextarea,
} from '@ionic/angular/standalone';
import { IconComponent } from '../icon/icon.component';
import { ModelRendererComponent } from '../model-renderer/model-renderer.component';
import { modelBuilderStructuredDefinitionOf } from '../../utils/structured-output';

type PropType = 'string' | 'number' | 'date' | 'boolean';

type ComponentTag =
  | 'ngx-decaf-crud-field'
  | 'ngx-decaf-file-upload'
  | 'ngx-decaf-searchbar'
  | 'ngx-decaf-table'
  | 'ngx-decaf-list'
  | 'ngx-decaf-fieldset'
  | 'app-select-field'
  | 'input'
  | 'textarea'
  | 'custom';

type LayoutCol = 1 | 2 | 'half' | 'full';
type OrderValue = 'first' | 'last' | '';
type HideOnOp = 'create' | 'read' | 'update' | 'delete';

// Undocumented single-value aliases: their union is exposed through
// `moveProperty` and keeps the generated `@param` tag JSDoc-parseable.
type MoveUp = -1;
type MoveDown = 1;

/**
 * Property reorder step accepted by {@link ModelBuilderComponent.moveProperty}:
 * one position up (`-1`) or down (`1`).
 * @typedef {MoveUp | MoveDown} PropertyMoveDirection
 */
type PropertyMoveDirection = MoveUp | MoveDown;

interface ValidatorConfig {
  required: boolean;
  min: number | null;
  max: number | null;
  minlength: number | null;
  maxlength: number | null;
  pattern: string;
  email: boolean;
  url: boolean;
}

interface UIElementConfig {
  tag: string;
  customTag: string;
  label: string;
  placeholder: string;
  type: string;
  readonly: boolean;
  translatable: boolean;
  options: string;
}

interface UILayoutConfig {
  col: LayoutCol;
  row: number;
  order: OrderValue;
  orderNum: number | null;
  hideOn: HideOnOp[];
}

interface PropertyConfig {
  name: string;
  type: PropType;
  validators: ValidatorConfig;
  ui: UIElementConfig;
  layout: UILayoutConfig;
  expanded: boolean;
}

interface ModelConfig {
  name: string;
  description: string;
  renderTag: string;
  layoutCols: number;
  layoutRows: number;
  listModelTag: string;
}

const DEFAULT_VALIDATORS: ValidatorConfig = {
  required: false,
  min: null,
  max: null,
  minlength: null,
  maxlength: null,
  pattern: '',
  email: false,
  url: false,
};

const DEFAULT_UI: UIElementConfig = {
  tag: 'ngx-decaf-crud-field',
  customTag: '',
  label: '',
  placeholder: '',
  type: 'text',
  readonly: false,
  translatable: true,
  options: '',
};

const DEFAULT_LAYOUT: UILayoutConfig = {
  col: 1,
  row: 1,
  order: '',
  orderNum: null,
  hideOn: [],
};

const COMPONENT_TAGS: { value: ComponentTag; label: string }[] = [
  { value: 'ngx-decaf-crud-field', label: 'CRUD Field (text/number/date/checkbox/select)' },
  { value: 'ngx-decaf-file-upload', label: 'File Upload' },
  { value: 'ngx-decaf-searchbar', label: 'Search Bar' },
  { value: 'ngx-decaf-table', label: 'Table' },
  { value: 'ngx-decaf-list', label: 'List' },
  { value: 'ngx-decaf-fieldset', label: 'Fieldset (nested group)' },
  { value: 'app-select-field', label: 'Select Field (custom)' },
  { value: 'input', label: 'Raw HTML Input' },
  { value: 'textarea', label: 'Raw HTML Textarea' },
  { value: 'custom', label: 'Custom (specify tag)' },
];

const INPUT_TYPES = [
  'text',
  'number',
  'date',
  'checkbox',
  'select',
  'textarea',
  'radio',
  'email',
  'password',
  'url',
  'tel',
  'search',
  'color',
  'range',
  'time',
  'week',
  'month',
  'datetime-local',
  'file',
];

const HIDE_ON_OPS: HideOnOp[] = ['create', 'read', 'update', 'delete'];

function makeProperty(name = '', type: PropType = 'string'): PropertyConfig {
  return {
    name,
    type,
    validators: { ...DEFAULT_VALIDATORS },
    ui: { ...DEFAULT_UI, label: name.charAt(0).toUpperCase() + name.slice(1) },
    layout: { ...DEFAULT_LAYOUT },
    expanded: false,
  };
}

function resolveTag(ui: UIElementConfig): string {
  return ui.tag === 'custom' ? ui.customTag || 'input' : ui.tag;
}

function resolveInputType(propType: PropType, uiType: string): string {
  if (uiType && uiType !== 'text') return uiType;
  switch (propType) {
    case 'number':
      return 'number';
    case 'date':
      return 'date';
    case 'boolean':
      return 'checkbox';
    default:
      return 'text';
  }
}

function parseOptions(optionsStr: string): { value: string; label: string }[] {
  if (!optionsStr.trim()) return [];
  return optionsStr.split(',').map((s) => {
    const trimmed = s.trim();
    const parts = trimmed.split(':');
    return { value: parts[0].trim(), label: (parts[1] || parts[0]).trim() };
  });
}

/** One generated structured-output form field, derived from the authored model definition (SAA-836 U1/S1). */
export interface ModelBuilderStructuredField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'checkbox' | 'date';
  required: boolean;
}

/** JSON prompt-injection vocabulary of the S1 structured-output definition (mastra `structuredOutput.jsonPromptInjection`). */
export type ModelBuilderInjectionMode = 'default' | 'auto' | 'system' | 'inline' | 'true' | 'false';

export { modelBuilderStructuredDefinitionOf } from '../../utils/structured-output';

/**
 * Standalone model-builder widget: authors a decaf model (name, properties,
 * layout, render tags) whose definition generates the structured-output form,
 * and emits the S1 structured-output definition the backend resolves through
 * its decaf-model registry.
 *
 * @category ModelBuilder
 */
@Component({
  standalone: true,
  selector: 'ngx-decaf-model-builder',
  imports: [
    FormsModule,
    IonButton,
    IconComponent,
    IonInput,
    IonSelect,
    IonLabel,
    IonItem,
    IonCheckbox,
    IonTextarea,
    IonAccordion,
    IonAccordionGroup,
    ModelRendererComponent,
  ],
  templateUrl: './model-builder.component.html',
  styleUrl: './model-builder.component.scss',
})
export class ModelBuilderComponent {
  @Input() preview = false;

  /**
   * Structured-output editing mode (SAA-836 U1/S1): the component authors the
   * decaf model whose definition generates the structured-output form, and
   * emits the S1 definition (`model`/`instructions`/`jsonPromptInjection`)
   * the backend resolves through its decaf-model registry.
   */
  @Input() structuredOutputMode = false;

  /** Persisted S1 structured-output definition to preload (object or JSON string). */
  @Input() set definition(value: unknown) {
    this.loadStructuredDefinition(value);
  }

  /** Emits the edited S1 structured-output definition. */
  @Output() structuredOutputChange = new EventEmitter<Record<string, unknown>>();

  modelConfig = signal<ModelConfig>({
    name: '',
    description: '',
    renderTag: 'ngx-decaf-crud-form',
    layoutCols: 1,
    layoutRows: 1,
    listModelTag: '',
  });

  properties = signal<PropertyConfig[]>([]);
  builtModel = signal<Model | null>(null);
  buildError = signal<string | null>(null);
  buildInfo = signal<string | null>(null);

  /** Structuring instructions forwarded to mastra (`structuredOutput.instructions`). */
  structuredInstructions = signal('');

  /** JSON prompt-injection mode forwarded to mastra (`structuredOutput.jsonPromptInjection`). */
  structuredInjection = signal<ModelBuilderInjectionMode>('default');

  /** Form fields generated from the authored model definition. */
  generatedFields = signal<ModelBuilderStructuredField[]>([]);

  /** Current values of the generated structured-output form. */
  generatedValues = signal<Record<string, string | boolean>>({});

  componentTags = COMPONENT_TAGS;
  inputTypes = INPUT_TYPES;
  hideOnOps = HIDE_ON_OPS;

  hasProperties = computed(() => this.properties().length > 0);
  canBuild = computed(
    () => this.modelConfig().name.trim().length > 0 && this.properties().every((p) => p.name.trim().length > 0)
  );

  /** Adds an empty property row to the builder. */
  addProperty(): void {
    this.properties.update((props) => [...props, makeProperty()]);
  }

  /** Removes the property row at the given index. */
  removeProperty(index: number): void {
    this.properties.update((props) => props.filter((_, i) => i !== index));
  }

  /** Moves the property row one position up (`-1`) or down (`1`). */
  moveProperty(index: number, direction: PropertyMoveDirection): void {
    const props = [...this.properties()];
    const target = index + direction;
    if (target < 0 || target >= props.length) return;
    [props[index], props[target]] = [props[target], props[index]];
    this.properties.set(props);
  }

  /** Expands or collapses the property row's detail editor. */
  toggleExpanded(index: number): void {
    const props = [...this.properties()];
    props[index] = { ...props[index], expanded: !props[index].expanded };
    this.properties.set(props);
  }

  /** Updates a property name and auto-fills its label while it is still the default. */
  onPropertyNameChange(index: number, value: string): void {
    const props = [...this.properties()];
    props[index] = { ...props[index], name: value };
    const autoLabel = value.charAt(0).toUpperCase() + value.slice(1);
    if (
      !props[index].ui.label ||
      props[index].ui.label === makeProperty(props[index].name.replace(value, '')).ui.label
    ) {
      props[index].ui = { ...props[index].ui, label: autoLabel };
    }
    this.properties.set(props);
  }

  /** Toggles one operation (create/read/update/delete) in a property's hide-on layout rule. */
  toggleHideOn(propIndex: number, op: HideOnOp): void {
    const props = [...this.properties()];
    const current = props[propIndex].layout.hideOn;
    const isSelected = current.includes(op);
    props[propIndex].layout = {
      ...props[propIndex].layout,
      hideOn: isSelected ? current.filter((o) => o !== op) : [...current, op],
    };
    this.properties.set(props);
  }

  /**
   * Builds the decaf model class from the authored configuration: applies the
   * class-level ui-model/layout decorators, then per-property attribute type,
   * validators and `uielement`/`uilayoutprop`/`uiorder`/`hideOn` decorators. In
   * structured-output mode it then derives the form fields and emits the S1
   * definition. Failures are reported through the `buildError` signal without
   * throwing.
   */
  buildModel(): void {
    this.buildError.set(null);
    this.buildInfo.set(null);
    try {
      const cfg = this.modelConfig();
      const name = cfg.name.trim();
      if (!name) throw new Error('Model name is required');

      const builder = ModelBuilder.builder<Model & Record<string, unknown>>();
      builder.setName(name);

      builder.decorateClass(uimodel(cfg.renderTag, {}));
      builder.decorateClass(uilayout(cfg.renderTag, cfg.layoutCols, cfg.layoutRows, {}));
      if (cfg.listModelTag) {
        builder.decorateClass(uilistmodel(cfg.listModelTag, {}));
      }
      if (cfg.description) {
        builder.description(cfg.description);
      }

      const appliedProps: string[] = [];

      for (let i = 0; i < this.properties().length; i++) {
        const prop = this.properties()[i];
        const propName = prop.name.trim();
        if (!propName) throw new Error(`Property #${i + 1} has no name`);

        let attr;
        switch (prop.type) {
          case 'number':
            attr = builder.number(propName as never);
            break;
          case 'date':
            attr = builder.date(propName as never);
            break;
          case 'boolean':
            attr = builder.instance(Boolean as never, propName as never);
            break;
          default:
            attr = builder.string(propName as never);
            break;
        }

        const v = prop.validators;
        if (v.required) attr.required();
        if (v.min !== null) attr.min(v.min);
        if (v.max !== null) attr.max(v.max);
        if (v.minlength !== null) attr.minlength(v.minlength);
        if (v.maxlength !== null) attr.maxlength(v.maxlength);
        if (v.pattern) attr.pattern(v.pattern);
        if (v.email) attr.email();
        if (v.url) attr.url();

        const tag = resolveTag(prop.ui);
        const inputType = resolveInputType(prop.type, prop.ui.type);

        const elementProps: Record<string, unknown> = {
          label: prop.ui.label || propName,
          type: inputType,
        };
        if (prop.ui.placeholder) elementProps['placeholder'] = prop.ui.placeholder;
        if (prop.ui.readonly) elementProps['readonly'] = true;
        if (prop.ui.translatable !== undefined) elementProps['translatable'] = prop.ui.translatable;

        const options = parseOptions(prop.ui.options);
        if (options.length) elementProps['options'] = options;

        type DecoratorFn = (target: unknown, key?: string | symbol) => unknown;
        const decorators: DecoratorFn[] = [
          uielement(tag, elementProps) as DecoratorFn,
          uilayoutprop(prop.layout.col as number, prop.layout.row) as DecoratorFn,
        ];

        if (prop.layout.order === 'first') {
          decorators.push(uiorder('first' as never) as DecoratorFn);
        } else if (prop.layout.order === 'last') {
          decorators.push(uiorder('last' as never) as DecoratorFn);
        } else if (prop.layout.orderNum !== null) {
          decorators.push(uiorder(prop.layout.orderNum as never) as DecoratorFn);
        }

        if (prop.layout.hideOn.length) {
          const ops = prop.layout.hideOn.map((o) => {
            switch (o) {
              case 'create':
                return OperationKeys.CREATE;
              case 'read':
                return OperationKeys.READ;
              case 'update':
                return OperationKeys.UPDATE;
              case 'delete':
                return OperationKeys.DELETE;
              default:
                return o;
            }
          });
          decorators.push(hideOn(...(ops as never[])) as DecoratorFn);
        }

        attr.decorate(...(decorators as never[]));
        appliedProps.push(propName);
      }

      const ModelClass = builder.build();
      const instance = new ModelClass() as Model;
      this.builtModel.set(instance);
      this.buildInfo.set(
        `Built "${name}" with ${appliedProps.length} propert${appliedProps.length === 1 ? 'y' : 'ies'}: ${appliedProps.join(', ')}`
      );
      if (this.structuredOutputMode) {
        this.generateStructuredForm();
        this.emitStructuredDefinition();
      }
    } catch (e: unknown) {
      this.buildError.set(e instanceof Error ? e.message : String(e));
      this.builtModel.set(null);
    }
  }

  /**
   * Structured-output mode (SAA-836 U1/S1): derives the structured-output form
   * fields from the authored model definition so the root entry point has no
   * feature-specific schema dependency.
   */
  private generateStructuredForm(): void {
    const fields: ModelBuilderStructuredField[] = this.properties()
      .filter((prop) => prop.name.trim().length > 0)
      .map((prop) => {
        const name = prop.name.trim();
        let type: ModelBuilderStructuredField['type'] = 'text';
        if (prop.type === 'number') type = 'number';
        else if (prop.type === 'boolean') type = 'checkbox';
        else if (prop.type === 'date') type = 'date';
        return {
          name,
          label: prop.ui.label || name.charAt(0).toUpperCase() + name.slice(1),
          type,
          required: prop.validators.required,
        };
      });
    this.generatedFields.set(fields);
    this.generatedValues.set(
      Object.fromEntries(fields.map((field) => [field.name, field.type === 'checkbox' ? false : '']))
    );
  }

  /** Builds the serializable S1 structured-output definition and emits it. */
  private emitStructuredDefinition(): void {
    const name = this.modelConfig().name.trim();
    if (!name) return;
    const definition: Record<string, unknown> = { model: name };
    const instructions = this.structuredInstructions().trim();
    if (instructions) definition['instructions'] = instructions;
    const injection = this.structuredInjection();
    if (injection === 'true') definition['jsonPromptInjection'] = true;
    else if (injection === 'false') definition['jsonPromptInjection'] = false;
    else if (injection !== 'default') definition['jsonPromptInjection'] = injection;
    this.structuredOutputChange.emit(definition);
  }

  /** Handles instruction edits in structured-output mode and re-emits the definition. */
  onStructuredInstructionsChange(value: string): void {
    this.structuredInstructions.set(value);
    this.emitStructuredDefinition();
  }

  /** Handles injection-mode edits in structured-output mode and re-emits the definition. */
  onStructuredInjectionChange(value: ModelBuilderInjectionMode): void {
    this.structuredInjection.set(value);
    this.emitStructuredDefinition();
  }

  /** Stores one edited value of the generated structured-output form. */
  onGeneratedValueChange(field: ModelBuilderStructuredField, value: string | boolean): void {
    this.generatedValues.update((values) => ({ ...values, [field.name]: value }));
  }

  /** Preloads a persisted S1 definition into the builder state (name, instructions, injection). */
  private loadStructuredDefinition(value: unknown): void {
    const definition = modelBuilderStructuredDefinitionOf(value);
    if (!definition) return;
    const name = String(definition['model']);
    this.modelConfig.update((config) => ({ ...config, name }));
    const instructions = definition['instructions'];
    this.structuredInstructions.set(typeof instructions === 'string' ? instructions : '');
    const injection = definition['jsonPromptInjection'];
    this.structuredInjection.set(
      injection === true
        ? 'true'
        : injection === false
          ? 'false'
          : injection === 'system' || injection === 'inline' || injection === 'auto'
            ? injection
            : 'default'
    );
  }

  /** Clears all builder state (model config, properties, built model, generated form). */
  reset(): void {
    this.modelConfig.set({
      name: '',
      description: '',
      renderTag: 'ngx-decaf-crud-form',
      layoutCols: 1,
      layoutRows: 1,
      listModelTag: '',
    });
    this.properties.set([]);
    this.builtModel.set(null);
    this.buildError.set(null);
    this.buildInfo.set(null);
    this.generatedFields.set([]);
    this.generatedValues.set({});
  }

  /** Preloads a demonstration `User` model config with representative properties. */
  loadExample(): void {
    this.modelConfig.set({
      name: 'User',
      description: 'A user account model with profile fields',
      renderTag: 'ngx-decaf-crud-form',
      layoutCols: 2,
      layoutRows: 1,
      listModelTag: '',
    });
    this.properties.set([
      {
        name: 'username',
        type: 'string',
        validators: { ...DEFAULT_VALIDATORS, required: true, minlength: 3, maxlength: 20 },
        ui: {
          ...DEFAULT_UI,
          tag: 'ngx-decaf-crud-field',
          label: 'Username',
          placeholder: 'Enter username',
          type: 'text',
        },
        layout: { ...DEFAULT_LAYOUT, col: 1 },
        expanded: false,
      },
      {
        name: 'email',
        type: 'string',
        validators: { ...DEFAULT_VALIDATORS, required: true, email: true },
        ui: {
          ...DEFAULT_UI,
          tag: 'ngx-decaf-crud-field',
          label: 'Email Address',
          placeholder: 'user@example.com',
          type: 'email',
        },
        layout: { ...DEFAULT_LAYOUT, col: 1 },
        expanded: false,
      },
      {
        name: 'age',
        type: 'number',
        validators: { ...DEFAULT_VALIDATORS, min: 0, max: 150 },
        ui: { ...DEFAULT_UI, tag: 'ngx-decaf-crud-field', label: 'Age', type: 'number' },
        layout: { ...DEFAULT_LAYOUT, col: 'half' },
        expanded: false,
      },
      {
        name: 'role',
        type: 'string',
        validators: { ...DEFAULT_VALIDATORS, required: true },
        ui: {
          ...DEFAULT_UI,
          tag: 'ngx-decaf-crud-field',
          label: 'Role',
          type: 'select',
          options: 'admin:Administrator, user:Regular User, guest:Guest',
        },
        layout: { ...DEFAULT_LAYOUT, col: 'half' },
        expanded: false,
      },
      {
        name: 'bio',
        type: 'string',
        validators: { ...DEFAULT_VALIDATORS, maxlength: 500 },
        ui: {
          ...DEFAULT_UI,
          tag: 'ngx-decaf-crud-field',
          label: 'Biography',
          placeholder: 'Tell us about yourself',
          type: 'textarea',
        },
        layout: { ...DEFAULT_LAYOUT, col: 'full' },
        expanded: false,
      },
      {
        name: 'avatar',
        type: 'string',
        validators: { ...DEFAULT_VALIDATORS },
        ui: { ...DEFAULT_UI, tag: 'ngx-decaf-file-upload', label: 'Avatar', type: 'file' },
        layout: { ...DEFAULT_LAYOUT, col: 'full' },
        expanded: false,
      },
      {
        name: 'createdAt',
        type: 'date',
        validators: { ...DEFAULT_VALIDATORS },
        ui: {
          ...DEFAULT_UI,
          tag: 'ngx-decaf-crud-field',
          label: 'Created At',
          type: 'date',
          readonly: true,
          translatable: false,
        },
        layout: { ...DEFAULT_LAYOUT, col: 'half', hideOn: ['create'] },
        expanded: false,
      },
    ]);
  }
}
