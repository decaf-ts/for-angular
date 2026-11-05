import { FormControl, FormGroup, Validators, type ValidatorFn } from '@angular/forms';
import { Constructor } from '@decaf-ts/decoration';
import { Model, ModelBuilder, type ModelArg } from '@decaf-ts/decorator-validation';
import {
  DEFAULT_PATTERNS,
  ValidationKeys,
} from '@decaf-ts/decorator-validation';
import { uielement } from '@decaf-ts/ui-decorators';
import { input as graphInput } from '@decaf-ts/as-graph/shared';
import {
  graphLeafPortsOf,
  type GraphPortDefinition,
  type GraphWorkflowDefinition,
  type GraphWorkflowPortInstance,
} from '@decaf-ts/as-graph/shared';
/**
 * HTML-ish control type a workflow input field renders as: `text`, `textarea`,
 * `number`, `checkbox`, `date`, `email` or `url`.
 * @category Graph
 */
export type WorkflowInputControlType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'checkbox'
  | 'date'
  | 'email'
  | 'url';

/**
 * How a submitted field's raw form value is typed for the run payload. A
 * document port that declares no schema accepts free-form JSON text, so a
 * schema-less port (the engine fixtures) still submits the declared type the
 * user entered (`7` → number, `[1,2,3]` → array, `{n:0}` → object).
 */
export type WorkflowInputValueType = 'text' | 'number' | 'boolean' | 'json';
/**
 * One resolved workflow input field: canonical port identity, the reactive
 * control it maps to, its validators and how its raw value is typed on submit.
 *
 * @property property - Canonical port property name.
 * @property path - Full dotted path of the port within the workflow inputs.
 * @property controlName - Reactive-form control name derived from the path.
 * @property label - Display label of the field.
 * @property placeholder - Optional placeholder text.
 * @property controlType - Control type the field renders as.
 * @property value - Current (seed) value of the field.
 * @property validators - Validators derived from the port's validation metadata.
 * @property required - Whether the port is required.
 * @property valueType - Declared typing applied to the raw form value before submission.
 * @category Graph
 */
export interface WorkflowInputFieldDefinition {
  property: string;
  path: string;
  controlName: string;
  label: string;
  placeholder?: string;
  controlType: WorkflowInputControlType;
  value: unknown;
  validators: ValidatorFn[];
  required: boolean;
  /** Declared typing applied to the raw form value before it is submitted. */
  valueType?: WorkflowInputValueType;
}
/**
 * Everything needed to render and submit a workflow's input form.
 *
 * @property fields - Resolved field definitions.
 * @property form - The reactive `FormGroup` for the fields.
 * @property modelClass - Generated decaf `Model` class for the run payload.
 * @category Graph
 */
export interface WorkflowInputBuildResult {
  fields: WorkflowInputFieldDefinition[];
  form: FormGroup;
  modelClass: Constructor<Model>;
}

function getValidationMeta<T extends Record<string, unknown>>(port: GraphPortDefinition, key: string): T | undefined {
  return port.validation?.[key] as T | undefined;
}

function isDateLike(value: unknown): value is string | number | Date {
  return value instanceof Date || typeof value === 'string' || typeof value === 'number';
}

function resolveInitialValue(
  port: GraphPortDefinition,
  values?: Record<string, unknown>,
  fallbackKey?: string
) {
  const path = port.path || port.property;
  if (values) {
    const direct = readNestedValue(values, path);
    if (direct !== undefined) {
      return direct;
    }

    if (fallbackKey && fallbackKey in values) {
      return values[fallbackKey];
    }
  }

  const elementValue = port.element?.['props']?.['value'] ?? port.prop?.['value'];
  if (elementValue !== undefined) return elementValue;

  const modelValue = port.validation?.['defaultValue'];
  if (modelValue !== undefined) return modelValue;

  return undefined;
}

function readNestedValue(values: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((current, segment) => {
    if (current && typeof current === 'object' && segment in (current as Record<string, unknown>)) {
      return (current as Record<string, unknown>)[segment];
    }
    return undefined;
  }, values);
}

