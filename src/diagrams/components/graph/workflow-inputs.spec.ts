/**
 * @module for-angular/graph/workflow-inputs.spec
 * @summary Direct unit contract for the graph run-form input helpers (SAA-802,
 * from SAA-799).
 * @description Proves the pure exported API of `workflow-inputs.ts`: value
 * coercion, value normalization/assignment, control-type + validator derivation,
 * declared submit typing, and initial-value precedence — for both the
 * decorated-root ports (`buildWorkflowInputFields`) and the canonical document
 * port instances (`buildWorkflowInputFieldsFromPorts`). Previously covered only
 * indirectly through the A4 per-engine Playwright lane.
 */
import { FormControl, type ValidatorFn } from '@angular/forms';
import {
  PortDirection,
  type GraphPortDefinition,
  type GraphWorkflowDefinition,
  type GraphWorkflowPortInstance,
} from '@decaf-ts/as-graph/shared';

import {
  buildWorkflowInputFields,
  buildWorkflowInputFieldsFromPorts,
  buildWorkflowInputForm,
  buildWorkflowInputFormFromPorts,
  buildWorkflowInputModelClass,
  coerceWorkflowInputValue,
  instantiateWorkflowInputModel,
  normalizeWorkflowInputValues,
  type WorkflowInputFieldDefinition,
} from './workflow-inputs';

/** Builds an input port definition with the given overrides. */
function port(overrides: Partial<GraphPortDefinition> = {}): GraphPortDefinition {
  return {
    property: 'value',
    name: 'value',
    label: 'Value',
    direction: PortDirection.INPUT,
    required: false,
    hidden: false,
    ...overrides,
  };
}

/** Wraps a port list in a minimal workflow definition (only `inputs`/`name` are read). */
function workflow(inputs: GraphPortDefinition[], name = 'Demo'): GraphWorkflowDefinition {
  return { name, inputs } as unknown as GraphWorkflowDefinition;
}

/** Builds a field definition with the given overrides. */
function field(overrides: Partial<WorkflowInputFieldDefinition> = {}): WorkflowInputFieldDefinition {
  return {
    property: 'value',
    path: 'value',
    controlName: 'value',
    label: 'Value',
    controlType: 'text',
    value: undefined,
    validators: [],
    required: false,
    ...overrides,
  };
}

/** Runs `value` through a field's validators and returns the bound control. */
function controlWith(validators: ValidatorFn[], value: unknown): FormControl {
  const control = new FormControl(value, { validators, nonNullable: false });
  control.updateValueAndValidity();
  return control;
}

/** The single field built from one decorated-root port. */
function fieldFor(
  definition: GraphPortDefinition,
  values?: Record<string, unknown>
): WorkflowInputFieldDefinition {
  return buildWorkflowInputFields(workflow([definition]), values)[0];
}

/** The single field built from one document port instance. */
function docField(
  definition: GraphWorkflowPortInstance,
  values?: Record<string, unknown>
): WorkflowInputFieldDefinition {
  return buildWorkflowInputFieldsFromPorts([definition], values)[0];
}

/** Builds a canonical workflow port instance. */
function docPort(
  id: string,
  extra: Partial<GraphWorkflowPortInstance> = {}
): GraphWorkflowPortInstance {
  return { id, ...extra };
}

