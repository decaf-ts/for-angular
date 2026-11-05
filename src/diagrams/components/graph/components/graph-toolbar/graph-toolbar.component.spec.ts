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
import { GraphEngineCapabilityStore } from '../../capabilities/GraphEngineCapabilityStore';
import type {
  GraphEngineCapabilityManifest,
  GraphEngineDescriptor,
  GraphEngineFeature,
} from '../../capabilities';

/** Renders the toolbar with the given inputs and returns the live fixture. */
function render(inputs: {
  canRun?: boolean;
  workflowRunnable?: boolean;
  isRunning?: boolean;
  invalid?: boolean;
  hasRun?: boolean;
  issues?: { code: string; path: string; message: string }[];
}): ComponentFixture<GraphToolbarComponent> {
  const fixture = TestBed.createComponent(GraphToolbarComponent);
  fixture.componentRef.setInput('workflowId', 'text-pipeline-workflow');
  fixture.componentRef.setInput('canRun', inputs.canRun ?? true);
  fixture.componentRef.setInput('workflowRunnable', inputs.workflowRunnable ?? true);
  fixture.componentRef.setInput('isRunning', inputs.isRunning ?? false);
  fixture.componentRef.setInput('invalid', inputs.invalid ?? false);
  fixture.componentRef.setInput('hasRun', inputs.hasRun ?? false);
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

describe('GraphToolbarComponent — per-workflow runnable gate (SAA-1359 D5)', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('disables Run and names the per-workflow block for a runnable:false row', () => {
    const fixture = render({
      canRun: true,
      workflowRunnable: false,
      invalid: false,
    });
    const run = fixture.nativeElement.querySelector(
      'button.graph-float-btn--run',
    ) as HTMLButtonElement;

    expect(run.disabled).toBe(true);
    expect(run.getAttribute('aria-disabled')).toBe('true');
    expect(run.getAttribute('aria-label')).toBe(
      'This workflow is a read-only canonical document, not a deployed job, so it cannot be run',
    );
    expect(run.getAttribute('title')).toBe(
      'This workflow is a read-only canonical document, not a deployed job, so it cannot be run',
    );
    expect(run.getAttribute('aria-label')).not.toBe('Start workflow');
  });

  it('keeps Run enabled and named with the normal action for a runnable:true row', () => {
    const fixture = render({
      canRun: true,
      workflowRunnable: true,
      invalid: false,
    });
    const run = fixture.nativeElement.querySelector(
      'button.graph-float-btn--run',
    ) as HTMLButtonElement;

    expect(run.disabled).toBe(false);
    expect(run.getAttribute('aria-disabled')).toBe('false');
    expect(run.getAttribute('aria-label')).toBe('Start workflow');
    expect(run.getAttribute('title')).toBe('Start workflow');
  });

  it('does not emit runWorkflow for a runnable:false row even when clicked', () => {
    const fixture = render({
      canRun: true,
      workflowRunnable: false,
      invalid: false,
    });
    let emitted = 0;
    fixture.componentInstance.runWorkflow.subscribe(() => {
      emitted += 1;
    });

    fixture.componentInstance.onRun();

    expect(emitted).toBe(0);
  });
});

describe('GraphToolbarComponent — Save gate (R2-3(8))', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('enables Save and titles it with the save affordance when the graph is valid', () => {
    const fixture = render({ invalid: false });
    const save = fixture.nativeElement.querySelector(
      'button.graph-float-btn--save',
    ) as HTMLButtonElement;

    expect(save.disabled).toBe(false);
    expect(save.getAttribute('aria-disabled')).toBe('false');
    expect(save.getAttribute('title')).toBe('Save workflow');
    expect(save.textContent?.trim()).toBe('Save');
  });

  it('disables and titles Save with the issue count when the graph is invalid', () => {
    const fixture = render({
      invalid: true,
      issues: [
        { code: 'graph.edge.dangling', path: 'edges.0', message: 'Edge target is missing' },
        { code: 'graph.node.missing', path: 'nodes.1', message: 'Node kind is not registered' },
      ],
    });
    const save = fixture.nativeElement.querySelector(
      'button.graph-float-btn--save',
    ) as HTMLButtonElement;

    expect(save.disabled).toBe(true);
    expect(save.getAttribute('aria-disabled')).toBe('true');
    expect(save.getAttribute('title')).toBe(
      'Fix 2 graph validation issue(s) before saving',
    );
  });

  it('does not emit saveWorkflow when Save is clicked on an invalid graph', async () => {
    const fixture = render({
      invalid: true,
      issues: [{ code: 'c', path: 'p', message: 'm' }],
    });
    let emitted = 0;
    fixture.componentInstance.saveWorkflow.subscribe(() => {
      emitted += 1;
    });

    const save = fixture.nativeElement.querySelector(
      'button.graph-float-btn--save',
    ) as HTMLButtonElement;
    expect(save.disabled).toBe(true);
    save.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await fixture.componentInstance.onSave();

    expect(emitted).toBe(0);
  });

  it('emits saveWorkflow once when Save is clicked on a valid graph', () => {
    const fixture = render({ invalid: false });
    let emitted = 0;
    fixture.componentInstance.saveWorkflow.subscribe(() => {
      emitted += 1;
    });

    const save = fixture.nativeElement.querySelector(
      'button.graph-float-btn--save',
    ) as HTMLButtonElement;
    expect(save.disabled).toBe(false);
    save.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(emitted).toBe(1);
  });
});