function assignNestedValue(target: Record<string, unknown>, path: string, value: unknown) {
  const segments = path.split('.').filter(Boolean);
  if (!segments.length) return;

  let current: Record<string, unknown> = target;
  for (let index = 0; index < segments.length - 1; index += 1) {
    const segment = segments[index];
    const existing = current[segment];
    if (!existing || typeof existing !== 'object' || Array.isArray(existing)) {
      current[segment] = {};
    }
    current = current[segment] as Record<string, unknown>;
  }

  current[segments[segments.length - 1]] = value;
}

/**
 * Applies a field's declared typing to the raw form value. A schema-less
 * document port is typed `json`, so a JSON-shaped string entered in a control
 * is parsed back to the declared type (number/array/object); a value that does
 * not parse stays the literal string (a plain text port such as `name`).
 * @param field The field whose declared `valueType` drives the coercion.
 * @param value The raw form value for the field.
 * @returns The value typed for submission.
 */
export function coerceWorkflowInputValue(
  field: WorkflowInputFieldDefinition,
  value: unknown
): unknown {
  switch (field.valueType) {
    case 'number':
      if (typeof value === 'string' && value.trim() !== '') {
        const numeric = Number(value);
        return Number.isNaN(numeric) ? value : numeric;
      }
      return value;
    case 'json':
      if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed) return value;
        try {
          return JSON.parse(trimmed);
        } catch {
          return value;
        }
      }
      return value;
    default:
      return value;
  }
}
/**
 * Types each field's raw form value per its declared
 * {@link WorkflowInputValueType} (`text` stays string, `number` parses
 * numerics, `boolean` coerces, `json` parses JSON with a string fallback) and
 * drops controls with no value.
 *
 * @param fields - Resolved field definitions.
 * @param values - Raw form values keyed by control name or path.
 * @returns Normalized values keyed by property path.
 * @category Graph
 */
export function normalizeWorkflowInputValues(
  fields: WorkflowInputFieldDefinition[],
  values: Record<string, unknown>
): Record<string, unknown> {
  const normalized: Record<string, unknown> = {};

  for (const field of fields) {
    const value =
      values[field.controlName] ??
      values[field.path] ??
      values[field.property] ??
      field.value;
    assignNestedValue(normalized, field.path, coerceWorkflowInputValue(field, value));
  }

  return normalized;
}

function resolveControlType(port: GraphPortDefinition): WorkflowInputControlType {
  const elementTag = String(port.element?.['tag'] || port.prop?.['tag'] || '').toLowerCase();
  const type = String(port.type || port.designType || '').toLowerCase();

  if (elementTag === 'textarea') return 'textarea';
  if (type === 'number' || getValidationMeta(port, ValidationKeys.MIN) || getValidationMeta(port, ValidationKeys.MAX) || getValidationMeta(port, ValidationKeys.STEP)) {
    return 'number';
  }
  if (type === 'boolean') return 'checkbox';
  if (type === 'date' || getValidationMeta(port, ValidationKeys.DATE)) return 'date';
  if (getValidationMeta(port, ValidationKeys.EMAIL)) return 'email';
  if (getValidationMeta(port, ValidationKeys.URL)) return 'url';
  return 'text';
}

