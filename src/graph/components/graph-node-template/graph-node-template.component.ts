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
import type { SwitchNodeMetadata, NodeMetadataChange } from '@decaf-ts/integrations/graph';
import { GraphDemoNodeData } from '../../types';
import { graphExecutionState } from '../../execution/GraphExecutionStateService';
import { graphNodeConfig } from '../../execution/GraphNodeConfigStore';
import { graphSelection } from '../../execution/GraphSelectionStore';
import { GraphNodeEditModalComponent, type GraphNodeEditResult } from '../graph-node-edit-modal/graph-node-edit-modal.component';
import { GraphSwitchEditModalComponent, type GraphSwitchEditResult } from '../graph-switch-edit-modal/graph-switch-edit-modal.component';

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

  readonly nodeHeight = computed(() => {
    const data = this.node().data;
    const caseCount = data.switchMetadata?.cases?.length ?? 0;
    if (caseCount > 0) {
      return 140 + caseCount * 24;
    }
    return data.switchMetadata ? 140 : null;
  });

  readonly nodeWidth = computed(() => {
    const data = this.node().data;
    return data.switchMetadata ? 120 : null;
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
    const data = this.node().data;
    const isSwitch = data.kind === 'core.flow.switch';

    if (isSwitch) {
      const inputProps = data.ports
        .filter((p) => p.direction === PortDirection.INPUT)
        .map((p) => p.property);
      const existingConfig = graphNodeConfig.getConfig(nodeId);
      const initialSwitchMeta: SwitchNodeMetadata = data.switchMetadata ?? { cases: [], defaultPort: 'default' };

      const modal = await this.modalCtrl.create({
        component: GraphSwitchEditModalComponent,
        componentProps: {
          nodeTitle: data.title,
          nodeId,
          inputProperties: inputProps,
          initialSwitchMetadata: initialSwitchMeta,
        },
        presentingElement: undefined,
      });

      await modal.present();

      const { role, data: result } = await modal.onWillDismiss<GraphSwitchEditResult | null>();
      if (role === 'confirm' && result) {
        graphNodeConfig.applyResult({
          nodeId: result.nodeId,
          values: result.values,
          portModes: result.portModes,
          outputSplits: result.outputSplits,
        });
        const change = (ModelClass as unknown as { applyMetadata?: (m: unknown) => NodeMetadataChange | null })
          .applyMetadata?.(result.switchMetadata);
        if (change) {
          this.applyNodeMetadata(change);
        }
      }
      return;
    }

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

    const { role, data: result } = await modal.onWillDismiss<GraphNodeEditResult | null>();
    if (role === 'confirm' && result) {
      graphNodeConfig.applyResult(result);
    }
  }

  /**
   * Relays a {@link NodeMetadataChange} produced by the node class's own
   * `applyMetadata()` into the ng-diagram model. The node class owns its
   * ports, size, and data patches — this method just pushes them onto the
   * diagram so they render on canvas.
   */
  private applyNodeMetadata(change: NodeMetadataChange) {
    const id = this.node().id;
    const data = this.node().data;
    const updatedData = { ...data, ...change.dataPatch, ports: change.ports } as GraphDemoNodeData;
    const diagram = this.modelService;
    const currentNodes = diagram.nodes();
    const updatedNodes = currentNodes.map((n) => {
      if (n.id !== id) return n;
      const prevSize = n.size ?? { width: 0, height: 0 };
      return {
        ...n,
        data: updatedData,
        size: {
          width: change.size.width ?? prevSize.width,
          height: change.size.height ?? prevSize.height,
        },
      } as never;
    }) as never[];
    diagram.updateNodes(updatedNodes);

    const el = this.hostRef.nativeElement;
    const article = el.querySelector('article.graph-node');
    if (article) {
      article.style.setProperty('height', `${change.size.height}px`);
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
