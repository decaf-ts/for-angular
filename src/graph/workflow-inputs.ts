import { FormControl, FormGroup, Validators, type ValidatorFn } from '@angular/forms';
import { Constructor } from '@decaf-ts/decoration';
import { Model, ModelBuilder, type ModelArg } from '@decaf-ts/decorator-validation';
import {
  DEFAULT_PATTERNS,
  ValidationKeys,
} from '@decaf-ts/decorator-validation';
import { uielement } from '@decaf-ts/ui-decorators';
import { input as graphInput } from '@decaf-ts/ui-decorators/graph';
import {
  graphLeafPortsOf,
  type GraphPortDefinition,
  type GraphWorkflowDefinition,
} from '@decaf-ts/ui-decorators/graph';

export type WorkflowInputControlType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'checkbox'
  | 'date'
  | 'email'
  | 'url';

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
}

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
    assignNestedValue(normalized, field.path, value);
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

export function buildWorkflowInputModelClass(
  workflow: GraphWorkflowDefinition
): Constructor<Model> {
  const builder = ModelBuilder.builder<Model & Record<string, unknown>>().setName(
    `${workflow.name}WorkflowInputs`
  );

  buildWorkflowModelBuilder(builder, workflow.inputs);

  return builder.build();
}

export function buildWorkflowInputFields(
  workflow: GraphWorkflowDefinition,
  values?: Record<string, unknown>
): WorkflowInputFieldDefinition[] {
  return graphLeafPortsOf(workflow.inputs).map((port) => {
    const path = port.path || port.property;
    const controlName = path.replace(/[^\w-]/g, '__');
    return {
      property: port.property,
      path,
      controlName,
      label: port.label,
      placeholder: port.element?.['props']?.['placeholder'] ?? port.prop?.['placeholder'],
      controlType: resolveControlType(port),
      value: resolveInitialValue(port, values, controlName),
      validators: resolveValidators(port),
      required: port.required,
    };
  });
}

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
