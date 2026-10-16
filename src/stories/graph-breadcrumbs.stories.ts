/**
 * @module for-angular/stories/graph-breadcrumbs
 * @summary Storybook stories for the graph page breadcrumbs.
 * @description Covers {@link GraphBreadcrumbsComponent} step rendering and navigation across the workflows/editor hierarchy.
 */
import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, Input, ViewChild } from '@angular/core';
import type { Meta, StoryObj } from '@storybook/angular';
import {
  GraphBreadcrumbsComponent,
  type GraphBreadcrumbStep,
} from 'src/app/pages/graph/graph-breadcrumbs.component';
import './setup';
import { getComponentMeta } from './utils';

const STEPS: GraphBreadcrumbStep[] = [
  { id: 'workflows', labelKey: 'graph.breadcrumbs.workflows', route: '/workflows' },
];

/**
 * Host wrapper for {@link GraphBreadcrumbsComponent}: renders the breadcrumb
 * trail and optionally opens the in-place rename editor.
 */
@Component({
  selector: 'story-graph-breadcrumbs-host',
  standalone: true,
  imports: [CommonModule, GraphBreadcrumbsComponent],
  template: `
    <div style="width: 720px; padding: 1rem">
      <app-graph-breadcrumbs
        [steps]="steps"
        [workflowName]="workflowName"
        [renamable]="renamable"
      />
    </div>
  `,
})
class GraphBreadcrumbsHostComponent implements AfterViewInit {
  @Input() steps: GraphBreadcrumbStep[] = STEPS;
  @Input() workflowName = 'Text pipeline';
  @Input() renamable = true;
  @Input() startEditing = false;

  @ViewChild(GraphBreadcrumbsComponent) private breadcrumbs?: GraphBreadcrumbsComponent;

  ngAfterViewInit(): void {
    if (this.startEditing) this.breadcrumbs?.startRename();
  }
}

const component = getComponentMeta<GraphBreadcrumbsHostComponent>([]);
const meta: Meta<GraphBreadcrumbsHostComponent> = {
  title: 'Graph/Navigation/Breadcrumbs',
  component: GraphBreadcrumbsHostComponent,
  ...component,
  argTypes: {
    ...component.argTypes,
    steps: { control: false, table: { disable: true } },
  },
};
export default meta;
type Story = StoryObj<GraphBreadcrumbsHostComponent>;

/** Editable trail with a leading workflows step and the current workflow name. */
export const editable: Story = {
  args: { workflowName: 'Text pipeline', renamable: true },
};

/** Read-only trail (read operation): no rename affordance. */
export const readOnly: Story = {
  args: { workflowName: 'Text pipeline', renamable: false },
};

/** Untitled workflow: the trailing step falls back to its placeholder. */
export const untitled: Story = {
  args: { workflowName: '', renamable: true },
};

/** In-place rename editor open on the trailing step. */
export const renameEditing: Story = {
  args: { workflowName: 'Text pipeline', renamable: true, startEditing: true },
};
