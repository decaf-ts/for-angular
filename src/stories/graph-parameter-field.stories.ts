/**
 * @module for-angular/stories/graph-parameter-field
 * @summary Storybook stories for the graph parameter field.
 * @description Covers {@link GraphParameterFieldComponent} rendering across the declared parameter kinds and form contexts.
 */
import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import type {
  GraphNodeInstance,
  GraphNodeManifest,
  GraphParameterDefinition,
} from '@decaf-ts/as-graph/shared';
import type { Meta, StoryObj } from '@storybook/angular';
import { GraphParameterFieldComponent } from 'src/diagrams/components/graph/parameters/components/graph-parameter-field.component';
import type { GraphParameterFormContext } from 'src/diagrams/components/graph/parameters';
import './setup';
import { getComponentMeta } from './utils';

const MANIFEST = {
  kind: 'demo.node',
  display: { name: 'Demo', description: '', category: 'Utility', labels: [], width: 120, height: 80 },
  inputs: [],
  outputs: [],
} as unknown as GraphNodeManifest;

const INSTANCE: GraphNodeInstance = { id: 'demo-1', kind: 'demo.node', parameters: {}, inputBindings: {} };

function context(credentialOptions: GraphParameterFormContext['credentialOptions'] = []): GraphParameterFormContext {
  return { node: INSTANCE, manifest: MANIFEST, values: {}, credentialOptions };
}

function def(definition: GraphParameterDefinition): GraphParameterDefinition {
  return definition;
}

/**
 * Host wrapper for {@link GraphParameterFieldComponent}: renders one schema
 * parameter through the parameter renderer registry, so every supported
 * parameter type and its variants can be captured.
 */
@Component({
  selector: 'story-graph-parameter-field-host',
  standalone: true,
  imports: [CommonModule, GraphParameterFieldComponent],
  template: `
    <div style="width: 420px; background: #ffffff; padding: 0.5rem 1rem">
      <app-graph-parameter-field
        [parameter]="parameter"
        [value]="value"
        [disabled]="disabled"
        [context]="context"
      />
    </div>
  `,
})
class GraphParameterFieldHostComponent {
  @Input() parameter: GraphParameterDefinition = def({ id: 'name', label: 'Name', type: 'string' });
  @Input() value: unknown = '';
  @Input() disabled = false;
  @Input() context: GraphParameterFormContext = context();
}

const component = getComponentMeta<GraphParameterFieldHostComponent>([]);
const meta: Meta<GraphParameterFieldHostComponent> = {
  title: 'Graph/Parameters/Parameter Field',
  component: GraphParameterFieldHostComponent,
  ...component,
  argTypes: {
    ...component.argTypes,
    parameter: { control: false, table: { disable: true } },
    context: { control: false, table: { disable: true } },
  },
};
export default meta;
type Story = StoryObj<GraphParameterFieldHostComponent>;

/** `string` parameter: single-line text input. */
export const stringSingleLine: Story = {
  args: { parameter: def({ id: 'name', label: 'Name', type: 'string', placeholder: 'Node name' }), value: 'Split text' },
};

/** `string` parameter with `multiline`: textarea. */
export const stringMultiline: Story = {
  args: {
    parameter: def({ id: 'prompt', label: 'Prompt', type: 'string', multiline: true, placeholder: 'Describe the task' }),
    value: 'Summarize the input document.',
  },
};

/** `number` parameter: free-form numeric input. */
export const numberDecimal: Story = {
  args: { parameter: def({ id: 'ratio', label: 'Ratio', type: 'number', min: 0, max: 1, step: 0.1 }), value: 0.5 },
};

/** `number` parameter with `integer`: integer input. */
export const numberInteger: Story = {
  args: { parameter: def({ id: 'count', label: 'Count', type: 'number', integer: true, min: 1 }), value: 3 },
};

/** `boolean` parameter, checked. */
export const booleanOn: Story = {
  args: { parameter: def({ id: 'strict', label: 'Strict mode', type: 'boolean' }), value: true },
};

/** `boolean` parameter, unchecked. */
export const booleanOff: Story = {
  args: { parameter: def({ id: 'strict', label: 'Strict mode', type: 'boolean' }), value: false },
};

/** `options` parameter: fixed single-select list. */
export const optionsSingle: Story = {
  args: {
    parameter: def({
      id: 'mode',
      label: 'Mode',
      type: 'options',
      options: [
        { label: 'Fast', value: 'fast' },
        { label: 'Balanced', value: 'balanced' },
        { label: 'Thorough', value: 'thorough' },
      ],
    }),
    value: 'balanced',
  },
};

