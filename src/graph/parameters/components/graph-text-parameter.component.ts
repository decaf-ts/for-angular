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
import { IonInput, IonTextarea } from '@ionic/angular/standalone';
import type { GraphJsonValue, GraphParameterDefinition } from '@decaf-ts/ui-decorators/graph';
import type {
  GraphParameterFormContext,
  GraphParameterRendererContract,
  GraphParameterValueIssue,
} from '../GraphParameterRendererContract';

/**
 * Schema-driven renderer for `text` parameters: a text input honoring schema constraints.
 * Implements {@link GraphParameterRendererContract}.
 */
@Component({
  selector: 'app-graph-text-parameter',
  standalone: true,
  imports: [IonInput, IonTextarea],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (isMultiline) {
      <ion-textarea
        [value]="textValue"
        [placeholder]="placeholder"
        class="graph-parameter-textarea"
        [autoGrow]="true"
        (ionInput)="onTextInput($event)"
      ></ion-textarea>
    } @else {
      <ion-input
        [value]="textValue"
        [placeholder]="placeholder"
        class="graph-parameter-input"
        [type]="'text'"
        (ionInput)="onTextInput($event)"
      ></ion-input>
    }
  `,
})
export class GraphTextParameterComponent implements OnChanges, GraphParameterRendererContract {
  @Input({ required: true }) parameter!: GraphParameterDefinition;
  @Input() value: GraphJsonValue | undefined;
  @Input() disabled = false;
  @Input() context: GraphParameterFormContext | undefined;

  @Output() valueChange = new EventEmitter<GraphJsonValue | undefined>();
  @Output() errorChange = new EventEmitter<GraphParameterValueIssue[]>();

  private readonly changeDetectorRef = inject(ChangeDetectorRef);

  get isMultiline(): boolean {
    return (this.parameter as { multiline?: boolean }).multiline === true;
  }

  get textValue(): string {
    return typeof this.value === 'string' ? this.value : this.value === undefined || this.value === null ? '' : String(this.value);
  }

  get placeholder(): string {
    return this.parameter?.placeholder ?? '';
  }

  ngOnChanges(): void {
    this.changeDetectorRef.markForCheck();
  }

  onTextInput(event: Event): void {
    const target = event.target as HTMLInputElement | HTMLTextAreaElement | null;
    const next = target?.value ?? '';
    this.changeDetectorRef.markForCheck();
    this.valueChange.emit(next === '' ? undefined : next);
  }
}
