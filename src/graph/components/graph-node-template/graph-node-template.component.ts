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
import { GRAPH_DEFAULT_NODE_CORNER_RADIUS, graphNodeSizeOf } from '@decaf-ts/ui-decorators/graph';
import type {
  GraphIconReference,
  GraphInputBinding,
  GraphJsonValue,
  GraphNodeDisplayManifest,
  GraphNodeInstance,
  GraphOutputBinding,
  GraphPortDefinition,
} from '@decaf-ts/ui-decorators/graph';
import type { SwitchNodeMetadata, SwitchCase, NodeMetadataChange } from '@decaf-ts/ui-decorators/graph';
import { GraphDemoNodeData } from '../../types';
import { graphExecutionState } from '../../execution/GraphExecutionStateService';
import { graphInspection } from '../../execution/GraphInspectionStore';
import { GraphWorkflowDocumentStore } from '../../document/GraphWorkflowDocumentStore';
import type { GraphDocumentCommand } from '../../document/GraphDocumentCommands';
import { graphNodeAddCommandOf } from '../../document/GraphDiagramMutationTranslator';
import { GraphNodeCatalogService } from '../../catalog/GraphNodeCatalogService';
import type { GraphNodeCatalogFailure } from '../../catalog/GraphNodeCatalogStore';
import { ghostNodeStore } from '../../execution/GhostNodeStore';
import { graphSelection } from '../../execution/GraphSelectionStore';
import { graphValidity } from '../../validation/GraphWorkflowValidityStore';
import { GraphNodeEditModalComponent, type GraphNodeEditResult } from '../graph-node-edit-modal/graph-node-edit-modal.component';
import { GraphSwitchEditModalComponent, type GraphSwitchEditResult } from '../graph-switch-edit-modal/graph-switch-edit-modal.component';

/**
 * `catalogue` icon references resolve to a Tabler sprite `<svg><use>` href
 * (D7/G3-25). The sprite ships every `ti-*` symbol id.
 */
export function graphIconSpriteHrefOf(icon: GraphIconReference | undefined): string | null {
  if (!icon || icon.type !== 'catalogue' || !icon.name) return null;
  return `assets/tabler-sprite.svg#tabler-${icon.name.replace(/^ti-/, '')}`;
}

/**
 * `url` and `data:` icon references resolve to an image source (D7/G3-25).
 * `data:` carries an inline `image/svg+xml` payload.
 */
export function graphIconImageSrcOf(icon: GraphIconReference | undefined): string | null {
  if (!icon) return null;
  if (icon.type === 'url' && icon.url) return icon.url;
  if (icon.type === 'data' && icon.value) {
    return `data:${icon.mediaType ?? 'image/svg+xml'};utf8,${encodeURIComponent(icon.value)}`;
  }
  return null;
}

/**
 * First output port id of a node (G3-29): the node-side add connector
 * auto-connects the new node from this port. Falls back to `result` when the node
 * exposes no output port.
 */
export function graphNodePrimaryOutputPortIdOf(ports: GraphPortDefinition[]): string {
  const outputs = (ports ?? []).filter((port) => port.direction === PortDirection.OUTPUT);
  return (outputs[0]?.path || outputs[0]?.property) ?? 'result';
}

/**
 * Degraded-mode feedback for the node CRUD modal (G3-28): backend-down silently
 * drops dynamic parameter options, so the modal is told the catalogue is degraded
 * and why. Only a `degraded`/`failed` catalogue produces a notice.
 */
export function graphNodeCatalogDegradedNoticeOf(
  status: string,
  failure: GraphNodeCatalogFailure | null
): { degraded: boolean; reason: string } {
  const degraded = status === 'degraded' || status === 'failed';
  if (!degraded) return { degraded: false, reason: '' };
  return {
    degraded: true,
    reason:
      failure?.kind === 'malformed-response'
        ? 'The node catalogue backend returned an unexpected response; dynamic parameter options may be incomplete.'
        : 'The node catalogue backend is unavailable; dynamic parameter options may be incomplete.',
  };
}

const GRAPH_CANVAS_BOUNDARY_NODE_PREFIX = 'input-';
const GRAPH_CANVAS_GHOST_PREFIX = 'ghost-';

