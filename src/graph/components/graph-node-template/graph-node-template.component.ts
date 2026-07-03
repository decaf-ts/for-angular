import { Component, EnvironmentInjector, inject, input, computed, ElementRef } from '@angular/core';
import { ModalController } from '@ionic/angular/standalone';
import {
  NgDiagramBaseNodeTemplateComponent,
  NgDiagramNodeTemplate,
  NgDiagramModelService,
  NgDiagramPortComponent,
  NgDiagramService,
  type Node,
} from 'ng-diagram';
import { PortDirection } from '@decaf-ts/ui-decorators/graph';
import { GraphDemoNodeData } from '../../types';
import { graphExecutionState } from '../../execution/GraphExecutionStateService';
import { graphNodeConfig } from '../../execution/GraphNodeConfigStore';
import { graphSelection } from '../../execution/GraphSelectionStore';
import { GraphNodeEditModalComponent, type GraphNodeEditResult } from '../graph-node-edit-modal/graph-node-edit-modal.component';

@Component({
  selector: 'app-graph-node-template',
  standalone: true,
  imports: [NgDiagramBaseNodeTemplateComponent, NgDiagramPortComponent],
  templateUrl: './graph-node-template.component.html',
  styleUrl: './graph-node-template.component.scss',
})
export class GraphNodeTemplateComponent implements NgDiagramNodeTemplate<GraphDemoNodeData> {
  node = input.required<Node<GraphDemoNodeData>>();
  private readonly modelService = inject(NgDiagramModelService);
  private readonly diagramService = inject(NgDiagramService);
  private readonly injector = inject(EnvironmentInjector);
  private readonly modalCtrl = inject(ModalController);
  private readonly hostRef = inject(ElementRef<HTMLElement>);
  private _pinned = false;

  readonly nodeExecutionState = computed(() => {
    const id = this.node().id;
    return graphExecutionState.nodeStates()[id];
  });

  readonly isPinned = computed(() => this._pinned);

  readonly statusLabel = computed(() => {
    const state = this.nodeExecutionState();
    if (!state) return '';
    return state['status'] as string;
  });

  readonly isSelected = computed(() => {
    const nodeId = this.node().id;
    return graphSelection.selectedNodeIds().has(nodeId);
  });

  readonly isConnecting = computed(() => {
    const linking = this.diagramService.actionState().linking;
    return !!linking && linking.sourceNodeId === this.node().id;
  });

  readonly connectedPortIds = computed(() => {
    const nodeId = this.node().id;
    const edges = this.modelService.edges();
    const ids = new Set<string>();
    for (const edge of edges) {
      if (edge.source === nodeId && edge.sourcePort) ids.add(edge.sourcePort);
      if (edge.target === nodeId && edge.targetPort) ids.add(edge.targetPort);
    }
    return ids;
  });

  readonly iconFallback = computed(() => {
    const title = this.node().data.title || this.node().data.kind;
    return title.charAt(0).toUpperCase();
  });

  private updatePinnedClasses() {
    const el = this.hostRef.nativeElement;
    const article = el.querySelector('article.graph-node');
    if (!article) return;
    article.classList.toggle('graph-node--pinned', this._pinned);
  }

  inputPorts() {
    return this.visiblePorts(PortDirection.INPUT);
  }

  outputPorts() {
    return this.visiblePorts(PortDirection.OUTPUT);
  }

  connectionPorts() {
    return this.visiblePorts(PortDirection.CONNECTION);
  }

  connectionColor(category?: string): string {
    if (!category) return '#64748b';
    const colors: Record<string, string> = {
      model: '#3b82f6',
      memory: '#10b981',
      workspace: '#f59e0b',
    };
    return colors[category] ?? '#64748b';
  }

  async deleteNode(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    this.modelService.deleteNodes([this.node().id]);
  }

  async openEditor(event: Event) {
    event.preventDefault();
    event.stopPropagation();

    const ModelClass = this.node().data.modelClass;
    if (typeof ModelClass !== 'function') return;

    const nodeId = this.node().id;
    const existingConfig = graphNodeConfig.getConfig(nodeId);
    const initialValues = existingConfig?.values ?? {};
    const initialPortModes = existingConfig?.portModes ?? {};

    const modal = await this.modalCtrl.create({
      component: GraphNodeEditModalComponent,
      componentProps: {
        nodeTitle: this.node().data.title,
        modelClass: ModelClass,
        nodeId,
        initialValues,
        initialPortModes,
      },
      presentingElement: undefined,
    });

    await modal.present();

    const { role, data } = await modal.onWillDismiss<GraphNodeEditResult | null>();
    if (role === 'confirm' && data) {
      graphNodeConfig.applyResult(data);
    }
  }

  pinNode(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    this._pinned = !this._pinned;
    this.updatePinnedClasses();
  }

  visiblePorts(direction: PortDirection) {
    const showAll = this.isSelected() || this.isConnecting();
    const connected = this.connectedPortIds();
    return this.node()
      .data.ports.filter((port) => port.direction === direction)
      .filter((port) => {
        const portId = port.path || port.property;
        if (port.property === 'value' || port.path === 'value') return true;
        if (showAll) return true;
        return connected.has(portId);
      });
  }
}
