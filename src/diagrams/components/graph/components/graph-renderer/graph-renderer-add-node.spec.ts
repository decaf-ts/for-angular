/**
 * @module for-angular/graph/components/graph-renderer/graph-renderer-add-node.spec
 * @summary G4-R5 add-node interaction contract (DECAF-50 §4.22).
 * @description Proves the R5 replacement for the removed node-highlight "+":
 *
 * - `onEdgeDrawEnded` opens the add-node palette only for a `noTarget` release
 *   over empty canvas and records the drag source + drop position;
 * - `addNode` places the selected node at the drop point and connects the drag
 *   source output into the node's first available input port;
 * - `addNode` inside a foreach splices the node between the foreach and its
 *   ghost (`for-each → added → ghost → for-each`, never a parallel loop);
 * - `addNode` with no pending source places an unconnected node.
 *
 * The real `ng-diagram` canvas cannot mount under jsdom, so the component is
 * exercised with its document store stubbed and no template.
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GraphRendererComponent } from './graph-renderer.component';
import { GraphWorkflowDocumentStore } from '../../document/GraphWorkflowDocumentStore';
import {
  GraphDiagramAdapter,
  graphWorkflowDocumentCanvasModelOf,
} from '../../document/GraphDiagramAdapter';
import type { GraphNodeManifestReader } from '../../catalog/GraphNodeCatalogReader';
import type {
  GraphEdgeInstance,
  GraphNodeInstance,
  GraphResolvedNodeManifest,
  GraphWorkflowDocument,
} from '@decaf-ts/as-graph/shared';
import { GraphWorkflowValidateClient } from '../../validation';
import { GRAPH_DEV_MODE } from '../../tokens/graph-configuration.tokens';
import { ghostNodeStore } from '../../execution/GhostNodeStore';
import type { GraphPaletteEntry } from '../../utils';

/** Minimal stand-in workflow root (never read by the add-node path). */
class DummyRoot {}

interface StoreStub {
  document: jest.Mock;
  addNodeFromManifest: jest.Mock;
  addNode: jest.Mock;
  addEdge: jest.Mock;
  removeEdge: jest.Mock;
  dispatchCommand: jest.Mock;
}

const LOG_ENTRY = {
  title: 'Utility Log',
  kind: 'core.flow.log',
  manifest: {
    kind: 'core.flow.log',
    inputs: [{ id: 'value' }],
    outputs: [{ id: 'value' }],
  },
} as unknown as GraphPaletteEntry;

function render(
  store: StoreStub,
  template = ''
): ComponentFixture<GraphRendererComponent> {
  const catalogStub = {
    status: () => 'ready',
    failure: () => null,
    refresh: jest.fn(async () => undefined),
    reader: () => ({ all: () => [], get: () => undefined, resolve: () => undefined }),
  };

  TestBed.overrideComponent(GraphRendererComponent, {
    set: {
      providers: [
        { provide: GraphWorkflowDocumentStore, useValue: store },
        { provide: GraphWorkflowValidateClient, useValue: null },
        { provide: GRAPH_DEV_MODE, useValue: false },
      ],
      template,
    },
  });

  const fixture = TestBed.createComponent(GraphRendererComponent);
  fixture.componentRef.setInput('graphRoot', DummyRoot);
  (fixture.componentInstance as unknown as { catalogService: unknown }).catalogService =
    catalogStub;
  fixture.detectChanges();
  return fixture;
}

function storeStub(nodes: { id: string; position?: { x: number; y: number } }[] = []): StoreStub {
  return {
    document: jest.fn(() => ({ nodes, edges: [], inputs: [], outputs: [] })),
    addNodeFromManifest: jest.fn(() => ({ id: 'new-node' })),
    addNode: jest.fn(() => ({ id: 'ghost-new-node' })),
    addEdge: jest.fn(),
    removeEdge: jest.fn(),
    dispatchCommand: jest.fn(),
  };
}

