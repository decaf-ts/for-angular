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
import { IonCheckbox } from '@ionic/angular/standalone';
import type { GraphJsonValue, GraphParameterDefinition } from '@decaf-ts/ui-decorators/graph';
import type {
  GraphParameterFormContext,
  GraphParameterRendererContract,
  GraphParameterValueIssue,
} from '../GraphParameterRendererContract';

/**
 * Schema-driven renderer for `boolean` parameters: an Ionic checkbox bound to the parameter value.
 * Implements {@link GraphParameterRendererContract}.
 */
@Component({
  selector: 'app-graph-boolean-parameter',
  standalone: true,
  imports: [IonCheckbox],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ion-checkbox
      [checked]="booleanValue"
      [class.graph-boolean-parameter]="true"
      (ionChange)="onCheckedChanged($event)"
    ></ion-checkbox>
  `,
})
export class GraphBooleanParameterComponent implements OnChanges, GraphParameterRendererContract {
  @Input({ required: true }) parameter!: GraphParameterDefinition;
  @Input() value: GraphJsonValue | undefined;
  @Input() disabled = false;
  @Input() context: GraphParameterFormContext | undefined;

  @Output() valueChange = new EventEmitter<GraphJsonValue | undefined>();
  @Output() errorChange = new EventEmitter<GraphParameterValueIssue[]>();

  private readonly changeDetectorRef = inject(ChangeDetectorRef);

  get booleanValue(): boolean {
    return this.value === true;
  }

  ngOnChanges(): void {
    this.changeDetectorRef.markForCheck();
  }

  onCheckedChanged(event: Event): void {
    const target = event.target as HTMLInputElement | null;
    this.valueChange.emit(!!target?.checked);
  }
}
