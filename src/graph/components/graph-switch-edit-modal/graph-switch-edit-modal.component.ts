import { Component, Input, signal, computed, inject, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular/standalone';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonButtons, IonIcon, IonItem, IonLabel, IonInput } from '@ionic/angular/standalone';
import { GraphConditionEditorComponent, type GraphConditionEditorChange } from '../graph-condition-editor/graph-condition-editor.component';
import type { SwitchCase, SwitchCaseCondition, SwitchNodeMetadata } from '@decaf-ts/integrations/graph/shared';

let caseIdCounter = 0;

function generateCaseId(): string {
  caseIdCounter += 1;
  return `case-${Date.now()}-${caseIdCounter}`;
}

function sanitizePortName(label: string): string {
  return label
    .replace(/[^a-zA-Z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .toLowerCase() || 'case';
}

export interface GraphSwitchEditResult {
  nodeId: string;
  values: Record<string, unknown>;
  portModes: Record<string, 'port' | 'value'>;
  outputSplits: string[];
  switchMetadata: SwitchNodeMetadata;
}

@Component({
  selector: 'app-graph-switch-edit-modal',
  standalone: true,
  imports: [
    IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonButtons, IonIcon, IonInput,
    GraphConditionEditorComponent,
  ],
  templateUrl: './graph-switch-edit-modal.component.html',
  styleUrl: './graph-switch-edit-modal.component.scss',
})
export class GraphSwitchEditModalComponent implements OnInit {
  @Input() nodeTitle = '';
  @Input() nodeId = '';
  @Input() inputProperties: string[] = [];
  @Input() initialSwitchMetadata: SwitchNodeMetadata = { cases: [], defaultPort: 'default' };

  private readonly modalCtrl = inject(ModalController);

  readonly _cases = signal<SwitchCase[]>([]);
  readonly _defaultPort = signal('default');

  readonly cases = this._cases.asReadonly();
  readonly defaultPort = this._defaultPort.asReadonly();
  readonly outputPorts = computed(() => {
    const ports = this._cases().map((c) => c.outputPort);
    ports.push(this._defaultPort());
    return ports;
  });

  ngOnInit() {
    this._cases.set(this.initialSwitchMetadata.cases.map((c) => ({ ...c })));
    this._defaultPort.set(this.initialSwitchMetadata.defaultPort ?? 'default');
  }

  addCase() {
    const id = generateCaseId();
    const label = `Case ${this._cases().length + 1}`;
    const outputPort = `case_${this._cases().length + 1}`;
    const newCase: SwitchCase = {
      id,
      label,
      condition: { op: 'eq', left: { path: '' }, right: { const: '' } },
      outputPort,
    };
    this._cases.update((cases) => [...cases, newCase]);
  }

  removeCase(id: string) {
    this._cases.update((cases) => cases.filter((c) => c.id !== id));
  }

  onCaseLabelChange(id: string, event: Event) {
    const target = event.target as HTMLInputElement;
    const label = target.value;
    const outputPort = sanitizePortName(label);
    this._cases.update((cases) =>
      cases.map((c) => (c.id === id ? { ...c, label, outputPort } : c))
    );
  }

  onConditionChange(id: string, change: GraphConditionEditorChange) {
    this._cases.update((cases) =>
      cases.map((c) => (c.id === id ? { ...c, condition: change.condition } : c))
    );
  }

  trackCase(index: number, item: SwitchCase): string {
    return item.id;
  }

  save() {
    const result: GraphSwitchEditResult = {
      nodeId: this.nodeId,
      values: {},
      portModes: {},
      outputSplits: [],
      switchMetadata: {
        cases: this._cases(),
        defaultPort: this._defaultPort(),
      },
    };
    this.modalCtrl.dismiss(result, 'confirm');
  }

  cancel() {
    this.modalCtrl.dismiss(null, 'cancel');
  }
}
