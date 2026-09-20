/**
 * @module for-angular/graph/components/graph-ghost-node-template/graph-ghost-node-template.component.spec
 * @summary R2-3(5) hover-only ghost visibility contract (DECAF-50 round 2).
 * @description Proves the ghost template's `muted` projection: an empty for-each
 * loop keeps its add-node ghost always visible; once the loop holds a real body
 * node the ghost is muted until the loop (or the ghost itself) is hovered, and the
 * hover handlers keep `hoveredGhostId` correct without clobbering another ghost's
 * hover.
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GraphGhostNodeTemplateComponent } from './graph-ghost-node-template.component';
import { ghostNodeStore } from '../../execution/GhostNodeStore';

/**
 * The real template's `ng-diagram-base-node-template` host pulls in ng-diagram's
 * internal `_InputEventsRouterService`, which needs a live diagram injector the
 * jsdom test bed does not provide. This minimal template reproduces the exact
 * bindings under test (`--muted` class + mouseenter/mouseleave), so the component
 * logic is exercised without the diagram host.
 */
const GHOST_BINDING_TEMPLATE = `
  <article
    class="graph-ghost-node"
    [class.graph-ghost-node--muted]="muted()"
    (mouseenter)="onHoverStart()"
    (mouseleave)="onHoverEnd()"
  ></article>
`;

/** Mounts the ghost template against the real singleton store. */
function renderGhost(nodeId: string, parentId?: string): ComponentFixture<GraphGhostNodeTemplateComponent> {
  TestBed.configureTestingModule({});
  TestBed.overrideComponent(GraphGhostNodeTemplateComponent, {
    set: { template: GHOST_BINDING_TEMPLATE },
  });
  const fixture = TestBed.createComponent(GraphGhostNodeTemplateComponent);
  fixture.componentRef.setInput('node', {
    id: nodeId,
    data: { ghostParentId: parentId },
  });
  fixture.detectChanges();
  return fixture;
}

/** The rendered ghost article, or null when the template is stubbed out. */
function ghostArticle(
  fixture: ComponentFixture<GraphGhostNodeTemplateComponent>
): HTMLElement | null {
  return fixture.nativeElement.querySelector('.graph-ghost-node');
}

describe('GraphGhostNodeTemplateComponent — R2-3(5) hover-only visibility', () => {
  beforeEach(() => {
    ghostNodeStore.setLoopBodyIds([]);
    ghostNodeStore.hoveredLoopId.set(null);
    ghostNodeStore.hoveredGhostId.set(null);
  });

  afterEach(() => {
    ghostNodeStore.setLoopBodyIds([]);
    ghostNodeStore.hoveredLoopId.set(null);
    ghostNodeStore.hoveredGhostId.set(null);
    TestBed.resetTestingModule();
  });

  it('keeps an empty loop ghost always visible (not muted)', () => {
    const fixture = renderGhost('ghost-loop-1', 'loop-1');

    expect(fixture.componentInstance.muted()).toBe(false);
    expect(ghostArticle(fixture)?.classList.contains('graph-ghost-node--muted')).toBe(false);
  });

  it('keeps a ghost with no parent loop always visible', () => {
    const fixture = renderGhost('ghost-loop-1');

    expect(fixture.componentInstance.muted()).toBe(false);
    expect(ghostArticle(fixture)?.classList.contains('graph-ghost-node--muted')).toBe(false);
  });

  it('mutes a populated loop ghost until the loop is hovered', () => {
    ghostNodeStore.setLoopBodyIds(['loop-1']);
    const fixture = renderGhost('ghost-loop-1', 'loop-1');

    expect(fixture.componentInstance.muted()).toBe(true);
    expect(ghostArticle(fixture)?.classList.contains('graph-ghost-node--muted')).toBe(true);

    ghostNodeStore.hoveredLoopId.set('loop-1');
    fixture.detectChanges();

    expect(fixture.componentInstance.muted()).toBe(false);
    expect(ghostArticle(fixture)?.classList.contains('graph-ghost-node--muted')).toBe(false);
  });

  it('reveals a populated loop ghost while the ghost itself is hovered', () => {
    ghostNodeStore.setLoopBodyIds(['loop-1']);
    const fixture = renderGhost('ghost-loop-1', 'loop-1');

    expect(fixture.componentInstance.muted()).toBe(true);

    ghostNodeStore.hoveredGhostId.set('ghost-loop-1');
    fixture.detectChanges();

    expect(fixture.componentInstance.muted()).toBe(false);
  });

  it('does not reveal a populated loop ghost when a different loop is hovered', () => {
    ghostNodeStore.setLoopBodyIds(['loop-1']);
    const fixture = renderGhost('ghost-loop-1', 'loop-1');

    ghostNodeStore.hoveredLoopId.set('loop-2');
    fixture.detectChanges();

    expect(fixture.componentInstance.muted()).toBe(true);
  });

  it('does not reveal a populated loop ghost when a different ghost is hovered', () => {
    ghostNodeStore.setLoopBodyIds(['loop-1']);
    const fixture = renderGhost('ghost-loop-1', 'loop-1');

    ghostNodeStore.hoveredGhostId.set('ghost-loop-2');
    fixture.detectChanges();

    expect(fixture.componentInstance.muted()).toBe(true);
  });

  it('onHoverStart sets the hovered ghost id', () => {
    const fixture = renderGhost('ghost-loop-1', 'loop-1');

    fixture.componentInstance.onHoverStart();

    expect(ghostNodeStore.hoveredGhostId()).toBe('ghost-loop-1');
  });

  it('onHoverEnd clears the hovered ghost id when it is this ghost', () => {
    const fixture = renderGhost('ghost-loop-1', 'loop-1');

    fixture.componentInstance.onHoverStart();
    fixture.componentInstance.onHoverEnd();

    expect(ghostNodeStore.hoveredGhostId()).toBeNull();
  });

  it("onHoverEnd never clears another ghost's hover", () => {
    const fixture = renderGhost('ghost-loop-1', 'loop-1');

    ghostNodeStore.hoveredGhostId.set('ghost-loop-2');
    fixture.componentInstance.onHoverEnd();

    expect(ghostNodeStore.hoveredGhostId()).toBe('ghost-loop-2');
  });

  it('wires mouseenter/mouseleave on the rendered article to the hover handlers', () => {
    const fixture = renderGhost('ghost-loop-1', 'loop-1');
    const article = ghostArticle(fixture);
    expect(article).not.toBeNull();

    article!.dispatchEvent(new MouseEvent('mouseenter', { bubbles: false }));
    expect(ghostNodeStore.hoveredGhostId()).toBe('ghost-loop-1');

    article!.dispatchEvent(new MouseEvent('mouseleave', { bubbles: false }));
    expect(ghostNodeStore.hoveredGhostId()).toBeNull();
  });

  it('requests the add-node palette for the ghost parent when activated', () => {
    const fixture = renderGhost('ghost-loop-1', 'loop-1');
    const event = { preventDefault: jest.fn(), stopPropagation: jest.fn() } as unknown as Event;

    fixture.componentInstance.onAddNode(event);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(event.stopPropagation).toHaveBeenCalled();
    expect(ghostNodeStore.consume()).toBe('loop-1');
  });
});
