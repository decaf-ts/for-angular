import { Component, OnInit } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { IonButton } from '@ionic/angular/standalone';
import { IconComponent, ListItemComponent } from 'src/lib/components';
import { Dynamic, IListItemCustomEvent, KeyValue } from 'src/lib/engine';

/**
 * Custom `ngx-decaf-list` item renderer for a workflow execution row
 * (SAA-68 D2): shows the run status plus its timestamps and exposes a play
 * action that asks the page to replay the execution. The `replay` action is
 * re-emitted as a `listenEvent` so the execution list page can replay the run
 * through mastra time travel (it navigates to the editor with the run's
 * `replayRun` query param). Bound to the list through `GraphRunListModel`'s
 * `@uilistmodel` tag.
 */
@Dynamic()
@Component({
  selector: 'app-graph-run-item',
  templateUrl: './graph-run-item.component.html',
  standalone: true,
  imports: [TranslatePipe, IonButton, IconComponent],
})
export class GraphRunItemComponent extends ListItemComponent implements OnInit {
  /** Binds the executions i18n subtree and the served row to the list item. */
  override async ngOnInit(): Promise<void> {
    await super.ngOnInit();
    this.locale = 'graph.executions';
    this.item = this.model as KeyValue;
  }

  /**
   * Emits the `replay` action with the row's `runId` so the executions page
   * replays the run through mastra time travel.
   */
  replay(event: Event): void {
    event.stopImmediatePropagation();
    const runId = this.item?.['runId'];
    if (!runId) return;
    this.clickEvent.emit({
      action: 'replay',
      data: runId,
      pk: this.pk,
      name: 'click',
      component: this.componentName,
    } as IListItemCustomEvent);
  }
}
