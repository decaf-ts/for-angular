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
  type SwitchCaseCondition,
} from '@decaf-ts/as-graph/shared';
import type { GraphNodeInstance } from '@decaf-ts/as-graph/shared';
import {
  GraphPortFieldComponent,
  type GraphPortFieldChange,
  type GraphPortFieldConfig,
  type GraphPortFieldModeChange,
} from '../graph-port-field/graph-port-field.component';
import {
  graphPortDefaultValueMode,
  graphPortValueBodyOf,
  graphPortValueModeOf,
  graphPortValueModesOf,
  graphPortValuePatchOf,
  isGraphValueTemplateValue,
  type GraphPortValueMode,
} from '../graph-port-field/graph-port-value';
import {
  GraphConditionEditorComponent,
  type GraphConditionEditorChange,
} from '../graph-condition-editor/graph-condition-editor.component';
import { graphParameterVisibilityOf } from '../../parameters/GraphParameterVisibilityEvaluator';
import { GraphTranslateService } from '../../i18n/graph-translate.service';
import type { GraphDemoNodeData, GraphRendererNodeData } from '../../types';

/** Node kinds whose edit surface carries a graphical|code condition editor. */
const GRAPH_CONDITION_NODE_KINDS = new Set(['core.flow.if', 'core.loop.while', 'core.loop.until']);

