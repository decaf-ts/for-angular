import { Component, EnvironmentInjector, inject, input, computed, ElementRef, AfterViewInit, OnDestroy, NgZone } from '@angular/core';
import { ModalController } from '@ionic/angular/standalone';
import {
  NgDiagramBaseNodeTemplateComponent,
  NgDiagramNodeTemplate,
  NgDiagramModelService,
  NgDiagramPortComponent,
  NgDiagramService,
  type Node,
  type Edge,
} from 'ng-diagram';
import { graphDefinitionOf, PortDirection } from '@decaf-ts/ui-decorators/graph';
import type { GraphPortDefinition } from '@decaf-ts/ui-decorators/graph';
import type { SwitchNodeMetadata, SwitchCase, NodeMetadataChange } from '@decaf-ts/integrations/graph/shared';
import { LogFlowNode } from '@decaf-ts/integrations/graph/shared';
import { buildMemberNode } from '../../utils';
import { GraphDemoNodeData } from '../../types';
import { graphExecutionState } from '../../execution/GraphExecutionStateService';
import { graphNodeConfig } from '../../execution/GraphNodeConfigStore';
import { graphSelection } from '../../execution/GraphSelectionStore';
import { GraphNodeEditModalComponent, type GraphNodeEditResult } from '../graph-node-edit-modal/graph-node-edit-modal.component';
import { GraphSwitchEditModalComponent, type GraphSwitchEditResult } from '../graph-switch-edit-modal/graph-switch-edit-modal.component';

function computeSwitchMetadataChange(
  modelClass: unknown,
  currentData: GraphDemoNodeData,
  meta: SwitchNodeMetadata
): NodeMetadataChange {
  const definition = graphDefinitionOf(modelClass as never);
  const defaultPortName = meta.defaultPort ?? 'default';
  const hasDefault = meta.hasDefault === true;
  const casePortNames = new Set((meta.cases || []).map((c: SwitchCase) => c.outputPort));

  const basePorts: GraphPortDefinition[] = definition.ports;
  const nonDefaultNonCasePorts = basePorts.filter(
    (p) => p.property !== defaultPortName && !casePortNames.has(p.property)
  );
  const defaultPort = basePorts.find((p) => p.property === defaultPortName);

  const casePorts: GraphPortDefinition[] = (meta.cases || []).map((c: SwitchCase) => ({
    property: c.outputPort,
    name: c.label,
    direction: PortDirection.OUTPUT,
    label: c.label,
    required: false,
    hidden: false,
    path: c.outputPort,
  }));

  const ports = [...nonDefaultNonCasePorts, ...casePorts];
  if (hasDefault && defaultPort) {
    ports.push(defaultPort);
  }

  const caseCount = (meta.cases || []).length;
  return {
    ports,
    size: {
      width: definition.width ?? 120,
      height: caseCount > 0 ? 140 + caseCount * 24 : definition.height ?? 140,
    },
    dataPatch: { switchMetadata: meta },
  };
}

@Component({
  selector: 'app-graph-node-template',
  standalone: true,
  imports: [NgDiagramBaseNodeTemplateComponent, NgDiagramPortComponent],
  templateUrl: './graph-node-template.component.html',
  styleUrl: './graph-node-template.component.scss',
})
export class GraphNodeTemplateComponent implements NgDiagramNodeTemplate<GraphDemoNodeData>, AfterViewInit, OnDestroy {
  node = input.required<Node<GraphDemoNodeData>>();
  private readonly modelService = inject(NgDiagramModelService);
  private readonly diagramService = inject(NgDiagramService);
  private readonly injector = inject(EnvironmentInjector);
  private readonly modalCtrl = inject(ModalController);
  private readonly hostRef = inject(ElementRef<HTMLElement>);
  private readonly zone = inject(NgZone);
  private _pinned = false;
  private portObserver: MutationObserver | null = null;
  private pendingRaf: number | null = null;

  ngAfterViewInit() {
    const host = this.hostRef.nativeElement;
    const nodeEl = host.closest('.ng-diagram-node') as HTMLElement | null;
    if (!nodeEl) return;

    this.zone.runOutsideAngular(() => {
      this.portObserver = new MutationObserver(() => {
        if (this.pendingRaf !== null) return;
        this.pendingRaf = requestAnimationFrame(() => {
          this.pendingRaf = null;
          this.remeasurePorts(nodeEl);
        });
      });
      this.portObserver.observe(nodeEl, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['data-port-id', 'style', 'class'],
      });
    });

