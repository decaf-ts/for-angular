import { model, Model, ModelArg } from '@decaf-ts/decorator-validation';
import { uilistmodel } from '@decaf-ts/ui-decorators';

/**
 * UI list metadata for the workflow list (design spec §12): registers the custom
 * item renderer tag (`app-graph-workflow-item`) that the `ngx-decaf-list` engine
 * resolves when the workflow list binds its model. The list is fed by
 * `[data]`/`[customSource]`, so this model only carries rendering metadata.
 */
@uilistmodel('app-graph-workflow-item', { icon: 'ti-sitemap' })
@model()
export class GraphWorkflowListModel extends Model {
  /** Workflow document id. */
  workflowId!: string;
  /** Display name, when present. */
  name?: string;
  /** ISO timestamp of the last save/update. */
  updatedAt!: string;

  constructor(arg: ModelArg<GraphWorkflowListModel> = {}) {
    super(arg);
  }
}

/**
 * UI list metadata for the execution list: registers the custom run item renderer
 * tag (`app-graph-run-item`) which adds the replay action on top of the default
 * run row. The list is fed by `[data]`/`[customSource]`, not a repository.
 */
@uilistmodel('app-graph-run-item', { icon: 'ti-player-play' })
@model()
export class GraphRunListModel extends Model {
  /** Engine-assigned run id. */
  runId!: string;
  /** Workflow (document) id the run executes. */
  workflowId!: string;
  /** Current lifecycle status. */
  status!: string;
  /** Run creation timestamp (ISO string). */
  createdAt?: string;
  /** Execution start timestamp (ISO string). */
  startedAt?: string;
  /** Terminal-state timestamp (ISO string). */
  finishedAt?: string;

  constructor(arg: ModelArg<GraphRunListModel> = {}) {
    super(arg);
  }
}
