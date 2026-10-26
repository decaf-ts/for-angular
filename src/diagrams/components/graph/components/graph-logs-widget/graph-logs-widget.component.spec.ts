/**
 * @module for-angular/graph/components/graph-logs-widget/graph-logs-widget.component.spec
 * @summary Gate-2 P0 #6 (D6) — on-demand docked run-log drawer contract.
 * @description Proves the run log drawer (DECAF-50 §4.22/D6, §4.24 P0 #6)
 * against the real component + shared store:
 *
 * - the drawer is NOT entries-gated (G3-19): it opens on demand even with zero
 *   `GRAPH_RUN_LOG` entries, showing the empty state instead of nothing;
 * - the drawer is docked to the canvas bottom as an on-demand affordance
 *   (G3-20): a handle renders while closed, the full drawer replaces it once
 *   opened;
 * - run-lifecycle lines (created/validated/validation-issues, G3-21) feed the
 *   drawer alongside the streamed entries and render even when no entry streamed;
 * - the streamed entries keep their Chrome-console-style filter behaviour.
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';

import type { GraphRunLogEntry } from '@decaf-ts/as-graph/shared';

import { graphRunLog, type GraphRunLogLevel } from '../../execution/GraphRunLogStore';
import { GraphLogsWidgetComponent } from './graph-logs-widget.component';

/** One streamed `GRAPH_RUN_LOG` entry. */
function entry(level: GraphRunLogLevel, message = `msg-${level}`): GraphRunLogEntry {
  return {
    level,
    message,
    timestamp: '2024-01-01T00:00:00.000Z',
    runId: 'r1',
    workflowId: 'w1',
    nodeId: 'SplitTextCodeNode',
    user: 'alice',
  };
}

/** Renders the widget against the shared run-log store. */
function render(): ComponentFixture<GraphLogsWidgetComponent> {
  const fixture = TestBed.createComponent(GraphLogsWidgetComponent);
  fixture.detectChanges();
  return fixture;
}

