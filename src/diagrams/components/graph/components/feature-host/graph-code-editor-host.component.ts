/**
 * @module graph/components/feature-host/graph-code-editor-host
 * @description Dependency-free host for the graph's code-editor ports.
 *
 * Renders the host-provided `/code-editor` component when one is registered
 * through {@link GRAPH_CODE_EDITOR_COMPONENT}; otherwise it degrades to an
 * `ion-textarea`, so the `/diagrams` entry point keeps building and running
 * without the CodeMirror peer family installed.
 */
import { NgComponentOutlet } from '@angular/common';
import { Component, EventEmitter, inject, Input, OnDestroy, Output } from '@angular/core';
import { IonTextarea } from '@ionic/angular/standalone';
import { GRAPH_CODE_EDITOR_COMPONENT } from './graph-feature-components';

/** Shape of the output emitter exposed by a registered code-editor component. */
interface CodeEditorInstance {
  codeChange?: {
    subscribe?: (next: (value: string) => void) => { unsubscribe(): void };
  };
}

/** @see GraphCodeEditorHostComponent */
/**
 * Injection host for the feature code editor: renders the host-registered
 * editor component (see `GRAPH_CODE_EDITOR_COMPONENT`) or falls back to a plain
 * Ionic textarea when none is registered, forwarding edits to both.
 * @category Graph
 */

@Component({
  selector: 'app-code-editor',
  standalone: true,
  imports: [NgComponentOutlet, IonTextarea],
  template: `
    @if (component; as codeEditor) {
      <ng-container
        [ngComponentOutlet]="codeEditor"
        [ngComponentOutletInputs]="outletInputs()"
        (ngComponentOutletActivate)="onComponentActivate($event)"
      ></ng-container>
    } @else {
      <ion-textarea
        class="graph-code-editor-fallback"
        [value]="code"
        [placeholder]="placeholder"
        [rows]="mode === 'formula' ? 1 : 8"
        [autoGrow]="mode === 'formula'"
        [attr.aria-label]="ariaLabel"
        (ionInput)="onFallbackInput($event)"
      ></ion-textarea>
    }
  `,
})
export class GraphCodeEditorHostComponent implements OnDestroy {
  /** Host-registered concrete editor component, or `null` for the textarea fallback. */
  readonly component = inject(GRAPH_CODE_EDITOR_COMPONENT, { optional: true });

  @Input() mode: 'formula' | 'code' = 'code';
  @Input() code = '';
  @Input() placeholder = '';
  @Input() ariaLabel = 'Code editor';
  @Output() codeChange = new EventEmitter<string>();

  private subscription?: { unsubscribe(): void };

  /** Inputs forwarded to the registered editor component. */
  outletInputs(): Record<string, unknown> {
    return {
      mode: this.mode,
      code: this.code,
      placeholder: this.placeholder,
      ariaLabel: this.ariaLabel,
    };
  }

  /** Subscribes to the registered component's `codeChange` output. */
  onComponentActivate(instance: unknown): void {
    this.subscription?.unsubscribe();
    const emitter = (instance as CodeEditorInstance | null)?.codeChange;
    if (emitter && typeof emitter.subscribe === 'function') {
      this.subscription = emitter.subscribe((value) => this.codeChange.emit(value));
    }
  }

  /** Emits the fallback textarea value. */
  onFallbackInput(event: Event): void {
    this.codeChange.emit((event.target as HTMLTextAreaElement).value);
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }
}