describe('GraphRendererComponent — add-node interaction (G4-R5)', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
    ghostNodeStore.clear();
  });

  afterEach(() => {
    ghostNodeStore.clear();
    TestBed.resetTestingModule();
  });

  describe('onEdgeDrawEnded', () => {
    it('opens the palette and records the drop point on a no-target release', () => {
      const store = storeStub();
      const fixture = render(store);
      const component = fixture.componentInstance;
      component.paletteOpen.set(false);

      component.onEdgeDrawEnded({
        success: false,
        reason: 'noTarget',
        source: { id: 'node-a' },
        sourcePort: 'result',
        dropPosition: { x: 640, y: 320 },
      } as never);

      expect(ghostNodeStore.pendingAddSource()).toEqual({
        nodeId: 'node-a',
        portId: 'result',
        position: { x: 640, y: 320 },
      });
      expect(component.paletteOpen()).toBe(true);
    });

    it('ignores a successful draw and a non-noTarget failure', () => {
      const store = storeStub();
      const fixture = render(store);
      const component = fixture.componentInstance;

      component.onEdgeDrawEnded({
        success: true,
        source: { id: 'node-a' },
        sourcePort: 'result',
      } as never);
      expect(ghostNodeStore.pendingAddSource()).toBeNull();
      expect(component.paletteOpen()).toBe(false);

      component.onEdgeDrawEnded({
        success: false,
        reason: 'invalid',
        source: { id: 'node-a' },
        sourcePort: 'result',
      } as never);
      expect(ghostNodeStore.pendingAddSource()).toBeNull();
      expect(component.paletteOpen()).toBe(false);
    });
  });

  describe('addNode from a drag-to-canvas source (R5)', () => {
    it('places the node at the drop point and connects the drag source output', () => {
      const store = storeStub();
      const fixture = render(store);
      const component = fixture.componentInstance;
      ghostNodeStore.requestAddNodeFrom('node-a', 'result', { x: 640, y: 320 });

      component.addNode(LOG_ENTRY);

      expect(store.addNodeFromManifest).toHaveBeenCalledWith(
        LOG_ENTRY.manifest,
        { x: 640, y: 320 },
        LOG_ENTRY.title
      );
      expect(store.addEdge).toHaveBeenCalledTimes(1);
      expect(store.addEdge).toHaveBeenCalledWith(
        expect.objectContaining({
          source: { scope: 'node', nodeId: 'node-a', port: 'result' },
          target: { scope: 'node', nodeId: 'new-node', port: 'value' },
        })
      );
    });

    it('falls back to a beside-the-source position without a drop point', () => {
      const store = storeStub();
      const fixture = render(store);
      const component = fixture.componentInstance;
      component.model.set({
        getNodes: () => [{ id: 'node-a', position: { x: 100, y: 50 }, size: { width: 96 } }],
      } as never);
      ghostNodeStore.requestAddNodeFrom('node-a', 'result');

      component.addNode(LOG_ENTRY);

      expect(store.addNodeFromManifest).toHaveBeenCalledWith(
        LOG_ENTRY.manifest,
        { x: 316, y: 50 },
        LOG_ENTRY.title
      );
    });
  });

  describe('addNode inside a foreach (R2-3(3), SAA-1363 req 10)', () => {
    it('creates the canonical loop:item -> added -> loop:loop chain and never a document ghost', () => {
      const store = storeStub();
      const fixture = render(store);
      const component = fixture.componentInstance;
      component.model.set({
        getNodes: () => [
          { id: 'ghost-GraphForeachLoopNode', position: { x: 200, y: 200 } },
        ],
      } as never);
      // A loop ghost is canvas-only: the document holds the foreach loop and no
      // ghost member at all.
      store.document.mockReturnValue({
        nodes: [
          { id: 'GraphForeachLoopNode', kind: 'core.loop.foreach', parameters: {} },
        ],
        edges: [],
        inputs: [],
        outputs: [],
      });
      ghostNodeStore.requestAddNode('GraphForeachLoopNode', { x: 640, y: 320 });

      component.addNode(LOG_ENTRY);

      // The label is the entry title: no legacy `(materialized)` suffix.
      expect(store.addNodeFromManifest).toHaveBeenCalledWith(
        LOG_ENTRY.manifest,
        { x: 200, y: 200 },
        LOG_ENTRY.title
      );
      // No ghost is materialised into the document, and the old
      // addNode/removeEdge/addEdge splice is gone.
      expect(store.addNode).not.toHaveBeenCalled();
      expect(store.removeEdge).not.toHaveBeenCalled();
      expect(store.addEdge).not.toHaveBeenCalled();
      // The canonical chain is dispatched through the document command path.
      expect(store.dispatchCommand).toHaveBeenCalledTimes(2);
      expect(store.dispatchCommand).toHaveBeenNthCalledWith(1, {
        type: 'edge.add',
        edge: expect.objectContaining({
          source: { scope: 'node', nodeId: 'GraphForeachLoopNode', port: 'item' },
          target: { scope: 'node', nodeId: 'new-node', port: 'value' },
          metadata: { mandatory: true },
        }),
      });
      expect(store.dispatchCommand).toHaveBeenNthCalledWith(2, {
        type: 'edge.add',
        edge: expect.objectContaining({
          source: { scope: 'node', nodeId: 'new-node', port: 'value' },
          target: { scope: 'node', nodeId: 'GraphForeachLoopNode', port: 'loop' },
          metadata: { mandatory: true },
        }),
      });
    });
  });

  describe('addNode with no pending source', () => {
    it('places an unconnected node and creates no edges', () => {
      const store = storeStub();
      const fixture = render(store);
      const component = fixture.componentInstance;

      component.addNode(LOG_ENTRY);

      expect(store.addNodeFromManifest).toHaveBeenCalledTimes(1);
      expect(store.addEdge).not.toHaveBeenCalled();
    });
  });

  /**
   * R2-3(5) round-2 add-node popup dismissal: a pointerdown inside the
   * palette root (button + popup) keeps it open; a pointerdown elsewhere in
   * the document closes it and clears the pending add-node source plus the
   * palette query; a pointerdown while already closed is a no-op; and the
   * toggle button still toggles open/closed.
   */
  describe('outside-click dismissal (R2-3(5))', () => {
    const PALETTE_TEMPLATE = `
      <div #paletteRoot class="graph-renderer__palette">
        <button
          type="button"
          class="graph-renderer__palette-btn"
          (click)="togglePalette()"
        >
          + Add node
        </button>
        <div class="graph-renderer__palette-popup">popup</div>
      </div>
      <div class="graph-renderer__canvas">canvas</div>
    `;

    function pointerDown(element: Element): void {
      element.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    }

    it('keeps the palette open on a pointerdown inside the palette root', () => {
      const fixture = render(storeStub(), PALETTE_TEMPLATE);
      const component = fixture.componentInstance;
      ghostNodeStore.requestAddNodeFrom('node-a', 'result', { x: 1, y: 2 });
      component.paletteQuery.set('log');
      component.paletteOpen.set(true);

      pointerDown(
        fixture.nativeElement.querySelector('.graph-renderer__palette-popup')
      );

      expect(component.paletteOpen()).toBe(true);
      expect(ghostNodeStore.pendingAddSource()).not.toBeNull();
      expect(component.paletteQuery()).toBe('log');
    });

    it('closes the palette and clears the pending add-node source on an outside pointerdown', () => {
      const fixture = render(storeStub(), PALETTE_TEMPLATE);
      const component = fixture.componentInstance;
      ghostNodeStore.requestAddNodeFrom('node-a', 'result', { x: 1, y: 2 });
      component.paletteQuery.set('log');
      component.paletteOpen.set(true);

      pointerDown(fixture.nativeElement.querySelector('.graph-renderer__canvas'));

      expect(component.paletteOpen()).toBe(false);
      expect(ghostNodeStore.pendingAddSource()).toBeNull();
      expect(component.paletteQuery()).toBe('');
    });

    it('is a no-op when the palette is already closed', () => {
      const fixture = render(storeStub(), PALETTE_TEMPLATE);
      const component = fixture.componentInstance;
      component.paletteQuery.set('keep');
      component.paletteOpen.set(false);

      pointerDown(fixture.nativeElement.querySelector('.graph-renderer__canvas'));

      expect(component.paletteOpen()).toBe(false);
      expect(component.paletteQuery()).toBe('keep');
    });

    it('toggles the palette open and closed through the toggle button', () => {
      const fixture = render(storeStub(), PALETTE_TEMPLATE);
      const component = fixture.componentInstance;
      const toggle = fixture.nativeElement.querySelector(
        '.graph-renderer__palette-btn'
      ) as HTMLButtonElement;

      toggle.click();
      expect(component.paletteOpen()).toBe(true);

      toggle.click();
      expect(component.paletteOpen()).toBe(false);
    });
  });

  /**
   * R4-3 round-4 palette-search focus: opening the palette (either through the
   * toggle button or a drag-to-canvas release) focuses the search input so the
   * user can type the node name immediately without a second click.
   */
  describe('palette search autofocus (R4-3)', () => {
    const FOCUS_TEMPLATE = `
      <div #paletteRoot class="graph-renderer__palette">
        <button
          type="button"
          class="graph-renderer__palette-btn"
          (click)="togglePalette()"
        >
          + Add node
        </button>
        @if (paletteOpen()) {
          <div class="graph-renderer__palette-popup">
            <input
              #paletteSearch
              class="graph-renderer__palette-search-input"
              type="search"
            />
          </div>
        }
      </div>
    `;

    it('focuses the search input once the palette opens', async () => {
      const fixture = render(storeStub(), FOCUS_TEMPLATE);
      const component = fixture.componentInstance;

      component.togglePalette();
      fixture.detectChanges();
      await Promise.resolve();

      const input = fixture.nativeElement.querySelector(
        '.graph-renderer__palette-search-input'
      ) as HTMLInputElement;
      expect(input).not.toBeNull();
      expect(document.activeElement).toBe(input);
    });

    it('focuses the search input when the palette opens from a drag release', async () => {
      const fixture = render(storeStub(), FOCUS_TEMPLATE);
      const component = fixture.componentInstance;

      component.onEdgeDrawEnded({
        success: false,
        reason: 'noTarget',
        source: { id: 'node-a' },
        sourcePort: 'result',
        dropPosition: { x: 10, y: 20 },
      } as never);
      fixture.detectChanges();
      await Promise.resolve();

      expect(component.paletteOpen()).toBe(true);
      expect(document.activeElement).toBe(
        fixture.nativeElement.querySelector('.graph-renderer__palette-search-input')
      );
    });

    it('renders no search input while the palette stays closed', () => {
      const fixture = render(storeStub(), FOCUS_TEMPLATE);
      expect(
        fixture.nativeElement.querySelector('.graph-renderer__palette-search-input')
      ).toBeNull();
    });
  });
});


