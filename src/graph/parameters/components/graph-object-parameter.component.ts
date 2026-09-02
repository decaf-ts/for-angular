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
import type { GraphJsonValue, GraphParameterDefinition } from '@decaf-ts/ui-decorators/graph';
import { GraphParameterFieldComponent } from './graph-parameter-field.component';
import type {
  GraphParameterFormContext,
  GraphParameterRendererContract,
  GraphParameterValueIssue,
} from '../GraphParameterRendererContract';

/**
 * Schema-driven renderer for `object` parameters: a property-grid editor over the object schema.
 * Implements {@link GraphParameterRendererContract}.
 */
@Component({
  selector: 'app-graph-object-parameter',
  standalone: true,
  imports: [GraphParameterFieldComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @for (property of properties; track property.id) {
      <div class="graph-object-parameter">
        <app-graph-parameter-field
          [parameter]="property"
          [value]="propertyValue(property)"
          [disabled]="disabled"
          [context]="propertyContext(property)"
          (valueChange)="onPropertyValueChange(property, $event)"
          (errorChange)="onPropertyErrors(property, $event)"
        ></app-graph-parameter-field>
      </div>
    }
  `,
})
export class GraphObjectParameterComponent implements OnChanges, GraphParameterRendererContract {
  @Input({ required: true }) parameter!: GraphParameterDefinition;
  @Input() value: GraphJsonValue | undefined;
  @Input() disabled = false;
  @Input() context: GraphParameterFormContext | undefined;

  @Output() valueChange = new EventEmitter<GraphJsonValue | undefined>();
  @Output() errorChange = new EventEmitter<GraphParameterValueIssue[]>();

  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly propertyIssues = new Map<string, GraphParameterValueIssue[]>();

  get properties(): GraphParameterDefinition[] {
    return (this.parameter as { properties?: GraphParameterDefinition[] }).properties ?? [];
  }

  get objectRecord(): Record<string, GraphJsonValue> {
    return typeof this.value === 'object' && this.value !== null && !Array.isArray(this.value)
      ? (this.value as Record<string, GraphJsonValue>)
      : {};
  }

  propertyValue(property: GraphParameterDefinition): GraphJsonValue | undefined {
    return this.objectRecord[property.id];
  }

  propertyContext(property: GraphParameterDefinition): GraphParameterFormContext | undefined {
    if (!this.context) return undefined;
    return { ...this.context, values: { ...this.objectRecord, [property.id]: undefined } };
  }

  ngOnChanges(): void {
    this.changeDetectorRef.markForCheck();
  }

  onPropertyValueChange(property: GraphParameterDefinition, next: GraphJsonValue | undefined): void {
    const record: Record<string, GraphJsonValue> = { ...this.objectRecord };
    if (next === undefined) {
      delete record[property.id];
    } else {
      record[property.id] = next;
    }
    this.changeDetectorRef.markForCheck();
    this.valueChange.emit(record);
  }

  onPropertyErrors(property: GraphParameterDefinition, list: GraphParameterValueIssue[]): void {
    const remapped = list.map((issue) => ({
      ...issue,
      parameterId: this.parameter.id,
      path: this.joinPropertyPath(property.id, issue.path),
    }));
    if (remapped.length) {
      this.propertyIssues.set(property.id, remapped);
    } else {
      this.propertyIssues.delete(property.id);
    }
    const merged = [...this.propertyIssues.values()].flat();
    this.changeDetectorRef.markForCheck();
    this.errorChange.emit(merged);
  }

  private joinPropertyPath(propertyId: string, path?: string): string {
    return path ? `${propertyId}.${path}` : propertyId;
  }
}