function resolveValidators(port: GraphPortDefinition): ValidatorFn[] {
  const validators: ValidatorFn[] = [];
  const isRequired = port.required || !!getValidationMeta(port, ValidationKeys.REQUIRED);

  if (isRequired) {
    validators.push(Validators.required);
  }

  const min = getValidationMeta<{ [ValidationKeys.MIN]: number | Date | string }>(port, ValidationKeys.MIN)?.[ValidationKeys.MIN];
  if (typeof min === 'number') validators.push(Validators.min(min));
  if (isDateLike(min) && !(typeof min === 'number')) {
    const minDate = new Date(min);
    validators.push((control) => {
      const raw = control.value;
      if (!raw) return null;
      const current = new Date(raw);
      return Number.isNaN(current.getTime()) || current < minDate ? { min: { min, actual: raw } } : null;
    });
  }

  const max = getValidationMeta<{ [ValidationKeys.MAX]: number | Date | string }>(port, ValidationKeys.MAX)?.[ValidationKeys.MAX];
  if (typeof max === 'number') validators.push(Validators.max(max));
  if (isDateLike(max) && !(typeof max === 'number')) {
    const maxDate = new Date(max);
    validators.push((control) => {
      const raw = control.value;
      if (!raw) return null;
      const current = new Date(raw);
      return Number.isNaN(current.getTime()) || current > maxDate ? { max: { max, actual: raw } } : null;
    });
  }

  const step = getValidationMeta<{ [ValidationKeys.STEP]: number }>(port, ValidationKeys.STEP)?.[ValidationKeys.STEP];
  if (typeof step === 'number') {
    validators.push((control) => {
      const raw = Number(control.value);
      if (Number.isNaN(raw)) return null;
      return raw % step === 0 ? null : { step: { step, actual: control.value } };
    });
  }

  const minlength = getValidationMeta<{ [ValidationKeys.MIN_LENGTH]: number }>(port, ValidationKeys.MIN_LENGTH)?.[ValidationKeys.MIN_LENGTH];
  if (typeof minlength === 'number') validators.push(Validators.minLength(minlength));

  const maxlength = getValidationMeta<{ [ValidationKeys.MAX_LENGTH]: number }>(port, ValidationKeys.MAX_LENGTH)?.[ValidationKeys.MAX_LENGTH];
  if (typeof maxlength === 'number') validators.push(Validators.maxLength(maxlength));

  const pattern = getValidationMeta<{ [ValidationKeys.PATTERN]: string | RegExp }>(port, ValidationKeys.PATTERN)?.[ValidationKeys.PATTERN];
  if (pattern) validators.push(Validators.pattern(pattern));

  if (getValidationMeta(port, ValidationKeys.EMAIL)) validators.push(Validators.email);
  if (getValidationMeta(port, ValidationKeys.URL)) validators.push(Validators.pattern(DEFAULT_PATTERNS.URL));
  if (getValidationMeta(port, ValidationKeys.PASSWORD)) {
    validators.push(
      Validators.pattern(
        new RegExp(DEFAULT_PATTERNS.PASSWORD.CHAR8_ONE_OF_EACH.source)
      )
    );
  }

  const enumValues = getValidationMeta<{ [ValidationKeys.ENUM]: unknown[] }>(port, ValidationKeys.ENUM)?.[ValidationKeys.ENUM];
  if (Array.isArray(enumValues) && enumValues.length > 0) {
    validators.push((control) => {
      if (control.value === undefined || control.value === null || control.value === '') return null;
      return enumValues.includes(control.value) ? null : { enum: { allowed: enumValues, actual: control.value } };
    });
  }

  return validators;
}

