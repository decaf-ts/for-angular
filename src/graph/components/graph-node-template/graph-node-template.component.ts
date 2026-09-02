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
import { PortDirection } from '@decaf-ts/ui-decorators/graph';
import type {
  GraphInputBinding,
  GraphJsonValue,
  GraphNodeInstance,
  GraphOutputBinding,
  GraphPortDefinition,
} from '@decaf-ts/ui-decorators/graph';
import type { SwitchNodeMetadata, SwitchCase, NodeMetadataChange } from '@decaf-ts/integrations/graph/shared';
import { GraphDemoNodeData } from '../../types';
import { graphExecutionState } from '../../execution/GraphExecutionStateService';
import { graphInspection } from '../../execution/GraphInspectionStore';
import { GraphWorkflowDocumentStore } from '../../document/GraphWorkflowDocumentStore';
import type { GraphDocumentCommand } from '../../document/GraphDocumentCommands';
import { graphNodeAddCommandOf } from '../../document/GraphDiagramMutationTranslator';
import { GraphNodeCatalogService } from '../../catalog/GraphNodeCatalogService';
import { graphSelection } from '../../execution/GraphSelectionStore';
import { GraphNodeEditModalComponent, type GraphNodeEditResult } from '../graph-node-edit-modal/graph-node-edit-modal.component';
import { GraphSwitchEditModalComponent, type GraphSwitchEditResult } from '../graph-switch-edit-modal/graph-switch-edit-modal.component';

const GRAPH_CANVAS_BOUNDARY_NODE_PREFIX = 'input-';
const GRAPH_CANVAS_GHOST_PREFIX = 'ghost-';

/**
 * Document-native switch write path (§4.4.4/§4.18): the canonical switch
 * instance carries its configuration in TWO shapes.
 * - `parameters["switch"]` block — backend executor parity
 *   (`SwitchGraphNodeExecutor.readSwitchMetadata` reads that block).
 * - top-level `parameters["cases"]`/`parameters["hasDefault"]` — the shared
 *   dynamic-port rules (`repeatFromParameter` on `cases`, `togglePort` on
 *   `hasDefault`) and both catalogue resolvers read that surface; the adapter's
 *   projection sizes the switch from `parameters["cases"]` as well.
 */
function switchParameterBlockOf(meta: SwitchNodeMetadata): Record<string, GraphJsonValue> {
  const cases = (meta.cases ?? []).map((entry) => ({
    id: entry.id,
    label: entry.label,
    condition: entry.condition,
    outputPort: entry.outputPort,
  })) as unknown as GraphJsonValue;
  const hasDefault = meta.hasDefault === true;
  return {
    cases,
    hasDefault,
    switch: {
      cases,
      defaultPort: meta.defaultPort ?? 'default',
      hasDefault,
    } as unknown as GraphJsonValue,
  } as Record<string, GraphJsonValue>;
}


function computeSwitchMetadataChange(
  currentData: GraphDemoNodeData,
  meta: SwitchNodeMetadata
): NodeMetadataChange {
  const defaultPortName = meta.defaultPort ?? 'default';
  const hasDefault = meta.hasDefault === true;
  const casePortNames = new Set((meta.cases || []).map((c: SwitchCase) => c.outputPort));

  const basePorts: GraphPortDefinition[] = currentData.ports ?? [];
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
      width: 120,
      height: caseCount > 0 ? 140 + caseCount * 24 : 140,
    },
    dataPatch: { switchMetadata: meta },
  };
}

