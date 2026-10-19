/**
 * @module graph/components/feature-host/graph-model-builder-host
 * @description Dependency-free host for the graph's model-builder ports.
 *
 * Renders the host-provided `/model-builder` component when one is registered
 * through {@link GRAPH_MODEL_BUILDER_COMPONENT}; otherwise it degrades to a
 * JSON textarea, so the `/diagrams` entry point keeps building and running
 * without the `@decaf-ts/as-zod` and `zod` peers installed.
 */
import { NgComponentOutlet } from '@angular/common';
import { Component, EventEmitter, inject, Input, OnDestroy, Output } from '@angular/core';
import { IonTextarea } from '@ionic/angular/standalone';
import { GRAPH_MODEL_BUILDER_COMPONENT } from './graph-feature-components';

/** Shape of the output emitter exposed by a registered model-builder component. */
interface ModelBuilderInstance {
  structuredOutputChange?: {
    subscribe?: (next: (value: Record<string, unknown>) => void) => { unsubscribe(): void };
  };
}

/** @see GraphModelBuilderHostComponent */
/**
 * Injection host for the feature model-builder: renders the host-registered
 * model-builder component (see `GRAPH_MODEL_BUILDER_COMPONENT`) or falls back
 * to a plain JSON textarea, forwarding the structured-output definition text.
 * @category Graph
 */

@Component({
  selector: 'ngx-decaf-model-builder',
  standalone: true,
  imports: [NgComponentOutlet, IonTextarea],
  template: `
    @if (component; as modelBuilder) {
      <ng-container
        [ngComponentOutlet]="modelBuilder"
        [ngComponentOutletInputs]="outletInputs()"
        (ngComponentOutletActivate)="onComponentActivate($event)"
      ></ng-container>
    } @else {
      <ion-textarea
        class="graph-model-builder-fallback"
        [value]="definitionText"
        [rows]="6"
        [autoGrow]="true"
        placeholder='{"model": "..."}'
        aria-label="Structured output definition"
        (ionInput)="onFallbackInput($event)"
      ></ion-textarea>
    }
  `,
})
export class GraphModelBuilderHostComponent implements OnDestroy {
  /** Host-registered concrete model-builder component, or `null` for the textarea fallback. */
  readonly component = inject(GRAPH_MODEL_BUILDER_COMPONENT, { optional: true });

  @Input() structuredOutputMode = false;
  @Input() definition: Record<string, unknown> | null = null;
  @Output() structuredOutputChange = new EventEmitter<Record<string, unknown>>();

  private subscription?: { unsubscribe(): void };

  /** Serialised definition shown by the fallback textarea. */
  get definitionText(): string {
    return this.definition ? JSON.stringify(this.definition, null, 2) : '';
  }

  /** Inputs forwarded to the registered model-builder component. */
  outletInputs(): Record<string, unknown> {
    return {
      structuredOutputMode: this.structuredOutputMode,
      definition: this.definition,
    };
  }

  /** Subscribes to the registered component's `structuredOutputChange` output. */
  onComponentActivate(instance: unknown): void {
    this.subscription?.unsubscribe();
    const emitter = (instance as ModelBuilderInstance | null)?.structuredOutputChange;
    if (emitter && typeof emitter.subscribe === 'function') {
      this.subscription = emitter.subscribe((value) => this.structuredOutputChange.emit(value));
    }
  }

  /** Emits a definition parsed from the fallback textarea. */
  onFallbackInput(event: Event): void {
    const raw = (event.target as HTMLTextAreaElement).value.trim();
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        this.structuredOutputChange.emit(parsed as Record<string, unknown>);
        return;
      }
    } catch {
      // Fall through to the model-only definition shape.
    }
    this.structuredOutputChange.emit({ model: raw });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }
}