function buildAttributeModelBuilder(
  builder: ModelBuilder<Model & Record<string, unknown>>,
  port: GraphPortDefinition
) {
  const property = port.property as never;
  const controlType = resolveControlType(port);
  const uielementMetadata = {
    label: port.label,
    placeholder: port.element?.['props']?.['placeholder'] ?? port.prop?.['placeholder'],
    type: controlType === 'checkbox' ? 'checkbox' : controlType === 'number' ? 'number' : controlType === 'date' ? 'date' : controlType === 'email' ? 'email' : controlType === 'url' ? 'url' : 'text',
  };

  type WorkflowAttributeBuilder =
    | ReturnType<ModelBuilder<Model & Record<string, unknown>>['string']>
    | ReturnType<ModelBuilder<Model & Record<string, unknown>>['number']>
    | ReturnType<ModelBuilder<Model & Record<string, unknown>>['date']>
    | ReturnType<ModelBuilder<Model & Record<string, unknown>>['instance']>;

  let attribute: WorkflowAttributeBuilder;
  switch (controlType) {
    case 'number':
      attribute = builder.number(property);
      break;
    case 'date':
      attribute = builder.date(property);
      break;
    case 'checkbox':
      attribute = builder.instance(Boolean as never, property);
      break;
    default:
      attribute = builder.string(property);
      break;
  }

  if (port.required) attribute.required();
  const min = getValidationMeta<{ [ValidationKeys.MIN]: number | Date | string }>(port, ValidationKeys.MIN)?.[ValidationKeys.MIN];
  const max = getValidationMeta<{ [ValidationKeys.MAX]: number | Date | string }>(port, ValidationKeys.MAX)?.[ValidationKeys.MAX];
  const step = getValidationMeta<{ [ValidationKeys.STEP]: number }>(port, ValidationKeys.STEP)?.[ValidationKeys.STEP];
  const minlength = getValidationMeta<{ [ValidationKeys.MIN_LENGTH]: number }>(port, ValidationKeys.MIN_LENGTH)?.[ValidationKeys.MIN_LENGTH];
  const maxlength = getValidationMeta<{ [ValidationKeys.MAX_LENGTH]: number }>(port, ValidationKeys.MAX_LENGTH)?.[ValidationKeys.MAX_LENGTH];
  const pattern = getValidationMeta<{ [ValidationKeys.PATTERN]: string | RegExp }>(port, ValidationKeys.PATTERN)?.[ValidationKeys.PATTERN];
  const email = getValidationMeta(port, ValidationKeys.EMAIL);
  const url = getValidationMeta(port, ValidationKeys.URL);
  const password = getValidationMeta(port, ValidationKeys.PASSWORD);
  const enumValues = getValidationMeta<{ [ValidationKeys.ENUM]: unknown[] }>(port, ValidationKeys.ENUM)?.[ValidationKeys.ENUM];

  if (typeof min !== 'undefined' && typeof attribute.min === 'function') attribute.min(min as never);
  if (typeof max !== 'undefined' && typeof attribute.max === 'function') attribute.max(max as never);
  if (typeof step === 'number' && typeof attribute.step === 'function') attribute.step(step);
  if (typeof minlength === 'number' && typeof attribute.minlength === 'function') attribute.minlength(minlength);
  if (typeof maxlength === 'number' && typeof attribute.maxlength === 'function') attribute.maxlength(maxlength);
  if (pattern && typeof attribute.pattern === 'function') attribute.pattern(pattern);
  if (email && typeof attribute.email === 'function') attribute.email();
  if (url && typeof attribute.url === 'function') attribute.url();
  if (password && typeof attribute.password === 'function') attribute.password();
  if (Array.isArray(enumValues) && typeof attribute.option === 'function') attribute.option(enumValues);

  attribute.decorate(
    uielement(port.element?.['tag'] || 'input', uielementMetadata),
    graphInput({
      handle: port.graph?.handle || port.path || port.property,
      connectionRules: port.connectionRules,
    })
  );

  return attribute;
}

function buildWorkflowModelBuilder(
  builder: ModelBuilder<Model & Record<string, unknown>>,
  ports: GraphPortDefinition[]
) {
  for (const port of ports) {
    if (port.children && port.children.length) {
      buildWorkflowModelBuilder(builder.model(port.property), port.children);
      continue;
    }

    buildAttributeModelBuilder(builder, port);
  }
}
/**
 * Generates the decaf `Model` class describing a workflow's declared inputs
 * (validation and ui decorators included), named `<workflow>WorkflowInputs`.
 *
 * @param workflow - The workflow definition whose input ports drive the model.
 * @returns The generated model constructor.
 * @category Graph
 */
export function buildWorkflowInputModelClass(
  workflow: GraphWorkflowDefinition
): Constructor<Model> {
  const builder = ModelBuilder.builder<Model & Record<string, unknown>>().setName(
    `${workflow.name}WorkflowInputs`
  );

  buildWorkflowModelBuilder(builder, workflow.inputs);

  return builder.build();
}
/**
 * Resolves a workflow's leaf input ports into renderable
 * {@link WorkflowInputFieldDefinition} entries (control names, validators,
 * control types and value typing).
 *
 * @param workflow - The workflow definition whose input ports are resolved.
 * @param values - Optional current values to seed the fields with.
 * @returns One field definition per leaf input port.
 * @category Graph
 */