/**
 * SAA-1363 reqs 10-12: the canvas loop chain is a single ordered path built
 * through document commands, and deleting a body node reconnects its survivors.
 */
function loopNodeOf(): GraphNodeInstance {
  return { id: 'loop-1', kind: 'core.loop.foreach', label: 'For each', parameters: {} };
}

function logNodeOf(id: string): GraphNodeInstance {
  return { id, kind: 'core.flow.log', label: id, parameters: {} };
}

function chainEdgeOf(
  source: string,
  sourcePort: string,
  target: string,
  targetPort: string
): GraphEdgeInstance {
  return {
    id: `${source}:${sourcePort}->${target}:${targetPort}`,
    type: 'data',
    source: { scope: 'node', nodeId: source, port: sourcePort },
    target: { scope: 'node', nodeId: target, port: targetPort },
    label: targetPort,
    metadata: { mandatory: true },
  };
}

function loopChainDocument(body: string[] = ['a', 'b', 'c']): GraphWorkflowDocument {
  const edges: GraphEdgeInstance[] = [];
  if (body.length) {
    edges.push(chainEdgeOf('loop-1', 'item', body[0], 'value'));
    for (let index = 1; index < body.length; index += 1) {
      edges.push(chainEdgeOf(body[index - 1], 'value', body[index], 'value'));
    }
    edges.push(chainEdgeOf(body[body.length - 1], 'value', 'loop-1', 'loop'));
  }
  return {
    id: 'wf-loop-chain',
    name: 'Loop chain',
    inputs: [],
    outputs: [],
    nodes: [loopNodeOf(), ...body.map(logNodeOf)],
    edges,
  };
}

