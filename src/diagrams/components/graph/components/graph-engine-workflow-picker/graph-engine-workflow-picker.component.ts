/**
 * @module for-angular/graph/components/graph-engine-workflow-picker
 * @summary Manifest-driven engine/workflow picker modal for the graph canvas
 * (SAA-197 / Deliverable 4).
 * @description Standalone modal component that lists the served engines, lets
 * the user switch engines, and lists the selected engine's workflows through
 * the capability service. Selecting a workflow resolves its canonical document
 * and emits it for the page to load and run; the component owns no document
 * state of its own and renders entirely from capability signals.
 */
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  output,
} from "@angular/core";
import {
  IonButton,
  IonItem,
  IonList,
  IonSelect,
  IonSelectOption,
  IonSpinner,
} from "@ionic/angular/standalone";
import { TranslatePipe } from "@ngx-translate/core";
import {
  GraphEngineCapabilityService,
  type GraphEngineWorkflowSelection,
  type GraphEngineWorkflowSummary,
} from "../../capabilities";

/**
 * Modal picker over the served engine capability manifest: engine selection,
 * workflow listing for the selected engine, and workflow-run emission.
 */
/**
 * Workflow picker driven by the served engine capability manifest: lists the
 * workflows the selected engine publishes and emits the chosen workflow id.
 * @category Graph
 */
@Component({
  selector: "app-graph-engine-workflow-picker",
  standalone: true,
  imports: [
    TranslatePipe,
    IonButton,
    IonItem,
    IonList,
    IonSelect,
    IonSelectOption,
    IonSpinner,
  ],
  templateUrl: "./graph-engine-workflow-picker.component.html",
  styleUrl: "./graph-engine-workflow-picker.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GraphEngineWorkflowPickerComponent {
  /** The injected capability facade. */
  private readonly capabilities = inject(GraphEngineCapabilityService);

  /** Whether the hosting page currently shows the picker modal. */
  readonly open = input<boolean>(false);

  /** The served engine descriptors. */
  readonly engines = this.capabilities.engines;
  /** The selected engine id. */
  readonly selectedEngineId = this.capabilities.selectedEngineId;
  /** The workflows listed for the selected engine. */
  readonly workflows = this.capabilities.workflows;
  /** Whether the selected engine declares `workflowList` SUPPORTED. */
  readonly canListWorkflows = this.capabilities.canBrowseWorkflows;
  /** Whether the selected engine allows running a picked scenario. */
  readonly canRunWorkflow = this.capabilities.canRunWorkflow;

  /**
   * Whether this listed workflow may be run: the engine must allow runs and the
   * served row must not be marked read-only.
   *
   * @param workflow - The listed workflow summary.
   * @return {boolean} `true` only when both the engine and the row allow a run.
   */
  canRunListedWorkflow(workflow: GraphEngineWorkflowSummary): boolean {
    return this.capabilities.canRunListedWorkflow(workflow);
  }

  /**
   * Resolves the i18n key for a listed workflow's Run action: the engine-level
   * block name when the engine cannot run workflows at all, the read-only
   * explanation when only this row is not runnable, and the normal run label
   * otherwise.
   *
   * @param workflow - The listed workflow summary.
   * @return {string} The translation key naming the Run action.
   */
  runLabelKey(workflow: GraphEngineWorkflowSummary): string {
    if (!this.canRunWorkflow()) return "graph.engines.picker.runBlocked";
    if (!this.canRunListedWorkflow(workflow)) {
      return "graph.engines.picker.runBlockedReadOnly";
    }
    return "graph.engines.picker.run";
  }
  /** The manifest load lifecycle status. */
  readonly status = this.capabilities.status;
  /** The classified capability failure, when degraded/failed. */
  readonly failure = this.capabilities.failure;

  /** Emits a picked workflow with its resolved document. */
  readonly workflowSelected = output<GraphEngineWorkflowSelection>();
  /** Emits when the user dismisses the picker. */
  readonly dismiss = output<void>();

  /**
   * Loads the manifest (once) and the selected engine's workflows; load
   * failures leave the picker showing the store's failure state.
   *
   * @returns Resolves once the manifest and workflow list have settled.
   */
  async openAndLoad(): Promise<void> {
    try {
      await this.capabilities.load();
    } catch {
      return;
    }
    await this.capabilities.listWorkflows();
  }

  /**
   * Handles an engine selection change and reloads that engine's workflows.
   *
   * @param event - The Ionic select change event.
   */
  onEngineChange(event: CustomEvent): void {
    const value = String(
      (event.detail as { value?: unknown })?.value ?? "",
    );
    if (!value) return;
    this.capabilities.selectEngine(value);
    void this.capabilities.listWorkflows(value);
  }

  /**
   * Resolves and emits the picked workflow's canonical document; unknown
   * documents are silently ignored.
   *
   * @param workflow - The workflow summary the user picked.
   * @returns Resolves once the selection has been emitted or dropped.
   */
  async onWorkflowRun(workflow: GraphEngineWorkflowSummary): Promise<void> {
    // SAA-707: the selected engine's manifest gates running; a `NOT_SUPPORTED`
    // verdict disables the action rather than removing the row. The served row's
    // `runnable: false` blocks read-only canonical documents independently.
    if (!this.canRunListedWorkflow(workflow)) return;
    const engineId = this.selectedEngineId();
    if (!engineId) return;
    const document = await this.capabilities.getWorkflow(
      engineId,
      workflow.workflowId,
    );
    if (!document) return;
    this.workflowSelected.emit({ engineId, summary: workflow, document });
  }

  /** Emits the dismissal and lets the page close the modal. */
  onDismiss(): void {
    this.dismiss.emit();
  }
}