describe('workflow-inputs — coerceWorkflowInputValue', () => {
  describe('number valueType', () => {
    const numberField = field({ valueType: 'number' });

    it('parses a numeric string to a number', () => {
      expect(coerceWorkflowInputValue(numberField, '42')).toBe(42);
      expect(coerceWorkflowInputValue(numberField, ' 3.5 ')).toBe(3.5);
    });

    it('keeps a non-numeric string as a string', () => {
      expect(coerceWorkflowInputValue(numberField, 'abc')).toBe('abc');
    });

    it('keeps an empty or whitespace string as a string', () => {
      expect(coerceWorkflowInputValue(numberField, '')).toBe('');
      expect(coerceWorkflowInputValue(numberField, '   ')).toBe('   ');
    });

    it('passes a non-string value through unchanged', () => {
      expect(coerceWorkflowInputValue(numberField, 7)).toBe(7);
      expect(coerceWorkflowInputValue(numberField, true)).toBe(true);
    });
  });

  describe('json valueType', () => {
    const jsonField = field({ valueType: 'json' });

    it('parses a JSON string back to its declared type', () => {
      expect(coerceWorkflowInputValue(jsonField, '42')).toBe(42);
      expect(coerceWorkflowInputValue(jsonField, '[1,2,3]')).toEqual([1, 2, 3]);
      expect(coerceWorkflowInputValue(jsonField, '{"n":0}')).toEqual({ n: 0 });
    });

    it('keeps a non-JSON string as the literal string', () => {
      expect(coerceWorkflowInputValue(jsonField, 'not json')).toBe('not json');
    });

    it('keeps a blank string literal', () => {
      expect(coerceWorkflowInputValue(jsonField, '')).toBe('');
      expect(coerceWorkflowInputValue(jsonField, '   ')).toBe('   ');
    });

    it('passes a non-string value through unchanged', () => {
      expect(coerceWorkflowInputValue(jsonField, [1, 2])).toEqual([1, 2]);
    });
  });

  it('passes text/default values through unchanged', () => {
    expect(coerceWorkflowInputValue(field({ valueType: 'text' }), 'x')).toBe('x');
    expect(coerceWorkflowInputValue(field(), 5)).toBe(5);
  });
});

describe('workflow-inputs — normalizeWorkflowInputValues', () => {
  it('prefers controlName over path, property, and the field value', () => {
    const definition = field({ controlName: 'c', path: 'p', property: 'prop', value: 'fallback' });

    expect(normalizeWorkflowInputValues([definition], { c: 'C', p: 'P', prop: 'PROP' })).toEqual({
      p: 'C',
    });
  });

  it('falls back to path, then property, then the field value', () => {
    const definition = field({ controlName: 'c', path: 'p', property: 'prop', value: 'fallback' });

    expect(normalizeWorkflowInputValues([definition], { p: 'P', prop: 'PROP' })).toEqual({ p: 'P' });
    expect(normalizeWorkflowInputValues([definition], { prop: 'PROP' })).toEqual({ p: 'PROP' });
    expect(normalizeWorkflowInputValues([definition], {})).toEqual({ p: 'fallback' });
  });

  it('assigns a nested dotted path', () => {
    const definition = field({
      path: 'a.b.c',
      property: 'c',
      controlName: 'a__b__c',
      value: 5,
    });

    expect(normalizeWorkflowInputValues([definition], {})).toEqual({ a: { b: { c: 5 } } });
  });

  it('is a no-op for an empty path', () => {
    const definition = field({ path: '', property: '', controlName: '', value: 'x' });

    expect(normalizeWorkflowInputValues([definition], {})).toEqual({});
  });

  it('applies the declared value type to the raw value', () => {
    const definition = field({ path: 'n', property: 'n', controlName: 'n', valueType: 'number' });

    expect(normalizeWorkflowInputValues([definition], { n: '7' })).toEqual({ n: 7 });
  });
});