    this.pendingRaf = requestAnimationFrame(() => {
      this.pendingRaf = null;
      this.remeasurePorts(nodeEl);
    });
  }

  ngOnDestroy() {
    if (this.portObserver) {
      this.portObserver.disconnect();
      this.portObserver = null;
    }
    if (this.pendingRaf !== null) {
      cancelAnimationFrame(this.pendingRaf);
      this.pendingRaf = null;
    }
  }

  private remeasurePorts(nodeEl: HTMLElement) {
    const id = this.node().id;
    const nodeRect = nodeEl.getBoundingClientRect();
    if (nodeRect.width === 0 && nodeRect.height === 0) return;

    let scale = 1;
    try {
      scale = this.modelService.metadata()?.viewport?.scale ?? 1;
    } catch {
      scale = 1;
    }

    const portEls = nodeEl.querySelectorAll('[data-port-id]');
    const portUpdates: { portId: string; portChanges: { position: { x: number; y: number }; size: { width: number; height: number } } }[] = [];
    portEls.forEach((el) => {
      const portId = el.getAttribute('data-port-id');
      if (!portId) return;
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) return;
      portUpdates.push({
        portId,
        portChanges: {
          position: { x: (r.left - nodeRect.left) / scale, y: (r.top - nodeRect.top) / scale },
          size: { width: r.width / scale, height: r.height / scale },
        },
      });
    });
    if (portUpdates.length === 0) return;

    const ds = this.diagramService as unknown as { flowCoreProvider?: { provide: () => { updater: { applyPortChanges: (nodeId: string, updates: typeof portUpdates) => void } } } };
    const flowCore = ds.flowCoreProvider?.provide();
    if (!flowCore) return;
    flowCore.updater.applyPortChanges(id, portUpdates);
  }

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

  readonly portModes = computed(() => {
    const nodeId = this.node().id;
    return graphNodeConfig.getConfig(nodeId)?.portModes ?? {};
  });

  readonly iconFallback = computed(() => {
    const title = this.node().data.title || this.node().data.kind;
    return title.charAt(0).toUpperCase();
  });

  readonly nodeWidthPx = computed(() => {
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
          .applyMetadata?.(result.switchMetadata)
          ?? computeSwitchMetadataChange(ModelClass, data, result.switchMetadata);
        this.applyNodeMetadata(change);
        if (result.autoCreateDefaultNode) {
          this.autoCreateExceptionNode(result.switchMetadata.defaultPort ?? 'default');
        }
      }
      return;
    }

    const existingConfig = graphNodeConfig.getConfig(nodeId);
    const initialValues = existingConfig?.values ?? {};
    const initialPortModes = existingConfig?.portModes ?? {};
    const initialMetadata = existingConfig?.metadata ?? {};

    const modal = await this.modalCtrl.create({
      component: GraphNodeEditModalComponent,
      componentProps: {
        nodeTitle: this.node().data.title,
        modelClass: ModelClass,
        nodeId,
        initialValues,
        initialPortModes,
        initialMetadata,
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

  /**
   * Auto-creates a Log node (as a simple exception/default handler) to the
   * right of the switch node and connects the switch's `default` output port
   * to the Log node's `value` input port. The user can delete the auto-created
   * node and connect the default port to something else.
   */
  private autoCreateExceptionNode(defaultPort: string) {
    const switchNode = this.node();
    const switchPos = switchNode.position ?? { x: 0, y: 0 };
    const switchSize = switchNode.size ?? { width: 120, height: 140 };

    const exceptionNode = buildMemberNode(LogFlowNode, 0, `default-handler-${Date.now()}`, 'No match (default)');
    exceptionNode.position = {
      x: switchPos.x + switchSize.width + 150,
      y: switchPos.y,
    };

    const diagram = this.modelService;
    diagram.addNodes([exceptionNode as never]);

    const edge: Edge = {
      id: `edge-default-${Date.now()}`,
      source: switchNode.id,
      sourcePort: defaultPort,
      target: exceptionNode.id,
      targetPort: 'value',
      data: { label: 'default' },
    } as Edge;
    diagram.addEdges([edge]);
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
    const modes = this.portModes();
    const isDefault = (port: { property: string; path?: string }) =>
      port.property === 'value' || port.path === 'value' || port.property === 'default' || port.path === 'default';
    // Switch case ports (no @uielement, dynamically generated) are always visible.
    const isSwitchCasePort = (port: { element?: unknown }) => !port.element;
    return this.node()
      .data.ports.filter((port) => port.direction === direction)
      .filter((port) => {
        const portId = port.path || port.property;
        const mode = modes[portId];
        if (mode === 'value') return false;
        if (isSwitchCasePort(port)) return true;
        if (mode !== 'port' && port.element) {
          return connected.has(portId);
        }
        if (isDefault(port)) return true;
        if (showAll) return true;
        return connected.has(portId);
      })
      .sort((a, b) => {
        const aDefault = isDefault(a) ? 1 : 0;
        const bDefault = isDefault(b) ? 1 : 0;
        return aDefault - bDefault;
      });
  }
}
