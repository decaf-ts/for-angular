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
    outputs: [{ id: 'logged' }],
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

  describe('addNode inside a foreach (R2-3(3))', () => {
    it('splices the node between the foreach and its ghost, with no parallel loop', () => {
      const store = storeStub();
      const fixture = render(store);
      const component = fixture.componentInstance;
      component.model.set({
        getNodes: () => [
          { id: 'ghost-GraphForeachLoopNode', position: { x: 200, y: 200 } },
        ],
      } as never);
      // The loop's add-node ghost is document-carried (R2-1/R2-3(3)): the
      // document holds the ghost node plus its `item → ghost:in` edge.
      store.document.mockReturnValue({
        nodes: [{ id: 'ghost-GraphForeachLoopNode', ui: { position: { x: 200, y: 200 } } }],
        edges: [
          {
            id: 'GraphForeachLoopNode:item->ghost-GraphForeachLoopNode:in',
            source: { scope: 'node', nodeId: 'GraphForeachLoopNode', port: 'item' },
            target: { scope: 'node', nodeId: 'ghost-GraphForeachLoopNode', port: 'in' },
          },
        ],
        inputs: [],
        outputs: [],
      });
      ghostNodeStore.requestAddNode('GraphForeachLoopNode');

      component.addNode(LOG_ENTRY);

      expect(store.addNodeFromManifest).toHaveBeenCalledWith(
        LOG_ENTRY.manifest,
        { x: 200, y: 200 },
        `${LOG_ENTRY.title} (materialized)`
      );
      // The ghost's `item → ghost:in` edge is removed and replaced by
      // `item → <added>` + `<added> → ghost:in`: for-each → added → ghost.
      expect(store.removeEdge).toHaveBeenCalledWith(
        'GraphForeachLoopNode:item->ghost-GraphForeachLoopNode:in'
      );
      expect(store.addEdge).toHaveBeenCalledTimes(2);
      expect(store.addEdge).toHaveBeenCalledWith(
        expect.objectContaining({
          source: { scope: 'node', nodeId: 'GraphForeachLoopNode', port: 'item' },
          target: { scope: 'node', nodeId: 'new-node', port: 'value' },
          metadata: { mandatory: true },
        })
      );
      expect(store.addEdge).toHaveBeenCalledWith(
        expect.objectContaining({
          source: { scope: 'node', nodeId: 'new-node', port: 'logged' },
          target: { scope: 'node', nodeId: 'ghost-GraphForeachLoopNode', port: 'in' },
          metadata: { mandatory: true },
        })
      );
      // No second loop is ever created by an addNode.
      expect(store.addNode).not.toHaveBeenCalled();
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
});
