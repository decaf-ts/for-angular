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

/** Generic fallback renderer used when a manifest parameter type has no registered
 *  frontend component. Keeps the value a JSON string so complex values stay editable. */
/**
 * Fallback schema-driven renderer for parameter types without a dedicated component.
 * Implements {@link GraphParameterRendererContract}.
 */
@Component({
  selector: 'app-graph-generic-parameter',
  standalone: true,
  imports: [IonInput, IonTextarea],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (isStructured) {
      <ion-textarea
        [value]="textValue"
        [placeholder]="placeholder"
        [rows]="6"
        (ionInput)="onTextInput($event)"
      ></ion-textarea>
    } @else {
      <ion-input
        [value]="textValue"
        [placeholder]="placeholder"
        [type]="'text'"
        (ionInput)="onTextInput($event)"
      ></ion-input>
    }
  `,
})
export class GraphGenericParameterComponent implements OnChanges, GraphParameterRendererContract {
  @Input({ required: true }) parameter!: GraphParameterDefinition;
  @Input() value: GraphJsonValue | undefined;
  @Input() disabled = false;
  @Input() context: GraphParameterFormContext | undefined;

  @Output() valueChange = new EventEmitter<GraphJsonValue | undefined>();
  @Output() errorChange = new EventEmitter<GraphParameterValueIssue[]>();

  private readonly changeDetectorRef = inject(ChangeDetectorRef);

  get isStructured(): boolean {
    return (
      typeof this.value === 'object' ||
      (this.value !== undefined && this.value !== null && typeof this.value !== 'string')
    );
  }

  get textValue(): string {
    if (typeof this.value === 'string') return this.value;
    if (this.value === undefined || this.value === null) return '';
    return JSON.stringify(this.value, null, 2);
  }

  get placeholder(): string {
    return this.parameter?.placeholder ?? '';
  }

  ngOnChanges(): void {
    this.changeDetectorRef.markForCheck();
  }

  onTextInput(event: Event): void {
    const target = event.target as HTMLInputElement | HTMLTextAreaElement | null;
    const raw = (target?.value ?? '').trim();
    this.changeDetectorRef.markForCheck();
    this.valueChange.emit(raw === '' ? undefined : raw);
  }
}
