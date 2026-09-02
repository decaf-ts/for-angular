import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  inject,
} from '@angular/core';
import { IonInput } from '@ionic/angular/standalone';
import type { GraphJsonValue, GraphParameterDefinition } from '@decaf-ts/ui-decorators/graph';
import type {
  GraphParameterFormContext,
  GraphParameterRendererContract,
  GraphParameterValueIssue,
} from '../GraphParameterRendererContract';

/**
 * Schema-driven renderer for `expression` parameters: expression-aware text editing of a value-reference expression.
 * Implements {@link GraphParameterRendererContract}.
 */
@Component({
  selector: 'app-graph-expression-parameter',
  standalone: true,
  imports: [IonInput],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ion-input
      [value]="expression"
      [placeholder]="placeholder"
      [type]="'text'"
      class="graph-expression-parameter"
      (ionInput)="onExpressionInput($event)"
    ></ion-input>
  `,
})
export class GraphExpressionParameterComponent implements OnChanges, GraphParameterRendererContract {
  @Input({ required: true }) parameter!: GraphParameterDefinition;
  @Input() value: GraphJsonValue | undefined;
  @Input() disabled = false;
  @Input() context: GraphParameterFormContext | undefined;

  @Output() valueChange = new EventEmitter<GraphJsonValue | undefined>();
  @Output() errorChange = new EventEmitter<GraphParameterValueIssue[]>();

  private readonly changeDetectorRef = inject(ChangeDetectorRef);

  get expression(): string {
    return typeof this.value === 'string' ? this.value : '';
  }

  get placeholder(): string {
    return this.parameter?.placeholder ?? '';
  }

  ngOnChanges(): void {
    this.changeDetectorRef.markForCheck();
  }

  onExpressionInput(event: Event): void {
    const target = event.target as HTMLInputElement | null;
    const next = (target?.value ?? '').trim();
    this.changeDetectorRef.markForCheck();
    this.valueChange.emit(next === '' ? undefined : next);
  }
}