describe('GraphLogsWidgetComponent — on-demand docked drawer (D6/G3-19..21)', () => {
  beforeEach(() => {
    graphRunLog.reset();
    TestBed.configureTestingModule({});
  });

  afterEach(() => {
    graphRunLog.reset();
    TestBed.resetTestingModule();
  });

  it('renders only the open affordance while the drawer is closed', () => {
    const fixture = render();

    expect(fixture.nativeElement.querySelector('.graph-logs')).toBeNull();
    const handle = fixture.nativeElement.querySelector(
      '.graph-logs__handle',
    ) as HTMLButtonElement | null;
    expect(handle).not.toBeNull();
    expect(handle?.textContent).toContain('Run log');
  });

  it('opens on demand with zero entries and shows the empty state (entries().length coupling removed)', () => {
    const fixture = render();
    expect(graphRunLog.entries()).toHaveLength(0);

    const handle = fixture.nativeElement.querySelector(
      '.graph-logs__handle',
    ) as HTMLButtonElement;
    handle.click();
    fixture.detectChanges();

    // The implicit `store.open() && store.entries().length` coupling is gone:
    // an open drawer renders even though the run streamed no entries.
    expect(fixture.nativeElement.querySelector('.graph-logs')).not.toBeNull();
    expect(fixture.nativeElement.querySelectorAll('.graph-logs__entry')).toHaveLength(0);
    expect(
      fixture.nativeElement.querySelector('.graph-logs__empty')?.textContent,
    ).toContain('No run messages yet.');
  });

  it('renders run-lifecycle lines (created/validated/validation-issues) even with zero entries', () => {
    const fixture = render();
    graphRunLog.recordLifecycle('created', 'Run r1 created for workflow w1', {
      runId: 'r1',
      workflowId: 'w1',
    });
    graphRunLog.recordLifecycle('validated', 'Workflow w1 validated', { workflowId: 'w1' });
    graphRunLog.recordLifecycle('validation-issues', 'Workflow w1 validation reported 1 issue(s)', {
      workflowId: 'w1',
    });

    graphRunLog.setOpen(true);
    fixture.detectChanges();

    const lines = fixture.nativeElement.querySelectorAll('.graph-logs__lifecycle-entry');
    expect(lines).toHaveLength(3);
    expect(lines[0].textContent).toContain('Created');
    expect(lines[1].textContent).toContain('Validated');
    expect(lines[2].textContent).toContain('Validation issues');
    // Lifecycle lines are feedback, not the filterable engine stream.
    expect(fixture.nativeElement.querySelectorAll('.graph-logs__entry')).toHaveLength(0);
    expect(fixture.nativeElement.querySelector('.graph-logs__empty')).toBeNull();
  });

  it('keeps the streamed entries filterable when both entries and lifecycle lines exist', () => {
    const fixture = render();
    graphRunLog.recordLifecycle('validated', 'Workflow w1 validated', { workflowId: 'w1' });
    graphRunLog.appendAll([entry('debug', 'debug line'), entry('warn', 'warn line'), entry('error', 'error line')]);
    graphRunLog.setOpen(true);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.graph-logs__entry')).toHaveLength(3);
    expect(fixture.nativeElement.querySelectorAll('.graph-logs__lifecycle-entry')).toHaveLength(1);

    const warnFilter = Array.from(
      fixture.nativeElement.querySelectorAll('.graph-logs__filter'),
    ).find((button) => (button as HTMLElement).textContent?.trim() === 'Warnings') as HTMLButtonElement;
    warnFilter.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.graph-logs__entry')).toHaveLength(2);
    expect(fixture.nativeElement.querySelectorAll('.graph-logs__lifecycle-entry')).toHaveLength(1);
  });

  it('dismisses back to the open affordance and clears the drawer', () => {
    const fixture = render();
    graphRunLog.setOpen(true);
    fixture.detectChanges();

    const dismiss = Array.from(
      fixture.nativeElement.querySelectorAll('.graph-logs__icon-btn'),
    ).find((button) => (button as HTMLElement).textContent?.includes('×')) as HTMLButtonElement;
    dismiss.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.graph-logs')).toBeNull();
    expect(fixture.nativeElement.querySelector('.graph-logs__handle')).not.toBeNull();
  });

  it('renders a malformed streamed entry without throwing (missing level / bad timestamp)', () => {
    const fixture = render();
    // A regressed stream could still hand the console an entry without a
    // `level` or with an unparseable timestamp; the drawer must degrade, not
    // throw during change detection (SAA-767).
    graphRunLog.append({
      message: 'no level',
      timestamp: 'not-a-date',
      runId: 'r1',
      workflowId: 'w1',
    } as never);
    graphRunLog.setOpen(true);

    expect(() => fixture.detectChanges()).not.toThrow();
    const line = fixture.nativeElement.querySelector('.graph-logs__entry') as HTMLElement | null;
    expect(line).not.toBeNull();
    expect(line?.textContent).toContain('LOG');
    expect(line?.textContent).toContain('no level');
  });

  it('clears both streamed entries and run-lifecycle lines', () => {
    const fixture = render();
    graphRunLog.append(entry('info', 'streamed'));
    graphRunLog.recordLifecycle('created', 'Run r1 created for workflow w1');
    graphRunLog.setOpen(true);
    fixture.detectChanges();

    const clear = Array.from(
      fixture.nativeElement.querySelectorAll('.graph-logs__icon-btn'),
    ).find((button) => (button as HTMLElement).textContent?.trim() === 'Clear') as HTMLButtonElement;
    clear.click();
    fixture.detectChanges();

    expect(graphRunLog.entries()).toHaveLength(0);
    expect(graphRunLog.lifecycle()).toHaveLength(0);
    expect(fixture.nativeElement.querySelector('.graph-logs__empty')).not.toBeNull();
  });
});

