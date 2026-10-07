import { Component, Input, signal, computed, Output, EventEmitter, OnInit, inject } from '@angular/core';
import type { GraphPortDefinition, GraphValueTemplateLanguage } from '@decaf-ts/as-graph/shared';
import { PortDirection } from '@decaf-ts/as-graph/shared';
import { IonInput, IonTextarea } from '@ionic/angular/standalone';
import { CodeEditorComponent, type CodeEditorMode } from '../code-editor/code-editor.component';
import { GraphTranslateService } from '../../i18n/graph-translate.service';
import {
  graphPortDefaultValueMode,
  graphPortValueModesOf,
  type GraphPortValueMode,
} from './graph-port-value';

/** English fallbacks for the graph port-field locale keys (never hardcoded in the template). */
const GRAPH_PORT_FIELD_LABELS: Record<string, string> = {
  port_disabled: 'Value provided directly — clear it to connect from upstream',
  port_use_value: 'Port exposed — click to use a literal value',
  port_expose: 'Click to expose as port',
  wired_from_upstream: 'wired from upstream',
  exposed_for_downstream: 'exposed for downstream',
  value_mode: 'Value input mode',
  'value_mode.literal': 'Value',
  'value_mode.expression': 'Code',
  'value_mode.template': 'Template',
  'value_mode.formula': 'Formula',
  'value_mode.literal_short': 'Val',
  'value_mode.expression_short': '{ }',
  'value_mode.template_short': 'T',
  'value_mode.formula_short': 'ƒ',
};

export type { GraphPortValueMode } from './graph-port-value';

export interface GraphPortFieldConfig {
  port: GraphPortDefinition;
  label: string;
  type: string;
  value: unknown;
  useAsPort: boolean;
  /** Currently selected value-input mode (gated by the port's metadata). */
  valueMode?: GraphPortValueMode;
  /** Persisted template/expression language for the current mode. */
  language?: GraphValueTemplateLanguage;
  /** Value modes the port's metadata allows; defaults to {@link graphPortValueModesOf}. */
  valueModes?: GraphPortValueMode[];
}

/** Value edit emitted on every content change; shape kept stable for callers. */
export interface GraphPortFieldChange {
  property: string;
  value: unknown;
  useAsPort: boolean;
}

/** Value-mode edit emitted when the user switches the input mode (§13). */
export interface GraphPortFieldModeChange {
  property: string;
  mode: GraphPortValueMode;
  language?: GraphValueTemplateLanguage;
}