function seededStore(document: GraphWorkflowDocument): GraphWorkflowDocumentStore {
  const store = new GraphWorkflowDocumentStore();
  store.initialize(document);
  return store;
}

function loopReader(): GraphNodeManifestReader {
  const resolves: Record<string, GraphResolvedNodeManifest> = {
    'core.loop.foreach': {
      kind: 'core.loop.foreach',
      display: { name: 'For each', category: 'Control', width: 120, height: 140 },
      inputs: [{ id: 'list', label: 'List', direction: 'input', required: true }],
      outputs: [
        { id: 'item', label: 'Item', direction: 'output', required: true },
        { id: 'done', label: 'Done', direction: 'output', required: true },
      ],
      connections: [{ id: 'loop', label: 'Loop', direction: 'input', required: true }],
      parameters: [],
    } as unknown as GraphResolvedNodeManifest,
    'core.flow.log': {
      kind: 'core.flow.log',
      display: { name: 'Log', category: 'Utility', width: 96, height: 96 },
      inputs: [{ id: 'value', label: 'Value', direction: 'input', required: true }],
      outputs: [{ id: 'value', label: 'Value', direction: 'output', required: true }],
      parameters: [],
    } as unknown as GraphResolvedNodeManifest,
  };
  return {
    all: () => Object.keys(resolves).map((kind) => ({ kind }) as never),
    get: (kind: string) => (resolves[kind]?.kind ? ({ kind } as never) : undefined),
    resolve: (instance: GraphNodeInstance) => resolves[instance.kind],
  };
}