/** English fallbacks for the node-edit-modal locale keys (§13 locale rule). */
const GRAPH_NODE_EDIT_LABELS: Record<string, string> = {
  cancel: 'Cancel',
  save: 'Save',
  code: 'Code',
  inputs: 'Inputs',
  outputs: 'Outputs',
  parameters: 'Parameters',
  condition: 'Condition',
  code_hint:
    'JavaScript only. Access the input as $input, variables as $vars, loop item as $item/$index, and upstream outputs as $node["Name"].output. Return a value with return or write a bare expression.',
  inputs_hint:
    'Toggle "Use as port" to wire this input from an upstream output. Leave unchecked to set a literal value.',
  parameters_hint: 'Non-port parameters of the node definition, edited on the instance.',
  outputs_hint:
    'Toggle "Use as port" to expose this output for downstream connection. Use "Split output" to connect a single output to multiple inputs.',
  timeout: 'Timeout (ms)',
  catalogue_degraded: 'Catalogue degraded',
  catalogue_degraded_fallback:
    'The node catalogue backend is unavailable; some dynamic parameter options may be missing.',
};

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
 *
 * The port rows write the full value-input-mode contract (§13 "Value input
 * modes"): `edge`/`literal` bindings plus `expression` bindings and persisted
 * `GraphValueTemplate` parameters. `if`/`while`/`until` nodes additionally
 * render the graphical|code condition editor, emitting a `CodeCondition` or
 * `ConditionExpression` into `parameters.condition`.
 */
@Component({
  selector: 'app-graph-node-edit-modal',
  standalone: true,
  imports: [
    IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonButtons, IonInput, IonTextarea, IonCheckbox,
    GraphPortFieldComponent, GraphConditionEditorComponent,
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
  /**
   * Whether the node catalogue is degraded (G3-28): backend-down silently drops
   * dynamic parameter options, so the modal shows an explicit degraded notice
   * instead of an empty parameter section.
   */
  @Input() degraded = false;
  /** Human-readable degraded-mode reason rendered in the modal notice (G3-28). */
  @Input() degradedReason = '';

  private readonly modalCtrl = inject(ModalController);
  private readonly i18n = inject(GraphTranslateService);

  readonly _ports = signal<GraphPortDefinition[]>([]);
  readonly _values = signal<Record<string, unknown>>({});
  readonly _portModes = signal<Record<string, 'port' | 'value'>>({});
  readonly _portValueModes = signal<Record<string, GraphPortValueMode>>({});
  readonly _parameters = signal<Record<string, unknown>>({});
  readonly _metadata = signal<Record<string, unknown>>({});
  readonly _condition = signal<SwitchCaseCondition | null>(null);
  readonly _conditionValid = signal(true);

  readonly portsLive = this._ports.asReadonly();
  readonly inputPorts = computed(() => this._ports().filter((p) => p.direction === PortDirection.INPUT && !p.hidden));
  readonly outputPorts = computed(() => this._ports().filter((p) => p.direction === PortDirection.OUTPUT && !p.hidden));

  readonly fieldConfigs = computed<GraphPortFieldConfig[]>(() => {
    const values = this._values();
    const modes = this._portModes();
    const valueModes = this._portValueModes();
    return this._ports()
      .filter((p) => !p.hidden)
      .map((port) => {
        const portId = port.path || port.property;
        return {
          port,
          label: port.label || port.name,
          type: port.type || 'text',
          value: values[port.property] ?? '',
          useAsPort: modes[port.property] === 'port',
          valueMode: valueModes[portId] ?? graphPortDefaultValueMode(port),
          valueModes: graphPortValueModesOf(port),
        };
      });
  });

  readonly editableParameterIds = computed<Set<string>>(
    () => new Set(this.parameterDefs.map((param) => param.id))
  );

  /**
   * Parameter rows the model's metadata currently makes visible (§13 "Gating"):
   * the declarative visibility DSL (`GraphParameterVisibilityEvaluator`) is applied
   * against the current parameter values, so a hidden parameter is never rendered.
   */
  readonly visibleParameterDefs = computed<GraphParameterDefinition[]>(() => {
    const values = this._parameters();
    return this.parameterDefs.filter((param) =>
      graphParameterVisibilityOf(param.visibility, values as never)
    );
  });

  /** Manifest-level editable row model for one parameter (§4.4.4). */
  readonly parameterFields = computed<GraphParameterFieldConfig[]>(() => {
    const parameters = this._parameters();
    return this.visibleParameterDefs()
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

  /** Resolves one node-edit-modal locale key through `@ngx-translate` (§13 locale rule). */
  label(key: string): string {
    return this.i18n.key(`graph.editor.node.${key}`, GRAPH_NODE_EDIT_LABELS[key] ?? key);
  }

  readonly isCodeNode = computed(() => this.nodeData?.kind === 'core.utility.code');

  /** Whether this node kind's edit surface carries a graphical|code condition editor. */
  readonly isConditionNode = computed(() =>
    GRAPH_CONDITION_NODE_KINDS.has(this.nodeData?.kind ?? '')
  );

  readonly condition = this._condition.asReadonly();
  readonly conditionValid = this._conditionValid.asReadonly();

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
    const conditionValue = (this.nodeInstance?.parameters ?? {})['condition'];
    if (conditionValue && typeof conditionValue === 'object') {
      this._condition.set(conditionValue as unknown as SwitchCaseCondition);
    }
    for (const port of this.inputPorts()) {
      const portId = port.path || port.property;
      const binding = (this.nodeInstance?.inputBindings ?? {})[portId];
      const parameterValue = (this.nodeInstance?.parameters ?? {})[portId];
      const mode = graphPortValueModeOf(port, binding, parameterValue);
      this._portValueModes.update((modes) => ({ ...modes, [portId]: mode }));
      this._portModes.update((modes) => ({
        ...modes,
        [portId]: mode === 'port' ? 'port' : 'value',
      }));
      const body = graphPortValueBodyOf(binding, parameterValue);
      if (body !== '' || mode === 'expression' || mode === 'template' || mode === 'formula') {
        this._values.update((values) => ({ ...values, [portId]: body as never }));
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
      // R1: the code node comes pre-filled with the code to perform its task.
      // The node instance's `parameters.code` wins; otherwise the manifest's
      // `metadata.defaultCode` pre-fills the editor (the same fallback the
      // executor evaluates when the `code` input port is not wired).
      const defaultValue = nodeMetadata['defaultCode'];
      if (
        !this._values()['code'] &&
        typeof defaultValue === 'string' &&
        defaultValue.trim()
      ) {
        this._values.update((values) => ({ ...values, code: defaultValue }));
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

  onFieldModeChange(change: GraphPortFieldModeChange) {
    this._portValueModes.update((modes) => ({ ...modes, [change.property]: change.mode }));
    this._portModes.update((modes) => ({
      ...modes,
      [change.property]: change.mode === 'port' ? 'port' : 'value',
    }));
  }

  onConditionChange(change: GraphConditionEditorChange) {
    this._condition.set(change.condition);
    this._conditionValid.set(change.valid);
  }

  onTimeoutChange(value: string) {
    const timeoutMs = Number(value) || 1000;
    this._metadata.update((m) => ({ ...m, timeoutMs }));
  }

  validateCode(): boolean {
    this.codeValidationErrors.set([]);
    this.codeValidationWarnings.set([]);

    if (!this.isCodeNode()) return true;

    // Templated strings are not raw JS, so only literal/expression modes are
    // syntax-checked as a function body (§13 "Value input modes").
    if (this._portValueModes()['code'] === 'template') return true;

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
    if (this.isConditionNode() && this._condition() && !this._conditionValid()) {
      return;
    }
    const inputBindings: Record<string, GraphInputBinding> = {};
    const parameters: Record<string, GraphJsonValue> = { ...this._parameters() } as never;
    for (const port of this.inputPorts()) {
      const portId = port.path || port.property;
      if (!portId) continue;
      const mode = this._portValueModes()[portId] ?? graphPortDefaultValueMode(port);
      const raw = this._values()[portId];
      const body = raw === undefined || raw === null ? '' : String(raw);
      if (mode === 'port') {
        inputBindings[portId] = { mode: 'edge' };
        continue;
      }
      if (mode === 'literal') {
        if (body === '') continue;
        inputBindings[portId] = { mode: 'literal', value: body as GraphJsonValue };
        continue;
      }
      const patch = graphPortValuePatchOf(port, mode, body);
      if (patch.binding) inputBindings[portId] = patch.binding;
      if (patch.template) parameters[portId] = patch.template as unknown as GraphJsonValue;
    }
    // Non-port parameter rows commit their edited literals onto the node's
    // `inputBindings` map as literal bindings (mode:'literal', value) so the
    // canonical document carries them on the binding surface; the value also
    // stays in `parameters` for the executor's own configuration read. A value
    // already persisted as a `GraphValueTemplate` is never overwritten by a
    // literal binding.
    for (const parameter of this.visibleParameterDefs()) {
      if (parameter.type === 'hidden') continue;
      if (isGraphValueTemplateValue(parameters[parameter.id])) continue;
      const edited = this._parameters()[parameter.id];
      if (edited === undefined) continue;
      inputBindings[parameter.id] = { mode: 'literal', value: edited as GraphJsonValue };
    }
    if (this.isConditionNode() && this._condition()) {
      parameters['condition'] = this._condition() as unknown as GraphJsonValue;
    }
    const outputBindings: Record<string, GraphOutputBinding> = {};
    // The code node's `code` parameter is the executor's fallback read when the
    // port is not wired; it is only the raw literal. Expression/template modes
    // already persisted their `GraphValueTemplate` above and must not be clobbered.
    const codeValue = this._values()['code'];
    const codeMode = this._portValueModes()['code'];
    if (
      this.isCodeNode() &&
      codeMode === 'literal' &&
      typeof codeValue === 'string' &&
      codeValue.trim()
    ) {
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
