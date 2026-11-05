import { AfterViewInit, Component, OnInit, ViewChild, computed, signal } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent, IonSelect, IonSelectOption } from '@ionic/angular/standalone';
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
import { GraphEngineCapabilityService } from 'src/diagrams/components/graph/capabilities';
import { GraphWorkflowItemComponent } from './graph-workflow-item.component';

/**
 * Workflow list page (SAA-68 D1, SAA-707): lists every workflow the selected
 * backend exposes to the caller through the for-angular `ngx-decaf-list`
 * component, using the existing `ngx-decaf-searchbar` for client-side search.
 *
 * The rows come from the selected engine's workflow catalogue
 * (`graph/engines/{engineId}/workflows`) whenever the served capability manifest
 * advertises catalogue browsing, and from the legacy `GET /graph/workflows` endpoint
 * otherwise. The engine is switchable in place, so the table follows the selected
 * backend without any backend-specific code; degraded/backend-down capability
 * states surface through the store's failure signal. Each row is rendered by
 * {@link GraphWorkflowItemComponent} and offers an "open" action (loads the graph
 * in edit mode), a "run" action (loads and runs the scenario) and a "past
 * executions" action (routes to the execution list).
 */
@Component({
  standalone: true,
  selector: 'app-workflow-list',
  templateUrl: './workflow-list.page.html',
  styleUrls: ['./workflow-list.page.scss'],
  providers: [GraphWorkflowItemComponent],
  imports: [
    IonContent,
    IonSelect,
    IonSelectOption,
    AppCardTitleComponent,
    TranslatePipe,
    ListComponent,
    ContainerComponent,
  ],
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
  /** Workflow rows loaded from the engine catalogue or the legacy endpoint. */
  readonly workflows = signal<GraphWorkflowSummary[]>([]);
  /** Whether the rows came from the selected engine's catalogue. */
  readonly catalogue = signal(false);
  /** Display mapper consumed by the list engine. */
  readonly mapper = (item: KeyValue): KeyValue => ({
    ...item,
    text: (item['name'] as string) ?? (item['workflowId'] as string),
    value: item['updatedAt'] as string,
  });

  /** Served engine descriptors, for the engine selector. */
  readonly engines = computed(() => this.capabilities?.engines() ?? []);
  /** The selected engine id, or an empty string before a manifest arrives. */
  readonly selectedEngineId = computed(
    () => this.capabilities?.selectedEngineId() ?? ''
  );
  /** Whether more than one engine is advertised. */
  readonly canSelectEngine = computed(
    () => this.capabilities?.canSelectEngine() ?? false
  );
  /** Whether the selected engine allows creating a workflow. */
  readonly canCreateWorkflow = computed(
    () => this.capabilities?.canCreateWorkflow() ?? true
  );
  /** The classified capability failure, when degraded/failed. */
  readonly failure = computed(() => this.capabilities?.failure() ?? null);

  constructor(
    private readonly service: GraphListService,
    private readonly router: Router,
    private readonly capabilities?: GraphEngineCapabilityService
  ) {}

  async ngOnInit(): Promise<void> {
    await this.loadWorkflows();
  }

  async ngAfterViewInit(): Promise<void> {
    await this.list?.refresh(true);
  }

  /** Re-fetches the workflow list on each page entry. */
  async ionViewWillEnter(): Promise<void> {
    await this.loadWorkflows();
  }

  /**
   * Loads the capability manifest and then the workflow rows. A manifest failure
   * lands the store `failed` with `backend-down`/`malformed-response`; the page
   * surfaces it through the `failure` signal and falls back to the legacy rows
   * instead of throwing.
   *
   * @returns Resolves once the manifest and rows have settled.
   */
  async loadWorkflows(): Promise<void> {
    if (this.capabilities) {
      try {
        await this.capabilities.load();
      } catch {
        // The store classifies the failure; the banner surfaces it below.
      }
    }
    await this.refreshWorkflows();
  }

  /**
   * Re-fetches the workflow rows. Prefers the selected engine's catalogue so the
   * table follows the engine, and falls back to the legacy `GET /graph/workflows`
   * endpoint only when the manifest does not advertise catalogue browsing.
   *
   * @returns Resolves once the rows are loaded and the list refreshed.
   */
  async refreshWorkflows(): Promise<void> {
    const fromCatalogue = this.capabilities?.canBrowseWorkflows() ?? false;
    this.catalogue.set(fromCatalogue);
    if (fromCatalogue && this.capabilities) {
      // The catalogue summary leaves `updatedAt` optional; normalise it onto the
      // list row's required shape so both sources bind identically.
      const listed = await this.capabilities.listWorkflows();
      this.workflows.set(
        listed.map((workflow) => ({
          workflowId: workflow.workflowId,
          name: workflow.name,
          updatedAt: workflow.updatedAt ?? '',
          ...(workflow.runnable !== undefined
            ? { runnable: workflow.runnable }
            : {}),
        })),
      );
    } else {
      this.workflows.set(await this.service.listWorkflows());
    }
    await this.list?.refresh(true);
  }

  /**
   * Re-selects the engine and refreshes its catalogue.
   *
   * @param event - The Ionic select change event.
   * @returns Resolves once the new engine's rows are loaded.
   */
  async onEngineChange(event: CustomEvent): Promise<void> {
    const value = String((event.detail as { value?: unknown })?.value ?? '');
    if (!value || !this.capabilities) return;
    this.capabilities.selectEngine(value);
    await this.refreshWorkflows();
  }

  /**
   * Retries the manifest load after a degraded/backend-down failure.
   *
   * @returns Resolves once the manifest and rows have settled.
   */
  async onRetry(): Promise<void> {
    if (this.capabilities) {
      try {
        await this.capabilities.refresh();
      } catch {
        // The store keeps the failure; the banner stays visible.
      }
    }
    await this.refreshWorkflows();
  }

  /** Routes to the create canvas when the engine allows creating workflows. */
  async onCreate(): Promise<void> {
    if (!this.canCreateWorkflow()) return;
    await this.router.navigate(['/graph/create']);
  }
}