describe('GraphToolbarComponent — return to edit after run (R2-3(9))', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('renders no Edit affordance before a run has happened', () => {
    const fixture = render({ hasRun: false, isRunning: false });

    expect(
      fixture.nativeElement.querySelector('.graph-float-btn--edit'),
    ).toBeNull();
  });

  it('renders the Edit affordance once a run has happened and is not running', () => {
    const fixture = render({ hasRun: true, isRunning: false });
    const edit = fixture.nativeElement.querySelector(
      'button.graph-float-btn--edit',
    ) as HTMLButtonElement;

    expect(edit).not.toBeNull();
    expect(edit.textContent?.trim()).toBe('Edit');
    expect(edit.getAttribute('title')).toBe('Back to edit mode');
  });

  it('renders no Edit affordance while a run is in flight', () => {
    const fixture = render({ hasRun: true, isRunning: true });

    expect(
      fixture.nativeElement.querySelector('.graph-float-btn--edit'),
    ).toBeNull();
  });

  it('emits editWorkflow once when Edit is clicked', () => {
    const fixture = render({ hasRun: true, isRunning: false });
    let emitted = 0;
    fixture.componentInstance.editWorkflow.subscribe(() => {
      emitted += 1;
    });

    const edit = fixture.nativeElement.querySelector(
      'button.graph-float-btn--edit',
    ) as HTMLButtonElement;
    edit.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(emitted).toBe(1);
  });
});

/** Builds an engine descriptor with the given capability rows. */
function capabilityEngine(
  engineId: string,
  capabilities: GraphEngineFeature[],
): GraphEngineDescriptor {
  return {
    engineId,
    displayName: `Engine ${engineId}`,
    local: true,
    pinnedEngineVersion: '1.0.0',
    capabilities,
  };
}

/** A manifest whose default engine supports workflow browsing. */
function capabilityManifest(): GraphEngineCapabilityManifest {
  return {
    engines: [
      capabilityEngine('engine-a', [
        { feature: 'workflowList', verdict: 'SUPPORTED' },
      ]),
    ],
    defaultEngineId: 'engine-a',
  };
}

describe('GraphToolbarComponent — engine capability affordances (SAA-198)', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('hides the engine label when no manifest has landed', () => {
    const fixture = render({});

    expect(
      fixture.nativeElement.querySelector('.graph-float-btn--engine'),
    ).toBeNull();
  });

  it('shows the engine label when the selected engine supports browsing', () => {
    const fixture = render({});
    const store = TestBed.inject(GraphEngineCapabilityStore);
    store.setManifest(capabilityManifest());
    store.setStatus('ready');
    fixture.detectChanges();

    const label = fixture.nativeElement.querySelector(
      '.graph-float-btn--engine',
    ) as HTMLElement;

    expect(label).not.toBeNull();
    expect(label.textContent?.trim()).toBe('Engine engine-a');
  });

  it('keeps the engine label when the engine cannot browse', () => {
    const fixture = render({});
    const store = TestBed.inject(GraphEngineCapabilityStore);
    store.setManifest({
      engines: [
        capabilityEngine('engine-a', [
          { feature: 'workflowList', verdict: 'NOT_SUPPORTED' },
        ]),
      ],
      defaultEngineId: 'engine-a',
    });
    store.setStatus('ready');
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('.graph-float-btn--engine'),
    ).not.toBeNull();
  });

  it('hides the engine label when no engine is selected', () => {
    const fixture = render({});
    const store = TestBed.inject(GraphEngineCapabilityStore);
    store.setManifest({ engines: [], defaultEngineId: 'engine-a' });
    store.setStatus('ready');
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('.graph-float-btn--engine'),
    ).toBeNull();
  });

  it('renders no Browse affordance even when the engine advertises workflowList SUPPORTED (SAA-722)', () => {
    const fixture = render({});
    const store = TestBed.inject(GraphEngineCapabilityStore);
    store.setManifest(capabilityManifest());
    store.setStatus('ready');
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('.graph-float-btn--browse'),
    ).toBeNull();
  });
});

