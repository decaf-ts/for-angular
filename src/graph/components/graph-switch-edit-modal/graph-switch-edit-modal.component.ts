import { Component, computed, inject, Input, OnInit, signal } from '@angular/core';
import type { SwitchNodeMetadata as BaseSwitchNodeMetadata, SwitchCase } from '@decaf-ts/integrations/graph/shared';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonInput,
  IonTitle,
  IonToggle,
  IonToolbar,
  ModalController,
} from '@ionic/angular/standalone';
import { IconComponent } from 'src/lib/components';
import {
  GraphConditionEditorComponent,
  type GraphConditionEditorChange,
} from '../graph-condition-editor/graph-condition-editor.component';

let caseIdCounter = 0;

function generateCaseId(): string {
  caseIdCounter += 1;
  return `case-${Date.now()}-${caseIdCounter}`;
}

function sanitizePortName(label: string): string {
  return (
    label
      .replace(/[^a-zA-Z0-9_]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .toLowerCase() || 'case'
  );
}

export interface GraphSwitchEditResult {
  nodeId: string;
  values: Record<string, unknown>;
  portModes: Record<string, 'port' | 'value'>;
  outputSplits: string[];
  switchMetadata: BaseSwitchNodeMetadata;
  autoCreateDefaultNode: boolean;
}

type SwitchNodeMetadata = BaseSwitchNodeMetadata & { hasDefault?: boolean };

@Component({
  selector: 'app-graph-switch-edit-modal',
  standalone: true,
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButton,
    IonButtons,
    IconComponent,
    IonInput,
    IonToggle,
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
  readonly _hasDefault = signal(false);
  readonly _wasDefaultToggledOn = signal(false);
  readonly _draggedId = signal<string | null>(null);
  readonly _dragOverIndex = signal<number | null>(null);

  readonly cases = this._cases.asReadonly();
  readonly defaultPort = this._defaultPort.asReadonly();
  readonly hasDefault = this._hasDefault.asReadonly();
  readonly draggedId = this._draggedId.asReadonly();
  readonly dragOverIndex = this._dragOverIndex.asReadonly();
  readonly outputPorts = computed(() => {
    const ports = this._cases().map((c) => c.outputPort);
    if (this._hasDefault()) {
      ports.push(this._defaultPort());
    }
    return ports;
  });

  ngOnInit() {
    this._cases.set(this.initialSwitchMetadata.cases.map((c) => ({ ...c })));
    this._defaultPort.set(this.initialSwitchMetadata.defaultPort ?? 'default');
    this._hasDefault.set(this.initialSwitchMetadata.hasDefault === true);
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

  onDragStart(id: string, event: DragEvent) {
    this._draggedId.set(id);
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', id);
    }
  }

  onDragEnd() {
    this._draggedId.set(null);
    this._dragOverIndex.set(null);
  }

  onDragOver(index: number, event: DragEvent) {
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    if (this._dragOverIndex() !== index) {
      this._dragOverIndex.set(index);
    }
  }

  onDragLeave() {
    this._dragOverIndex.set(null);
  }

  onDrop(index: number, event: DragEvent) {
    event.preventDefault();
    const draggedId = this._draggedId() ?? event.dataTransfer?.getData('text/plain');
    this._draggedId.set(null);
    this._dragOverIndex.set(null);
    if (!draggedId) return;

    this._cases.update((cases) => {
      const fromIndex = cases.findIndex((c) => c.id === draggedId);
      if (fromIndex === -1 || fromIndex === index) return cases;
      const updated = [...cases];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(index, 0, moved);
      return updated;
    });
  }

  onHasDefaultChange(event: Event) {
    const target = event.target as HTMLInputElement;
    const next = target.checked;
    if (next && !this._hasDefault()) {
      this._wasDefaultToggledOn.set(true);
    }
    this._hasDefault.set(next);
  }

  onCaseLabelChange(id: string, event: Event) {
    const target = event.target as HTMLInputElement;
    const label = target.value;
    const outputPort = sanitizePortName(label);
    this._cases.update((cases) => cases.map((c) => (c.id === id ? { ...c, label, outputPort } : c)));
  }

  onConditionChange(id: string, change: GraphConditionEditorChange) {
    this._cases.update((cases) => cases.map((c) => (c.id === id ? { ...c, condition: change.condition } : c)));
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
        hasDefault: this._hasDefault(),
      },
      autoCreateDefaultNode: this._wasDefaultToggledOn(),
    };
    this.modalCtrl.dismiss(result, 'confirm');
  }

  cancel() {
    this.modalCtrl.dismiss(null, 'cancel');
  }
}