/**
 * Vocabulary used to split a single-token node name into readable words for the
 * category letter silhouette (D7/G3-24). Longest first so `foreach` -> `for`+`each`.
 */
const GRAPH_SILHOUETTE_WORDS = [
  'parallel',
  'schedule',
  'boundary',
  'approval',
  'webhook',
  'trigger',
  'manual',
  'switch',
  'return',
  'delay',
  'merge',
  'until',
  'while',
  'break',
  'agent',
  'error',
  'human',
  'event',
  'form',
  'code',
  'chat',
  'each',
  'text',
  'for',
  'log',
  'map',
  'if',
];

/**
 * D2 default-port predicate (DECAF-50 §4.22): the manifest's default port is the
 * complete-input `value` port (or a `default` output branch). Default ports are
 * always visible.
 *
 * Exported for the gate-2 P0 port-visibility unit tests.
 */
export function isGraphDefaultPort(port: { property: string; path?: string }): boolean {
  const id = port.path || port.property;
  return id === 'value' || id === 'default';
}

/**
 * D2 dynamic-port predicate (G3-08): ports the manifest generates from its
 * declarative dynamic rules (e.g. Switch case ports) carry no static `@uielement`
 * and are covered by the same visibility rule as every other visible port.
 *
 * Exported for the gate-2 P0 port-visibility unit tests.
 */
export function isGraphDynamicPort(port: { element?: unknown }): boolean {
  return !port.element;
}

/**
 * D2 port-visibility rule (DECAF-50 §4.22, G3-05..G3-08). A port handle is
 * visible when any of the named guarantees holds:
 *
 * 1. it is the manifest's default port;
 * 2. it is connected (an edge binds it);
 * 3. it is a required **input** port (required inputs stay visible even when
 *    unconnected);
 * 4. it is value-bound (literal/expression) — it renders with a value badge
 *    instead of vanishing;
 * 5. it is a dynamic port (Switch cases), covered by the same rule.
 *
 * Selection/connection reveals every port. The manifest `hidden` flag is a
 * CRUD-form flag, never a canvas-hiding authority (`CodeInputSchema.data` is
 * canvas-only and hidden in the modal, yet still visible on the canvas).
 *
 * Exported for the gate-2 P0 port-visibility unit tests.
 */
export function graphPortVisible(
  port: { property: string; path?: string; required?: boolean; element?: unknown; direction: PortDirection },
  connected: ReadonlySet<string>,
  modes: Record<string, 'port' | 'value'>,
  showAll: boolean
): boolean {
  const portId = port.path || port.property;
  if (isGraphDefaultPort(port)) return true;
  if (connected.has(portId)) return true;
  if (port.direction === PortDirection.INPUT && port.required === true) return true;
  if (modes[portId] === 'value') return true;
  if (isGraphDynamicPort(port)) return true;
  return showAll;
}

/**
 * Readable category letter silhouette (D7/G3-24): the fallback when the manifest
 * provides no icon. Derived from the node's human name by splitting camelCase and
 * word boundaries and taking the first letter of up to two tokens — never just the
 * title's first character. `"Foreach"` -> `"FE"`, `"Split text"` -> `"ST"`.
 *
 * Exported for the gate-2 P0 node-face unit tests.
 */
