/**
 * @module for-angular/graph/components/graph-node-inspection/graph-workflow-input-editor
 * @summary Inline CRUD editor for a workflow-boundary node (D3/G3-10).
 * @description Boundary (workflow-input) nodes get double-click CRUD
 * (DECAF-50 §4.22 D3): the split view's CENTER pane renders the editable
 * workflow-input form control the renderer builds and validates, so editing a
 * boundary badge edits the same input the run submits (G3-13). Output boundaries
 * render their run value read-only.
 */
import { Component, Input, computed } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import type { WorkflowInputFieldDefinition } from '../../workflow-inputs';

/**
 * Inline workflow-input CRUD form for a boundary node's property
 * (D3/G3-10/G3-13). The control binds to the renderer's own workflow-input
 * form, so a boundary edit and a Run share one input source.
 */
@Component({
  selector: 'app-graph-workflow-input-editor',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './graph-workflow-input-editor.component.html',
  styleUrl: './graph-workflow-input-editor.component.scss',
})
export class GraphWorkflowInputEditorComponent {
  /** Boundary role: input boundaries are editable, output boundaries read-only. */
  @Input() role: 'input' | 'output' = 'input';
  /** Workflow-input field definition bound to this boundary node. */
  @Input() field: WorkflowInputFieldDefinition | null = null;
  /** The renderer's editable workflow-input form (the run-input source). */
  @Input() form: FormGroup | null = null;
  /** Boundary node's current value (rendered read-only for output roles). */
  @Input() value: unknown = undefined;

  /** Display label of the edited workflow input. */
  readonly label = computed(() => this.field?.label ?? '');

  /** Control name of the edited workflow input inside the renderer form. */
  readonly controlName = computed(() => this.field?.controlName ?? '');

  /** Control type driving which inline control renders. */
  readonly controlType = computed(() => this.field?.controlType ?? 'text');

  /** Placeholder shown by the inline control. */
  readonly placeholder = computed(() => this.field?.placeholder ?? this.field?.label ?? '');

  /** Read-only display of an output boundary's run value. */
  readonly readOnlyValue = computed(() => {
    const value = this.value;
    if (value === undefined || value === null || value === '') return 'No value yet';
    if (typeof value === 'string') return value;
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  });
}