describe('workflow-inputs — buildWorkflowInputFields control types', () => {
  it('resolves textarea from the element tag', () => {
    expect(fieldFor(port({ element: { tag: 'textarea' } })).controlType).toBe('textarea');
  });

  it('resolves number from the declared type or a numeric bound', () => {
    expect(fieldFor(port({ type: 'number' })).controlType).toBe('number');
    expect(fieldFor(port({ validation: { min: { min: 1 } } })).controlType).toBe('number');
    expect(fieldFor(port({ validation: { max: { max: 1 } } })).controlType).toBe('number');
    expect(fieldFor(port({ validation: { step: { step: 1 } } })).controlType).toBe('number');
  });

  it('resolves checkbox for a boolean port', () => {
    expect(fieldFor(port({ type: 'boolean' })).controlType).toBe('checkbox');
  });

  it('resolves date from the declared type or the DATE validation', () => {
    expect(fieldFor(port({ type: 'date' })).controlType).toBe('date');
    expect(fieldFor(port({ validation: { date: {} } })).controlType).toBe('date');
  });

  it('resolves email and url from their validations', () => {
    expect(fieldFor(port({ validation: { email: {} } })).controlType).toBe('email');
    expect(fieldFor(port({ validation: { url: {} } })).controlType).toBe('url');
  });

  it('falls back to text', () => {
    expect(fieldFor(port({ type: 'string' })).controlType).toBe('text');
    expect(fieldFor(port()).controlType).toBe('text');
  });
});

describe('workflow-inputs — buildWorkflowInputFields validators', () => {
  it('adds the required validator', () => {
    const definition = fieldFor(port({ required: true }));

    expect(definition.required).toBe(true);
    expect(controlWith(definition.validators, '').hasError('required')).toBe(true);
    expect(controlWith(definition.validators, 'x').valid).toBe(true);
  });

  it('bounds a numeric minimum and maximum', () => {
    const definition = fieldFor(
      port({ validation: { min: { min: 5 }, max: { max: 9 } } })
    );

    expect(controlWith(definition.validators, 4).hasError('min')).toBe(true);
    expect(controlWith(definition.validators, 10).hasError('max')).toBe(true);
    expect(controlWith(definition.validators, 7).valid).toBe(true);
  });

  it('rejects a date before the custom minimum and accepts an in-range one', () => {
    const definition = fieldFor(port({ validation: { min: { min: '2024-01-01' } } }));

    expect(controlWith(definition.validators, '2023-12-31').hasError('min')).toBe(true);
    expect(controlWith(definition.validators, '2024-06-01').valid).toBe(true);
    expect(controlWith(definition.validators, '').valid).toBe(true);
  });

  it('rejects a date after the custom maximum and ignores an empty one', () => {
    const definition = fieldFor(port({ validation: { max: { max: '2024-12-31' } } }));

    expect(controlWith(definition.validators, '2025-01-01').hasError('max')).toBe(true);
    expect(controlWith(definition.validators, '2024-06-01').valid).toBe(true);
    expect(controlWith(definition.validators, '').valid).toBe(true);
  });

  it('enforces the step validator', () => {
    const definition = fieldFor(port({ validation: { step: { step: 10 } } }));

    expect(controlWith(definition.validators, 20).valid).toBe(true);
    expect(controlWith(definition.validators, 15).hasError('step')).toBe(true);
  });

  it('enforces minLength and maxLength', () => {
    const minField = fieldFor(port({ validation: { minlength: { minlength: 3 } } }));
    expect(controlWith(minField.validators, 'ab').hasError('minlength')).toBe(true);
    expect(controlWith(minField.validators, 'abc').valid).toBe(true);

    const maxField = fieldFor(port({ validation: { maxlength: { maxlength: 2 } } }));
    expect(controlWith(maxField.validators, 'abc').hasError('maxlength')).toBe(true);
    expect(controlWith(maxField.validators, 'ab').valid).toBe(true);
  });

  it('enforces a pattern', () => {
    const definition = fieldFor(port({ validation: { pattern: { pattern: '^a+$' } } }));

    expect(controlWith(definition.validators, 'aaa').valid).toBe(true);
    expect(controlWith(definition.validators, 'bbb').hasError('pattern')).toBe(true);
  });

  it('rejects a malformed email and accepts a valid one', () => {
    const definition = fieldFor(port({ validation: { email: {} } }));

    expect(controlWith(definition.validators, 'not-an-email').hasError('email')).toBe(true);
    expect(controlWith(definition.validators, 'user@example.com').valid).toBe(true);
  });

  it('rejects a malformed url and accepts a valid one', () => {
    const definition = fieldFor(port({ validation: { url: {} } }));

    expect(controlWith(definition.validators, 'not a url').hasError('pattern')).toBe(true);
    expect(controlWith(definition.validators, 'https://example.com').valid).toBe(true);
  });

  it('rejects a password missing a character class and accepts a conforming one', () => {
    const definition = fieldFor(port({ validation: { password: {} } }));

    expect(controlWith(definition.validators, 'password').hasError('pattern')).toBe(true);
    expect(controlWith(definition.validators, 'Abcdef1!').valid).toBe(true);
  });

  it('enforces an enum while bypassing null/undefined/empty', () => {
    const definition = fieldFor(port({ validation: { enum: { enum: ['a', 'b'] } } }));

    expect(controlWith(definition.validators, 'a').valid).toBe(true);
    expect(controlWith(definition.validators, 'c').hasError('enum')).toBe(true);
    expect(controlWith(definition.validators, '').valid).toBe(true);
    expect(controlWith(definition.validators, null).valid).toBe(true);
    expect(controlWith(definition.validators, undefined).valid).toBe(true);
  });
});

