import { Component, EnvironmentInjector, inject, input, computed, signal, ElementRef, viewChild } from '@angular/core';
import { ModalController } from '@ionic/angular/standalone';
import {
  NgDiagramBaseNodeTemplateComponent,
  NgDiagramNodeTemplate,
  NgDiagramModelService,
  NgDiagramPortComponent,
  type Node,
} from 'ng-diagram';
import { PortDirection } from '@decaf-ts/ui-decorators/graph';
import { GraphDemoNodeData } from '../../types';
import { graphExecutionState } from '../../execution/GraphExecutionStateService';
import { graphNodeConfig } from '../../execution/GraphNodeConfigStore';
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

  private updatePinnedClasses() {
    const el = this.hostRef.nativeElement;
    const article = el.querySelector('article.graph-node');
    if (!article) return;
    article.classList.toggle('graph-node--pinned', this._pinned);
    const pinBtns = el.querySelectorAll('button.graph-node__action');
    pinBtns.forEach((btn: Element) => {
      if (btn.textContent?.includes('📌')) {
        btn.classList.toggle('graph-node__action--pinned', this._pinned);
      }
    });
    const statusBar = el.querySelector('.graph-node__status-bar');
    if (statusBar) {
      let pinnedBadge = statusBar.querySelector('.graph-node__status--pinned');
      if (this._pinned && !pinnedBadge) {
        pinnedBadge = document.createElement('span');
        pinnedBadge.className = 'graph-node__status graph-node__status--pinned';
        pinnedBadge.textContent = 'pinned';
        statusBar.appendChild(pinnedBadge);
      } else if (!this._pinned && pinnedBadge) {
        pinnedBadge.remove();
      }
    }
  }

  inputPorts() {
    return this.visiblePorts(PortDirection.INPUT);
  }

  outputPorts() {
    return this.visiblePorts(PortDirection.OUTPUT);
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
    const target = event.target as HTMLElement;
    const article = target.closest('article.graph-node');
    if (!article) return;
    article.classList.toggle('graph-node--pinned', this._pinned);
    const pinBtns = article.querySelectorAll('button.graph-node__action');
    pinBtns.forEach((btn: Element) => {
      if (btn.textContent?.includes('📌')) {
        btn.classList.toggle('graph-node__action--pinned', this._pinned);
      }
    });
    const statusBar = article.querySelector('.graph-node__status-bar');
    if (statusBar) {
      let pinnedBadge = statusBar.querySelector('.graph-node__status--pinned');
      if (this._pinned && !pinnedBadge) {
        pinnedBadge = document.createElement('span');
        pinnedBadge.className = 'graph-node__status graph-node__status--pinned';
        pinnedBadge.textContent = 'pinned';
        statusBar.appendChild(pinnedBadge);
      } else if (!this._pinned && pinnedBadge) {
        pinnedBadge.remove();
      }
    }
  }

  toggleExpanded(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    this.modelService.updateNodeData(this.node().id, {
      ...this.node().data,
      expanded: !this.node().data.expanded,
    });
  }

  isExpanded() {
    return !!this.node().data.expanded;
  }

  hasExpandablePorts(direction: PortDirection) {
    return this.node().data.ports.some((port) => port.direction === direction && !!port.children?.length);
  }

  visiblePorts(direction: PortDirection) {
    return this.node()
      .data.ports.filter((port) => port.direction === direction)
      .flatMap((port) => this.portLeaves(port));
  }

  portLeaves(port: GraphDemoNodeData['ports'][number]): GraphDemoNodeData['ports'] {
    if (port.children?.length && this.isExpanded()) {
      return port.children.flatMap((child) => this.portLeaves(child));
    }

    return [port];
  }
}
