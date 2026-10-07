import { Component, OnInit } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { IconComponent, ListItemComponent } from 'src/lib/components';
import { Dynamic, KeyValue } from 'src/lib/engine';

/**
 * Custom `ngx-decaf-list` item renderer for a workflow summary (SAA-68 D1):
 * shows the workflow name (falling back to its id) and last-update timestamp,
 * with an "open" action (loads the graph in edit mode) and a "past executions"
 * action (navigates to the workflow's execution list). Registered with the
 * rendering engine through `@Dynamic()` and bound to the workflow list through
 * `GraphWorkflowListModel`'s `@uilistmodel` tag.
 */
@Dynamic()
@Component({
  selector: 'app-graph-workflow-item',
  templateUrl: './graph-workflow-item.component.html',
  standalone: true,
  imports: [TranslatePipe, IconComponent],
})
export class GraphWorkflowItemComponent extends ListItemComponent implements OnInit {
  override async ngOnInit(): Promise<void> {
    await super.ngOnInit();
    this.locale = 'graph.workflows';
    this.item = this.model as KeyValue;
  }

  openWorkflow(event: Event): void {
    event.stopImmediatePropagation();
    const workflowId = this.item?.['workflowId'];
    if (!workflowId) return;
    void this.router.navigate([`/graph/read/${workflowId}`]);
  }

  pastExecutions(event: Event): void {
    event.stopImmediatePropagation();
    const workflowId = this.item?.['workflowId'];
    if (!workflowId) return;
    void this.router.navigate([`/workflows/${workflowId}/runs`]);
  }
}
