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
import { IonSelect, IonSelectOption } from '@ionic/angular/standalone';
import type {
  GraphCredentialReference,
  GraphJsonValue,
  GraphParameterDefinition,
} from '@decaf-ts/ui-decorators/graph';
import type {
  GraphParameterFormContext,
  GraphParameterRendererContract,
  GraphParameterValueIssue,
} from '../GraphParameterRendererContract';

/**
 * Schema-driven renderer for `credential` parameters: a select over the credential references authorized in the form context.
 * Implements {@link GraphParameterRendererContract}.
 */
@Component({
  selector: 'app-graph-credential-parameter',
  standalone: true,
  imports: [IonSelect, IonSelectOption],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ion-select
      [value]="credentialId"
      [multiple]="false"
      [interface]="'popover'"
      [class.graph-credential-parameter]="true"
      (ionChange)="onCredentialChange($event)"
    >
      <ion-select-option value="">Unset</ion-select-option>
      @for (reference of credentialOptions; track reference.credentialId) {
        <ion-select-option [value]="reference.credentialId">{{ reference.credentialId }}</ion-select-option>
      }
    </ion-select>
  `,
})
export class GraphCredentialParameterComponent implements OnChanges, GraphParameterRendererContract {
  @Input({ required: true }) parameter!: GraphParameterDefinition;
  @Input() value: GraphJsonValue | undefined;
  @Input() disabled = false;
  @Input() context: GraphParameterFormContext | undefined;

  @Output() valueChange = new EventEmitter<GraphJsonValue | undefined>();
  @Output() errorChange = new EventEmitter<GraphParameterValueIssue[]>();

  private readonly changeDetectorRef = inject(ChangeDetectorRef);

  get credentialOptions(): GraphCredentialReference[] {
    const options = this.context?.credentialOptions ?? [];
    return options.filter((reference) => reference.credentialType === this.credentialType);
  }

  get credentialType(): string {
    return (this.parameter as { credentialType?: string }).credentialType ?? '';
  }

  get credentialId(): string {
    const value = this.value;
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return '';
    return typeof (value as Record<string, unknown>)['credentialId'] === 'string'
      ? (value as Record<string, unknown>)['credentialId'] as string
      : '';
  }

  ngOnChanges(): void {
    this.changeDetectorRef.markForCheck();
  }

  onCredentialChange(event: Event): void {
    const target = event.target as { value?: unknown } | null;
    const credentialId = target?.value;
    const next =
      typeof credentialId === 'string' && credentialId
        ? { credentialId, credentialType: this.credentialType }
        : undefined;
    this.changeDetectorRef.markForCheck();
    this.valueChange.emit(next);
  }
}
