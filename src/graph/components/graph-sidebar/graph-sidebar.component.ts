import { CommonModule } from '@angular/common';
import { Component, computed, input, output, signal } from '@angular/core';

type GraphSidebarActionId = 'add' | 'search' | 'toggle';
type GraphSidebarItemId = 'overview' | 'chat' | 'templates' | 'insights' | 'help' | 'settings';

interface GraphSidebarItem {
  id: GraphSidebarItemId;
  label: string;
  icon: string;
  group: 'primary' | 'secondary';
}

@Component({
  selector: 'ngx-decaf-graph-sidebar',
  templateUrl: './graph-sidebar.component.html',
  styleUrls: ['./graph-sidebar.component.scss'],
  imports: [CommonModule],
  standalone: true,
})
export class GraphSidebarComponent {
  readonly collapsed = input(true);
  readonly collapsedChange = output<boolean>();

  readonly activeItem = signal<GraphSidebarItemId>('overview');
  readonly selectedTopAction = signal<GraphSidebarActionId | null>(null);
  readonly expanded = computed(() => !this.collapsed());

  readonly primaryItems: GraphSidebarItem[] = [
    { id: 'overview', label: 'Overview', icon: 'home-dot', group: 'primary' },
    { id: 'chat', label: 'Chat', icon: 'brand-line', group: 'primary' },
  ];

  readonly secondaryItems: GraphSidebarItem[] = [
    { id: 'templates', label: 'Templates', icon: 'package-open', group: 'secondary' },
    { id: 'insights', label: 'Insights', icon: 'chart-line', group: 'secondary' },
    { id: 'help', label: 'Help', icon: 'help-octagon', group: 'secondary' },
    { id: 'settings', label: 'Settings', icon: 'settings', group: 'secondary' },
  ];

  selectTopAction(action: GraphSidebarActionId): void {
    if (action === 'toggle') {
      this.toggleCollapsed();
      return;
    }

    this.selectedTopAction.set(action);
  }

  toggleCollapsed(): void {
    this.collapsedChange.emit(!this.collapsed());
    this.selectedTopAction.set('toggle');
  }

  selectItem(itemId: GraphSidebarItemId): void {
    this.activeItem.set(itemId);
  }

  trackItem(_: number, item: GraphSidebarItem): string {
    return item.id;
  }
}
