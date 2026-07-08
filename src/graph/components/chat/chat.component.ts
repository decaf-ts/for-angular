import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

type GraphWorkflowsActionId = 'add' | 'search' | 'filter' | 'toggle';
type GraphWorkflowsItemId = 'drafts' | 'running' | 'completed' | 'failed' | 'scheduled' | 'archived';

interface GraphWorkflowsItem {
  id: GraphWorkflowsItemId;
  label: string;
  icon: string;
  group: 'primary' | 'secondary';
  count?: number;
}

@Component({
  selector: 'ngx-decaf-graph-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss'],
  imports: [CommonModule],
  standalone: true,
})
export class GraphChatComponent {
  // readonly collapsed = input(true);
  // readonly collapsedChange = output<boolean>();
  // readonly activeItem = signal<GraphWorkflowsItemId>('drafts');
  // readonly selectedTopAction = signal<GraphWorkflowsActionId | null>(null);
  // readonly expanded = computed(() => !this.collapsed());
  // readonly primaryItems: GraphWorkflowsItem[] = [
  //   { id: 'drafts', label: 'Drafts', icon: 'notes', group: 'primary', count: 3 },
  //   { id: 'running', label: 'Running', icon: 'player-play', group: 'primary', count: 2 },
  //   { id: 'completed', label: 'Completed', icon: 'circle-check', group: 'primary', count: 12 },
  // ];
  // readonly secondaryItems: GraphWorkflowsItem[] = [
  //   { id: 'failed', label: 'Failed', icon: 'alert-triangle', group: 'secondary', count: 1 },
  //   { id: 'scheduled', label: 'Scheduled', icon: 'calendar-time', group: 'secondary', count: 4 },
  //   { id: 'archived', label: 'Archived', icon: 'archive', group: 'secondary' },
  // ];
  // selectTopAction(action: GraphWorkflowsActionId): void {
  //   if (action === 'toggle') {
  //     this.toggleCollapsed();
  //     return;
  //   }
  //   this.selectedTopAction.set(action);
  // }
  // toggleCollapsed(): void {
  //   this.collapsedChange.emit(!this.collapsed());
  //   this.selectedTopAction.set('toggle');
  // }
  // selectItem(itemId: GraphWorkflowsItemId): void {
  //   this.activeItem.set(itemId);
  // }
  // trackItem(_: number, item: GraphWorkflowsItem): string {
  //   return item.id;
  // }
}