/** `options` parameter with `multiple`: multi-select list. */
export const optionsMultiple: Story = {
  args: {
    parameter: def({
      id: 'tags',
      label: 'Tags',
      type: 'options',
      multiple: true,
      options: [
        { label: 'Transform', value: 'transform' },
        { label: 'Validate', value: 'validate' },
        { label: 'Enrich', value: 'enrich' },
      ],
    }),
    value: ['transform', 'enrich'],
  },
};

/** `collection` parameter: repeatable primitive items. */
export const collectionPrimitive: Story = {
  args: {
    parameter: def({ id: 'columns', label: 'Columns', type: 'collection', itemLabelPath: 'value', maxItems: 5 }),
    value: ['id', 'name'],
  },
};

/** `collection` parameter with `itemParameters`: repeatable record rows. */
export const collectionRecords: Story = {
  args: {
    parameter: def({
      id: 'headers',
      label: 'Headers',
      type: 'collection',
      itemIdPath: 'key',
      itemParameters: [
        { id: 'key', label: 'Key', type: 'string' },
        { id: 'value', label: 'Value', type: 'string' },
      ],
    }),
    value: [{ key: 'Authorization', value: 'Bearer …' }],
  },
};

/** `object` parameter: nested structured fields. */
export const objectProperties: Story = {
  args: {
    parameter: def({
      id: 'retry',
      label: 'Retry policy',
      type: 'object',
      properties: [
        { id: 'attempts', label: 'Attempts', type: 'number', integer: true },
        { id: 'backoff', label: 'Backoff (ms)', type: 'number' },
      ],
    }),
    value: { attempts: 3, backoff: 500 },
  },
};

/** `code` parameter: code editor. */
export const codeJavascript: Story = {
  args: {
    parameter: def({ id: 'code', label: 'Code', type: 'code', language: 'javascript' }),
    value: 'return $input.value * 2;',
  },
};

/** `expression` parameter: inline expression input. */
export const expression: Story = {
  args: {
    parameter: def({ id: 'expression', label: 'Expression', type: 'expression', placeholder: '{{ inputs.value }}' }),
    value: '{{ inputs.value }}',
  },
};

/** `resourceLocator` parameter limited to the `list` mode. */
export const resourceLocatorList: Story = {
  args: {
    parameter: def({ id: 'table', label: 'Table', type: 'resourceLocator', modes: ['list'] }),
    value: { mode: 'list', value: 'public.users' },
  },
};

/** `resourceLocator` parameter advertising `list` and `dynamic` modes. */
export const resourceLocatorDynamic: Story = {
  args: {
    parameter: def({ id: 'table', label: 'Table', type: 'resourceLocator', modes: ['list', 'dynamic'] }),
    value: { mode: 'dynamic', placeholder: '${env.TABLE}' },
  },
};

/** `credential` parameter bound to a credential type with options available. */
export const credential: Story = {
  args: {
    parameter: def({ id: 'apiKey', label: 'API key', type: 'credential', credentialType: 'apiKey' }),
    value: { credentialId: 'cred-1', credentialType: 'apiKey' },
    context: context([
      { credentialId: 'cred-1', credentialType: 'apiKey' },
      { credentialId: 'cred-2', credentialType: 'apiKey' },
    ]),
  },
};

/** `notice` parameter, informational variant. */
export const noticeInfo: Story = {
  args: {
    parameter: def({ id: 'note', label: 'This node calls a paid API.', type: 'notice', noticeVariant: 'info', noticeContent: '' }),
  },
};

/** `notice` parameter, warning variant. */
export const noticeWarning: Story = {
  args: {
    parameter: def({ id: 'note', label: 'This node is deprecated.', type: 'notice', noticeVariant: 'warning', noticeContent: '' }),
  },
};

/** `notice` parameter, error variant. */
export const noticeError: Story = {
  args: {
    parameter: def({ id: 'note', label: 'Missing required credential.', type: 'notice', noticeVariant: 'error', noticeContent: '' }),
  },
};

/** `hidden` parameter: never rendered (documents the no-op surface). */
export const hiddenParameter: Story = {
  args: { parameter: def({ id: 'token', label: 'Token', type: 'hidden' }), value: 'secret' },
};

/** Disabled field: the renderer is mounted read-only. */
export const disabled: Story = {
  args: {
    parameter: def({ id: 'name', label: 'Name', type: 'string' }),
    value: 'Locked value',
    disabled: true,
  },
};
