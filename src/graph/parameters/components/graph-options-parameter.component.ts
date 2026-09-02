import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  inject,
} from '@angular/core';
import { IonInput, IonSelect, IonSelectOption } from '@ionic/angular/standalone';
import type {
  GraphJsonValue,
  GraphJsonPrimitive,
  GraphParameterDefinition,
  GraphParameterOption,
} from '@decaf-ts/ui-decorators/graph';
import {
  isGraphJsonPrimitive,
  isGraphParameterOption,
  isGraphParameterOptionArray,
} from '@decaf-ts/ui-decorators/graph';
import type {
  GraphParameterFormContext,
  GraphParameterRendererContract,
  GraphParameterValueIssue,
} from '../GraphParameterRendererContract';

/**
 * Schema-driven renderer for `options` parameters: a select whose options may load dynamically via `loadOptionsMethod`.
 * Implements {@link GraphParameterRendererContract}.
 */
@Component({
  selector: 'app-graph-options-parameter',
  standalone: true,
  imports: [IonSelect, IonSelectOption, IonInput],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (isStaticOrResolved()) {
      <ion-select
        [value]="selected()"
        [placeholder]="placeholder"
        [multiple]="isMultiple"
        [interface]="'popover'"
        (ionChange)="onSelectChange($event)"
      >
        @for (entry of options; track entry.value) {
          <ion-select-option [value]="entry.value">{{ entry.label }}</ion-select-option>
        }
      </ion-select>
    } @else {
      <ion-input
        [value]="''"
        [placeholder]="placeholder"
        [type]="'text'"
        class="graph-options-loading"
        (ionInput)="onSelectChange($event)"
      ></ion-input>
    }
  `,
})
export class GraphOptionsParameterComponent implements OnChanges, OnDestroy, GraphParameterRendererContract {
  @Input({ required: true }) parameter!: GraphParameterDefinition;
  @Input() value: GraphJsonValue | undefined;
  @Input() disabled = false;
  @Input() context: GraphParameterFormContext | undefined;

  @Output() valueChange = new EventEmitter<GraphJsonValue | undefined>();
  @Output() errorChange = new EventEmitter<GraphParameterValueIssue[]>();

  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly _resolvedOptions: GraphParameterOption[] = [];
  private dynamicLoadToken = 0;

  get isMultiple(): boolean {
    return (this.parameter as { multiple?: boolean }).multiple === true;
  }

  get placeholder(): string {
    return this.parameter?.placeholder ?? '';
  }

  get options(): GraphParameterOption[] {
    const definition = this.parameter as { options?: unknown; loadOptionsMethod?: string };
    if (definition.options && isGraphParameterOptionArray(definition.options)) {
      return definition.options;
    }
    return this._resolvedOptions;
  }

  isStaticOrResolved(): boolean {
    const definition = this.parameter as { options?: unknown; loadOptionsMethod?: string };
    if (definition.loadOptionsMethod) return this.options.length > 0;
    return true;
  }

  selected(): GraphJsonPrimitive | GraphJsonPrimitive[] | undefined {
    if (this.isMultiple) {
      return Array.isArray(this.value)
        ? (this.value.filter((entry) => isGraphJsonPrimitive(entry)) as GraphJsonPrimitive[])
        : undefined;
    }
    return isGraphJsonPrimitive(this.value) ? this.value : undefined;
  }

  ngOnChanges(changes: {
    parameter?: unknown;
    context?: unknown;
  }): void {
    const definition = this.parameter as { loadOptionsMethod?: string };
    const contextChanged = 'context' in changes && !!changes['context'];
    if (definition.loadOptionsMethod && (contextChanged || !this._resolvedOptions.length)) {
      void this.loadDynamicOptions();
    }
    this.changeDetectorRef.markForCheck();
  }

  ngOnDestroy(): void {
    this.dynamicLoadToken += 1;
  }

  onSelectChange(event: Event): void {
    const target = event.target as { value?: unknown } | null;
    const raw = target?.value;
    if (this.isMultiple) {
      const list = Array.isArray(raw) ? (raw as unknown[]) : [];
      this.changeDetectorRef.markForCheck();
      this.valueChange.emit(list.filter((entry) => isGraphJsonPrimitive(entry)) as GraphJsonValue[]);
      return;
    }
    this.changeDetectorRef.markForCheck();
    this.valueChange.emit(isGraphJsonPrimitive(raw) ? raw : undefined);
  }

  private async loadDynamicOptions(): Promise<void> {
    const definition = this.parameter as { loadOptionsMethod?: string } | undefined;
    const loadOptions = this.context?.loadOptions;
    if (!definition?.loadOptionsMethod || !loadOptions) return;

    const token = (this.dynamicLoadToken += 1);
    const node = this.context?.node;
    const response = await loadOptions(this.parameter, {
      method: definition.loadOptionsMethod,
      nodeId: node?.id ?? '',
    });
    if (token !== this.dynamicLoadToken) return;

    this._resolvedOptions.length = 0;
    if (Array.isArray(response)) {
      for (const entry of response) {
        if (isGraphParameterOption(entry)) {
          this._resolvedOptions.push(entry);
        } else if (isGraphJsonPrimitive(entry)) {
          this._resolvedOptions.push({ label: String(entry), value: entry });
        }
      }
    }
    this.changeDetectorRef.markForCheck();
  }
}
