/**
 * @module for-angular/graph/components/graph-toolbar/graph-toolbar.component.spec
 * @summary Gate-2 P0 #5 (D5) — toolbar Run gate component contract.
 * @description Proves the toolbar's Run affordance is blocked on the editor's
 * validity projection (DECAF-50 §4.22/D5, §4.24 P0 #5): when `invalid` (or
 * `canRun` false) the Run control is disabled and titled with the structured
 * issue count, the "Invalid (n)" badge renders, and `onRun()` never emits
 * `runWorkflow`; a valid, available graph keeps Run enabled.
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GraphToolbarComponent } from './graph-toolbar.component';

/** Renders the toolbar with the given inputs and returns the live fixture. */
function render(inputs: {
  canRun?: boolean;
  isRunning?: boolean;
  invalid?: boolean;
  issues?: { code: string; path: string; message: string }[];
}): ComponentFixture<GraphToolbarComponent> {
  const fixture = TestBed.createComponent(GraphToolbarComponent);
  fixture.componentRef.setInput('workflowId', 'text-pipeline-workflow');
  fixture.componentRef.setInput('canRun', inputs.canRun ?? true);
  fixture.componentRef.setInput('isRunning', inputs.isRunning ?? false);
  fixture.componentRef.setInput('invalid', inputs.invalid ?? false);
  fixture.componentRef.setInput('validationIssues', inputs.issues ?? []);
  fixture.detectChanges();
  return fixture;
}

describe('GraphToolbarComponent — Run gate (D5/G3-17)', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('enables Run and titles it with the start affordance when the graph is valid', () => {
    const fixture = render({ canRun: true, invalid: false });
    const run = fixture.nativeElement.querySelector(
      'button.graph-float-btn--run',
    ) as HTMLButtonElement;

    expect(run.disabled).toBe(false);
    expect(run.getAttribute('title')).toBe('Start workflow');
    expect(run.textContent?.trim()).toBe('Start');
    expect(fixture.nativeElement.querySelector('.graph-float-btn--invalid')).toBeNull();
  });

  it('disables and titles Run, and renders the Invalid (n) badge, when the graph is invalid', () => {
    const fixture = render({
      canRun: false,
      invalid: true,
      issues: [
        { code: 'graph.edge.dangling', path: 'edges.0', message: 'Edge target is missing' },
        { code: 'graph.node.missing', path: 'nodes.1', message: 'Node kind is not registered' },
      ],
    });
    const run = fixture.nativeElement.querySelector(
      'button.graph-float-btn--run',
    ) as HTMLButtonElement;
    const badge = fixture.nativeElement.querySelector(
      '.graph-float-btn--invalid',
    ) as HTMLElement;

    expect(run.disabled).toBe(true);
    expect(run.getAttribute('aria-disabled')).toBe('true');
    expect(run.getAttribute('title')).toBe(
      'Fix 2 graph validation issue(s) before running',
    );
    expect(badge.textContent?.trim()).toBe('Invalid (2)');
    expect(badge.getAttribute('title')).toBe(
      'Fix 2 graph validation issue(s) before running',
    );
  });

  it('does not emit runWorkflow when Run is clicked on an invalid graph', () => {
    const fixture = render({
      canRun: false,
      invalid: true,
      issues: [{ code: 'c', path: 'p', message: 'm' }],
    });
    let emitted = 0;
    fixture.componentInstance.runWorkflow.subscribe(() => {
      emitted += 1;
    });

    const run = fixture.nativeElement.querySelector(
      'button.graph-float-btn--run',
    ) as HTMLButtonElement;
    run.click();

    expect(emitted).toBe(0);
  });

  it('disables Run when the backend is unavailable even though the graph is not invalid', () => {
    const fixture = render({ canRun: false, invalid: false });
    const run = fixture.nativeElement.querySelector(
      'button.graph-float-btn--run',
    ) as HTMLButtonElement;

    expect(run.disabled).toBe(true);
    expect(run.getAttribute('title')).toBe('Start workflow');
    expect(fixture.nativeElement.querySelector('.graph-float-btn--invalid')).toBeNull();
  });

  it('emits runWorkflow when Run is clicked on a valid, available graph', () => {
    const fixture = render({ canRun: true, invalid: false });
    let emitted = 0;
    fixture.componentInstance.runWorkflow.subscribe(() => {
      emitted += 1;
    });

    const run = fixture.nativeElement.querySelector(
      'button.graph-float-btn--run',
    ) as HTMLButtonElement;
    expect(run.disabled).toBe(false);
    run.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(emitted).toBe(1);
  });

  it('renders no Cancel affordance while no run is in flight', () => {
    const fixture = render({ canRun: true, isRunning: false });

    expect(fixture.nativeElement.querySelector('.graph-float-btn--cancel')).toBeNull();
  });

  it('emits cancelWorkflow once when Cancel is clicked on a running workflow', () => {
    const fixture = render({ canRun: false, isRunning: true });
    let emitted = 0;
    fixture.componentInstance.cancelWorkflow.subscribe(() => {
      emitted += 1;
    });

    const cancel = fixture.nativeElement.querySelector(
      'button.graph-float-btn--cancel',
    ) as HTMLButtonElement;
    expect(cancel).not.toBeNull();
    expect(cancel.textContent?.trim()).toBe('Cancel');
    cancel.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(emitted).toBe(1);
  });
});