/** A manifest whose single engine carries the given capability rows. */
function manifestWith(
  capabilities: GraphEngineFeature[],
): GraphEngineCapabilityManifest {
  return {
    engines: [capabilityEngine('engine-a', capabilities)],
    defaultEngineId: 'engine-a',
  };
}

describe('GraphToolbarComponent — engine capability run/save gate (SAA-707)', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('disables and titles Run when the engine explicitly blocks running', () => {
    const fixture = render({ canRun: true, invalid: false });
    const store = TestBed.inject(GraphEngineCapabilityStore);
    store.setManifest(
      manifestWith([{ feature: 'workflowRun', verdict: 'NOT_SUPPORTED' }]),
    );
    store.setStatus('ready');
    fixture.detectChanges();

    const run = fixture.nativeElement.querySelector(
      'button.graph-float-btn--run',
    ) as HTMLButtonElement;

    expect(run.disabled).toBe(true);
    expect(run.getAttribute('aria-disabled')).toBe('true');
    expect(run.getAttribute('title')).toBe(
      'The selected engine does not support running workflows',
    );
  });

  it('keeps Run enabled when the engine leaves running undeclared', () => {
    const fixture = render({ canRun: true, invalid: false });
    const store = TestBed.inject(GraphEngineCapabilityStore);
    store.setManifest(manifestWith([]));
    store.setStatus('ready');
    fixture.detectChanges();

    const run = fixture.nativeElement.querySelector(
      'button.graph-float-btn--run',
    ) as HTMLButtonElement;

    expect(run.disabled).toBe(false);
    expect(run.getAttribute('title')).toBe('Start workflow');
  });

  it('does not emit runWorkflow when the engine blocks running', () => {
    const fixture = render({ canRun: true, invalid: false });
    const store = TestBed.inject(GraphEngineCapabilityStore);
    store.setManifest(
      manifestWith([{ feature: 'workflowRun', verdict: 'NOT_SUPPORTED' }]),
    );
    store.setStatus('ready');
    fixture.detectChanges();

    let emitted = 0;
    fixture.componentInstance.runWorkflow.subscribe(() => {
      emitted += 1;
    });

    fixture.componentInstance.onRun();

    expect(emitted).toBe(0);
  });

  it('disables and titles Save when the engine explicitly blocks editing', () => {
    const fixture = render({ invalid: false });
    const store = TestBed.inject(GraphEngineCapabilityStore);
    store.setManifest(
      manifestWith([{ feature: 'workflowUpdate', verdict: 'NOT_SUPPORTED' }]),
    );
    store.setStatus('ready');
    fixture.detectChanges();

    const save = fixture.nativeElement.querySelector(
      'button.graph-float-btn--save',
    ) as HTMLButtonElement;

    expect(save.disabled).toBe(true);
    expect(save.getAttribute('aria-disabled')).toBe('true');
    expect(save.getAttribute('title')).toBe(
      'The selected engine does not support editing/saving workflows',
    );
  });

  it('does not emit saveWorkflow when the engine blocks editing', async () => {
    const fixture = render({ invalid: false });
    const store = TestBed.inject(GraphEngineCapabilityStore);
    store.setManifest(
      manifestWith([{ feature: 'workflowUpdate', verdict: 'NOT_SUPPORTED' }]),
    );
    store.setStatus('ready');
    fixture.detectChanges();

    let emitted = 0;
    fixture.componentInstance.saveWorkflow.subscribe(() => {
      emitted += 1;
    });

    await fixture.componentInstance.onSave();

    expect(emitted).toBe(0);
  });

  it('keeps Save enabled and titled with the save affordance when editing is undeclared', () => {
    const fixture = render({ invalid: false });
    const store = TestBed.inject(GraphEngineCapabilityStore);
    store.setManifest(manifestWith([]));
    store.setStatus('ready');
    fixture.detectChanges();

    const save = fixture.nativeElement.querySelector(
      'button.graph-float-btn--save',
    ) as HTMLButtonElement;

    expect(save.disabled).toBe(false);
    expect(save.getAttribute('title')).toBe('Save workflow');
  });
});
