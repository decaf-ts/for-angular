/**
 * @module for-angular/graph/components/graph-renderer/graph-renderer-palette-search.spec
 * @summary G4-R6 palette search contract (DECAF-50 §4.22).
 * @description Proves the node add list filters its manifest entries as the user
 * types: `filteredPaletteEntries` narrows by title, kind, or category
 * (case-insensitive), `paletteSearchEmpty` drives the no-results message, and
 * `onPaletteQueryChange`/`clearPaletteQuery` own the query signal. The real
 * `ng-diagram` canvas cannot mount under jsdom, so the component is exercised
 * with the document store and validate client overridden to `null` (mirrors
 * `graph-renderer-palette.spec.ts`).
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import type { GraphNodeManifest } from '@decaf-ts/ui-decorators/graph';

import { GraphRendererComponent } from './graph-renderer.component';
import { GraphWorkflowDocumentStore } from '../../document/GraphWorkflowDocumentStore';
import { GraphWorkflowValidateClient } from '../../validation';
import { GRAPH_DEV_MODE } from '../../tokens/graph-configuration.tokens';

/** Minimal stand-in workflow root (the palette projection never reads it here). */
class DummyRoot {}

const MANIFESTS = [
  { kind: 'core.flow.code', display: { name: 'Split text', category: 'Utility' } },
  { kind: 'core.loop.foreach', display: { name: 'Foreach', category: 'Loop' } },
  { kind: 'core.flow.log', display: { name: 'Log Results', category: 'Utility' } },
] as unknown as GraphNodeManifest[];

function render(): ComponentFixture<GraphRendererComponent> {
  const catalogStub = {
    status: signal<string>('ready'),
    failure: signal(null),
    refresh: jest.fn(async () => undefined),
  };

  TestBed.overrideComponent(GraphRendererComponent, {
    set: {
      providers: [
        { provide: GraphWorkflowDocumentStore, useValue: null },
        { provide: GraphWorkflowValidateClient, useValue: null },
        { provide: GRAPH_DEV_MODE, useValue: false },
      ],
      template: '',
    },
  });

  const fixture = TestBed.createComponent(GraphRendererComponent);
  fixture.componentRef.setInput('graphRoot', DummyRoot);
  fixture.componentRef.setInput('availableNodes', MANIFESTS);
  (fixture.componentInstance as unknown as { catalogService: unknown }).catalogService =
    catalogStub;
  fixture.detectChanges();
  return fixture;
}

describe('GraphRendererComponent — palette search (G4-R6)', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('lists every catalogue entry with no query', () => {
    const fixture = render();
    const component = fixture.componentInstance;

    expect(component.paletteQuery()).toBe('');
    expect(component.filteredPaletteEntries().map((entry) => entry.title)).toEqual([
      'Foreach',
      'Log Results',
      'Split text',
    ]);
    expect(component.paletteSearchEmpty()).toBe(false);
  });

  it('filters the catalogue by title as the user types', () => {
    const fixture = render();
    const component = fixture.componentInstance;

    component.onPaletteQueryChange('fore');
    fixture.detectChanges();

    expect(component.paletteQuery()).toBe('fore');
    expect(component.filteredPaletteEntries().map((entry) => entry.title)).toEqual(['Foreach']);
    expect(component.paletteSearchEmpty()).toBe(false);
  });

  it('filters the catalogue by kind', () => {
    const fixture = render();
    const component = fixture.componentInstance;

    component.onPaletteQueryChange('core.flow.code');
    fixture.detectChanges();

    expect(component.filteredPaletteEntries().map((entry) => entry.kind)).toEqual([
      'core.flow.code',
    ]);
  });

  it('filters the catalogue by category', () => {
    const fixture = render();
    const component = fixture.componentInstance;

    component.onPaletteQueryChange('utility');
    fixture.detectChanges();

    expect(component.filteredPaletteEntries().map((entry) => entry.title)).toEqual([
      'Log Results',
      'Split text',
    ]);
  });

  it('reports an empty search when the query matches no entry', () => {
    const fixture = render();
    const component = fixture.componentInstance;

    component.onPaletteQueryChange('does-not-exist');
    fixture.detectChanges();

    expect(component.filteredPaletteEntries()).toEqual([]);
    expect(component.paletteSearchEmpty()).toBe(true);
  });

  it('clears the query and restores the full catalogue', () => {
    const fixture = render();
    const component = fixture.componentInstance;

    component.onPaletteQueryChange('fore');
    fixture.detectChanges();
    expect(component.filteredPaletteEntries().length).toBe(1);

    component.clearPaletteQuery();
    fixture.detectChanges();

    expect(component.paletteQuery()).toBe('');
    expect(component.filteredPaletteEntries().length).toBe(3);
    expect(component.paletteSearchEmpty()).toBe(false);
  });
});
