import { Component, signal, computed, inject, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular/standalone';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonButtons, IonInput, IonTextarea, IonCheckbox } from '@ionic/angular/standalone';
import {
  PortDirection,
  type GraphInputBinding,
  type GraphJsonValue,
  type GraphOutputBinding,
  type GraphParameterDefinition,
  type GraphPortDefinition,
} from '@decaf-ts/ui-decorators/graph';
import type { GraphNodeInstance } from '@decaf-ts/ui-decorators/graph';
import {
  GraphPortFieldComponent,
  type GraphPortFieldChange,
  type GraphPortFieldConfig,
} from '../graph-port-field/graph-port-field.component';
import type { GraphDemoNodeData, GraphRendererNodeData } from '../../types';

/**
 * Document-native edit result (§4.4.4/§4.4.5): port bindings, non-port
 * parameters and instance metadata are the node instance's own state; the
 * modal returns the exact patch the caller dispatches to
 * `GraphWorkflowDocumentStore.updateNode` — no config store leg remains.
 */
export interface GraphNodeEditResult {
  nodeId: string;
  inputBindings: Record<string, GraphInputBinding>;
  outputBindings: Record<string, GraphOutputBinding>;
  parameters: Record<string, GraphJsonValue>;
  metadata?: Record<string, GraphJsonValue>;
}

/** Control configuration for one modal parameter row: id, label, control type, and current control value. */
export interface GraphParameterFieldConfig {
  id: string;
  label: string;
  /** 'boolean' → checkbox; 'textinput' → ion-input; 'textbox'/'valuetextarea' → textarea. */
  parameterType: 'boolean' | 'textinput' | 'textbox' | 'valuetextarea';
  value: string | boolean;
}

function graphParameterControlTypeOf(param: GraphParameterDefinition): GraphParameterFieldConfig['parameterType'] {
  if (param.type === 'boolean') return 'boolean';
  if (param.type === 'string' && (param.type === 'string' ? (param as { multiline?: boolean }).multiline : false)) {
    return 'textbox';
  }
  if (param.type === 'string' || param.type === 'number') return 'textinput';
  return 'valuetextarea';
}

/**
 * Renders one parameter into the row control value: strings pass through,
 * numbers/booleans stringify, non-JSON-safe values serialize as JSON and
 * missing values fall back to the manifest's `defaultValue`.
 */
function graphParameterValueControlOf(param: GraphParameterDefinition, value: unknown): string | boolean {
  if (param.type === 'boolean') return value === true || value === 'true';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (value === undefined || value === null) {
    const { defaultValue } = param as { defaultValue?: unknown };
    return defaultValue === undefined || defaultValue === null ? '' : String(defaultValue);
  }
  return JSON.stringify(value) ?? '';
}

/**
 * Parses one row into the canonical parameter value: numbers parse numerically,
 * booleans are booleans, JSON-shaped values parse as JSON (falling back to the
 * raw string when the row is not valid JSON), and everything else keeps the
 * string the row carried.
 */
function graphParameterValueOf(
  param: GraphParameterDefinition | undefined,
  parameterId: string,
  raw: string
): GraphJsonValue {
  void parameterId;
  switch (param?.type) {
    case 'boolean':
      return raw === 'true';
    case 'number': {
      const numeric = Number(raw);
      return Number.isFinite(numeric) ? numeric : raw;
    }
    case 'collection':
    case 'object': {
      if (!raw.trim()) return param.defaultValue ?? '';
      try {
        return JSON.parse(raw) as GraphJsonValue;
      } catch {
        return raw;
      }
    }
    default:
      return raw;
  }
}

/**
 * Node edit modal: edits a node instance's parameters and ports against its
 * manifest — legacy node data and canonical instances are both accepted —
 * and returns the edited instance to the caller on save.
 */
@Component({
  selector: 'app-graph-node-edit-modal',
  standalone: true,
  imports: [
    IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonButtons, IonInput, IonTextarea, IonCheckbox,
    GraphPortFieldComponent,
  ],
  templateUrl: './graph-node-edit-modal.component.html',
  styleUrl: './graph-node-edit-modal.component.scss',
})
export class GraphNodeEditModalComponent implements OnInit {
  @Input() nodeTitle = '';
  @Input() nodeId = '';
  @Input() nodeData: (GraphDemoNodeData | GraphRendererNodeData) | null = null;
  @Input() nodeInstance: GraphNodeInstance | null = null;
  /** Manifest-level node parameter definitions (non-port parameter rows). */
  @Input() parameterDefs: GraphParameterDefinition[] = [];

  private readonly modalCtrl = inject(ModalController);

  readonly _ports = signal<GraphPortDefinition[]>([]);
  readonly _values = signal<Record<string, unknown>>({});
  readonly _portModes = signal<Record<string, 'port' | 'value'>>({});
  readonly _parameters = signal<Record<string, unknown>>({});
  readonly _metadata = signal<Record<string, unknown>>({});

  readonly portsLive = this._ports.asReadonly();
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

  readonly editableParameterIds = computed<Set<string>>(
    () => new Set(this.parameterDefs.map((param) => param.id))
  );

  /** Manifest-level editable row model for one parameter (§4.4.4). */
  readonly parameterFields = computed<GraphParameterFieldConfig[]>(() => {
    const parameters = this._parameters();
    return this.parameterDefs
      .filter((param) => param.type !== 'hidden')
      .map((param) => ({
        id: param.id,
        label: param.label,
        parameterType: graphParameterControlTypeOf(param),
        value: graphParameterValueControlOf(param, parameters[param.id]),
      }))
      .sort((left, right) => left.id.localeCompare(right.id));
  });

  readonly hasEditableParameters = computed(() => this.parameterFields().length > 0);

  isEditableParameter(property: string): boolean {
    return this.editableParameterIds().has(property);
  }

  parameterById(parameterId: string): GraphParameterDefinition | undefined {
    return this.parameterDefs.find((param) => param.id === parameterId);
  }

  onParameterChange(parameterId: string, parameter: GraphParameterDefinition | undefined, raw: string): void {
    const value = graphParameterValueOf(parameter, parameterId, raw);
    this._parameters.update((parameters) => ({ ...parameters, [parameterId]: value }));
  }
  readonly isCodeNode = computed(() => this.nodeData?.kind === 'core.flow.code');

  readonly codeTimeoutMs = computed(() => Number(this._metadata()['timeoutMs'] ?? 1000));

  readonly editableOutputPorts = computed(() => {
    return this.outputPorts().filter((p) => p.property !== 'result');
  });

  readonly hasEditableOutputs = computed(() => this.editableOutputPorts().length > 0);

  readonly codeValidationErrors = signal<string[]>([]);
  readonly codeValidationWarnings = signal<string[]>([]);

  ngOnInit() {
    this._ports.set([...(this.nodeData?.ports ?? [])]);
    this._parameters.set({ ...(this.nodeInstance?.parameters ?? {}) });
    this._metadata.set({ ...(this.nodeInstance?.metadata ?? {}) });
    for (const [portId, binding] of Object.entries(this.nodeInstance?.inputBindings ?? {})) {
      this._portModes.update((modes) => ({
        ...modes,
        [portId]: binding?.mode === 'edge' ? 'port' : 'value',
      }));
      if (binding?.mode === 'literal' && typeof binding === 'object' && 'value' in (binding as object)) {
        const literal = (binding as unknown as { value?: unknown }).value;
        if (literal === undefined) continue;
        this._values.update((values) => ({ ...values, [portId]: literal as never }));
      }
      if (binding?.mode === 'expression') {
        const expression = (binding as unknown as { expression?: unknown }).expression;
        if (expression === undefined) continue;
        this._values.update((values) => ({ ...values, [portId]: String(expression) }));
      }
    }
    if (this.isCodeNode()) {
      const nodeParameters = (this.nodeInstance?.parameters ?? {}) as Record<string, unknown>;
      const codeValue = nodeParameters['code'];
      if (typeof codeValue === 'string' && codeValue.trim()) {
        this._values.update((values) => ({ ...values, code: codeValue }));
      }
      const nodeMetadata = (this.nodeInstance?.metadata ?? {}) as Record<string, unknown>;
      if (nodeMetadata['timeoutMs'] !== undefined) {
        this._metadata.update((metadata) => ({ ...metadata, timeoutMs: nodeMetadata['timeoutMs'] }));
      }
    }
  }

  onFieldChange(change: GraphPortFieldChange) {
    this._values.update((v) => ({ ...v, [change.property]: change.value }));
    this._portModes.update((m) => ({
      ...m,
      [change.property]: change.useAsPort ? 'port' : 'value',
    }));
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
    const inputBindings: Record<string, GraphInputBinding> = {};
    for (const port of this.inputPorts()) {
      const portId = port.path || port.property;
      if (!portId) continue;
      const mode = this._portModes()[portId];
      if (mode === 'port') {
        inputBindings[portId] = { mode: 'edge' };
        continue;
      }
      const raw = this._values()[portId];
      if (raw === undefined || raw === null || (typeof raw === 'string' && raw === '')) continue;
      inputBindings[portId] = { mode: 'literal', value: raw as GraphJsonValue };
    }
    // Non-port parameter rows commit their edited literals onto the node's
    // `inputBindings` map as literal bindings (mode:'literal', value) so the
    // canonical document carries them on the binding surface; the value also
    // stays in `parameters` for the executor's own configuration read.
    for (const parameter of this.parameterDefs) {
      if (parameter.type === 'hidden') continue;
      const edited = this._parameters()[parameter.id];
      if (edited === undefined) continue;
      inputBindings[parameter.id] = { mode: 'literal', value: edited as GraphJsonValue };
    }
    const outputBindings: Record<string, GraphOutputBinding> = {};
    const parameters: Record<string, GraphJsonValue> = { ...this._parameters() } as never;
    const codeValue = this._values()['code'];
    if (this.isCodeNode() && typeof codeValue === 'string' && codeValue.trim()) {
      parameters['code'] = codeValue;
    }
    const metadata = { ...this._metadata() };
    const result: GraphNodeEditResult = {
      nodeId: this.nodeId,
      inputBindings,
      outputBindings,
      parameters,
      ...(Object.keys(metadata).length ? { metadata: metadata as Record<string, GraphJsonValue> } : {}),
    };
    this.modalCtrl.dismiss(result, 'confirm');
  }

  cancel() {
    this.modalCtrl.dismiss(null, 'cancel');
  }
}
