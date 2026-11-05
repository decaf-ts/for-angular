import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { IHomeTabItem } from '../../interfaces';
import { CardComponent } from '@decaf-ts/for-angular';

type HomeTabIds = 'workflows' | 'credentials' | 'executions';
/**
 * Graph landing page: tabbed home area (workflows, credentials) rendering the
 * entry lists and entry actions for the graph demo.
 * @category Graph
 */
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
