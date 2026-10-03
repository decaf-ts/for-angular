import { AfterViewInit, Component, OnInit, ViewChild, signal } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';
import { AppCardTitleComponent } from 'src/app/components/card-title/card-title.component';
import { ContainerComponent } from 'src/lib/components';
import { ListComponent } from 'src/lib/components/list/list.component';
import { KeyValue } from 'src/lib/engine';
import { GraphWorkflowListModel } from 'src/app/models/GraphListModels';
import {
  GraphListService,
  GraphWorkflowSummary,
} from 'src/app/services/graph-list/graph-list.service';
import { GraphWorkflowItemComponent } from './graph-workflow-item.component';

/**
 * Workflow list page (SAA-68 D1): lists every workflow visible to the caller
 * through the for-angular `ngx-decaf-list` component, using the existing
 * `ngx-decaf-searchbar` for client-side search. Each row is rendered by
 * {@link GraphWorkflowItemComponent} and offers an "open" action (loads the graph
 * in edit mode) and a "past executions" action (routes to the execution list).
 */
@Component({
  standalone: true,
  selector: 'app-workflow-list',
  templateUrl: './workflow-list.page.html',
  styleUrls: ['./workflow-list.page.scss'],
  providers: [GraphWorkflowItemComponent],
  imports: [IonContent, AppCardTitleComponent, TranslatePipe, ListComponent, ContainerComponent],
})
export class WorkflowListPage implements OnInit, AfterViewInit {
  @ViewChild(ListComponent) list?: ListComponent;

  /** i18n key prefix for this page. */
  readonly locale = 'graph.workflows';
  /** List root route used for navigation and the create action. */
  readonly route = 'workflows';
  /** Card title key. */
  readonly title = `${this.locale}.title`;
  /** Card subtitle key. */
  readonly subtitle = `${this.locale}.subtitle`;
  /** UI list metadata (custom item tag + icon). */
  readonly listModel = new GraphWorkflowListModel();
  /** Workflow rows loaded from `GET /graph/workflows`. */
  readonly workflows = signal<GraphWorkflowSummary[]>([]);
  /** Display mapper consumed by the list engine. */
  readonly mapper = (item: KeyValue): KeyValue => ({
    ...item,
    text: (item['name'] as string) ?? (item['workflowId'] as string),
    value: item['updatedAt'] as string,
  });

  constructor(
    private readonly service: GraphListService,
    private readonly router: Router
  ) {}

  async ngOnInit(): Promise<void> {
    this.workflows.set(await this.service.listWorkflows());
  }

  async ngAfterViewInit(): Promise<void> {
    await this.list?.refresh(true);
  }

  /** Re-fetches the workflow list on each page entry. */
  async ionViewWillEnter(): Promise<void> {
    this.workflows.set(await this.service.listWorkflows());
    await this.list?.refresh(true);
  }

  /** Routes to the create canvas from the list's create action. */
  async onCreate(): Promise<void> {
    await this.router.navigate(['/graph/create']);
  }
}
