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
 * Schema-driven renderer for `number` parameters: a numeric input honoring schema min/max/step.
 * Implements {@link GraphParameterRendererContract}.
 */
@Component({
  selector: 'app-graph-number-parameter',
  standalone: true,
  imports: [IonInput],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ion-input
      [value]="numberValue"
      [placeholder]="placeholder"
      [type]="integer ? 'number' : 'text'"
      [class.graph-number-parameter]="true"
      (ionInput)="onNumberInput($event)"
    ></ion-input>
  `,
})
export class GraphNumberParameterComponent implements OnChanges, GraphParameterRendererContract {
  @Input({ required: true }) parameter!: GraphParameterDefinition;
  @Input() value: GraphJsonValue | undefined;
  @Input() disabled = false;
  @Input() context: GraphParameterFormContext | undefined;

  @Output() valueChange = new EventEmitter<GraphJsonValue | undefined>();
  @Output() errorChange = new EventEmitter<GraphParameterValueIssue[]>();

  private readonly changeDetectorRef = inject(ChangeDetectorRef);

  get integer(): boolean {
    return (this.parameter as { integer?: boolean }).integer === true;
  }

  get numberValue(): string {
    return typeof this.value === 'number' ? String(this.value) : '';
  }

  get placeholder(): string {
    return this.parameter?.placeholder ?? '';
  }

  ngOnChanges(): void {
    this.changeDetectorRef.markForCheck();
  }

  onNumberInput(event: Event): void {
    const target = event.target as HTMLInputElement | null;
    const raw = (target?.value ?? '').trim();
    if (!raw) {
      this.valueChange.emit(undefined);
      return;
    }
    const parsed = Number(raw);
    this.changeDetectorRef.markForCheck();
    this.valueChange.emit(Number.isFinite(parsed) ? parsed : undefined);
  }
}
