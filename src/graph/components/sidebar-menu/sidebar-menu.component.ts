import { CommonModule } from '@angular/common';
import { Component, computed, input, output, signal } from '@angular/core';
import { IGraphSidebarItem } from 'src/graph/interfaces';
import { NgxGraphDirective } from 'src/graph/NgxGraphDirective';

type GraphSidebarActionId = 'add' | 'search' | 'toggle';

@Component({
  selector: 'ngx-decaf-graph-sidebar-menu',
  templateUrl: './sidebar-menu.component.html',
  styleUrls: ['./sidebar-menu.component.scss'],
  imports: [CommonModule],
  standalone: true,
})
export class GraphSidebarMenuComponent extends NgxGraphDirective {
  readonly collapsed = input(true);
  readonly collapsedChange = output<boolean>();

  readonly activeItem = signal<string>('overview');
  readonly selectedTopAction = signal<GraphSidebarActionId | null>(null);
  readonly expanded = computed(() => !this.collapsed());

  readonly primaryItems: IGraphSidebarItem[] = [
    { id: 'overview', label: 'Overview', icon: 'home-dot', group: 'primary' },
    { id: 'chat', label: 'Chat', icon: 'brand-line', group: 'primary' },
  ];

  readonly secondaryItems: IGraphSidebarItem[] = [
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

  selectItem(item: IGraphSidebarItem): void {
    this.activeItem.set(item.id);
    console.log(`Selected item: ${item.label} (ID: ${item})`);
  }
}
