/**
 * @module for-angular/stories/graph-parameter-renderers
 * @summary Storybook stories for the graph parameter renderer components.
 * @description Covers the per-kind parameter renderers (boolean, code, numeric, text, selection, ...) across their configured states.
 */
import { CommonModule, NgComponentOutlet } from '@angular/common';
import { Component, Input, Type } from '@angular/core';
import type {
  GraphJsonValue,
  GraphParameterDefinition,
} from '@decaf-ts/as-graph/shared';
import type { Meta, StoryObj } from '@storybook/angular';
import { GraphBooleanParameterComponent } from 'src/graph/parameters/components/graph-boolean-parameter.component';
import { GraphCodeParameterComponent } from 'src/graph/parameters/components/graph-code-parameter.component';
import { GraphCollectionParameterComponent } from 'src/graph/parameters/components/graph-collection-parameter.component';
import { GraphCredentialParameterComponent } from 'src/graph/parameters/components/graph-credential-parameter.component';
import { GraphExpressionParameterComponent } from 'src/graph/parameters/components/graph-expression-parameter.component';
import { GraphGenericParameterComponent } from 'src/graph/parameters/components/graph-generic-parameter.component';
import { GraphHiddenParameterComponent } from 'src/graph/parameters/components/graph-hidden-parameter.component';
import { GraphNoticeParameterComponent } from 'src/graph/parameters/components/graph-notice-parameter.component';
import { GraphNumberParameterComponent } from 'src/graph/parameters/components/graph-number-parameter.component';
import { GraphObjectParameterComponent } from 'src/graph/parameters/components/graph-object-parameter.component';
import { GraphOptionsParameterComponent } from 'src/graph/parameters/components/graph-options-parameter.component';
import { GraphResourceLocatorParameterComponent } from 'src/graph/parameters/components/graph-resource-locator-parameter.component';
import { GraphTextParameterComponent } from 'src/graph/parameters/components/graph-text-parameter.component';
import type { GraphParameterFormContext } from 'src/graph/parameters/GraphParameterRendererContract';
import './setup';
import { getComponentMeta } from './utils';

const CONTEXT: GraphParameterFormContext = {
  node: { id: 'code-1', kind: 'core.utility.code', parameters: {}, inputBindings: {} },
  manifest: { kind: 'core.utility.code' } as never,
  values: {},
  credentialOptions: [
    { id: 'cred-openai', name: 'OpenAI', type: 'apiKey' } as never,
    { id: 'cred-db', name: 'Primary DB', type: 'password' } as never,
  ],
};

@Component({
  selector: 'story-graph-parameter-renderer-host',
  standalone: true,
  imports: [CommonModule, NgComponentOutlet],
  template: `
    <div style="max-width: 440px">
      <ng-container
        [ngComponentOutlet]="renderer"
        [ngComponentOutletInputs]="inputs"
      />
    </div>
  `,
})
class GraphParameterRendererHostComponent {
  @Input({ required: true }) renderer!: Type<unknown>;
  @Input({ required: true }) parameter!: GraphParameterDefinition;
  @Input() value: GraphJsonValue | undefined;
  @Input() disabled = false;
  @Input() context: GraphParameterFormContext | undefined = CONTEXT;

  get inputs(): Record<string, unknown> {
    return {
      parameter: this.parameter,
      value: this.value,
      disabled: this.disabled,
      context: this.context,
    };
  }
}

const component = getComponentMeta<GraphParameterRendererHostComponent>([], 'component', {}, []);
const meta: Meta<GraphParameterRendererHostComponent> = {
  title: 'Graph/Parameters/Renderers',
  component: GraphParameterRendererHostComponent,
  ...component,
  argTypes: {
    ...component.argTypes,
    renderer: { control: false, table: { disable: true } },
    parameter: { control: false, table: { disable: true } },
    context: { control: false, table: { disable: true } },
    value: { control: false, table: { disable: true } },
  },
};
export default meta;
type Story = StoryObj<GraphParameterRendererHostComponent>;

export const textSingleLine: Story = {
  args: {
    renderer: GraphTextParameterComponent,
    parameter: { id: 'label', label: 'Label', type: 'string', placeholder: 'Enter a label' },
    value: 'hello world',
  },
};

export const textMultiline: Story = {
  args: {
    renderer: GraphTextParameterComponent,
    parameter: { id: 'body', label: 'Body', type: 'string', multiline: true },
    value: 'line one\nline two',
  },
};

export const numberDecimal: Story = {
  args: {
    renderer: GraphNumberParameterComponent,
    parameter: { id: 'ratio', label: 'Ratio', type: 'number', step: 0.1 },
    value: 0.75,
  },
};

export const numberInteger: Story = {
  args: {
    renderer: GraphNumberParameterComponent,
    parameter: { id: 'retries', label: 'Retries', type: 'number', integer: true, min: 0, max: 10 },
    value: 3,
  },
};

export const booleanOn: Story = {
  args: {
    renderer: GraphBooleanParameterComponent,
    parameter: { id: 'strict', label: 'Strict mode', type: 'boolean' },
    value: true,
  },
};

export const booleanOff: Story = {
  args: {
    renderer: GraphBooleanParameterComponent,
    parameter: { id: 'strict', label: 'Strict mode', type: 'boolean' },
    value: false,
  },
};