export function graphNodeLetterSilhouetteOf(name: string): string {
  if (!name) return '?';
  const spaced = name
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim();
  let tokens = spaced.split(/\s+/).filter(Boolean);
  if (tokens.length === 1) {
    const lower = tokens[0].toLowerCase();
    for (const word of GRAPH_SILHOUETTE_WORDS) {
      if (lower === word) break;
      if (lower.startsWith(word) && lower.length > word.length) {
        tokens = [word, lower.slice(word.length)];
        break;
      }
    }
  }
  const initials = tokens.map((token) => token.charAt(0).toUpperCase()).filter(Boolean);
  return initials.slice(0, 2).join('') || '?';
}

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
  meta: SwitchNodeMetadata,
  display?: GraphNodeDisplayManifest
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
  // Value-driven growth (D1/G3-03): the size comes from the manifest's
  // declared display rules — never a hardcoded per-node formula.
  const size = graphNodeSizeOf(
    {
      width: display?.width,
      height: display?.height,
      sizeRules: display?.sizeRules,
    },
    { cases: caseCount }
  );
  return {
    ports,
    size,
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

  /**
   * Document-carried node instance (D4): the pin state is read from and written
   * to the canonical document, never a component-local flag.
   */
  private readonly documentNode = computed(() => {
    const nodeId = this.node().id;
    return this.documentStore?.signals.document()?.nodes.find((candidate) => candidate.id === nodeId);
  });

  /**
   * UI data-pin state (D4, DECAF-50 §4.22): pinned iff the canonical document
   * carries the node's pin state. The CSS class is incidental; the document is
   * the authority.
   */
  readonly isPinned = computed(() => this.documentNode()?.pinned !== undefined);

  /**
   * Whether the node is pinnable (D4/G3-14): the pin affordance renders only
   * when the manifest declares the node pinnable. Non-member canvases (ghosts,
   * consumed widgets without a manifest) default to pinnable.
   */
  readonly isPinnable = computed(() => this.node().data.pinnable !== false);

  /**
   * Whether the node carries at least one graph validation issue (D5/G3-16):
   * the canvas highlights it so the invalid state is visible per node.
   */
  readonly isInvalid = computed(() => graphValidity.invalidNodeIds().has(this.node().id));

  readonly statusLabel = computed(() => {
    const state = this.nodeExecutionState();
    if (!state) return '';
    return state['status'] as string;
  });

  /**
   * Whether this node has already executed. It never removes the CRUD form:
   * double-clicking always opens CRUD, and a ran node routes to the D3
   * three-pane split view whose CENTER pane is that same CRUD form
   * (DECAF-50 §4.22 D3/G3-10).
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

  readonly iconFallback = computed(() =>
    graphNodeLetterSilhouetteOf(this.node().data.title || this.node().data.kind)
  );

  /** Manifest icon reference (D7/G3-25) rendered per reference type. */
  readonly iconReference = computed<GraphIconReference | undefined>(() => this.node().data.iconReference);

  /** Manifest-authoritative corner radius (D1/G3-04). */
  readonly cornerRadiusPx = computed<number>(() => this.node().data.cornerRadius ?? GRAPH_DEFAULT_NODE_CORNER_RADIUS);

  /** Manifest-authoritative face silhouette (D1/G3-04). */
  readonly nodeShape = computed<string>(() => this.node().data.shape ?? 'rounded');

  /** `catalogue` icons resolve to a Tabler sprite `<svg><use>` href. */
  readonly iconSpriteHref = computed<string | null>(() => graphIconSpriteHrefOf(this.iconReference()));

  /** `url` / `data:` icons resolve to an image source. */
  readonly iconImageSrc = computed<string | null>(() => graphIconImageSrcOf(this.iconReference()));

  /**
   * Whether the node exposes at least one output port: the node-side add
   * connector (G3-29) only renders when there is an edge to connect from.
   */
  readonly hasOutputPorts = computed(() =>
    this.node().data.ports.some((port) => port.direction === PortDirection.OUTPUT)
  );

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

    // D3 (DECAF-50 §4.22): double-click ALWAYS opens the CRUD form. A node
    // that has run opens the three-pane split view whose CENTER pane is the
    // CRUD form (run inputs LEFT / CRUD CENTER / run outputs RIGHT) — the
    // `hasRan` state is kept but never removes CRUD (G3-10, supersedes
    // DECAF-48 §4.6 / DECAF-32 §21.11).
    if (this.hasRan()) {
      graphInspection.open(this.node().id);
      return;
    }

    await this.openCrudModal();
  }

  /**
   * Opens the node's CRUD form as a modal (pre-run path, D3). The modal is the
   * same document-native editor the split view renders inline once the node has
   * run, so both paths share one CRUD surface.
   */
  private async openCrudModal(): Promise<void> {
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

    const catalogStatus = this.catalog.status();
    const catalogFailure = this.catalog.failure();
    const { degraded, reason: degradedReason } = graphNodeCatalogDegradedNoticeOf(
      catalogStatus,
      catalogFailure
    );

    const modal = await this.modalCtrl.create({
      component: GraphNodeEditModalComponent,
      componentProps: {
        nodeTitle: this.node().data.title,
        nodeId,
        nodeData: data,
        nodeInstance,
        parameterDefs: this.catalog.get(data.kind)?.parameters ?? [],
        degraded,
        degradedReason,
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
    const display = this.catalog.get(data.kind)?.display;
    const change = computeSwitchMetadataChange(data as GraphDemoNodeData, result.switchMetadata, display);
    this.applyNodeMetadata(change);
    if (!this.documentStore) return;
    try {
      this.documentStore.updateNode(result.nodeId, {
        parameters: switchParameterBlockOf(result.switchMetadata),
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

  /**
   * D4 data pinning (DECAF-50 §4.22, fixes G3-14): toggles the node's pin
   * state by writing the canonical document — pinning freezes the current
   * parameter values, unpinning releases them. Never a local CSS-only toggle,
   * and never wired to the engine's cache pinning (`GraphPinning`).
   */
  pinNode(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    const nodeId = this.node().id;
    if (!this.documentStore) return;
    try {
      if (this.isPinned()) {
        this.documentStore.unpinNode(nodeId);
      } else {
        this.documentStore.pinNode(nodeId);
      }
    } catch (error) {
      console.warn('[GraphNodeTemplateComponent] document pin write skipped', error);
    }
  }

  /** D2 default-port predicate (`value`/`default`), always visible. */
  isDefaultPort(port: { property: string; path?: string }): boolean {
    return isGraphDefaultPort(port);
  }

  /**
   * First output port id (D2/G3-29): the node-side add connector
   * auto-connects the new node from this port.
   */
  primaryOutputPortId(): string {
    return graphNodePrimaryOutputPortIdOf(this.node().data.ports);
  }

  /**
   * Node-side add connector (G3-29 n8n-look ruling): records this node as the
   * pending connection source so the palette opens and the chosen node is placed
   * beside it and auto-connected from its first output port. This replaces the
   * corner popup as the node-adjacent add affordance; the canvas-level "+ Add
   * node" remains for unconnected insertion.
   */
  addNodeFromConnector(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    ghostNodeStore.requestAddNodeFrom(this.node().id, this.primaryOutputPortId());
  }

  /**
   * Binding mode for a port (`port` when edge-bound, `value` for literal /
   * expression bindings). Value-bound input ports render with a value badge
   * (D2/G3-07) instead of vanishing.
   */
  portBindingMode(port: { property: string; path?: string }): 'port' | 'value' | undefined {
    const portId = port.path || port.property;
    return this.portModes()[portId];
  }

  /**
   * Value indication for a value-bound (literal/expression) input port
   * (D2/G3-07): the bound literal is shown (truncated) and an expression
   * binding shows `ƒx`. Returns `null` for edge-bound ports.
   */
  portValueBadge(port: { property: string; path?: string }): string | null {
    const portId = port.path || port.property;
    if (this.portBindingMode(port) !== 'value') return null;
    const nodeId = this.node().id;
    const node = this.documentStore?.document()?.nodes.find((candidate) => candidate.id === nodeId);
    const binding = node?.inputBindings?.[portId];
    if (!binding || binding.mode === 'edge') return null;
    if (binding.mode === 'expression') return 'ƒx';
    const value = (binding as { value?: unknown }).value;
    if (value === undefined || value === null) return '=';
    const text = typeof value === 'string' ? value : JSON.stringify(value);
    return text.length > 12 ? `${text.slice(0, 11)}…` : text;
  }

  /**
   * D2 visible ports (DECAF-50 §4.22, G3-05..G3-08): the single principled
   * visibility rule. Port handles are visible by default on the node edges; the
   * named guarantees are the manifest default port, any connected port, and any
   * required input port (visible even unconnected). Value-bound input ports do
   * not vanish — they render with a value badge. Dynamic ports (Switch cases)
   * are covered by the same rule.
   */
  visiblePorts(direction: PortDirection) {
    const showAll = this.isSelected() || this.isConnecting();
    const connected = this.connectedPortIds();
    const modes = this.portModes();
    return this.node()
      .data.ports.filter((port) => port.direction === direction)
      .filter((port) => graphPortVisible(port, connected, modes, showAll))
      .sort((a, b) => {
        const aDefault = isGraphDefaultPort(a) ? 1 : 0;
        const bDefault = isGraphDefaultPort(b) ? 1 : 0;
        return aDefault - bDefault;
      });
  }
}
