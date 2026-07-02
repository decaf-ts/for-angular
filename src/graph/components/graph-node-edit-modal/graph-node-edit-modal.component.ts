import { Component, signal, computed, Output, EventEmitter, inject, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular/standalone';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonButtons } from '@ionic/angular/standalone';
import {
  graphDefinitionOf,
  graphLeafPortsOf,
  PortDirection,
  type GraphPortDefinition,
} from '@decaf-ts/ui-decorators/graph';
import { GraphPortFieldComponent, type GraphPortFieldConfig, type GraphPortFieldChange } from '../graph-port-field/graph-port-field.component';

export interface GraphNodeEditResult {
  nodeId: string;
  values: Record<string, unknown>;
  portModes: Record<string, 'port' | 'value'>;
  outputSplits: string[];
}

@Component({
  selector: 'app-graph-node-edit-modal',
  standalone: true,
  imports: [
    IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonButtons,
    GraphPortFieldComponent,
  ],
  templateUrl: './graph-node-edit-modal.component.html',
  styleUrl: './graph-node-edit-modal.component.scss',
})
export class GraphNodeEditModalComponent implements OnInit {
  @Input() nodeTitle = '';
  @Input() modelClass: unknown;
  @Input() nodeId = '';
  @Input() initialValues: Record<string, unknown> = {};
  @Input() initialPortModes: Record<string, 'port' | 'value'> = {};

  private readonly modalCtrl = inject(ModalController);

  readonly _ports = signal<GraphPortDefinition[]>([]);
  readonly _values = signal<Record<string, unknown>>({});
  readonly _portModes = signal<Record<string, 'port' | 'value'>>({});
  readonly _outputSplits = signal<string[]>([]);

  readonly ports = this._ports.asReadonly();
  readonly inputPorts = computed(() => this._ports().filter((p) => p.direction === PortDirection.INPUT));
  readonly outputPorts = computed(() => this._ports().filter((p) => p.direction === PortDirection.OUTPUT));

  readonly fieldConfigs = computed<GraphPortFieldConfig[]>(() => {
    const values = this._values();
    const modes = this._portModes();
    return this._ports().map((port) => ({
      port,
      label: port.label || port.name,
      type: port.type || 'text',
      value: values[port.property] ?? '',
      useAsPort: modes[port.property] === 'port',
    }));
  });

  ngOnInit() {
    const cls = this.modelClass;
    if (typeof cls === 'function') {
      this._ports.set(graphLeafPortsOf(graphDefinitionOf(cls as never).ports));
    }
    this._values.set({ ...this.initialValues });
    this._portModes.set({ ...this.initialPortModes });
  }

  onFieldChange(change: GraphPortFieldChange) {
    this._values.update((v) => ({ ...v, [change.property]: change.value }));
    this._portModes.update((m) => ({
      ...m,
      [change.property]: change.useAsPort ? 'port' : 'value',
    }));
    if (change.useAsPort && !this._outputSplits().includes(change.property)) {
      if (this.outputPorts().some((p) => p.property === change.property)) {
        this._outputSplits.update((s) => [...s, change.property]);
      }
    }
  }

  save() {
    const result: GraphNodeEditResult = {
      nodeId: this.nodeId,
      values: this._values(),
      portModes: this._portModes(),
      outputSplits: this._outputSplits(),
    };
    this.modalCtrl.dismiss(result, 'confirm');
  }

  cancel() {
    this.modalCtrl.dismiss(null, 'cancel');
  }
}
