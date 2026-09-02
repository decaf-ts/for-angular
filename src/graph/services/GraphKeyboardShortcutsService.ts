import { Injectable, inject } from '@angular/core';
import type { GraphWorkflowSnapshot,
  LegacyGraphWorkflowSnapshot } from '@decaf-ts/ui-decorators/graph';
import { GraphHistoryService } from './GraphHistoryService';
import { GraphAutoSaveService } from './GraphAutoSaveService';

type GraphHistorySnapshot = GraphWorkflowSnapshot | LegacyGraphWorkflowSnapshot;

type RestoreCallback = (snapshot: GraphHistorySnapshot) => void;

/**
 * Keyboard shortcuts for the graph editor: binds undo/redo (and save, where
 * applicable) to the active workflow's history and autosave services, with a
 * configurable snapshot-restore callback.
 */
@Injectable({ providedIn: 'root' })
export class GraphKeyboardShortcutsService {
  private readonly history = inject(GraphHistoryService);
  private readonly autoSave = inject(GraphAutoSaveService);

  private workflowId: string | null = null;
  private restoreFn: RestoreCallback | null = null;
  private handler: ((event: KeyboardEvent) => void) | null = null;

  configure(workflowId: string, restoreFn: RestoreCallback): void {
    this.workflowId = workflowId;
    this.restoreFn = restoreFn;
  }

  attach(): void {
    if (this.handler) return;
    this.handler = (event: KeyboardEvent) => this.onKeyDown(event);
    window.addEventListener('keydown', this.handler);
  }

  detach(): void {
    if (this.handler) {
      window.removeEventListener('keydown', this.handler);
      this.handler = null;
    }
  }

  private onKeyDown(event: KeyboardEvent): void {
    const mod = event.ctrlKey || event.metaKey;
    if (!mod) return;
    if (event.key !== 'z' && event.key !== 'Z' && event.key !== 'y' && event.key !== 'Y') return;

    if (this.isFocusInInput()) return;
    if (this.autoSave.enabled()) return;
    if (!this.workflowId || !this.restoreFn) return;

    const isRedo = event.shiftKey || event.key === 'y' || event.key === 'Y';

    if (isRedo) {
      const entry = this.history.redo(this.workflowId);
      if (entry) {
        event.preventDefault();
        this.restoreFn(entry.snapshot);
      }
    } else {
      const entry = this.history.undo(this.workflowId);
      if (entry) {
        event.preventDefault();
        this.restoreFn(entry.snapshot);
      }
    }
  }

  private isFocusInInput(): boolean {
    const el = document.activeElement;
    if (!el) return false;
    const tag = el.tagName.toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
    if (el.hasAttribute('contenteditable')) return true;
    if (el.closest('.cm-editor')) return true;
    return false;
  }
}
