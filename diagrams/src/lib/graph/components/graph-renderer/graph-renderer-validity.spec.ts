/**
 * @module for-angular/graph/components/graph-renderer/graph-renderer-validity.spec
 * @summary Gate-2 P0 #5 (D5) — canvas invalid-state projection contract.
 * @description Proves the renderer projects the singleton validity store onto the
 * canvas (DECAF-50 §4.22/D5, §4.24 P0 #5): the canvas carries
 * `data-graph-validity` from the projection, an invalid graph renders the
 * structured issue banner, and a valid/unavailable graph renders none. The real
 * `ng-diagram` canvas cannot mount under jsdom (it reads a null canvas context
 * `supports`), so the component is exercised with its canvas/banner markup
 * isolated; the full template binding is asserted end-to-end by
 * `tests/playwright/graph/canvas-run.spec.ts`.
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GraphRendererComponent } from './graph-renderer.component';
import { GraphWorkflowDocumentStore } from '../../document/GraphWorkflowDocumentStore';
import {
  GraphWorkflowValidateClient,
  graphValidity,
  type GraphValidationIssue,
} from '../../validation';

/** Minimal stand-in workflow root (the projection never reads it here). */
class DummyRoot {}

/** One structured issue rendered by the canvas banner. */
const ISSUE: GraphValidationIssue = {
  code: 'graph.edge.dangling',
  path: 'edges.0',
  message: 'Edge target is missing',
};

/**
 * Renders the renderer's canvas/banner projection markup. The document store
 * and validate client are overridden to `null` so the continuous projection does
 * not race the test's own `applyResult` calls; the projection signals under
 * test are the component's real public bindings.
 */
function render(): ComponentFixture<GraphRendererComponent> {
  TestBed.overrideComponent(GraphRendererComponent, {
    set: {
      providers: [
        { provide: GraphWorkflowDocumentStore, useValue: null },
        { provide: GraphWorkflowValidateClient, useValue: null },
      ],
      template: `
        <div
          class="graph-renderer__canvas"
          [class.graph-renderer__canvas--invalid]="graphInvalid()"
          [attr.data-graph-validity]="graphValidityStatus()"
        >
          @if (graphInvalid()) {
            <div
              class="graph-renderer__validation-banner"
              role="alert"
              aria-live="polite"
            >
              <strong>{{ graphValidityLabel() }}</strong>
              <ul class="graph-renderer__validation-list">
                @for (issue of graphIssues(); track $index) {
                  <li class="graph-renderer__validation-issue">
                    @if (issue.path) {
                      <code>{{ issue.path }}</code>
                    }
                    <span>{{ issue.message }}</span>
                  </li>
                }
              </ul>
            </div>
          }
        </div>
      `,
    },
  });
  const fixture = TestBed.createComponent(GraphRendererComponent);
  fixture.componentRef.setInput('graphRoot', DummyRoot);
  fixture.detectChanges();
  return fixture;
}

describe('GraphRendererComponent — canvas validity projection (D5/G3-16..18)', () => {
  beforeEach(() => {
    graphValidity.reset();
    TestBed.configureTestingModule({});
  });

  afterEach(() => {
    graphValidity.reset();
    TestBed.resetTestingModule();
  });

  it('projects the singleton validity status onto data-graph-validity', () => {
    const fixture = render();
    const canvas = (): HTMLElement =>
      fixture.nativeElement.querySelector('.graph-renderer__canvas') as HTMLElement;

    expect(canvas().getAttribute('data-graph-validity')).toBe('idle');

    graphValidity.applyResult({ valid: true, issues: [] });
    fixture.detectChanges();
    expect(canvas().getAttribute('data-graph-validity')).toBe('valid');
    expect(canvas().classList.contains('graph-renderer__canvas--invalid')).toBe(false);

    graphValidity.applyFailure(new Error('backend down'));
    fixture.detectChanges();
    expect(canvas().getAttribute('data-graph-validity')).toBe('unavailable');
  });

  it('renders the structured issue banner for an invalid graph', () => {
    const fixture = render();
    graphValidity.applyResult({ valid: false, issues: [ISSUE] });
    fixture.detectChanges();

    const canvas = fixture.nativeElement.querySelector(
      '.graph-renderer__canvas',
    ) as HTMLElement;
    const banner = canvas.querySelector(
      '.graph-renderer__validation-banner',
    ) as HTMLElement;
    const issue = canvas.querySelector(
      '.graph-renderer__validation-issue',
    ) as HTMLElement;

    expect(canvas.getAttribute('data-graph-validity')).toBe('invalid');
    expect(canvas.classList.contains('graph-renderer__canvas--invalid')).toBe(true);
    expect(banner).not.toBeNull();
    expect(banner.getAttribute('role')).toBe('alert');
    expect(banner.textContent).toContain('Invalid');
    expect(issue.textContent).toContain(ISSUE.path);
    expect(issue.textContent).toContain(ISSUE.message);
  });

  it('renders no banner for a valid graph', () => {
    const fixture = render();
    graphValidity.applyResult({ valid: true, issues: [] });
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('.graph-renderer__validation-banner'),
    ).toBeNull();
  });
});
