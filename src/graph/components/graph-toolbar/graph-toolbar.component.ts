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
import type {
  GraphWorkflowSnapshot,
  LegacyGraphWorkflowSnapshot,
} from '@decaf-ts/ui-decorators/graph';
import type { GraphValidationIssue } from '../../validation';

/** Snapshot form the toolbar hands to its restore callback: legacy canvas snapshot or canonical wrapper. */
export type GraphToolbarRestoreSnapshot =
  | LegacyGraphWorkflowSnapshot
  | GraphWorkflowSnapshot;

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
  readonly restoreSnapshot = output<GraphToolbarRestoreSnapshot>();

  readonly autoSaveEnabled = this.autoSave.enabled;
  readonly isSaving = this.saveService.saving;

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
   * may be in flight, and the editor's validity projection must not mark the
   * graph invalid. An invalid graph is never submittable.
   */
  readonly runDisabled = computed(
    () => !this.canRun() || this.isRunning() || this.invalid()
  );

  /** Run affordance title, surfacing the structured issue count when invalid. */
  readonly runTitle = computed(() =>
    this.invalid()
      ? `Fix ${this.validationIssues().length} graph validation issue(s) before running`
      : 'Start workflow'
  );

  ngOnInit(): void {
    this.history.setActiveWorkflow(this.workflowId());
    this.shortcuts.configure(this.workflowId(), (snapshot) => {
      this.restoreSnapshot.emit(snapshot);
    });
    this.shortcuts.attach();
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

  onAutoSaveToggle(event: CustomEvent): void {
    const checked = (event.detail as { checked: boolean }).checked;
    this.autoSave.setEnabled(checked);
  }

  async onSave(): Promise<void> {
    this.saveWorkflow.emit();
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