describe('GraphLogsWidgetComponent — always-visible dock bar and animated drawer (SAA-1362 req 7)', () => {
  beforeEach(() => {
    graphRunLog.reset();
    TestBed.configureTestingModule({});
  });

  afterEach(() => {
    graphRunLog.reset();
    TestBed.resetTestingModule();
  });

  /** The widget's persistent top bar. */
  function header(fixture: ComponentFixture<GraphLogsWidgetComponent>): HTMLElement {
    const element = fixture.nativeElement.querySelector('.graph-logs__header') as HTMLElement | null;
    expect(element).not.toBeNull();
    return element as HTMLElement;
  }

  /** The drawer element (always mounted, inert while lowered). */
  function drawer(fixture: ComponentFixture<GraphLogsWidgetComponent>): HTMLElement {
    const element = fixture.nativeElement.querySelector('.graph-logs-dock__drawer') as HTMLElement | null;
    expect(element).not.toBeNull();
    return element as HTMLElement;
  }

  it('keeps the top bar mounted while lowered, with the drawer hidden and inert', () => {
    const fixture = render();

    expect(header(fixture).textContent).toContain('Run console');
    expect(fixture.nativeElement.querySelector('.graph-logs__title')?.textContent).toContain(
      'Run console'
    );
    expect(fixture.nativeElement.querySelector('.graph-logs__handle')).not.toBeNull();
    expect(drawer(fixture).getAttribute('aria-hidden')).toBe('true');
    expect(drawer(fixture).getAttribute('inert')).toBe('');
    expect(fixture.nativeElement.querySelector('.graph-logs')).toBeNull();
    expect(fixture.nativeElement.querySelector('.graph-logs__filter')).toBeNull();
    expect(fixture.nativeElement.querySelector('.graph-logs__icon-btn')).toBeNull();
  });

  it('raises the drawer from the top-bar chevron and lowers it again without unmounting the bar', () => {
    const fixture = render();
    const toggle = fixture.nativeElement.querySelector(
      '.graph-logs__toggle'
    ) as HTMLButtonElement;

    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    toggle.click();
    fixture.detectChanges();

    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(drawer(fixture).hasAttribute('inert')).toBe(false);
    expect(drawer(fixture).getAttribute('aria-hidden')).toBeNull();
    expect(fixture.nativeElement.querySelector('.graph-logs')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.graph-logs__filter')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.graph-logs__handle')).toBeNull();
    expect(header(fixture).textContent).toContain('Run console');

    toggle.click();
    fixture.detectChanges();

    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(drawer(fixture).getAttribute('inert')).toBe('');
    expect(fixture.nativeElement.querySelector('.graph-logs')).toBeNull();
    expect(fixture.nativeElement.querySelector('.graph-logs__handle')).not.toBeNull();
    expect(header(fixture).textContent).toContain('Run console');
  });

  it('raises from the Run log handle and dismisses back to the always-visible bar', () => {
    const fixture = render();

    const handle = fixture.nativeElement.querySelector(
      '.graph-logs__handle'
    ) as HTMLButtonElement;
    handle.click();
    fixture.detectChanges();
    expect(drawer(fixture).hasAttribute('inert')).toBe(false);

    const dismiss = fixture.nativeElement.querySelector(
      '.graph-logs__icon-btn[title="Dismiss console"]'
    ) as HTMLButtonElement;
    dismiss.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.graph-logs__handle')).not.toBeNull();
    expect(header(fixture).textContent).toContain('Run console');
    expect(drawer(fixture).getAttribute('inert')).toBe('');
  });

  it('treats a store-collapsed console as lowered while keeping the bar mounted', () => {
    const fixture = render();
    graphRunLog.setOpen(true);
    graphRunLog.setCollapsed(true);
    fixture.detectChanges();

    const toggle = fixture.nativeElement.querySelector(
      '.graph-logs__toggle'
    ) as HTMLButtonElement;
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(drawer(fixture).getAttribute('inert')).toBe('');
    expect(drawer(fixture).getAttribute('aria-hidden')).toBe('true');
    expect(header(fixture).textContent).toContain('Run console');

    toggle.click();
    fixture.detectChanges();

    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(drawer(fixture).hasAttribute('inert')).toBe(false);
    expect(graphRunLog.open()).toBe(true);
    expect(graphRunLog.collapsed()).toBe(false);
  });
});
