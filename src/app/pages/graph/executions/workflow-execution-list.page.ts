import { AfterViewInit, Component, OnInit, ViewChild, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';
import { AppCardTitleComponent } from 'src/app/components/card-title/card-title.component';
import { ContainerComponent } from 'src/lib/components';
import { ListComponent } from 'src/lib/components/list/list.component';
import { IListItemCustomEvent, KeyValue } from 'src/lib/engine';
import { GraphRunListModel } from 'src/app/models/GraphListModels';
import {
  GraphListService,
  GraphRunRow,
} from 'src/app/services/graph-list/graph-list.service';
import { GraphRunItemComponent } from './graph-run-item.component';

/**
 * Workflow execution list page (SAA-68 D2): lists a workflow's past executions
 * through the for-angular `ngx-decaf-list` component. Each row is rendered by
 * {@link GraphRunItemComponent} and exposes a play action that replays the
 * execution through mastra time travel (SAA-836 U1 AC3): the page navigates to
 * the editor with the run's id, and the editor replays the recorded run's
 * event stream and restores the executed version when it differs from the
 * currently loaded one.
 */
@Component({
  standalone: true,
  selector: 'app-workflow-execution-list',
  templateUrl: './workflow-execution-list.page.html',
  styleUrls: ['./workflow-execution-list.page.scss'],
  providers: [GraphRunItemComponent],
  imports: [IonContent, AppCardTitleComponent, TranslatePipe, ListComponent, ContainerComponent],
})
export class WorkflowExecutionListPage implements OnInit, AfterViewInit {
  @ViewChild(ListComponent) list?: ListComponent;

  /** i18n key prefix for this page. */
  readonly locale = 'graph.executions';
  /** List root route. */
  readonly route = 'workflows';
  /** Card title key. */
  readonly title = `${this.locale}.title`;
  /** Card subtitle key. */
  readonly subtitle = `${this.locale}.subtitle`;
  /** UI list metadata (custom run item tag + icon). */
  readonly listModel = new GraphRunListModel();
  /** Execution rows loaded from `GET /graph/workflows/:workflowId/runs`. */
  readonly runs = signal<GraphRunRow[]>([]);
  /** Last replay error, surfaced to the page. */
  readonly replayError = signal<string | null>(null);
  /** Display mapper consumed by the list engine. */
  readonly mapper = (item: KeyValue): KeyValue => ({
    ...item,
    text: item['runId'] as string,
    value: item['status'] as string,
  });

  private workflowId = '';

  constructor(
    private readonly routeState: ActivatedRoute,
    private readonly router: Router,
    private readonly service: GraphListService
  ) {}

  /** Reads the `workflowId` route param and loads the workflow's run rows. */
  async ngOnInit(): Promise<void> {
    this.workflowId = this.routeState.snapshot.paramMap.get('workflowId') ?? '';
    if (!this.workflowId) return;
    this.runs.set(await this.service.listRuns(this.workflowId));
  }

  /** Refreshes the execution list once the view is initialized. */
  async ngAfterViewInit(): Promise<void> {
    await this.list?.refresh(true);
  }

  /** Re-fetches the execution list on each page entry. */
  async ionViewWillEnter(): Promise<void> {
    if (!this.workflowId) return;
    this.runs.set(await this.service.listRuns(this.workflowId));
    await this.list?.refresh(true);
  }

  /**
   * Replays the execution whose `runId` the item emitted through mastra
   * time travel (SAA-836 U1 AC3): navigates to the editor with the
   * `replayRun` query param, which replays the recorded run's event stream
   * and restores the executed version. Navigation failures surface through
   * the page's replay error signal.
   */
  async onListEvent(event: IListItemCustomEvent): Promise<void> {
    if (event?.action !== 'replay') return;
    const runId = event.data as string;
    if (!runId || !this.workflowId) return;
    try {
      await this.router.navigate([`/graph/read/${this.workflowId}`], {
        queryParams: { replayRun: runId },
      });
      this.replayError.set(null);
    } catch (err) {
      this.replayError.set(err instanceof Error ? err.message : String(err));
    }
  }
}
