import { Component, Input, signal, computed, Output, EventEmitter, OnInit } from '@angular/core';
import { IonInput, IonTextarea } from '@ionic/angular/standalone';
import type { GraphPortDefinition } from '@decaf-ts/ui-decorators/graph';
import { PortDirection } from '@decaf-ts/ui-decorators/graph';
import { CodeEditorComponent, type CodeEditorMode } from '../code-editor/code-editor.component';

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

  /**
   * When set to `'formula'`, the literal-value editor (port toggle OFF) uses
   * the CodeEditorComponent in formula mode (single-line JS syntax highlight)
   * instead of a plain ion-input/ion-textarea. Pass `'formula'` for nodes
   * whose input values are JS expressions (e.g. Code node).
   */
  @Input() codeMode: CodeEditorMode | null = null;

  readonly _useAsPort = signal(false);
  readonly _value = signal('');

  readonly isInput = computed(() => this.field?.port?.direction === PortDirection.INPUT);
  readonly isOutput = computed(() => this.field?.port?.direction === PortDirection.OUTPUT);
  readonly useAsPort = computed(() => this._useAsPort());
  readonly portLabel = computed(() => this.field?.port?.name ?? '');
  readonly fieldLabel = computed(() => this.field?.label ?? '');
  readonly fieldType = computed(() => this.field?.type ?? 'text');
  readonly isTextarea = computed(() => this.fieldType() === 'textarea');
  readonly useCodeEditor = computed(() => this.codeMode === 'formula' && this.isInput());

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
