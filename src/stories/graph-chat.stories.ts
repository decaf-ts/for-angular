/**
 * @module for-angular/stories/graph-chat
 * @summary Storybook stories for the graph chat panel.
 * @description Covers {@link GraphChatComponent} conversation rendering and submission states.
 */
import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import type { Meta, StoryObj } from '@storybook/angular';
import { GraphChatComponent } from 'diagrams/src/lib/graph/components/chat/chat.component';
import './setup';
import { getComponentMeta } from './utils';

/**
 * Host wrapper for {@link GraphChatComponent}. The component is currently a
 * template-only shell (its state members are commented out), so the story
 * documents its mount point in the graph navigation surface.
 */
@Component({
  selector: 'story-graph-chat-host',
  standalone: true,
  imports: [CommonModule, GraphChatComponent],
  template: `
    <div style="height: 420px; background: #0b1220">
      <ngx-decaf-graph-chat />
    </div>
  `,
})
class GraphChatHostComponent {}

const component = getComponentMeta<GraphChatHostComponent>([]);
const meta: Meta<GraphChatHostComponent> = {
  title: 'Graph/Navigation/Chat',
  component: GraphChatHostComponent,
  ...component,
};
export default meta;
type Story = StoryObj<GraphChatHostComponent>;

/** The graph chat surface as it currently renders (empty shell). */
export const defaultShell: Story = {};
