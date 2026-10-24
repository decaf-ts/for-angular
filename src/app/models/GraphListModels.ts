import { pk } from '@decaf-ts/core';
import { model, Model, ModelArg } from '@decaf-ts/decorator-validation';
import { uilistmodel, uilistprop } from '@decaf-ts/ui-decorators';

/**
 * UI list metadata for the workflow list (design spec §12): registers the custom
 * item renderer tag (`app-graph-workflow-item`) that the `ngx-decaf-list` engine
 * resolves when the workflow list binds its model. The list is fed by
 * `[data]`/`[customSource]`, so this model only carries rendering metadata.
 */
@uilistmodel('app-graph-workflow-item', { icon: 'ti-sitemap' })
@model()
export class GraphWorkflowListModel extends Model {
  /**
   * Workflow document id.
   *
   * Declared as a non-generated primary key (`@pk({ type: String, generated: false })`):
   * rows are built from externally-fetched engine documents, so each list entry must
   * already carry its persistent id and the model must expose a stable identity for
   * the list engine to key/render items correctly.
   */
  @pk({ type: String, generated: false })
  workflowId!: string;
  /**
   * Display name, when present.
   *
   * Marked with the `uilistprop('name')` decorator as the list item's primary display
   * field, so the `ngx-decaf-list` engine resolves the row label from this property
   * instead of losing the item tag to an unresolvable field.
   */
  @uilistprop('name')
  name?: string;
  /** ISO timestamp of the last save/update. */
  updatedAt!: string;
  runnable?: boolean;

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
  /**
   * Engine-assigned run id.
   *
   * Declared as a non-generated primary key (`@pk({ type: String, generated: false })`):
   * the id is minted by the execution engine before the row exists in this model, so it
   * is never generated locally and provides the stable identity for the run list item.
   */
  @pk({ type: String, generated: false })
  runId!: string;
  /** Workflow (document) id the run executes. */
  workflowId!: string;
  /**
   * Current lifecycle status.
   *
   * Marked with the `uilistprop('status')` decorator as the list item's status field,
   * so the `ngx-decaf-list` engine renders the run state (e.g. badge/label) from this
   * property.
   */
  @uilistprop('status')
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
