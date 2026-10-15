import {
  Component,
  inject,
  input,
  output,
  computed,
  signal,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { IonSpinner, IonToggle } from '@ionic/angular/standalone';
import { GraphHistoryService } from '../../services/GraphHistoryService';
import { GraphSaveService } from '../../services/GraphSaveService';
import { GraphAutoSaveService } from '../../services/GraphAutoSaveService';
import { GraphKeyboardShortcutsService } from '../../services/GraphKeyboardShortcutsService';
import { GraphEngineCapabilityService } from '../../capabilities';
import type { GraphWorkflowSnapshot } from '@decaf-ts/as-graph/shared';
import type { GraphValidationIssue } from '../../validation';

/** Snapshot form the toolbar hands to its restore callback: the canonical wrapper (§4.26 R2-2). */
export type GraphToolbarRestoreSnapshot = GraphWorkflowSnapshot;

/**
 * Graph editor toolbar: run/autosave toggles plus undo/redo/save controls,
 * wired to the history, save, autosave, and keyboard-shortcut services and
 * emitting restore requests for undo/redo.
 */
@Component({
  selector: 'app-graph-toolbar',
  standalone: true,
  imports: [IonSpinner, IonToggle],
  templateUrl: './graph-toolbar.component.html',
  styleUrl: './graph-toolbar.component.scss',
})
export class GraphToolbarComponent implements OnInit, OnDestroy {
  private readonly history = inject(GraphHistoryService);
  readonly saveService = inject(GraphSaveService);
  private readonly autoSave = inject(GraphAutoSaveService);
  private readonly shortcuts = inject(GraphKeyboardShortcutsService);
  private readonly capabilities = inject(GraphEngineCapabilityService);

  readonly workflowId = input.required<string>();
  readonly canRun = input<boolean>(true);
  readonly isRunning = input<boolean>(false);
  /**
   * Whether the editor's validity projection marks the graph invalid
   * (D5/G3-17): an invalid graph must never be submittable, so the Run
   * affordance is disabled and its title surfaces the issue count.
   */
  readonly invalid = input<boolean>(false);
  /** Structured graph validation issues backing {@link invalid} (D5/G3-16). */
  readonly validationIssues = input<GraphValidationIssue[]>([]);
  readonly runWorkflow = output<void>();
  /**
   * Requests cancellation of the in-flight run (G3-34): the page owns the run
   * client and the run id, so the toolbar only forwards the intent.
   */
  readonly cancelWorkflow = output<void>();
  readonly saveWorkflow = output<void>();
  /**
   * R2-3(9) (round-2): requests the editor return to the edit (unfaded)
   * mode after a run. The page owns the execution/inspection stores, so the
   * toolbar only forwards the intent.
   */
  readonly editWorkflow = output<void>();
  /**
   * Whether a run has happened (R2-3(9)/(10)): the toolbar shows the return
   * to edit mode affordance only when the canvas carries run state.
   */
  readonly hasRun = input<boolean>(false);
  readonly restoreSnapshot = output<GraphToolbarRestoreSnapshot>();
  /** Emits when the user asks to auto-arrange the workflow layout. */
  readonly arrangeWorkflow = output<void>();
  /** Emits when the user asks to browse the engine's workflow catalogue. */
  readonly browseWorkflows = output<void>();

  readonly autoSaveEnabled = this.autoSave.enabled;
  readonly isSaving = this.saveService.saving;

  /** Whether the selected engine advertises workflow browsing (manifest-driven). */
  readonly canBrowseWorkflows = this.capabilities.canBrowseWorkflows;
  /** Whether the selected engine allows editing/saving a workflow. */
  readonly canSaveWorkflow = this.capabilities.canUpdateWorkflow;
  /** Whether the selected engine allows running a workflow. */
  readonly canRunWorkflow = this.capabilities.canRunWorkflow;
  /** Human-readable label for the selected engine, if any. */
  readonly engineLabel = this.capabilities.engineLabel;

  readonly canUndo = computed(() => {
    if (this.autoSaveEnabled()) return false;
    return this.history.canUndoFor(this.workflowId());
  });

  readonly canRedo = computed(() => {
    if (this.autoSaveEnabled()) return false;
    return this.history.canRedoFor(this.workflowId());
  });

  readonly saveMessage = signal<string | null>(null);
  readonly saveError = signal<string | null>(null);

  /**
   * Whether Run is blocked (D5/G3-17): the backend must be available, no run
   * may be in flight, the editor's validity projection must not mark the graph
   * invalid, and the selected engine's capability manifest must not declare run
   * `NOT_SUPPORTED` (SAA-707). An invalid graph is never submittable.
   */
  readonly runDisabled = computed(
    () =>
      !this.canRun() ||
      this.isRunning() ||
      this.invalid() ||
      !this.canRunWorkflow()
  );

  /** Run affordance title, surfacing the capability block or issue count. */
  readonly runTitle = computed(() =>
    !this.canRunWorkflow()
      ? 'The selected engine does not support running workflows'
      : this.invalid()
        ? `Fix ${this.validationIssues().length} graph validation issue(s) before running`
        : 'Start workflow'
  );

  /**
   * Whether Save is blocked (R2-3(8)): a loose/invalid graph must fail
   * validation on save exactly as it does on Run (D5/G3-17), and the selected
   * engine's capability manifest must not declare edit/update `NOT_SUPPORTED`
   * (SAA-707). An invalid graph is never submittable from the toolbar, so Save
   * is disabled and its title surfaces the structured issue count.
   */
  readonly saveDisabled = computed(
    () => this.isSaving() || this.invalid() || !this.canSaveWorkflow()
  );

  /** Save affordance title, surfacing the capability block or issue count. */
  readonly saveTitle = computed(() =>
    !this.canSaveWorkflow()
      ? 'The selected engine does not support editing/saving workflows'
      : this.invalid()
        ? `Fix ${this.validationIssues().length} graph validation issue(s) before saving`
        : 'Save workflow'
  );

  ngOnInit(): void {
    this.history.setActiveWorkflow(this.workflowId());
    this.shortcuts.configure(this.workflowId(), (snapshot) => {
      this.restoreSnapshot.emit(snapshot);
    });
    this.shortcuts.attach();
    void this.capabilities.load().catch(() => undefined);
  }

  ngOnDestroy(): void {
    this.shortcuts.detach();
  }

  onUndo(): void {
    const entry = this.history.undo(this.workflowId());
    if (entry) {
      this.restoreSnapshot.emit(entry.snapshot);
    }
  }

  onRedo(): void {
    const entry = this.history.redo(this.workflowId());
    if (entry) {
      this.restoreSnapshot.emit(entry.snapshot);
    }
  }

  /**
   * Requests an auto-arrange of the current workflow (DECAF-50 §4.12). The
   * document store commits the layout through the same drag-end path a drag uses,
   * so a run in flight must never be disturbed by a re-arrange.
   */
  onArrange(): void {
    if (this.isRunning()) return;
    this.arrangeWorkflow.emit();
  }

  onAutoSaveToggle(event: CustomEvent): void {
    const checked = (event.detail as { checked: boolean }).checked;
    this.autoSave.setEnabled(checked);
  }

  async onSave(): Promise<void> {
    // R2-3(8): a loose/invalid graph must fail validation on save exactly
    // as it does on Run — an invalid graph is never submittable.
    if (this.saveDisabled()) return;
    this.saveWorkflow.emit();
  }

  /**
   * Returns the editor to edit (unfaded) mode after a run (R2-3(9)). The page
   * owns the execution/inspection stores and clears the run state there.
   */
  onEdit(): void {
    this.editWorkflow.emit();
  }

  /** Emits the browse affordance only when the manifest allows browsing. */
  onBrowseWorkflows(): void {
    if (!this.canBrowseWorkflows()) return;
    this.browseWorkflows.emit();
  }

  onRun(): void {
    // D5/G3-17: an invalid graph is never submittable from the toolbar.
    if (this.runDisabled()) return;
    this.runWorkflow.emit();
  }

  /**
   * Forwards a run-cancel request (G3-34) while a run is in flight.
   */
  onCancel(): void {
    if (!this.isRunning()) return;
    this.cancelWorkflow.emit();
  }
}
