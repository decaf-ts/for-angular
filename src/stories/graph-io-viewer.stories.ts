/**
 * @module for-angular/stories/graph-io-viewer
 * @summary Storybook stories for the node I/O viewer.
 * @description Covers {@link GraphIoViewerComponent} across the json/table/raw representations, the byte/line render cap with its truncation notice (SAA-722) and the full-payload download affordance.
 */
import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, Input, ViewChild } from '@angular/core';
import type { Meta, StoryObj } from '@storybook/angular';
import {
  GraphIoViewerComponent,
  type GraphIoViewMode,
  type GraphIoViewerField,
} from 'diagrams/src/lib/graph/components/graph-io-viewer/graph-io-viewer.component';
import './setup';
import { getComponentMeta } from './utils';

@Component({
  selector: 'story-graph-io-viewer-host',
  standalone: true,
  imports: [CommonModule, GraphIoViewerComponent],
  template: `
    <div style="height: 360px">
      <app-graph-io-viewer
        [title]="title"
        [value]="value"
        [error]="error"
        [runId]="runId"
        [nodeId]="nodeId"
        [field]="field"
      />
    </div>
  `,
})
class GraphIoViewerHostComponent implements AfterViewInit {
  @Input() title = '';
  @Input() value: unknown = undefined;
  @Input() error: { name?: string; message?: string; stack?: string } | null = null;
  @Input() runId = '';
  @Input() nodeId = '';
  @Input() field: GraphIoViewerField = 'inputs';
  @Input() mode: GraphIoViewMode = 'json';

  @ViewChild(GraphIoViewerComponent) viewer?: GraphIoViewerComponent;

  ngAfterViewInit(): void {
    this.viewer?.setMode(this.mode);
  }
}

const component = getComponentMeta<GraphIoViewerHostComponent>([]);
const meta: Meta<GraphIoViewerHostComponent> = {
  title: 'Graph/Panels/IO Viewer',
  component: GraphIoViewerHostComponent,
  ...component,
  argTypes: {
    ...component.argTypes,
    value: { control: false, table: { disable: true } },
    error: { control: false, table: { disable: true } },
  },
};
export default meta;
type Story = StoryObj<GraphIoViewerHostComponent>;

export const objectValue: Story = {
  args: {
    title: 'Run inputs',
    value: { text: 'hello world', count: 3, nested: { ok: true } },
  },
};

export const arrayValue: Story = {
  args: {
    title: 'Run outputs',
    value: ['alpha', 'beta', 'gamma'],
  },
};

export const primitiveValue: Story = {
  args: {
    title: 'Run outputs',
    value: 'plain text result',
  },
};

export const errorValue: Story = {
  args: {
    title: 'Run outputs',
    value: null,
    error: {
      name: 'GraphNodeError',
      message: 'Code node failed: reference $input.value is not defined',
      stack: 'Error: reference $input.value is not defined\n    at CodeGraphNodeExecutor.run (code.executor.ts:42)',
    },
  },
};

export const empty: Story = {
  args: {
    title: 'Run outputs',
    value: null,
  },
};

export const tableMode: Story = {
  args: {
    title: 'Run outputs',
    value: { result: 42, total: 21, nested: { ok: true }, empty: null },
    mode: 'table',
  },
};

export const tableModeArrayOfRecords: Story = {
  args: {
    title: 'Run outputs',
    value: [
      { id: 'a', value: 1 },
      { id: 'b', value: 2 },
    ],
    mode: 'table',
  },
};

export const rawMode: Story = {
  args: {
    title: 'Run inputs',
    value: { code: 'return $input.value * 2;', value: 21 },
    mode: 'raw',
  },
};

export const emptyObject: Story = {
  args: {
    title: 'Run outputs',
    value: {},
  },
};

export const emptyArray: Story = {
  args: {
    title: 'Run outputs',
    value: [],
  },
};

export const downloadEnabled: Story = {
  args: {
    title: 'Run outputs',
    value: { result: 42 },
    runId: 'run-42',
    nodeId: 'code-1',
    field: 'outputs',
  },
};

export const truncatedPayload: Story = {
  args: {
    title: 'Run outputs',
    value: { rows: Array.from({ length: 4000 }, (_, index) => ({ index, value: `row-${index}` })) },
    runId: 'run-42',
    nodeId: 'code-1',
  },
};
