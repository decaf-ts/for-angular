import { Component, Input, signal, computed, Output, EventEmitter, OnInit } from '@angular/core';
import { IonCheckbox, IonItem, IonLabel, IonInput, IonTextarea, IonNote } from '@ionic/angular/standalone';
import type { GraphPortDefinition } from '@decaf-ts/ui-decorators/graph';
import { PortDirection } from '@decaf-ts/ui-decorators/graph';

export interface GraphPortFieldConfig {
  port: GraphPortDefinition;
  label: string;
  type: string;
  value: unknown;
  useAsPort: boolean;
}

export interface GraphPortFieldChange {
  property: string;
  value: unknown;
  useAsPort: boolean;
}

@Component({
  selector: 'app-graph-port-field',
  standalone: true,
  imports: [IonCheckbox, IonItem, IonLabel, IonInput, IonTextarea, IonNote],
  templateUrl: './graph-port-field.component.html',
  styleUrl: './graph-port-field.component.scss',
})
export class GraphPortFieldComponent implements OnInit {
  @Input() field: GraphPortFieldConfig = {
    port: { property: '', name: '', direction: PortDirection.INPUT, label: '', required: false, hidden: false },
    label: '',
    type: 'text',
    value: '',
    useAsPort: false,
  };

  readonly _useAsPort = signal(false);
  readonly _value = signal('');

  readonly isInput = computed(() => this.field?.port?.direction === PortDirection.INPUT);
  readonly isOutput = computed(() => this.field?.port?.direction === PortDirection.OUTPUT);
  readonly useAsPort = computed(() => this._useAsPort());
  readonly portLabel = computed(() => this.field?.port?.name ?? '');
  readonly fieldLabel = computed(() => this.field?.label ?? '');
  readonly fieldType = computed(() => this.field?.type ?? 'text');
  readonly isTextarea = computed(() => this.fieldType() === 'textarea');

  @Output() fieldChange = new EventEmitter<GraphPortFieldChange>();

  ngOnInit() {
    const f = this.field;
    this._useAsPort.set(f?.useAsPort ?? false);
    this._value.set(f?.value !== undefined && f?.value !== null ? String(f.value) : '');
  }

  togglePort(event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    this._useAsPort.set(checked);
    this.emitChange();
  }

  onValueChange(event: Event) {
    const target = event.target as HTMLInputElement | HTMLTextAreaElement;
    this._value.set(target.value);
    this.emitChange();
  }

  addOutputSplit() {
    this.fieldChange.emit({
      property: this.field.port.property,
      value: this._value(),
      useAsPort: true,
    });
  }

  private emitChange() {
    this.fieldChange.emit({
      property: this.field.port.property,
      value: this._value(),
      useAsPort: this._useAsPort(),
    });
  }
}
