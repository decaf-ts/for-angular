/**
 * @module for-angular/graph/components/graph-node-inspection/graph-node-inline-editor
 * @summary Inline CRUD editor for the D3 split view's CENTER pane.
 * @description Document-native node editor rendered inside the split view
 * (DECAF-50 §4.22 D3/G3-10/G3-11): double-click ALWAYS opens the node's CRUD
 * form, and after a run that form is the CENTER pane of the three-pane split
 * view (run inputs LEFT / CRUD CENTER / run outputs RIGHT). This component
 * reuses the same document-native write path as the edit modal
 * ({@link GraphWorkflowDocumentStore.updateNode}) but renders inline, so the
 * canvas never has to leave the split view to edit a node.
 */
import { Component, Input, computed, signal, output, OnChanges } from '@angular/core';
import { IonCheckbox, IonInput, IonTextarea } from '@ionic/angular/standalone';
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
import type { GraphNodeEditResult, GraphParameterFieldConfig } from '../graph-node-edit-modal/graph-node-edit-modal.component';
import type { GraphDemoNodeData, GraphRendererNodeData } from '../../types';

function graphParameterControlTypeOf(param: GraphParameterDefinition): GraphParameterFieldConfig['parameterType'] {
  if (param.type === 'boolean') return 'boolean';
  if (param.type === 'string' && (param as { multiline?: boolean }).multiline) return 'textbox';
  if (param.type === 'string' || param.type === 'number') return 'textinput';
  return 'valuetextarea';
}

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

function graphParameterValueOf(
  param: GraphParameterDefinition | undefined,
  raw: string
): GraphJsonValue {
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
 * Inline node CRUD form (D3/G3-10, DECAF-50 §4.22): renders the node's
 * editable inputs and manifest parameters in the CENTER pane of the split view and
 * emits the canonical {@link GraphNodeEditResult} patch on save. It is the same
 * document-native surface the edit modal exposes, so the canvas CRUD is never
 * removed by a run.
 */
@Component({
  selector: 'app-graph-node-inline-editor',
  standalone: true,
  imports: [IonCheckbox, IonInput, IonTextarea, GraphPortFieldComponent],
  templateUrl: './graph-node-inline-editor.component.html',
  styleUrl: './graph-node-inline-editor.component.scss',
})
export class GraphNodeInlineEditorComponent implements OnChanges {
  /** Canvas node id the form edits. */
  @Input() nodeId = '';
  /** Canvas node data (ports / kind) the form renders. */
  @Input() nodeData: GraphDemoNodeData | GraphRendererNodeData | null = null;
  /** Canonical node instance whose bindings/parameters are edited. */
  @Input() nodeInstance: GraphNodeInstance | null = null;
  /** Manifest-level node parameter definitions (non-port parameter rows). */
  @Input() parameterDefs: GraphParameterDefinition[] = [];

  /** Canonical node patch emitted when the user saves the inline form. */
  readonly saved = output<GraphNodeEditResult>();
  /** Emitted when the user cancels the inline edit. */
  readonly cancelled = output<void>();

  private readonly _ports = signal<GraphPortDefinition[]>([]);
  private readonly _values = signal<Record<string, unknown>>({});
  private readonly _portModes = signal<Record<string, 'port' | 'value'>>({});
  private readonly _parameters = signal<Record<string, unknown>>({});

  readonly inputFieldConfigs = computed<GraphPortFieldConfig[]>(() => {
    const values = this._values();
    const modes = this._portModes();
    return this._ports()
      .filter((port) => port.direction === PortDirection.INPUT && !port.hidden)
      .map((port) => ({
        port,
        label: port.label || port.name,
        type: port.type || 'text',
        value: values[port.property] ?? '',
        useAsPort: modes[port.property] === 'port',
      }));
  });

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

  /**
   * Re-seeds the inline form whenever the edited node changes. The split view
   * keeps this component mounted while the user opens another node, so binding
   * changes must rebuild the form state (ports / bindings / parameters).
   */
  ngOnChanges(): void {
    this.seed();
  }

  /** Rebuilds the inline form state from the current node inputs. */
  private seed(): void {
    this._ports.set([...(this.nodeData?.ports ?? [])]);
    this._values.set({});
    this._portModes.set({});
    this._parameters.set({ ...(this.nodeInstance?.parameters ?? {}) });
    for (const [portId, binding] of Object.entries(this.nodeInstance?.inputBindings ?? {})) {
      this._portModes.update((modes) => ({
        ...modes,
        [portId]: binding?.mode === 'edge' ? 'port' : 'value',
      }));
      if (binding?.mode === 'literal' && typeof binding === 'object' && 'value' in binding) {
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
    // R1: the code node comes pre-filled with the manifest's `defaultCode`
    // when the instance carries no `code` parameter (the same fallback the
    // executor evaluates when the `code` input port is not wired).
    if (this.nodeData?.kind === 'core.flow.code' && !this._values()['code']) {
      const defaultValue = (this.nodeInstance?.metadata as Record<string, unknown> | undefined)?.['defaultCode'];
      if (typeof defaultValue === 'string' && defaultValue.trim()) {
        this._values.update((values) => ({ ...values, code: defaultValue }));
      }
    }
  }

  parameterById(parameterId: string): GraphParameterDefinition | undefined {
    return this.parameterDefs.find((param) => param.id === parameterId);
  }

  onFieldChange(change: GraphPortFieldChange): void {
    this._values.update((values) => ({ ...values, [change.property]: change.value }));
    this._portModes.update((modes) => ({
      ...modes,
      [change.property]: change.useAsPort ? 'port' : 'value',
    }));
  }

  onParameterChange(parameterId: string, parameter: GraphParameterDefinition | undefined, raw: string): void {
    const value = graphParameterValueOf(parameter, raw);
    this._parameters.update((parameters) => ({ ...parameters, [parameterId]: value }));
  }

  save(): void {
    const inputBindings: Record<string, GraphInputBinding> = {};
    for (const config of this.inputFieldConfigs()) {
      const portId = config.port.path || config.port.property;
      if (!portId) continue;
      if (this._portModes()[portId] === 'port') {
        inputBindings[portId] = { mode: 'edge' };
        continue;
      }
      const raw = this._values()[portId];
      if (raw === undefined || raw === null || (typeof raw === 'string' && raw === '')) continue;
      inputBindings[portId] = { mode: 'literal', value: raw as GraphJsonValue };
    }
    for (const parameter of this.parameterDefs) {
      if (parameter.type === 'hidden') continue;
      const edited = this._parameters()[parameter.id];
      if (edited === undefined) continue;
      inputBindings[parameter.id] = { mode: 'literal', value: edited as GraphJsonValue };
    }
    const outputBindings: Record<string, GraphOutputBinding> = {};
    const result: GraphNodeEditResult = {
      nodeId: this.nodeId,
      inputBindings,
      outputBindings,
      parameters: { ...this._parameters() } as never,
    };
    this.saved.emit(result);
  }

  cancel(): void {
    this.cancelled.emit();
  }
}
