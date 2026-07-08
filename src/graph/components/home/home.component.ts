import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { IHomeTabItem } from 'src/graph/interfaces';
import { CardComponent } from 'src/lib/components';

type HomeTabIds = 'workflows' | 'credentials' | 'executions';

@Component({
  selector: 'ngx-decaf-graph-home',
  standalone: true,
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  imports: [CardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GraphHomeComponent {
  readonly tabs: IHomeTabItem<HomeTabIds>[] = [
    { id: 'workflows', label: 'Workflows' },
    { id: 'credentials', label: 'Credentials' },
    { id: 'executions', label: 'Executions' },
  ];

  readonly activeTab = signal<HomeTabIds>('workflows');

  selectTab(tab: HomeTabIds): void {
    this.activeTab.set(tab);
  }
}
