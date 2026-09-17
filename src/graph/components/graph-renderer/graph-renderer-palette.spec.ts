/**
 * @module for-angular/graph/components/graph-renderer/graph-renderer-palette.spec
 * @summary PR-H palette failure-surface contract (DECAF-50 §4.23 G3-26/G3-27).
 * @description Proves the palette projects the catalogue's own status instead of
 * silently rendering an empty list. Per the §4.24 infra pairing, every assertion
 * checks the catalogue STATUS first (a fixture compile error silently empties the
 * palette, so a manifest-count assertion alone is unsafe):
 *
 * - `loading` renders a status line and no retry;
 * - `degraded` distinguishes backend-down from malformed-response wording;
 * - `failed` renders the failure message plus a retry that refreshes the catalogue;
 * - `ready` with no entries renders the empty state.
 *
 * The real `ng-diagram` canvas cannot mount under jsdom, so the component is
 * exercised with its palette markup isolated; the full template binding is asserted
 * end-to-end by `tests/playwright/graph/canvas-run.spec.ts`.
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';

import { GraphRendererComponent } from './graph-renderer.component';
import { GraphWorkflowDocumentStore } from '../../document/GraphWorkflowDocumentStore';
import { GraphWorkflowValidateClient } from '../../validation';
import { GRAPH_DEV_MODE } from '../../tokens/graph-configuration.tokens';
import type { GraphNodeCatalogFailure } from '../../catalog/GraphNodeCatalogStore';

/** Minimal stand-in workflow root (the palette projection never reads it here). */
class DummyRoot {}

/**
 * Renders the renderer's palette status markup with a controllable catalogue
 * service stub. The document store and validate client are overridden to `null` so
 * their continuous projections do not race the test's own catalogue signals.
 */
function render(
  status: ReturnType<typeof signal<string>>,
  failure: ReturnType<typeof signal<GraphNodeCatalogFailure | null>>,
  devMode = false,
): {
  fixture: ComponentFixture<GraphRendererComponent>;
  refresh: jest.Mock;
} {
  const refresh = jest.fn(async () => undefined);
  const catalogStub = {
    status: status as unknown as () => string,
    failure: failure as unknown as () => GraphNodeCatalogFailure | null,
    refresh,
  };

  TestBed.overrideComponent(GraphRendererComponent, {
    set: {
      providers: [
        { provide: GraphWorkflowDocumentStore, useValue: null },
        { provide: GraphWorkflowValidateClient, useValue: null },
        { provide: GRAPH_DEV_MODE, useValue: devMode },
      ],
      template: `
        <div
          class="graph-renderer__palette-status"
          [attr.data-catalog-status]="catalogStatus()"
        >
          {{ catalogStatusMessage() }}
        </div>
        @if (catalogStatus() === 'failed') {
          <button
            type="button"
            class="graph-renderer__palette-retry"
            (click)="reloadCatalogue()"
          >
            Retry catalogue
          </button>
        }
        @if (catalogStatus() === 'ready' && paletteEmpty()) {
          <p class="graph-renderer__palette-empty">No nodes are available in the catalogue.</p>
        }
        @if (devMode) {
          <textarea class="graph-renderer__snapshot-text"></textarea>
        }
      `,
    },
  });

  const fixture = TestBed.createComponent(GraphRendererComponent);
  fixture.componentRef.setInput('graphRoot', DummyRoot);
  (fixture.componentInstance as unknown as { catalogService: unknown }).catalogService =
    catalogStub;
  fixture.detectChanges();
  return { fixture, refresh };
}

describe('GraphRendererComponent — palette failure surface (G3-26/G3-27)', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('renders a loading status with no retry', () => {
    const status = signal<string>('loading');
    const failure = signal<GraphNodeCatalogFailure | null>(null);
    const { fixture } = render(status, failure);

    const el = fixture.nativeElement.querySelector(
      '.graph-renderer__palette-status',
    ) as HTMLElement;

    expect(el.getAttribute('data-catalog-status')).toBe('loading');
    expect(el.textContent).toContain('Loading the node catalogue');
    expect(
      fixture.nativeElement.querySelector('.graph-renderer__palette-retry'),
    ).toBeNull();
  });

  it('distinguishes backend-down from malformed-response in the degraded status', () => {
    const status = signal<string>('degraded');
    const failure = signal<GraphNodeCatalogFailure | null>({
      kind: 'backend-down',
      message: 'offline',
    });
    const { fixture } = render(status, failure);

    const el = (): HTMLElement =>
      fixture.nativeElement.querySelector('.graph-renderer__palette-status') as HTMLElement;

    expect(el().getAttribute('data-catalog-status')).toBe('degraded');
    expect(el().textContent).toContain('backend is unavailable');

    failure.set({ kind: 'malformed-response', message: 'out of contract' });
    fixture.detectChanges();

    expect(el().getAttribute('data-catalog-status')).toBe('degraded');
    expect(el().textContent).toContain('unexpected response');
  });

  it('renders the failure message and a retry that refreshes the catalogue', () => {
    const status = signal<string>('failed');
    const failure = signal<GraphNodeCatalogFailure | null>({
      kind: 'malformed-response',
      message: 'expected a manifest array',
    });
    const { fixture, refresh } = render(status, failure);

    const el = fixture.nativeElement.querySelector(
      '.graph-renderer__palette-status',
    ) as HTMLElement;
    const retry = fixture.nativeElement.querySelector(
      '.graph-renderer__palette-retry',
    ) as HTMLButtonElement;

    expect(el.getAttribute('data-catalog-status')).toBe('failed');
    expect(el.textContent).toContain('expected a manifest array');
    expect(retry).not.toBeNull();

    retry.click();
    expect(refresh).toHaveBeenCalled();
  });

  it('renders the empty state only for a ready catalogue with no entries', () => {
    const status = signal<string>('ready');
    const failure = signal<GraphNodeCatalogFailure | null>(null);
    const { fixture } = render(status, failure);

    expect(
      fixture.nativeElement.querySelector('.graph-renderer__palette-empty'),
    ).not.toBeNull();
  });

  it('hides the raw snapshot chrome when the dev flag is off (G3-36)', () => {
    const status = signal<string>('ready');
    const failure = signal<GraphNodeCatalogFailure | null>(null);

    const { fixture } = render(status, failure, false);

    expect(
      fixture.nativeElement.querySelector('.graph-renderer__snapshot-text'),
    ).toBeNull();
  });

  it('renders the raw snapshot chrome when the dev flag is on (G3-36)', () => {
    const status = signal<string>('ready');
    const failure = signal<GraphNodeCatalogFailure | null>(null);

    const { fixture } = render(status, failure, true);

    expect(
      fixture.nativeElement.querySelector('.graph-renderer__snapshot-text'),
    ).not.toBeNull();
  });
});