export function buildWorkflowInputFields(
  workflow: GraphWorkflowDefinition,
  values?: Record<string, unknown>
): WorkflowInputFieldDefinition[] {
  return graphLeafPortsOf(workflow.inputs).map((port) => {
    const path = port.path || port.property;
    const controlName = path.replace(/[^\w-]/g, '__');
    const controlType = resolveControlType(port);
    return {
      property: port.property,
      path,
      controlName,
      label: port.label,
      placeholder: port.element?.['props']?.['placeholder'] ?? port.prop?.['placeholder'],
      controlType,
      value: resolveInitialValue(port, values, controlName),
      validators: resolveValidators(port),
      required: port.required,
      valueType: resolveDecoratedValueType(controlType, port),
    };
  });
}

/**
 * Declared submit typing for a decorated-root input port, derived from the
 * rendered control and the port's declared type: number/checkbox controls map
 * to `number`/`boolean`, and an array/object/any/model port accepts free-form
 * JSON text (`json`); everything else submits as literal text.
 * @param controlType The control widget resolved for the port.
 * @param port The decorated root's input port definition.
 * @returns The declared typing applied to the raw form value on submit.
 */
function resolveDecoratedValueType(
  controlType: WorkflowInputControlType,
  port: GraphPortDefinition
): WorkflowInputValueType {
  if (controlType === 'number') return 'number';
  if (controlType === 'checkbox') return 'boolean';
  const type = String(port.type || port.designType || '').toLowerCase();
  if (type === 'array' || type === 'object' || type === 'any' || type === 'model') {
    return 'json';
  }
  return 'text';
}

/**
 * Control widget for a canonical workflow-document input port instance. The
 * instance carries only an optional `schema`, so a schema-less port (the engine
 * fixtures) renders as a free-form `text` control typed `json` on submit.
 * @param port The document's declared input port instance.
 * @returns The control widget the run form should render for the port.
 */
function resolvePortControlType(port: GraphWorkflowPortInstance): WorkflowInputControlType {
  const schema = port.schema;
  const type = schema?.type;
  const modelName =
    type === 'model'
      ? String((schema as { name?: unknown })?.name ?? '').toLowerCase()
      : '';
  if (type === 'number' || ['number', 'integer', 'float', 'double', 'bigint'].includes(modelName)) {
    return 'number';
  }
  if (type === 'boolean' || modelName === 'boolean') return 'checkbox';
  if (
    (type === 'string' || modelName === 'string') &&
    typeof (schema as { format?: unknown })?.format === 'string' &&
    /date|time/i.test((schema as { format: string }).format)
  ) {
    return 'date';
  }
  if (modelName === 'date') return 'date';
  if (modelName === 'string') return 'text';
  if (
    type === 'array' ||
    type === 'object' ||
    type === 'model' ||
    type === 'any' ||
    ['array', 'object', 'any', 'map', 'set', 'collection'].includes(modelName)
  ) {
    return 'textarea';
  }
  return 'text';
}

/**
 * Declared submit typing for a document input port instance, derived from the
 * rendered control and the port's optional schema: number/checkbox controls map
 * to `number`/`boolean`, a schema-less or non-string schema accepts free-form
 * JSON text (`json`), and a string schema submits as literal text.
 * @param controlType The control widget resolved for the port.
 * @param schemaType The port's declared schema type, when any.
 * @returns The declared typing applied to the raw form value on submit.
 */
function resolvePortValueType(
  controlType: WorkflowInputControlType,
  schemaType: string | undefined
): WorkflowInputValueType {
  if (controlType === 'number') return 'number';
  if (controlType === 'checkbox') return 'boolean';
  if (schemaType === 'string') return 'text';
  return 'json';
}

/**
 * Seeds a document-port control's initial value: the caller-supplied values
 * (matched by port id, then by the sanitized control name) take precedence,
 * otherwise the port's declared default applies.
 * @param port The document's declared input port instance.
 * @param values Optional current values to seed the control with.
 * @param fallbackKey Alternate key in `values` (the sanitized control name).
 * @returns The control's initial value.
 */
function resolvePortInitialValue(
  port: GraphWorkflowPortInstance,
  values?: Record<string, unknown>,
  fallbackKey?: string
): unknown {
  if (values) {
    const direct = values[port.id];
    if (direct !== undefined) return direct;
    if (fallbackKey && fallbackKey in values) return values[fallbackKey];
  }
  return port.defaultValue;
}