describe('workflow-inputs — decorated valueType derivation', () => {
  it('maps number/checkbox controls to number/boolean', () => {
    expect(fieldFor(port({ type: 'number' })).valueType).toBe('number');
    expect(fieldFor(port({ type: 'boolean' })).valueType).toBe('boolean');
  });

  it('maps array/object/any/model declared types to json', () => {
    for (const type of ['array', 'object', 'any', 'model']) {
      expect(fieldFor(port({ type })).valueType).toBe('json');
    }
  });

  it('defaults everything else to text', () => {
    expect(fieldFor(port({ type: 'string' })).valueType).toBe('text');
    expect(fieldFor(port()).valueType).toBe('text');
  });
});

describe('workflow-inputs — decorated initial-value precedence', () => {
  it('reads values[path] (nested) first', () => {
    const definition = port({ property: 'c', path: 'a.b.c' });

    expect(fieldFor(definition, { a: { b: { c: 'nested' } } }).value).toBe('nested');
  });

  it('then falls back to values[controlName]', () => {
    const definition = port({ property: 'c', path: 'a.b.c' });

    expect(fieldFor(definition, { a__b__c: 'byControl' }).value).toBe('byControl');
  });

  it('then reads the element/prop value', () => {
    expect(fieldFor(port({ path: 'c', element: { props: { value: 'el' } } })).value).toBe('el');
    expect(fieldFor(port({ path: 'c', prop: { value: 'prop' } })).value).toBe('prop');
  });

  it('then reads the validation defaultValue', () => {
    expect(fieldFor(port({ path: 'c', validation: { defaultValue: 'dv' } })).value).toBe('dv');
  });

  it('otherwise resolves to undefined', () => {
    expect(fieldFor(port({ path: 'c' })).value).toBeUndefined();
  });
});

