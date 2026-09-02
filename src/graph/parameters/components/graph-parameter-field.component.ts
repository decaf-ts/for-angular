import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ComponentRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges,
  ViewChild,
  ViewContainerRef,
  inject,
} from '@angular/core';
import { IonLabel, IonItem, IonNote } from '@ionic/angular/standalone';
import type { GraphJsonValue, GraphParameterDefinition } from '@decaf-ts/ui-decorators/graph';
import { GraphParameterRendererRegistry, graphRegisterParameterRenderers } from '../GraphParameterRendererRegistry';
import type {
  GraphParameterFormContext,
  GraphParameterRendererContract,
  GraphParameterValueIssue,
} from '../GraphParameterRendererContract';

/**
 * Host field for schema-driven parameter rendering: picks the renderer component for a parameter type and wires value/error emitters.
 * Implements {@link GraphParameterRendererContract}.
 */
@Component({
  selector: 'app-graph-parameter-field',
  standalone: true,
  imports: [IonLabel, IonItem, IonNote],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (!isNotice() && !isHidden()) {
      <ion-item lines="none">
        <div class="graph-parameter-field-body">
          <ion-label class="graph-parameter-field-label">{{ label }}</ion-label>
          <ng-container #anchor></ng-container>
          @if (description) {
            <ion-note class="graph-parameter-field-description">{{ description }}</ion-note>
          }
          @if (errors.length) {
            <ion-note class="graph-parameter-field-error" color="danger">{{ firstError }}</ion-note>
          }
        </div>
      </ion-item>
    }
    @if (isNotice()) {
      <div class="graph-parameter-field-notice">{{ label }}</div>
    }
  `,
})
export class GraphParameterFieldComponent implements OnChanges, OnInit, OnDestroy {
  @Input({ required: true }) parameter!: GraphParameterDefinition;
  @Input() value: GraphJsonValue | undefined;
  @Input() disabled = false;
  @Input() context: GraphParameterFormContext | undefined;

  @Output() valueChange = new EventEmitter<GraphJsonValue | undefined>();
  @Output() errorChange = new EventEmitter<GraphParameterValueIssue[]>();

  @ViewChild('anchor', { read: ViewContainerRef, static: true })
  private anchor!: ViewContainerRef;

  private readonly registry = inject(GraphParameterRendererRegistry);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);

  private ref: ComponentRef<GraphParameterRendererContract> | null = null;
  private readonly _errors: GraphParameterValueIssue[] = [];
  private renderersRegistered = false;

  get label(): string {
    return this.parameter?.label ?? this.parameter?.id ?? '';
  }

  get description(): string {
    return this.parameter?.description ?? '';
  }

  get errors(): GraphParameterValueIssue[] {
    return this._errors;
  }

  get firstError(): string {
    return this._errors[0]?.message ?? '';
  }

  isNotice(): boolean {
    return this.parameter?.type === 'notice';
  }

  isHidden(): boolean {
    return this.parameter?.type === 'hidden';
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['parameter'] || !this.ref) {
      this.mountRenderer();
    }
    this.syncToRenderer();
  }

  ngOnInit(): void {
    if (!this.ref) {
      this.mountRenderer();
      this.syncToRenderer();
    }
  }

  ngOnDestroy(): void {
    this.ref?.destroy();
    this.ref = null;
  }

  private mountRenderer(): void {
    if (!this.renderersRegistered) {
      graphRegisterParameterRenderers(this.registry);
      this.renderersRegistered = true;
    }
    const type = this.registry.resolve(this.parameter);
    if (this.ref && this.ref.componentType === type) return;

    this.ref?.destroy();
    this.ref = this.anchor.createComponent(type);

    const instance = this.ref.instance as Partial<GraphParameterRendererContract>;
    instance.valueChange?.subscribe?.((next: GraphJsonValue | undefined) => {
      this.changeDetectorRef.markForCheck();
      this.valueChange.emit(next);
    });
    instance.errorChange?.subscribe?.((next: GraphParameterValueIssue[]) => {
      this._errors.length = 0;
      this._errors.push(...next);
      this.changeDetectorRef.markForCheck();
      this.errorChange.emit(next);
    });
  }

  private syncToRenderer(): void {
    this.ref?.setInput('parameter', this.parameter);
    this.ref?.setInput('value', this.value);
    this.ref?.setInput('disabled', this.disabled);
    this.ref?.setInput('context', this.context);
  }
}