/**
 * Validators for a document-port control: `required` when the port is marked
 * required, plus numeric `min`/`max` bounds declared on the port's schema.
 * @param port The document's declared input port instance.
 * @returns The reactive validators for the port's control.
 */
function resolvePortValidators(port: GraphWorkflowPortInstance): ValidatorFn[] {
  const validators: ValidatorFn[] = [];
  if (port.required) validators.push(Validators.required);
  const schema = port.schema as { min?: unknown; max?: unknown } | undefined;
  if (typeof schema?.min === 'number') validators.push(Validators.min(schema.min));
  if (typeof schema?.max === 'number') validators.push(Validators.max(schema.max));
  return validators;
}

/**
 * Builds the run form's editable fields from the canonical document's declared
 * input port instances (G1/SAA-783): the fixture catalog exposes its declared
 * inputs (`n`, `items`, `state`, …) instead of the decorated demo root's
 * `count`/`text`, so the run form and the run payload share the document's own
 * input contract.
 * @param ports The document's declared input port instances.
 * @param values Optional current values to seed the controls with.
 * @returns One field definition per declared port.
 */
export function buildWorkflowInputFieldsFromPorts(
  ports: readonly GraphWorkflowPortInstance[],
  values?: Record<string, unknown>
): WorkflowInputFieldDefinition[] {
  return ports.map((port) => {
    const path = port.id;
    const controlName = path.replace(/[^\w-]/g, '__');
    const controlType = resolvePortControlType(port);
    const schema = port.schema;
    const schemaType =
      schema?.type === 'model'
        ? String((schema as { name?: unknown })?.name ?? '').toLowerCase()
        : schema?.type;
    return {
      property: path,
      path,
      controlName,
      label: port.label ?? path,
      controlType,
      value: resolvePortInitialValue(port, values, controlName),
      validators: resolvePortValidators(port),
      required: port.required === true,
      valueType: resolvePortValueType(controlType, schemaType),
    };
  });
}
/**
 * Builds the run form's `FormGroup` from a workflow definition's input ports.
 *
 * @param workflow - The workflow definition whose inputs are built.
 * @param values - Optional current values to seed the controls with.
 * @returns The reactive form for the workflow inputs.
 * @category Graph
 */
export function buildWorkflowInputForm(
  workflow: GraphWorkflowDefinition,
  values?: Record<string, unknown>
): FormGroup {
  const controls = Object.fromEntries(
    buildWorkflowInputFields(workflow, values).map((field) => [
      field.controlName,
      new FormControl(field.value, {
        validators: field.validators,
        nonNullable: false,
      }),
    ])
  );

  return new FormGroup(controls);
}

/**
 * Builds the run form's `FormGroup` from the document's declared input port
 * instances (G1/SAA-783), mirroring {@link buildWorkflowInputForm}.
 * @param ports The document's declared input port instances.
 * @param values Optional current values to seed the controls with.
 * @returns The reactive form for the declared ports.
 */
export function buildWorkflowInputFormFromPorts(
  ports: readonly GraphWorkflowPortInstance[],
  values?: Record<string, unknown>
): FormGroup {
  const controls = Object.fromEntries(
    buildWorkflowInputFieldsFromPorts(ports, values).map((field) => [
      field.controlName,
      new FormControl(field.value, {
        validators: field.validators,
        nonNullable: false,
      }),
    ])
  );

  return new FormGroup(controls);
}
/**
 * Instantiates the workflow's generated input `Model` from raw form values:
 * fields are resolved, values normalized and assigned onto the instance.
 *
 * @param workflow - The workflow definition whose inputs are instantiated.
 * @param values - Raw form values keyed by control name or path.
 * @returns The populated model instance.
 * @category Graph
 */
export function instantiateWorkflowInputModel(
  workflow: GraphWorkflowDefinition,
  values: Record<string, unknown>
) {
  const fields = buildWorkflowInputFields(workflow, values);
  const normalizedValues = normalizeWorkflowInputValues(fields, values);
  const ModelClass = buildWorkflowInputModelClass(workflow);
  const instance = new ModelClass(normalizedValues as ModelArg<Model>);
  Object.assign(instance, normalizedValues);
  return instance;
}
