import { Component, signal, computed, inject, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular/standalone';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonButtons, IonInput } from '@ionic/angular/standalone';
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
  metadata?: Record<string, unknown>;
}

@Component({
  selector: 'app-graph-node-edit-modal',
  standalone: true,
  imports: [
    IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonButtons, IonInput,
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
  @Input() initialMetadata: Record<string, unknown> = {};

  private readonly modalCtrl = inject(ModalController);

  readonly _ports = signal<GraphPortDefinition[]>([]);
  readonly _values = signal<Record<string, unknown>>({});
  readonly _portModes = signal<Record<string, 'port' | 'value'>>({});
  readonly _outputSplits = signal<string[]>([]);
  readonly _metadata = signal<Record<string, unknown>>({});

  readonly ports = this._ports.asReadonly();
  readonly inputPorts = computed(() => this._ports().filter((p) => p.direction === PortDirection.INPUT && !p.hidden));
  readonly outputPorts = computed(() => this._ports().filter((p) => p.direction === PortDirection.OUTPUT && !p.hidden));

  readonly fieldConfigs = computed<GraphPortFieldConfig[]>(() => {
    const values = this._values();
    const modes = this._portModes();
    return this._ports()
      .filter((p) => !p.hidden)
      .map((port) => ({
        port,
        label: port.label || port.name,
        type: port.type || 'text',
        value: values[port.property] ?? '',
        useAsPort: modes[port.property] === 'port',
      }));
  });

  readonly isCodeNode = computed(() => {
    const cls = this.modelClass as { prototype?: { constructor?: { name?: string } } } | undefined;
    if (!cls) return false;
    const def = graphDefinitionOf(cls as never);
    return def.kind === 'core.flow.code';
  });

  readonly codeTimeoutMs = computed(() => Number(this._metadata()['timeoutMs'] ?? 1000));

  readonly editableOutputPorts = computed(() => {
    return this.outputPorts().filter((p) => p.property !== 'result');
  });

  readonly hasEditableOutputs = computed(() => this.editableOutputPorts().length > 0);

  readonly codeValidationErrors = signal<string[]>([]);
  readonly codeValidationWarnings = signal<string[]>([]);

  ngOnInit() {
    const cls = this.modelClass;
    if (typeof cls === 'function') {
      this._ports.set(graphLeafPortsOf(graphDefinitionOf(cls as never).ports));
    }
    this._values.set({ ...this.initialValues });
    this._portModes.set({ ...this.initialPortModes });
    this._metadata.set({ ...this.initialMetadata });

    if (this.isCodeNode()) {
      const def = typeof cls === 'function' ? graphDefinitionOf(cls as never) : null;
      const defMeta = (def?.graph?.metadata ?? {}) as Record<string, unknown>;
      if (!this._values()['code'] && typeof defMeta['defaultCode'] === 'string') {
        this._values.update((v) => ({ ...v, code: defMeta['defaultCode'] }));
      }
      if (this._metadata()['timeoutMs'] === undefined && defMeta['timeoutMs'] !== undefined) {
        this._metadata.update((m) => ({ ...m, timeoutMs: defMeta['timeoutMs'] }));
      }
    }
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

  onTimeoutChange(value: string) {
    const timeoutMs = Number(value) || 1000;
    this._metadata.update((m) => ({ ...m, timeoutMs }));
  }

  validateCode(): boolean {
    this.codeValidationErrors.set([]);
    this.codeValidationWarnings.set([]);

    if (!this.isCodeNode()) return true;

    const code = String(this._values()['code'] ?? '').trim();
    const codeWired = this._portModes()['code'] === 'port';

    if (codeWired) return true;

    if (!code) {
      this.codeValidationErrors.set(['Code is empty. Type code or wire from upstream.']);
      return false;
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const hasReturn = /\breturn\b[\s;]/.test(code);
      const body = hasReturn ? code : `return (${code});`;
      new Function(body);
    } catch (err) {
      errors.push(`Syntax error: ${(err as Error).message}`);
    }

    if (!/\breturn\b[\s;]/.test(code)) {
      warnings.push('No return statement — code will be treated as a single expression.');
    }

    this.codeValidationErrors.set(errors);
    this.codeValidationWarnings.set(warnings);

    return errors.length === 0;
  }

  save() {
    if (this.isCodeNode() && !this.validateCode()) {
      return;
    }

    const result: GraphNodeEditResult = {
      nodeId: this.nodeId,
      values: this._values(),
      portModes: this._portModes(),
      outputSplits: this._outputSplits(),
      metadata: Object.keys(this._metadata()).length ? this._metadata() : undefined,
    };
    this.modalCtrl.dismiss(result, 'confirm');
  }

  cancel() {
    this.modalCtrl.dismiss(null, 'cancel');
  }
}
