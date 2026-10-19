/**
 * @module for-angular/stories/graph-headerbar
 * @summary Storybook stories for the graph page header bar.
 * @description Covers {@link GraphHeaderbarComponent} across its title, actions and engine-affordance states.
 */
import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, Input, ViewChild } from '@angular/core';
import type { Meta, StoryObj } from '@storybook/angular';
import { GraphHeaderbarComponent } from 'src/graph/components/graph-headerbar/graph-headerbar.component';
import './setup';
import { getComponentMeta } from './utils';

type HeaderTab = 'editor' | 'executions' | 'evaluations';

@Component({
  selector: 'story-graph-headerbar-host',
  standalone: true,
  imports: [CommonModule, GraphHeaderbarComponent],
  template: `
    <ngx-decaf-graph-headerbar
      [projectName]="projectName"
      [workflowName]="workflowName"
    />
  `,
})
class GraphHeaderbarHostComponent implements AfterViewInit {
  @Input() projectName = 'Personal';
  @Input() workflowName = 'My workflow 2';
  @Input() tab: HeaderTab = 'editor';
  @Input() editingName = false;
  @Input() tags: string[] = [];

  @ViewChild(GraphHeaderbarComponent) bar?: GraphHeaderbarComponent;

  ngAfterViewInit(): void {
    if (!this.bar) return;
    this.bar.setActiveTab(this.tab);
    if (this.tags.length) this.bar.tags.set(this.tags);
    if (this.editingName) this.bar.startEditingName();
  }
}

const component = getComponentMeta<GraphHeaderbarHostComponent>([]);
const meta: Meta<GraphHeaderbarHostComponent> = {
  title: 'Graph/Panels/Header Bar',
  component: GraphHeaderbarHostComponent,
  ...component,
};
export default meta;
type Story = StoryObj<GraphHeaderbarHostComponent>;

export const defaultNames: Story = {
  args: { projectName: 'Personal', workflowName: 'My workflow 2' },
};

export const customNames: Story = {
  args: { projectName: 'Acme Analytics', workflowName: 'Nightly enrichment' },
};

export const executionsTab: Story = {
  args: { projectName: 'Acme Analytics', workflowName: 'Nightly enrichment', tab: 'executions' },
};

export const evaluationsTab: Story = {
  args: { projectName: 'Acme Analytics', workflowName: 'Nightly enrichment', tab: 'evaluations' },
};

export const renameEditing: Story = {
  args: { projectName: 'Personal', workflowName: 'My workflow 2', editingName: true },
};

export const withTags: Story = {
  args: { projectName: 'Personal', workflowName: 'My workflow 2', tags: ['production', 'etl'] },
};