export const optionsSingle: Story = {
  args: {
    renderer: GraphOptionsParameterComponent,
    parameter: {
      id: 'level',
      label: 'Level',
      type: 'options',
      options: [
        { label: 'Info', value: 'info' },
        { label: 'Warning', value: 'warn' },
        { label: 'Error', value: 'error' },
      ],
    },
    value: 'info',
  },
};

export const optionsMultiple: Story = {
  args: {
    renderer: GraphOptionsParameterComponent,
    parameter: {
      id: 'channels',
      label: 'Channels',
      type: 'options',
      multiple: true,
      options: [
        { label: 'Email', value: 'email' },
        { label: 'Slack', value: 'slack' },
      ],
    },
    value: ['email'],
  },
};

export const optionsDynamicLoading: Story = {
  args: {
    renderer: GraphOptionsParameterComponent,
    parameter: { id: 'dataset', label: 'Dataset', type: 'options', loadOptionsMethod: 'loadDatasets' },
    value: undefined,
    context: undefined,
  },
};

export const collectionPrimitive: Story = {
  args: {
    renderer: GraphCollectionParameterComponent,
    parameter: {
      id: 'tags',
      label: 'Tags',
      type: 'collection',
      itemParameters: [{ id: 'tag', label: 'Tag', type: 'string' }],
    },
    value: ['alpha', 'beta'],
  },
};

export const collectionRecords: Story = {
  args: {
    renderer: GraphCollectionParameterComponent,
    parameter: {
      id: 'mappings',
      label: 'Mappings',
      type: 'collection',
      itemIdPath: 'from',
      itemLabelPath: 'from',
      itemParameters: [
        { id: 'from', label: 'From', type: 'string' },
        { id: 'to', label: 'To', type: 'string' },
      ],
    },
    value: [{ from: 'a', to: 'b' }],
  },
};

export const objectProperties: Story = {
  args: {
    renderer: GraphObjectParameterComponent,
    parameter: {
      id: 'connection',
      label: 'Connection',
      type: 'object',
      properties: [
        { id: 'host', label: 'Host', type: 'string' },
        { id: 'port', label: 'Port', type: 'number', integer: true },
      ],
    },
    value: { host: 'localhost', port: 5432 },
  },
};

export const codeJavascript: Story = {
  args: {
    renderer: GraphCodeParameterComponent,
    parameter: { id: 'code', label: 'Code', type: 'code', language: 'javascript' },
    value: 'return $input.value * 2;',
  },
};

export const codeTypescript: Story = {
  args: {
    renderer: GraphCodeParameterComponent,
    parameter: { id: 'code', label: 'Code', type: 'code', language: 'typescript' },
    value: 'const value: number = 42;',
  },
};

export const expression: Story = {
  args: {
    renderer: GraphExpressionParameterComponent,
    parameter: { id: 'predicate', label: 'Predicate', type: 'expression' },
    value: '$input.value > 0',
  },
};

export const resourceLocatorSingle: Story = {
  args: {
    renderer: GraphResourceLocatorParameterComponent,
    parameter: { id: 'source', label: 'Source', type: 'resourceLocator', modes: ['list'] },
    value: 's3://bucket/key',
  },
};

export const resourceLocatorDynamic: Story = {
  args: {
    renderer: GraphResourceLocatorParameterComponent,
    parameter: { id: 'source', label: 'Source', type: 'resourceLocator', modes: ['list', 'dynamic'] },
    value: { mode: 'dynamic', value: 'https://example.test/data.json' },
  },
};

export const credentialWithOptions: Story = {
  args: {
    renderer: GraphCredentialParameterComponent,
    parameter: { id: 'credential', label: 'Credential', type: 'credential', credentialType: 'apiKey' },
    value: 'cred-openai',
  },
};

export const credentialEmpty: Story = {
  args: {
    renderer: GraphCredentialParameterComponent,
    parameter: { id: 'credential', label: 'Credential', type: 'credential', credentialType: 'apiKey' },
    value: undefined,
    context: { ...CONTEXT, credentialOptions: [] },
  },
};

export const noticeInfo: Story = {
  args: {
    renderer: GraphNoticeParameterComponent,
    parameter: { id: 'hint', label: 'Hint', type: 'notice', noticeVariant: 'info', noticeContent: 'Uses the workspace default credentials.' },
  },
};

export const noticeWarning: Story = {
  args: {
    renderer: GraphNoticeParameterComponent,
    parameter: { id: 'warn', label: 'Warning', type: 'notice', noticeVariant: 'warning', noticeContent: 'This action cannot be undone.' },
  },
};

export const noticeError: Story = {
  args: {
    renderer: GraphNoticeParameterComponent,
    parameter: { id: 'err', label: 'Error', type: 'notice', noticeVariant: 'error', noticeContent: 'The referenced dataset is unavailable.' },
  },
};

export const hiddenParameter: Story = {
  args: {
    renderer: GraphHiddenParameterComponent,
    parameter: { id: 'secret', label: 'Secret', type: 'hidden' },
  },
};

export const genericFallback: Story = {
  args: {
    renderer: GraphGenericParameterComponent,
    parameter: { id: 'custom', label: 'Custom', type: 'string' },
    value: 'fallback rendering',
  },
};