function pairsOf(document: GraphWorkflowDocument): string[] {
  return document.edges.map((edge) => edge.id).sort();
}

describe('GraphRendererComponent — loop chain (SAA-1363 reqs 10-12)', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
    ghostNodeStore.clear();
  });

  afterEach(() => {
    ghostNodeStore.clear();
    jest.restoreAllMocks();
    TestBed.resetTestingModule();
  });

  it('adds the first body node to an empty loop and drops the canvas ghost', () => {
    const store = seededStore(loopChainDocument([]));
    const fixture = render(store as unknown as StoreStub);
    const component = fixture.componentInstance;
    ghostNodeStore.requestAddNode('loop-1', { x: 10, y: 10 });

    component.addNode(LOG_ENTRY);

    const added = store.document()!.nodes.find((node) => node.kind === 'core.flow.log')!;
    expect(pairsOf(store.document()!)).toEqual([
      `${added.id}:value->loop-1:loop`,
      `loop-1:item->${added.id}:value`,
    ]);
    // Once the loop has a real body the canvas-only ghost disappears.
    const projection = graphWorkflowDocumentCanvasModelOf(store.document()!, loopReader());
    expect(projection.nodes.some((node) => node.id === 'ghost-loop-1')).toBe(false);
  });

  it('appends a second node after a body node instead of creating a parallel chain', () => {
    const store = storeStub();
    store.document.mockReturnValue(loopChainDocument(['a']));
    const fixture = render(store);
    const component = fixture.componentInstance;
    ghostNodeStore.requestAddNodeFrom('a', 'value');

    component.addNode(LOG_ENTRY);

    expect(store.addEdge).not.toHaveBeenCalled();
    expect(store.dispatchCommand).toHaveBeenCalledTimes(3);
    expect(store.dispatchCommand).toHaveBeenNthCalledWith(1, {
      type: 'edge.remove',
      edgeId: 'a:value->loop-1:loop',
    });
    expect(store.dispatchCommand).toHaveBeenNthCalledWith(2, {
      type: 'edge.add',
      edge: expect.objectContaining({
        source: { scope: 'node', nodeId: 'a', port: 'value' },
        target: { scope: 'node', nodeId: 'new-node', port: 'value' },
        metadata: { mandatory: true },
      }),
    });
    expect(store.dispatchCommand).toHaveBeenNthCalledWith(3, {
      type: 'edge.add',
      edge: expect.objectContaining({
        source: { scope: 'node', nodeId: 'new-node', port: 'value' },
        target: { scope: 'node', nodeId: 'loop-1', port: 'loop' },
        metadata: { mandatory: true },
      }),
    });
    // No parallel `loop:item -> new-node` body edge is ever added.
    const addedPairs = store.dispatchCommand.mock.calls
      .map(([command]) => command)
      .filter((command) => command.type === 'edge.add')
      .map((command) => command.edge.id);
    expect(addedPairs).not.toContain('loop-1:item->new-node:value');
  });

  it('deleting a mid-loop node regenerates the surviving ordered chain', () => {
    const store = seededStore(loopChainDocument(['a', 'b', 'c']));
    const fixture = render(store as unknown as StoreStub);
    const component = fixture.componentInstance;

    component.onElementsRemoved({
      deletedNodes: [{ id: 'b' }],
      deletedEdges: [],
    } as never);

    const document = store.document()!;
    expect(document.nodes.map((node) => node.id).sort()).toEqual(['a', 'c', 'loop-1']);
    expect(pairsOf(document)).toEqual([
      'a:value->c:value',
      'c:value->loop-1:loop',
      'loop-1:item->a:value',
    ]);
    // The chain is still a single ordered path ending at loop:loop.
    expect(document.edges.every((edge) => edge.metadata?.['mandatory'] === true)).toBe(true);
    expect(store.version()).toBeGreaterThan(1);
  });

  it('anchors the add-node popup at the pointer offset, clamped/flipped to the viewport', () => {
    const fixture = render(storeStub(), '<div #paletteRoot class="palette-root"></div>');
    const component = fixture.componentInstance;

    ghostNodeStore.requestAddNode('loop-1', { x: 640, y: 320 });
    fixture.detectChanges();

    expect(component.paletteAnchor()).toEqual({ x: 640, y: 328 });
    expect(component.palettePopupStyle()).toEqual({ left: '640px', top: '328px' });

    // Near the bottom-right corner the popup flips above the pointer and clamps
    // its left edge inside the 1024x768 test viewport.
    ghostNodeStore.requestAddNode('loop-1', { x: 1000, y: 700 });
    fixture.detectChanges();

    expect(component.paletteAnchor()).toEqual({ x: 732, y: 272 });
  });

  it('opts out of loop ghosts while execution state is active', () => {
    const reconcileSpy = jest
      .spyOn(GraphDiagramAdapter.prototype, 'reconcile')
      .mockReturnValue({ getNodes: () => [], getEdges: () => [] } as never);
    const store = seededStore(loopChainDocument([]));
    const fixture = render(store as unknown as StoreStub);
    const component = fixture.componentInstance;
    (component as unknown as { catalogService: unknown }).catalogService = {
      status: () => 'ready',
      failure: () => null,
      refresh: jest.fn(async () => undefined),
      reader: loopReader,
    };

    fixture.componentRef.setInput('runResultState', 'running');
    fixture.detectChanges();
    expect(reconcileSpy.mock.calls.at(-1)?.[4]).toMatchObject({ includeLoopGhosts: false });

    fixture.componentRef.setInput('runResultState', 'idle');
    fixture.detectChanges();
    expect(reconcileSpy.mock.calls.at(-1)?.[4]).toMatchObject({ includeLoopGhosts: true });
  });
});
