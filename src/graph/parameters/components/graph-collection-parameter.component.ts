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
import { IonButton } from '@ionic/angular/standalone';
import type {
  GraphJsonValue,
  GraphParameterDefinition,
} from '@decaf-ts/ui-decorators/graph';
import { GraphParameterFieldComponent } from './graph-parameter-field.component';
import type {
  GraphParameterFormContext,
  GraphParameterRendererContract,
  GraphParameterValueIssue,
} from '../GraphParameterRendererContract';

/**
 * Schema-driven renderer for `collection` parameters: add/remove/reorder item rows over the member schema.
 * Implements {@link GraphParameterRendererContract}.
 */
@Component({
  selector: 'app-graph-collection-parameter',
  standalone: true,
  imports: [IonButton, GraphParameterFieldComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="graph-collection-parameter">
      @for (item of items; track trackItem; let index = $index) {
        <div class="graph-collection-parameter-item">
          @for (subParam of parametersOfItem; track subParam.id) {
            <div class="graph-collection-parameter-field">
              <app-graph-parameter-field
                [parameter]="subParam"
                [value]="itemValue(index, subParam)"
                [disabled]="disabled"
                [context]="itemContext(index)"
                (valueChange)="onItemValueChange(index, subParam, $event)"
                (errorChange)="onItemErrors(index, subParam, $event)"
              ></app-graph-parameter-field>
            </div>
          }
          @if (canRemoveItem) {
            <ion-button size="small" fill="clear" (click)="onRemoveItemClick(index)">Remove</ion-button>
          }
        </div>
      }
      @if (canAddItem) {
        <ion-button size="small" fill="clear" (click)="onAddItemClick()">Add</ion-button>
      }
    </div>
  `,
})
export class GraphCollectionParameterComponent implements OnChanges, GraphParameterRendererContract {
  @Input({ required: true }) parameter!: GraphParameterDefinition;
  @Input() value: GraphJsonValue | undefined;
  @Input() disabled = false;
  @Input() context: GraphParameterFormContext | undefined;

  @Output() valueChange = new EventEmitter<GraphJsonValue | undefined>();
  @Output() errorChange = new EventEmitter<GraphParameterValueIssue[]>();

  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private itemIssues = new Map<number, GraphParameterValueIssue[]>();

  get definition(): Extract<GraphParameterDefinition, { type: 'collection' }> {
    return this.parameter as Extract<GraphParameterDefinition, { type: 'collection' }>;
  }

  get parametersOfItem(): GraphParameterDefinition[] {
    return this.definition.itemParameters?.length
      ? this.definition.itemParameters
      : GraphCollectionParameterComponent.primitiveItemParameter();
  }

  get maxItems(): number {
    return this.definition.maxItems ?? Number.MAX_SAFE_INTEGER;
  }

  /** Value must be a JSON array; anything else is treated as an empty list. */
  get items(): unknown[] {
    return Array.isArray(this.value) ? (this.value as unknown[]) : [];
  }

  get canAddItem(): boolean {
    return !this.disabled && this.items.length < this.maxItems;
  }

  get canRemoveItem(): boolean {
    return !this.disabled;
  }

  itemValue(index: number, subParameter: GraphParameterDefinition): GraphJsonValue | undefined {
    if (!this.definition.itemParameters?.length) {
      return this.items[index] as GraphJsonValue | undefined;
    }
    const item = this.items[index];
    if (typeof item !== 'object' || item === null || Array.isArray(item)) return undefined;
    return (item as Record<string, GraphJsonValue>)[subParameter.id];
  }

  itemContext(index: number): GraphParameterFormContext | undefined {
    if (!this.context) return undefined;
    const item = this.items[index];
    const values =
      typeof item === 'object' && item !== null && !Array.isArray(item)
        ? (item as Record<string, GraphJsonValue>)
        : {};
    return { ...this.context, values };
  }

  trackItem(index: number, _item: unknown): number {
    return index;
  }

  ngOnChanges(): void {
    this.changeDetectorRef.markForCheck();
  }

  onItemValueChange(
    index: number,
    subParameter: GraphParameterDefinition,
    next: GraphJsonValue | undefined
  ): void {
    const nextItems = [...this.items];
    if (!this.definition.itemParameters?.length) {
      nextItems[index] = next;
    } else {
      const item = nextItems[index];
      const record: Record<string, GraphJsonValue> =
        typeof item === 'object' && item !== null && !Array.isArray(item)
          ? { ...(item as Record<string, GraphJsonValue>) }
          : {};
      if (next === undefined) {
        delete record[subParameter.id];
      } else {
        record[subParameter.id] = next;
      }
      nextItems[index] = record;
    }
    this.changeDetectorRef.markForCheck();
    this.valueChange.emit(nextItems as GraphJsonValue[]);
  }

  onAddItemClick(): void {
    if (!this.canAddItem) return;
    const newRecord = { ...GraphCollectionParameterComponent.defaultItemRecordOf(this.parametersOfItem) };
    this.changeDetectorRef.markForCheck();
    this.valueChange.emit([...this.items, newRecord] as GraphJsonValue[]);
  }

  onRemoveItemClick(index: number): void {
    if (!this.canRemoveItem) return;
    const nextItems = [...this.items];
    nextItems.splice(index, 1);
    const nextIssues = new Map<number, GraphParameterValueIssue[]>();
    for (const [itemIndex, list] of this.itemIssues) {
      const nextIndex = itemIndex > index ? itemIndex - 1 : itemIndex;
      nextIssues.set(nextIndex, list);
    }
    nextIssues.delete(index);
    this.itemIssues = nextIssues;
    this.changeDetectorRef.markForCheck();
    this.valueChange.emit(nextItems as GraphJsonValue[]);
  }

  onItemErrors(
    index: number,
    subParameter: GraphParameterDefinition,
    list: GraphParameterValueIssue[]
  ): void {
    const remapped = list.map((issue) => ({
      ...issue,
      parameterId: this.parameter.id,
      path: `${index}.${GraphCollectionParameterComponent.joinPath(subParameter.id, issue.path)}`,
    }));
    if (remapped.length) {
      this.itemIssues.set(index, remapped);
    } else {
      this.itemIssues.delete(index);
    }
    const merged = [...this.itemIssues.entries()]
      .sort(([left], [right]) => left - right)
      .map(([, list]) => list)
      .flat();
    this.changeDetectorRef.markForCheck();
    this.errorChange.emit(merged);
  }

  private static primitiveItemParameter(): GraphParameterDefinition[] {
    return [{ id: 'value', label: 'value', type: 'string' }];
  }

  private static defaultItemRecordOf(
    itemParameters: GraphParameterDefinition[]
  ): Record<string, GraphJsonValue> {
    const record: Record<string, GraphJsonValue> = {};
    for (const itemParameter of itemParameters) {
      if (itemParameter.defaultValue !== undefined) {
        record[itemParameter.id] = itemParameter.defaultValue;
      }
    }
    return record;
  }

  private static joinPath(left: string, right?: string): string {
    return right ? `${left}.${right}` : left;
  }
}
