import { Component, OnDestroy, OnInit } from '@angular/core';
import { IonSpinner, IonToggle } from '@ionic/angular/standalone';
// import { GraphHistoryService } from '../../services/GraphHistoryService';
// import { GraphSaveService } from '../../services/GraphSaveService';
// import { GraphAutoSaveService } from '../../services/GraphAutoSaveService';
// import { GraphKeyboardShortcutsService } from '../../services/GraphKeyboardShortcutsService';

@Component({
  selector: 'app-graph-toolbar',
  standalone: true,
  imports: [IonSpinner, IonToggle],
  templateUrl: './graph-toolbar.component.html',
  styleUrl: './graph-toolbar.component.scss',
})
export class GraphToolbarComponent implements OnInit, OnDestroy {
  ngOnInit(): void {}
  ngOnDestroy(): void {}
  // private readonly history = inject(GraphHistoryService);
  // readonly saveService = inject(GraphSaveService);
  // private readonly autoSave = inject(GraphAutoSaveService);
  // private readonly shortcuts = inject(GraphKeyboardShortcutsService);
  // readonly workflowId = input.required<string>();
  // readonly canRun = input<boolean>(true);
  // readonly isRunning = input<boolean>(false);
  // readonly runWorkflow = output<void>();
  // readonly saveWorkflow = output<void>();
  // readonly restoreSnapshot = output<GraphWorkflowSnapshot>();
  // readonly autoSaveEnabled = this.autoSave.enabled;
  // readonly isSaving = this.saveService.saving;
  // readonly canUndo = computed(() => {
  //   if (this.autoSaveEnabled()) return false;
  //   return this.history.canUndoFor(this.workflowId());
  // });
  // readonly canRedo = computed(() => {
  //   if (this.autoSaveEnabled()) return false;
  //   return this.history.canRedoFor(this.workflowId());
  // });
  // readonly saveMessage = signal<string | null>(null);
  // readonly saveError = signal<string | null>(null);
  // ngOnInit(): void {
  //   this.history.setActiveWorkflow(this.workflowId());
  //   this.shortcuts.configure(this.workflowId(), (snapshot) => {
  //     this.restoreSnapshot.emit(snapshot);
  //   });
  //   this.shortcuts.attach();
  // }
  // ngOnDestroy(): void {
  //   this.shortcuts.detach();
  // }
  // onUndo(): void {
  //   const entry = this.history.undo(this.workflowId());
  //   if (entry) {
  //     this.restoreSnapshot.emit(entry.snapshot);
  //   }
  // }
  // onRedo(): void {
  //   const entry = this.history.redo(this.workflowId());
  //   if (entry) {
  //     this.restoreSnapshot.emit(entry.snapshot);
  //   }
  // }
  // onAutoSaveToggle(event: CustomEvent): void {
  //   const checked = (event.detail as { checked: boolean }).checked;
  //   this.autoSave.setEnabled(checked);
  // }
  // async onSave(): Promise<void> {
  //   this.saveWorkflow.emit();
  // }
  // onRun(): void {
  //   this.runWorkflow.emit();
  // }
}
