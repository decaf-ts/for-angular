/**
 * @module for-angular/graph/components/graph-edge-template/graph-edge-template.component.spec
 * @summary Edge-label parity for loop-chain edges (SAA-1363 req 12).
 * @description Loop-chain edges are ordinary `graph-edge` template edges: they
 * carry a document `label` in their canvas data and render it through exactly
 * the same label element/position as a normal relation edge. There is no
 * loop-only label path.
 *
 * The real `ng-diagram-base-edge` host needs a live diagram injector, so the
 * template is stubbed with the same label bindings the production template uses
 * (`label()` + `positionOnEdge()`), exercising the component's computed data.
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { Edge } from 'ng-diagram';

import { GraphEdgeTemplateComponent } from './graph-edge-template.component';

const LABEL_BINDING_TEMPLATE = `
  <div class="graph-edge-probe">
    @let edgeLabel = label();
    @if (edgeLabel) {
      <div class="ng-diagram-default-edge-label">{{ edgeLabel }}</div>
    }
  </div>
`;

function renderEdge(edge: Partial<Edge>): ComponentFixture<GraphEdgeTemplateComponent> {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({});
  TestBed.overrideComponent(GraphEdgeTemplateComponent, {
    set: { template: LABEL_BINDING_TEMPLATE },
  });
  const fixture = TestBed.createComponent(GraphEdgeTemplateComponent);
  fixture.componentRef.setInput('edge', {
    id: 'edge-1',
    source: 'loop-1',
    target: 'a',
    ...edge,
  } as Edge);
  fixture.detectChanges();
  return fixture;
}

function labelOf(fixture: ComponentFixture<GraphEdgeTemplateComponent>): string | null {
  return (
    fixture.nativeElement.querySelector('.ng-diagram-default-edge-label')
      ?.textContent?.trim() ?? null
  );
}

describe('GraphEdgeTemplateComponent — loop-chain edge-label parity (SAA-1363 req 12)', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('renders a loop-chain edge label through the same label element as a normal edge', () => {
    const loopEdge = renderEdge({
      id: 'loop-1:item->a:value',
      data: { label: 'item', mandatory: true, engineEdgeId: 'loop-1:item->a:value' },
    });
    const normalEdge = renderEdge({
      id: 'edge-7',
      data: { label: 'value', engineEdgeId: 'a:value->b:value' },
    });

    expect(labelOf(loopEdge)).toBe('item');
    expect(labelOf(normalEdge)).toBe('value');
    expect(labelOf(loopEdge)).not.toBeNull();
    expect(labelOf(normalEdge)).not.toBeNull();
    // Both use the default midpoint anchor: no loop-specific label placement.
    expect(loopEdge.componentInstance.positionOnEdge()).toBe(0.5);
    expect(normalEdge.componentInstance.positionOnEdge()).toBe(0.5);
  });

  it('honours an explicit label position the same way for loop and normal edges', () => {
    const loopEdge = renderEdge({
      data: { label: 'loop', positionOnEdge: 0.9 },
    });

    expect(loopEdge.componentInstance.label()).toBe('loop');
    expect(loopEdge.componentInstance.positionOnEdge()).toBe(0.9);
  });

  it('renders no label element for an unlabeled edge', () => {
    const fixture = renderEdge({ data: { engineEdgeId: 'a:value->b:value' } });

    expect(fixture.componentInstance.label()).toBeUndefined();
    expect(labelOf(fixture)).toBeNull();
  });
});