@Component({
  selector: 'app-graph-port-field',
  standalone: true,
  imports: [IonInput, IonTextarea, CodeEditorComponent],
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
  readonly _valueMode = signal<GraphPortValueMode>('literal');

  readonly isInput = computed(() => this.field?.port?.direction === PortDirection.INPUT);
  readonly isOutput = computed(() => this.field?.port?.direction === PortDirection.OUTPUT);
  readonly useAsPort = computed(() => this._useAsPort());
  /**
   * R3 checkbox state: an input that already carries a user-provided value has
   * its checkbox disabled — the user introduced data directly, so the input cannot
   * be switched to a connection. An empty input (or an already-checked port) keeps
   * the checkbox enabled.
   */
  readonly ballDisabled = computed(
    () => this.isInput() && !this.useAsPort() && this._value().trim().length > 0
  );
  /**
   * R4-9 checkbox state: the input is always "bound" once it either carries a
   * user-provided value (value mode) or is exposed as a port (port mode), so the
   * checkbox renders selected in both cases. A value-provided input keeps the
   * checkbox selected but disabled — the port stays invisible/unusable, enforcing
   * the value-XOR-port exclusivity.
   */
  readonly ballSelected = computed(() => this.useAsPort() || this.ballDisabled());
  readonly portLabel = computed(() => this.field?.port?.name ?? '');
  readonly fieldLabel = computed(() => this.field?.label ?? '');
  readonly fieldType = computed(() => this.field?.type ?? 'text');
  readonly isTextarea = computed(() => this.fieldType() === 'textarea');

  readonly elementTag = computed(() => {
    const el = this.field?.port?.element as { tag?: string } | undefined;
    return el?.tag ?? '';
  });
  readonly useCodeEditor = computed(() => this.isInput() && this.elementTag() === 'code-editor');
  readonly codeEditorMode = computed<CodeEditorMode>(() => this.elementTag() === 'code-editor' ? 'code' : 'formula');

  /**
   * Value modes the port's metadata allows (§13 "Gating"). The modal passes an
   * explicit `valueModes` list; otherwise the port's own metadata decides.
   */
  readonly valueModes = computed<GraphPortValueMode[]>(
    () => this.field?.valueModes ?? graphPortValueModesOf(this.field?.port)
  );
  readonly valueMode = computed(() => this._valueMode());
  /** Value modes that render as selectable mode buttons (never `port`). */
  readonly valueModeButtons = computed(() => this.valueModes().filter((mode) => mode !== 'port'));
  /**
   * Whether the code editor renders for the current value mode: an input in
   * `expression`/`formula`/`template` mode always uses the IDE-like editor,
   * and a code-capable port keeps its manifest `code-editor` routing.
   */
  readonly showValueCodeEditor = computed(
    () => this.isInput() && (
      this._valueMode() === 'expression' ||
      this._valueMode() === 'formula' ||
      this._valueMode() === 'template' ||
      this.useCodeEditor()
    )
  );
  readonly valueCodeEditorMode = computed<CodeEditorMode>(
    () => (this._valueMode() === 'expression' || this._valueMode() === 'template' ? 'code' : this.codeEditorMode())
  );
  readonly valueLanguage = computed<GraphValueTemplateLanguage | undefined>(
    () => this.field?.language
  );
  readonly isLiteralMode = computed(() => this._valueMode() === 'literal');
  readonly isExpressionMode = computed(() => this._valueMode() === 'expression');
  readonly isFormulaMode = computed(() => this._valueMode() === 'formula');
  readonly isTemplateMode = computed(() => this._valueMode() === 'template');

  @Output() fieldChange = new EventEmitter<GraphPortFieldChange>();
  @Output() fieldModeChange = new EventEmitter<GraphPortFieldModeChange>();

  private readonly i18n = inject(GraphTranslateService);

  /** Resolves one port-field locale key through `@ngx-translate` (§13 locale rule). */
  modeLabel(key: string): string {
    return this.i18n.key(`graph.editor.port.${key}`, GRAPH_PORT_FIELD_LABELS[key] ?? key);
  }

  ngOnInit() {
    const f = this.field;
    this._useAsPort.set(f?.useAsPort ?? false);
    this._value.set(f?.value !== undefined && f?.value !== null ? String(f.value) : '');
    const modes = this.valueModes();
    const fallback = graphPortDefaultValueMode(f?.port);
    this._valueMode.set(
      f?.valueMode && modes.includes(f.valueMode) ? f.valueMode : fallback
    );
  }

  setValueMode(mode: GraphPortValueMode) {
    if (!this.valueModes().includes(mode)) return;
    this._valueMode.set(mode);
    this._useAsPort.set(mode === 'port');
    this.fieldModeChange.emit({
      property: this.field.port.property,
      mode,
      language: this.valueLanguage(),
    });
    this.emitChange();
  }

  togglePort(event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    this._useAsPort.set(checked);
    if (checked) {
      this._valueMode.set('port');
      this.fieldModeChange.emit({
        property: this.field.port.property,
        mode: 'port',
        language: this.valueLanguage(),
      });
    } else if (this._valueMode() === 'port') {
      const fallback = graphPortDefaultValueMode(this.field?.port);
      this._valueMode.set(fallback);
      this.fieldModeChange.emit({
        property: this.field.port.property,
        mode: fallback,
        language: this.valueLanguage(),
      });
    }
    this.emitChange();
  }

  toggleBall() {
    this._useAsPort.update((v) => !v);
    this.emitChange();
  }

  onValueChange(event: Event) {
    const target = event.target as HTMLInputElement | HTMLTextAreaElement;
    this._value.set(target.value);
    this.emitChange();
  }

  onCodeChange(code: string) {
    this._value.set(code);
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