describe('workflow-inputs — buildWorkflowInputFieldsFromPorts', () => {
  it('resolves the control type from the declared schema', () => {
    expect(docField(docPort('n', { schema: { type: 'number' } })).controlType).toBe('number');
    expect(docField(docPort('b', { schema: { type: 'boolean' } })).controlType).toBe('checkbox');
    expect(
      docField(docPort('d', { schema: { type: 'string', format: 'date-time' } })).controlType
    ).toBe('date');
    expect(
      docField(docPort('a', { schema: { type: 'array', items: { type: 'any' } } })).controlType
    ).toBe('textarea');
    expect(
      docField(docPort('o', { schema: { type: 'object', properties: {} } })).controlType
    ).toBe('textarea');
    expect(
      docField(docPort('m', { schema: { type: 'model', name: 'M' } })).controlType
    ).toBe('textarea');
    expect(docField(docPort('x', { schema: { type: 'any' } })).controlType).toBe('textarea');
    expect(docField(docPort('s', { schema: { type: 'string' } })).controlType).toBe('text');
    expect(docField(docPort('plain')).controlType).toBe('text');
  });

  it('resolves the declared submit typing from the control and schema', () => {
    expect(docField(docPort('n', { schema: { type: 'number' } })).valueType).toBe('number');
    expect(docField(docPort('b', { schema: { type: 'boolean' } })).valueType).toBe('boolean');
    expect(docField(docPort('s', { schema: { type: 'string' } })).valueType).toBe('text');
    expect(
      docField(docPort('a', { schema: { type: 'array', items: { type: 'any' } } })).valueType
    ).toBe('json');
    expect(docField(docPort('plain')).valueType).toBe('json');
  });

  it('defaults the label to the port id and honours an explicit label', () => {
    expect(docField(docPort('plain')).label).toBe('plain');
    expect(docField(docPort('plain', { label: 'Plain' })).label).toBe('Plain');
  });

  it('adds a required validator for a required port', () => {
    const definition = docField(docPort('n', { required: true, schema: { type: 'number' } }));

    expect(definition.required).toBe(true);
    expect(controlWith(definition.validators, '').hasError('required')).toBe(true);
  });

  it('bounds a numeric minimum and maximum declared on the schema', () => {
    const definition = docField(
      docPort('n', { schema: { type: 'number', min: 2, max: 8 } })
    );

    expect(controlWith(definition.validators, 1).hasError('min')).toBe(true);
    expect(controlWith(definition.validators, 9).hasError('max')).toBe(true);
    expect(controlWith(definition.validators, 5).valid).toBe(true);
  });

  it('resolves the initial value by port id, then sanitized control name, then default', () => {
    const definition = docPort('a.b', { defaultValue: 'dv' });

    expect(docField(definition, { 'a.b': 'byId' }).value).toBe('byId');
    expect(docField(definition, { a__b: 'byControl' }).value).toBe('byControl');
    expect(docField(definition).value).toBe('dv');
  });
});

describe('workflow-inputs — model class, forms, and instantiation', () => {
  it('names the model class <workflowName>WorkflowInputs', () => {
    const ModelClass = buildWorkflowInputModelClass(
      workflow([port({ property: 'count', path: 'count', type: 'number' })], 'ShipIt')
    );

    expect(ModelClass.name).toBe('ShipItWorkflowInputs');
  });

  it('recurses through nested children without throwing', () => {
    const ModelClass = buildWorkflowInputModelClass(
      workflow(
        [
          port({
            property: 'group',
            name: 'group',
            label: 'Group',
            children: [port({ property: 'inner', name: 'inner', label: 'Inner' })],
          }),
        ],
        'Nested'
      )
    );

    expect(ModelClass.name).toBe('NestedWorkflowInputs');
  });

  it('keys the decorated form controls by the sanitized control name', () => {
    const form = buildWorkflowInputForm(workflow([port({ property: 'c', path: 'a.b.c' })], 'W'));

    expect(Object.keys(form.controls)).toEqual(['a__b__c']);
    expect(form.controls['a.b.c']).toBeUndefined();
    expect(form.controls['a__b__c']).toBeDefined();
  });

  it('keys the port form controls by the sanitized port id', () => {
    const form = buildWorkflowInputFormFromPorts([docPort('a.b')]);

    expect(Object.keys(form.controls)).toEqual(['a__b']);
  });

  it('applies the normalized values to the instantiated model', () => {
    const instance = instantiateWorkflowInputModel(
      workflow([port({ property: 'count', path: 'count', type: 'number' })], 'Counter'),
      { count: '7' }
    );

    expect((instance as unknown as Record<string, unknown>)['count']).toBe(7);
  });
});