/**
 * Canvas node template for the graph editor: renders node chrome, ports, and
 * badges from the node's manifest-derived data, including loop and switch
 * indicator overlays (DECAF-50 §4.4).
 */
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
  private readonly documentStore = inject(GraphWorkflowDocumentStore, { optional: true });
  private readonly catalog = inject(GraphNodeCatalogService);
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

  /**
   * Whether this node has already executed, i.e. double-clicking should open
   * the I/O inspection panel instead of the edit modal (DECAF-48 §4.6).
   */
  readonly hasRan = computed(() => {
    if (graphInspection.has(this.node().id)) return true;
    const state = this.nodeExecutionState();
    if (!state) return false;
    const status = state.status as string;
    return status === 'succeeded' || status === 'failed' || status === 'cached';
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

  /**
   * Document-active port modes (canonical-only): the mode map derives from
   * the node instance's input bindings in the document store (§4.4.5) —
   * 'edge' reads as the legacy `port` mode, literal/expression as `value`.
   */
  readonly portModes = computed(() => {
    const nodeId = this.node().id;
    const node = this.documentStore?.document()?.nodes.find((candidate) => candidate.id === nodeId);
    const modes: Record<string, 'port' | 'value'> = {};
    for (const [portId, binding] of Object.entries(node?.inputBindings ?? {})) {
      if (binding?.mode !== 'edge') {
        modes[portId] = 'value';
        continue;
      }
      modes[portId] = 'port';
    }
    return modes;
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
    // Sort output ports so that 'completed' renders first (topmost on the right edge)
    return this.visiblePorts(PortDirection.OUTPUT).sort((a, b) => {
      const aCompleted = a.property === 'completed' ? 0 : 1;
      const bCompleted = b.property === 'completed' ? 0 : 1;
      return aCompleted - bCompleted;
    });
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
    const nodeId = this.node().id;
    if (nodeId.startsWith(GRAPH_CANVAS_GHOST_PREFIX) || nodeId.startsWith(GRAPH_CANVAS_BOUNDARY_NODE_PREFIX)) {
      // Legacy-viewport placeholders are canvas-only; remove them directly.
      this.modelService.deleteNodes([nodeId]);
      return;
    }
    if (!this.documentStore) {
      this.modelService.deleteNodes([nodeId]);
      return;
    }
    try {
      this.documentStore.removeNode(nodeId);
    } catch (error) {
      console.warn('[GraphNodeTemplateComponent] node removal skipped', error);
    }
  }

  async openEditor(event: Event) {
    event.preventDefault();
    event.stopPropagation();

    // Double-click on an already-ran node opens the I/O inspection panel
    // instead of the edit modal (DECAF-48 §4.6).
    if (this.hasRan()) {
      graphInspection.toggle(this.node().id);
      return;
    }

    const nodeId = this.node().id;
    const data = this.node().data;
    const isSwitch = data.kind === 'core.flow.switch';
    const nodeInstance = this.documentStore?.document()?.nodes.find((candidate) => candidate.id === nodeId) ?? null;

    if (isSwitch) {
      const inputProps = data.ports
        .filter((p) => p.direction === PortDirection.INPUT)
        .map((p) => p.property);
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
        this.applySwitchEditResult(result, nodeInstance);
        if (result.autoCreateDefaultNode) {
          this.autoCreateExceptionNode(result.switchMetadata.defaultPort ?? 'default');
        }
      }
      return;
    }

    const modal = await this.modalCtrl.create({
      component: GraphNodeEditModalComponent,
      componentProps: {
        nodeTitle: this.node().data.title,
        nodeId,
        nodeData: data,
        nodeInstance,
        parameterDefs: this.catalog.get(data.kind)?.parameters ?? [],
      },
      presentingElement: undefined,
    });

    await modal.present();

    const { role, data: result } = await modal.onWillDismiss<GraphNodeEditResult | null>();
    if (role === 'confirm' && result) {
      this.dispatchNodeUpdate(result.nodeId, result);
    }
  }

  /**
   * Writes one node instance patch into the canonical document store. The edit
   * result carries the document-native fields (input bindings, parameters,
   * metadata) directly.
   */
  private dispatchNodeUpdate(nodeId: string, result: GraphNodeEditResult): void {
    if (!this.documentStore) return;
    try {
      this.documentStore.updateNode(nodeId, {
        inputBindings: result.inputBindings,
        parameters: result.parameters,
        ...(result.metadata && Object.keys(result.metadata).length
          ? { metadata: result.metadata }
          : {}),
      });
    } catch (error) {
      // The document store can be uninitialized in consumed-widget contexts;
      // editor-only writes degrade gracefully there.
      console.warn('[GraphNodeTemplateComponent] document write skipped', error);
    }
  }

  /**
   * Writes the canonical switch-cases patch for the switch's own edit modal.
   * The doc's write targets the dual switch shape (`switchParameterBlockOf` —
   * the `parameters["switch"]` executor block plus the top-level
   * `parameters["cases"]`/`parameters["hasDefault"]` resolver surface), while
   * the size/ports deltas replay through the node metadata change so the
   * canvas renders the case ports.
   */
  private applySwitchEditResult(result: GraphSwitchEditResult, nodeInstance: GraphNodeInstance | null): void {
    const data = this.node().data;
    const change = computeSwitchMetadataChange(data as GraphDemoNodeData, result.switchMetadata);
    this.applyNodeMetadata(change);
    if (!this.documentStore) return;
    try {
      this.documentStore.updateNode(result.nodeId, {
        parameters: switchParameterBlockOf(result.switchMetadata),
        size: { height: change.size.height, width: change.size.width },
        ...(Object.keys(result.portModes).length
          ? { inputBindings: this.inputBindingsFromPortModes(nodeInstance, result.portModes) }
          : {}),
      });
    } catch (error) {
      console.warn('[GraphNodeTemplateComponent] switch document write skipped', error);
    }
  }

  /**
   * The switch modal's legacy result still carries per-input port modes; map
   * them back into canonical bindings when the node exists in the document.
   */
  private inputBindingsFromPortModes(
    nodeInstance: GraphNodeInstance | null,
    portModes: Record<string, 'port' | 'value'>
  ): Record<string, GraphInputBinding> {
    const bindings: Record<string, GraphInputBinding> = { ...(nodeInstance?.inputBindings ?? {}) };
    for (const [portId, mode] of Object.entries(portModes)) {
      if (mode === 'port') {
        bindings[portId] = { mode: 'edge' };
        continue;
      }
      // 'value' keeps an existing literal/expression binding as-is; without one
      // the upstream manifest `defaultValue` fallback stays in force.
      const current = bindings[portId];
      if (current?.mode === 'literal' || current?.mode === 'expression') continue;
      delete bindings[portId];
    }
    return bindings;
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
   * to the Log node's `value` input port. Dispatches `node.add` + `edge.add`
   * into the canonical document store and lets the reconcile projection
   * materialize them on canvas (§4.4.4). The user can delete the auto-created
   * node and connect the default port to something else.
   */
  private autoCreateExceptionNode(defaultPort: string) {
    const switchNode = this.node();
    const documentStore = this.documentStore;
    if (!documentStore) return;
    const document = documentStore.document();
    if (!document) return;

    const switchPos = switchNode.position ?? { x: 0, y: 0 };
    const switchSize = switchNode.size ?? { width: 120, height: 140 };
    const reader = this.catalog.reader();

    const nodeCommand = graphNodeAddCommandOf(document, {
      id: `default-handler-${Date.now()}`,
      kind: 'core.flow.log',
      label: 'No match (default)',
      position: { x: switchPos.x + switchSize.width + 150, y: switchPos.y },
    }, reader);

    if (nodeCommand.type !== 'node.add') return;

    const exceptionNodeId = nodeCommand.node.id;
    const edgeId = `${switchNode.id}:${defaultPort}->${exceptionNodeId}:value`;
    const edgeCommand: GraphDocumentCommand = {
      type: 'edge.add',
      edge: {
        id: edgeId,
        type: 'data',
        source: { scope: 'node', nodeId: switchNode.id, port: defaultPort },
        target: { scope: 'node', nodeId: exceptionNodeId, port: 'value' },
        label: 'default',
      },
    };

    try {
      documentStore.dispatchCommand(nodeCommand);
      documentStore.dispatchCommand(edgeCommand);
    } catch (error) {
      console.warn('[GraphNodeTemplateComponent] default-handler dispatch skipped', error);
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
