/**
 * @module for-angular/graph/components/graph-node-edit-modal/graph-node-edit-modal-value-modes.spec
 * @summary Editor-writable expression bindings, `GraphValueTemplate`
 * parameters, and if/while/until condition wiring (DECAF-50 §13 gaps 2 & 3).
 * @description Proves the node edit modal writes the full value-input-mode
 * contract on save (edge/literal/expression bindings plus persisted
 * `GraphValueTemplate` parameters), gates parameter rows through the declarative
 * visibility DSL, and persists a `CodeCondition` into `parameters.condition` for
 * condition nodes.
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ModalController } from '@ionic/angular/standalone';
import { PortDirection, type GraphParameterDefinition } from '@decaf-ts/as-graph/shared';

import {
  GraphNodeEditModalComponent,
  type GraphNodeEditResult,
} from './graph-node-edit-modal.component';
import type { GraphDemoNodeData } from '../../types';

/** Builds a node-data fixture with the given kind and ports. */
function nodeData(kind: string, ports: GraphDemoNodeData['ports']): GraphDemoNodeData {
  return {
    title: kind,
    description: kind,
    kind,
    labels: [],
    ports,
    sourceClass: kind,
  };
}

function codePort() {
  return {
    property: 'code',
    name: 'code',
    label: 'Code',
    direction: PortDirection.INPUT,
    type: 'code',
    required: false,
    hidden: false,
    element: { tag: 'code-editor' },
    graph: { direction: PortDirection.INPUT, userControlled: true },
  } as GraphDemoNodeData['ports'][number];
}

/** Mounts the modal with the given inputs and captures the dismiss payload. */
function render(overrides: {
  kind?: string;
  ports?: GraphDemoNodeData['ports'];
  parameterDefs?: GraphParameterDefinition[];
  parameters?: Record<string, unknown>;
}): {
  fixture: ComponentFixture<GraphNodeEditModalComponent>;
  dismiss: jest.Mock;
} {
  const dismiss = jest.fn();
  TestBed.configureTestingModule({
    providers: [{ provide: ModalController, useValue: { dismiss } }],
  });
  const fixture = TestBed.createComponent(GraphNodeEditModalComponent);
  const kind = overrides.kind ?? 'core.utility.code';
  fixture.componentRef.setInput('nodeId', 'node-1');
  fixture.componentRef.setInput('nodeData', nodeData(kind, overrides.ports ?? []));
  fixture.componentRef.setInput(
    'nodeInstance',
    { id: 'node-1', kind, parameters: overrides.parameters ?? {} }
  );
  fixture.componentRef.setInput('parameterDefs', overrides.parameterDefs ?? []);
  fixture.detectChanges();
  return { fixture, dismiss };
}

/** Returns the `GraphNodeEditResult` the modal dismissed with. */
function savedResult(dismiss: jest.Mock): GraphNodeEditResult {
  expect(dismiss).toHaveBeenCalledTimes(1);
  return dismiss.mock.calls[0][0] as GraphNodeEditResult;
}

describe('GraphNodeEditModalComponent — value modes & condition wiring (DECAF-50 §13)', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('writes an expression binding and a persisted GraphValueTemplate on save', () => {
    const { fixture, dismiss } = render({ ports: [codePort()] });

    fixture.componentInstance.onFieldModeChange({ property: 'code', mode: 'expression' });
    fixture.componentInstance.onFieldChange({
      property: 'code',
      value: 'return $input.value * 2;',
      useAsPort: false,
    });
    fixture.componentInstance.save();

    const result = savedResult(dismiss);
    expect(result.inputBindings['code']).toEqual({
      mode: 'expression',
      expression: 'return $input.value * 2;',
    });
    expect(result.parameters['code']).toEqual({
      mode: 'expression',
      expression: 'return $input.value * 2;',
      language: 'javascript',
    });
  });

  it('writes a persisted template parameter in template mode', () => {
    const { fixture, dismiss } = render({ ports: [codePort()] });

    fixture.componentInstance.onFieldModeChange({ property: 'code', mode: 'template' });
    fixture.componentInstance.onFieldChange({
      property: 'code',
      value: 'Hello {{ $input.name }}',
      useAsPort: false,
    });
    fixture.componentInstance.save();

    const result = savedResult(dismiss);
    expect(result.inputBindings['code']).toBeUndefined();
    expect(result.parameters['code']).toEqual({
      mode: 'template',
      expression: 'Hello {{ $input.name }}',
      language: 'text',
    });
  });

  it('seeds the mode and body from an existing persisted template', () => {
    const { fixture } = render({
      ports: [codePort()],
      parameters: {
        code: { mode: 'template', expression: 'Hi {{ $input.x }}', language: 'text' },
      },
    });

    expect(fixture.componentInstance._portValueModes()['code']).toBe('template');
    expect(fixture.componentInstance._values()['code']).toBe('Hi {{ $input.x }}');
  });

  it('persists a CodeCondition into parameters.condition for a condition node', () => {
    const { fixture, dismiss } = render({ kind: 'core.flow.if', ports: [codePort()] });

    expect(fixture.componentInstance.isConditionNode()).toBe(true);
    fixture.componentInstance.onConditionChange({
      condition: { type: 'code', code: 'return $input.value > 0;', language: 'javascript' },
      valid: true,
    });
    fixture.componentInstance.save();

    const result = savedResult(dismiss);
    expect(result.parameters['condition']).toEqual({
      type: 'code',
      code: 'return $input.value > 0;',
      language: 'javascript',
    });
  });

  it('blocks save while a condition node has an invalid condition', () => {
    const { fixture, dismiss } = render({ kind: 'core.loop.while', ports: [codePort()] });

    fixture.componentInstance.onConditionChange({
      condition: { type: 'code', code: '', language: 'javascript' },
      valid: false,
    });
    fixture.componentInstance.save();

    expect(dismiss).not.toHaveBeenCalled();
  });

  it('gates parameter rows through the declarative visibility DSL', () => {
    const parameterDefs: GraphParameterDefinition[] = [
      { id: 'mode', label: 'Mode', type: 'string', defaultValue: 'a' },
      {
        id: 'detail',
        label: 'Detail',
        type: 'string',
        visibility: { op: 'eq', parameter: 'mode', value: 'b' },
      },
    ];

    const { fixture } = render({ parameterDefs, parameters: { mode: 'a' } });

    expect(fixture.componentInstance.parameterFields().map((field) => field.id)).toEqual(['mode']);
  });

  it('renders a hidden parameter when its visibility expression holds', () => {
    const parameterDefs: GraphParameterDefinition[] = [
      { id: 'mode', label: 'Mode', type: 'string', defaultValue: 'a' },
      {
        id: 'detail',
        label: 'Detail',
        type: 'string',
        visibility: { op: 'eq', parameter: 'mode', value: 'b' },
      },
    ];

    const { fixture } = render({ parameterDefs, parameters: { mode: 'b' } });

    expect(fixture.componentInstance.parameterFields().map((field) => field.id)).toEqual([
      'detail',
      'mode',
    ]);
  });
});
