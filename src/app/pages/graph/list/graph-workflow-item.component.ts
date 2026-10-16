import { Component, OnInit, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { IconComponent, ListItemComponent } from 'src/lib/components';
import { Dynamic, KeyValue } from 'src/lib/engine';
import { GraphEngineCapabilityService } from 'src/graph/capabilities';

/**
 * Custom `ngx-decaf-list` item renderer for a workflow summary (SAA-68 D1,
 * SAA-707): shows the workflow name (falling back to its id) and last-update
 * timestamp, with an "open" action (loads the graph in edit mode), a "run" action
 * (loads and runs the scenario), and a "past executions" action (navigates to the
 * workflow's execution list). Registered with the rendering engine through
 * `@Dynamic()` and bound to the workflow list through
 * `GraphWorkflowListModel`'s `@uilistmodel` tag.
 *
 * The "run" action is gated on the selected engine's capability manifest: it is
 * disabled rather than hidden when the engine explicitly declares run
 * `NOT_SUPPORTED`, so the affordance stays discoverable.
 */
@Dynamic()
@Component({
  selector: 'app-graph-workflow-item',
  templateUrl: './graph-workflow-item.component.html',
  standalone: true,
  imports: [TranslatePipe, IconComponent],
})
export class GraphWorkflowItemComponent extends ListItemComponent implements OnInit {
  /** Capability facade driving the run gate for the selected engine. */
  private readonly capabilities = inject(GraphEngineCapabilityService);

  /** Whether the selected engine allows running a workflow scenario. */
  readonly canRunWorkflow = this.capabilities.canRunWorkflow;

  override async ngOnInit(): Promise<void> {
    await super.ngOnInit();
    this.locale = 'graph.workflows';
    this.item = this.model as KeyValue;
  }

  /**
   * Opens the listed workflow in the editor (SAA-722). The selected engine id is
   * forwarded so the editor resolves the scenario through the served engine
   * catalogue (its WorkflowRepository) instead of falling back to the legacy save
   * endpoint, so a served workflow opens the document the engine actually serves
   * (and its nodes carry the ids the run produces, keeping double-click settings
   * wired after a replay).
   */
  openWorkflow(event: Event): void {
    event.stopImmediatePropagation();
    const workflowId = this.item?.['workflowId'];
    if (!workflowId) return;
    const engine = this.capabilities.selectedEngineId();
    void this.router.navigate([`/graph/read/${workflowId}`], {
      queryParams: engine ? { engine } : {},
    });
  }

  /**
   * Runs the listed scenario (SAA-707): routes to the graph editor carrying the
   * selected engine so the page resolves the engine catalogue document and starts
   * the run. Disabled rather than hidden when the engine blocks running.
   */
  runScenario(event: Event): void {
    event.stopImmediatePropagation();
    if (!this.canRunWorkflow()) return;
    const workflowId = this.item?.['workflowId'];
    if (!workflowId) return;
    const engine = this.capabilities.selectedEngineId();
    void this.router.navigate([`/graph/read/${workflowId}`], {
      queryParams: engine ? { engine, autorun: '1' } : { autorun: '1' },
    });
  }

  pastExecutions(event: Event): void {
    event.stopImmediatePropagation();
    const workflowId = this.item?.['workflowId'];
    if (!workflowId) return;
    void this.router.navigate([`/workflows/${workflowId}/runs`]);
  }
}
