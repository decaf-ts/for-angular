/**
 * @module for-angular/stories/graph-home
 * @summary Storybook stories for the graph home panel.
 * @description Covers {@link GraphHomeComponent} landing/empty states of the graph workspace.
 */
import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, Input, ViewChild } from '@angular/core';
import type { Meta, StoryObj } from '@storybook/angular';
import { GraphHomeComponent } from 'diagrams/src/lib/graph/components/home/home.component';
import './setup';
import { getComponentMeta } from './utils';

type HomeTab = 'workflows' | 'credentials' | 'executions';

/**
 * Host wrapper for {@link GraphHomeComponent}: selects one of the three home
 * tabs after the view initialises so each tab configuration is captured.
 */
@Component({
  selector: 'story-graph-home-host',
  standalone: true,
  imports: [CommonModule, GraphHomeComponent],
  template: `
    <div style="height: 320px; background: #0b1220; padding: 1rem">
      <ngx-decaf-graph-home />
    </div>
  `,
})
class GraphHomeHostComponent implements AfterViewInit {
  @Input() tab: HomeTab = 'workflows';

  @ViewChild(GraphHomeComponent) private home?: GraphHomeComponent;

  ngAfterViewInit(): void {
    this.home?.selectTab(this.tab);
  }
}

const component = getComponentMeta<GraphHomeHostComponent>([]);
const meta: Meta<GraphHomeHostComponent> = {
  title: 'Graph/Navigation/Home',
  component: GraphHomeHostComponent,
  ...component,
};
export default meta;
type Story = StoryObj<GraphHomeHostComponent>;

/** Default tab: the workflows landing surface. */
export const workflowsTab: Story = {
  args: { tab: 'workflows' },
};

/** Credentials tab configuration. */
export const credentialsTab: Story = {
  args: { tab: 'credentials' },
};

/** Executions tab configuration. */
export const executionsTab: Story = {
  args: { tab: 'executions' },
};
