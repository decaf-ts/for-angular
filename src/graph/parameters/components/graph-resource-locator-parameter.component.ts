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
import { IonInput, IonSelect, IonSelectOption } from '@ionic/angular/standalone';
import type { GraphJsonValue, GraphParameterDefinition } from '@decaf-ts/ui-decorators/graph';
import type {
  GraphParameterFormContext,
  GraphParameterRendererContract,
  GraphParameterValueIssue,
} from '../GraphParameterRendererContract';

/**
 * Schema-driven renderer for `resourceLocator` parameters: a mode-specific resource reference input.
 * Implements {@link GraphParameterRendererContract}.
 */
@Component({
  selector: 'app-graph-resource-locator-parameter',
  standalone: true,
  imports: [IonInput, IonSelect, IonSelectOption],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ion-select
      [value]="mode"
      [multiple]="false"
      [interface]="'popover'"
      class="graph-resource-locator-mode"
      (ionChange)="onModeChange($event)"
    >
      @for (mode of locatorModes; track mode) {
        <ion-select-option [value]="mode">{{ mode }}</ion-select-option>
      }
    </ion-select>
    <ion-input
      [value]="locatorText"
      [placeholder]="placeholder"
      [type]="'text'"
      class="graph-resource-locator-value"
      (ionInput)="onValuesChanged($event)"
    ></ion-input>
  `,
})
export class GraphResourceLocatorParameterComponent implements OnChanges, GraphParameterRendererContract {
  @Input({ required: true }) parameter!: GraphParameterDefinition;
  @Input() value: GraphJsonValue | undefined;
  @Input() disabled = false;
  @Input() context: GraphParameterFormContext | undefined;

  @Output() valueChange = new EventEmitter<GraphJsonValue | undefined>();
  @Output() errorChange = new EventEmitter<GraphParameterValueIssue[]>();

  private readonly changeDetectorRef = inject(ChangeDetectorRef);

  get locatorValue(): Record<string, GraphJsonValue> | undefined {
    return typeof this.value === 'object' && this.value !== null && !Array.isArray(this.value)
      ? (this.value as Record<string, GraphJsonValue>)
      : undefined;
  }

  get mode(): 'list' | 'dynamic' {
    return this.locatorValue?.['mode'] === 'dynamic' ? 'dynamic' : 'list';
  }

  get locatorText(): string {
    const value = this.locatorValue?.['value'];
    return typeof value === 'string' ? value : value === undefined || value === null ? '' : String(value);
  }

  get locatorModes(): ('list' | 'dynamic')[] {
    return (this.parameter as { modes?: ('list' | 'dynamic')[] }).modes ?? ['list'];
  }

  get placeholder(): string {
    return this.parameter?.placeholder ?? '';
  }

  ngOnChanges(): void {
    this.changeDetectorRef.markForCheck();
  }

  onModeChange(event: Event): void {
    const target = event.target as { value?: unknown } | null;
    const mode = target?.value === 'dynamic' ? 'dynamic' : 'list';
    const record: Record<string, GraphJsonValue> = { ...(this.locatorValue ?? {}), mode };
    if (!this.locatorText) {
      delete record['value'];
    }
    this.changeDetectorRef.markForCheck();
    this.valueChange.emit(record);
  }

  onValuesChanged(event: Event): void {
    const target = event.target as HTMLInputElement | null;
    const text = (target?.value ?? '').trim();
    const record: Record<string, GraphJsonValue> = { ...(this.locatorValue ?? {}), mode: this.mode };
    if (text) {
      record['value'] = text;
    } else {
      delete record['value'];
    }
    this.changeDetectorRef.markForCheck();
    this.valueChange.emit(record);
  }
}
