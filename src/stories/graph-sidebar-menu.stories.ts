/**
 * @module for-angular/stories/graph-sidebar-menu
 * @summary Storybook stories for the graph sidebar menu.
 * @description Covers {@link GraphSidebarMenuComponent} navigation entries and active-route highlighting.
 */
import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import type { Meta, StoryObj } from '@storybook/angular';
import { GraphSidebarMenuComponent } from 'src/diagrams/components/graph/components/sidebar-menu/sidebar-menu.component';
import './setup';
import { getComponentMeta } from './utils';

/**
 * Host wrapper for {@link GraphSidebarMenuComponent}: renders the sidebar on a
 * dark rail background so both the collapsed (icon-only) and expanded
 * (label-bearing) configurations are legible.
 */
@Component({
  selector: 'story-graph-sidebar-menu-host',
  standalone: true,
  imports: [CommonModule, GraphSidebarMenuComponent],
  template: `
    <div style="height: 520px; display: flex; background: #0b1220">
      <ngx-decaf-graph-sidebar-menu [collapsed]="collapsed" />
    </div>
  `,
})
class GraphSidebarMenuHostComponent {
  @Input() collapsed = true;
}

const component = getComponentMeta<GraphSidebarMenuHostComponent>([]);
const meta: Meta<GraphSidebarMenuHostComponent> = {
  title: 'Graph/Navigation/Sidebar Menu',
  component: GraphSidebarMenuHostComponent,
  ...component,
};
export default meta;
type Story = StoryObj<GraphSidebarMenuHostComponent>;

/** Icon-only rail (the default `collapsed` configuration). */
export const collapsed: Story = {
  args: { collapsed: true },
};

/** Expanded rail: top actions and navigation items render their labels. */
export const expanded: Story = {
  args: { collapsed: false },
};
