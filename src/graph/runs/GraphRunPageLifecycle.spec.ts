/**
 * @module for-angular/graph/runs/GraphRunPageLifecycle.spec
 * @summary DECAF-50 §4.19 Angular run-row page tests: the GraphPage's
 * canonical run constructs (`202` handling, subscriber fold, terminal fold,
 * cancellation, teardown) against the P7-F-landed canonical-only page.
 * @description Covers the page-level §4.19 targets the run trio cannot see:
 *
 * - `202` handling: `POST /graph/runs` resolves the created-run shape and the
 *   page registers its per-run subscriber and opens the SSE connection only
 *   after the create resolves (spec §4.14/§4.19).
 * - The subscriber fold: every envelope reaches `graphRunState.applyEvent`
 *   and the page's `runStatus` signal; stream errors surface on `runError`
 *   without ending the run.
 * - The terminal fold (`finishCanonicalRun`): run-status signals, the
 *   `workflow.cancelled` skipped demotion, `lastResult` from the stored
 *   result's `outputs`, the inspection readout through
 *   `graphRunState.applyRunResult`, the submitted-vs-stored document
 *   semantic-hash round-trip assertion, and the disconnect/subscriber
 *   teardown.
 * - The seeded BLOCKED canvas state (DECAF-48 §4.4) and the page teardown.
 *
 * The page's `src/graph` specifier has no jest module mapping and Angular's
 * `inject` runs in field initializers, so the suite bridges `src/graph` to
 * the real barrel (virtual mock) and replaces `inject` with a token-keyed
 * fake registry. The page class is exercised directly (jsdom; no rendered
 * template).
 */
import type { GraphWorkflowDocument } from '@decaf-ts/ui-decorators/graph';
import type { GraphRunEventEnvelope } from '@decaf-ts/ui-decorators/graph';
import { GraphExecutionEventType } from '@decaf-ts/ui-decorators/graph';

import {
  GraphAutoSaveService,
  GraphMutationDetectorService,
  GraphSaveService,
} from '../services';
import {
  GraphBackendUnavailableError,
  GraphExecutionService,
  graphExecutionState,
  graphInspection,
  graphRunLog,
} from '../execution';
import { GraphNodeCatalogService } from '../catalog';
import { GraphWorkflowDocumentStore } from '../document';
import {
  GraphRunClient,
  GraphRunEventClient,
} from '../runs';
import { graphRunState, graphRunStateSnapshot } from './GraphRunStateStore';

jest.mock('@angular/core', () => {
  const actual = jest.requireActual('@angular/core');
  // Token-keyed fakes returned by the mocked Angular `inject`; exposed on the
  // module so the suite can register fakes without hoisted variables.
  const injectables = new Map<unknown, unknown>();
  return {
    ...actual,
    __testInjectables: injectables,
    inject: (token: unknown) => {
      if (!injectables.has(token)) {
        throw new Error(`no test fake registered for injection token: ${String(token)}`);
      }
      return injectables.get(token);
    },
  };
});

// The page imports the barrel through the app-root `src/graph` specifier,
// which jest does not map. Bridge it to the real non-component sub-barrels
// (the components barrel pulls renderer dependencies that only resolve in the
// Angular builder), with stub classes for the two components the page only
// references as metadata. Every token/store the page touches is therefore
// the exact module instance this suite imports.
jest.mock('src/graph', () => ({
  ...jest.requireActual('../catalog'),
  ...jest.requireActual('../document'),
  ...jest.requireActual('../execution'),
  ...jest.requireActual('../runs'),
  ...jest.requireActual('../services'),
  ...jest.requireActual('@decaf-ts/ui-decorators/graph'),
  GraphRendererComponent: class GraphRendererComponent {},
  GraphToolbarComponent: class GraphToolbarComponent {},
}), { virtual: true });

/* eslint-disable @typescript-eslint/no-explicit-any */
const { signal } = require('@angular/core') as typeof import('@angular/core');
const injectables = (require('@angular/core') as {
  __testInjectables: Map<unknown, unknown>;
}).__testInjectables;
/* eslint-enable @typescript-eslint/no-explicit-any */

/* eslint-disable-next-line @typescript-eslint/no-var-requires */
const { GraphPage } = require('../../app/pages/graph/graph.page') as {
  GraphPage: new () => InstanceType<new () => { ngOnInit(): void; ngOnDestroy(): void }>;
};

const WORKFLOW_ID = 'text-pipeline-workflow';
const RUN_ID = 'run-page-1';
const EVENTS_URL = `/graph/runs/${RUN_ID}/events`;
const RESULT_URL = `/graph/runs/${RUN_ID}/result`;
const RUN_INPUTS = { count: 1, text: 'Hello\nWorld\nFoo\nBar\nBaz' };

/** The canonical document the page's document store hands to the run path. */
const DOCUMENT = {
  id: WORKFLOW_ID,
  name: 'wf',
  inputs: [],
  outputs: [],
  nodes: [],
  edges: [],
} as never as GraphWorkflowDocument;

/** Builds a canonical run envelope with sensible defaults. */
function envelope(
  sequence: number,
  type: GraphExecutionEventType,
  extra: Record<string, unknown> = {},
): GraphRunEventEnvelope {
  return {
    runId: RUN_ID,
    workflowId: WORKFLOW_ID,
    sequence,
    type,
    timestamp: '2026-01-01T00:00:00.000Z',
    ...extra,
  } as GraphRunEventEnvelope;
}

/** Resolves once the synchronous-ish async page fold settles. */
async function until(cond: () => boolean, timeoutMs = 2000): Promise<void> {
  const start = Date.now();
  while (!cond()) {
    if (Date.now() - start > timeoutMs) throw new Error('page fold did not settle in time');
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

/** The created-run `202` payload `POST /graph/runs` resolves before completion. */
const created = {
  runId: RUN_ID,
  workflowId: WORKFLOW_ID,
  status: 'queued',
  eventsUrl: EVENTS_URL,
  resultUrl: RESULT_URL,
};

/** Fresh fakes + a constructed page wired for the canonical run path. */
function freshPage(
  overrides: {
    createRun?: () => Promise<unknown>;
    document?: () => GraphWorkflowDocument | undefined;
  } = {},
) {
  const createRun = jest.fn(overrides.createRun ?? (() => Promise.resolve(created)));
  const fetchRunResult = jest.fn(() => Promise.resolve(null as unknown));
  const connect = jest.fn();
  const disconnect = jest.fn();
  const backendAvailable = signal(true);

  injectables.clear();
  injectables.set(GraphExecutionService, {
    backendAvailable,
    checkBackend: jest.fn(),
  });
  injectables.set(GraphSaveService, { loadDocument: jest.fn(() => Promise.resolve(null)) });
  injectables.set(GraphAutoSaveService, {});
  injectables.set(GraphMutationDetectorService, { configure: jest.fn() });
  injectables.set(GraphWorkflowDocumentStore, {
    document: overrides.document ?? (() => DOCUMENT),
    snapshot: () => DOCUMENT,
  });
  injectables.set(GraphRunClient, {
    createRun,
    fetchRunResult,
    getRunResult: jest.fn(),
    getStatus: jest.fn(),
    cancelRun: jest.fn(),
  });
  injectables.set(GraphRunEventClient, { connect, disconnect });
  injectables.set(GraphNodeCatalogService, {
    manifests: [],
    load: jest.fn(() => Promise.resolve()),
  });

  const page = new GraphPage() as never as {
    isRunning(): boolean;
    lastResult(): Record<string, unknown> | null;
    runError(): string | null;
    runStatus(): string;
    backendAvailable(): boolean;
    runWorkflow(): Promise<void>;
    ngOnDestroy(): void;
    runEventSubscribers: Map<string, unknown>;
    renderer?: unknown;
  };
  return { page, createRun, fetchRunResult, connect, disconnect, backendAvailable };
}

/** The subscriber the page registered, captured from the SSE connect call. */
function registeredSubscriber(connect: jest.Mock): {
  onEvent(e: GraphRunEventEnvelope): void;
  onTerminal(e: GraphRunEventEnvelope): void;
  onError(error: unknown): void;
} {
  expect(connect).toHaveBeenCalledTimes(1);
  const [, subscriber] = connect.mock.calls[0] as [unknown, {
    onEvent(e: GraphRunEventEnvelope): void;
    onTerminal(e: GraphRunEventEnvelope): void;
    onError(error: unknown): void;
  }];
  return subscriber;
}

describe('GraphPage canonical run lifecycle (DECAF-50 §4.19 Angular run row)', () => {
  beforeEach(() => {
    graphExecutionState.reset();
    graphRunLog.reset();
    graphInspection.reset();
    graphRunState.reset();
  });

  afterEach(() => {
    injectables.clear();
  });

  it('handles the 202 created-run shape: subscriber registered and SSE connect opened after createRun resolves', async () => {
    const { page, createRun, connect } = freshPage();

    await page.runWorkflow();

    expect(createRun).toHaveBeenCalledWith({ workflow: DOCUMENT, inputs: RUN_INPUTS });
    expect(connect).toHaveBeenCalledTimes(1);
    expect(connect.mock.calls[0][0]).toEqual({ runId: RUN_ID, eventsUrl: EVENTS_URL });
    expect((createRun.mock.invocationCallOrder[0] ?? 0) < (connect.mock.invocationCallOrder[0] ?? 0))
      .toBe(true);
    expect(page.runEventSubscribers.has(RUN_ID)).toBe(true);
    expect(page.isRunning()).toBe(true);
    expect(page.runError()).toBeNull();
    expect(graphRunStateSnapshot()).toMatchObject({
      runId: RUN_ID,
      workflowId: WORKFLOW_ID,
      status: 'queued',
    });
  });

  it('seeds the canvas members as BLOCKED before the run starts (DECAF-48 §4.4)', async () => {
    const { page, createRun } = freshPage();
    (page as never as { renderer: unknown }).renderer = {
      viewModel: () => ({
        nodes: [{ id: 'n1' }, { id: 'n2' }],
        edges: [{ id: 'e1', data: { engineEdgeId: 'plan-e1' } }],
      }),
    };

    await page.runWorkflow();

    expect(createRun).toHaveBeenCalled();
    const nodes = graphExecutionState.nodeStates();
    expect(nodes['n1'].status).toBe('blocked');
    expect(nodes['n2'].status).toBe('blocked');
    const edges = graphExecutionState.edgeStates();
    expect(edges['e1'].status).toBe('blocked');
    expect(edges['plan-e1'].status).toBe('blocked');
  });

  it('skips the run entirely when no canonical document is available', async () => {
    const { page, createRun } = freshPage({ document: () => undefined });

    await page.runWorkflow();

    expect(createRun).not.toHaveBeenCalled();
    expect(page.isRunning()).toBe(false);
  });

  it('folds every subscriber envelope into the run state store and the runStatus signal', async () => {
    const { page, connect } = freshPage();
    await page.runWorkflow();
    const subscriber = registeredSubscriber(connect);

    subscriber.onEvent(envelope(1, GraphExecutionEventType.WORKFLOW_STARTED));
    subscriber.onEvent(envelope(2, GraphExecutionEventType.NODE_STARTED, { nodeId: 'n1' }));
    subscriber.onEvent(
      envelope(3, GraphExecutionEventType.GRAPH_RUN_LOG, {
        payload: { level: 'info', message: 'hello' },
      }),
    );

    expect(page.runStatus()).toBe('graph.run.log');
    expect(graphRunStateSnapshot()).toMatchObject({
      runId: RUN_ID,
      lastSequence: 3,
      status: 'running',
    });
    const nodes = graphExecutionState.nodeStates();
    expect(nodes['n1'].status).toBe('running');
    expect(graphRunLog.entries().map((entry) => entry.message)).toContain('hello');
  });

  it('surfaces stream errors on runError without ending the run (polling fallback keeps walking)', async () => {
    const { page, connect } = freshPage();
    await page.runWorkflow();
    const subscriber = registeredSubscriber(connect);

    subscriber.onError(new Error('SSE reconnect budget exhausted'));

    expect(page.runError()).toBe('SSE reconnect budget exhausted');
    expect(page.isRunning()).toBe(true);
    expect(page.runEventSubscribers.has(RUN_ID)).toBe(true);
  });

  it('folds the workflow.completed terminal envelope: outputs, inspection readout, document-hash assertion, teardown', async () => {
    const { page, connect, disconnect, fetchRunResult } = freshPage();
    await page.runWorkflow();
    const subscriber = registeredSubscriber(connect);

    const result = {
      runId: RUN_ID,
      workflowId: WORKFLOW_ID,
      status: 'succeeded',
      document: DOCUMENT,
      inputs: RUN_INPUTS,
      outputs: { result: ['HELLO', 'WORLD'] },
      nodeResults: {
        n1: { nodeId: 'n1', status: 'succeeded', inputs: { text: 'hello' }, outputs: { upper: 'HELLO' } },
      },
      events: [],
    };
    fetchRunResult.mockReturnValue(Promise.resolve(result));

    subscriber.onTerminal(envelope(9, GraphExecutionEventType.WORKFLOW_COMPLETED));
    await until(() => !page.isRunning());

    expect(page.runStatus()).toBe('workflow.completed');
    expect(page.lastResult()).toEqual({ result: ['HELLO', 'WORLD'] });
    expect(graphRunStateSnapshot()).toMatchObject({ status: 'succeeded', lastRunId: RUN_ID });
    expect(graphInspection.inspections()['n1']).toMatchObject({
      runId: RUN_ID,
      nodeId: 'n1',
      state: 'succeeded',
      inputs: { text: 'hello' },
      outputs: { upper: 'HELLO' },
    });
    expect(graphRunLog.open()).toBe(true);
    expect(page.runError()).toBeNull();
    expect(disconnect).toHaveBeenCalledWith(RUN_ID);
    expect(page.runEventSubscribers.has(RUN_ID)).toBe(false);
    expect(page.isRunning()).toBe(false);
  });

  it('flags a drifted stored document through the semantic-hash round-trip assertion', async () => {
    const { page, connect, fetchRunResult } = freshPage();
    await page.runWorkflow();
    const subscriber = registeredSubscriber(connect);

    const drifted = {
      ...DOCUMENT,
      nodes: [{ id: 'extra-node' } as never],
    } as never as GraphWorkflowDocument;
    fetchRunResult.mockReturnValue(
      Promise.resolve({
        runId: RUN_ID,
        workflowId: WORKFLOW_ID,
        status: 'succeeded',
        document: drifted,
        inputs: {},
        outputs: {},
        nodeResults: {},
        events: [],
      }),
    );

    subscriber.onTerminal(envelope(4, GraphExecutionEventType.WORKFLOW_COMPLETED));
    await until(() => !page.isRunning());

    expect(page.runError()).toMatch(/round trip drifted/u);
  });

  it('folds the workflow.cancelled terminal envelope: run-status + skipped demotion + teardown', async () => {
    const { page, connect, disconnect, fetchRunResult } = freshPage();
    await page.runWorkflow();
    const subscriber = registeredSubscriber(connect);

    graphExecutionState.setNodeState('n1', { status: 'succeeded', visualState: 'succeeded' });
    graphExecutionState.setNodeState('n2', { status: 'blocked', visualState: 'blocked' });
    graphExecutionState.setEdgeState('e1', { status: 'blocked', visualState: 'blocked' });

    fetchRunResult.mockReturnValue(
      Promise.resolve({
        runId: RUN_ID,
        workflowId: WORKFLOW_ID,
        status: 'cancelled',
        document: DOCUMENT,
        inputs: {},
        outputs: {},
        nodeResults: {},
        events: [],
      }),
    );

    subscriber.onTerminal(envelope(7, GraphExecutionEventType.WORKFLOW_CANCELLED));
    await until(() => !page.isRunning());

    expect(page.runStatus()).toBe('workflow.cancelled');
    expect(graphRunStateSnapshot()).toMatchObject({ status: 'cancelled' });
    const nodes = graphExecutionState.nodeStates();
    expect(nodes['n1'].status).toBe('succeeded');
    expect(nodes['n2'].status).toBe('skipped');
    expect(graphExecutionState.edgeStates()['e1'].status).toBe('skipped');
    expect(disconnect).toHaveBeenCalledWith(RUN_ID);
    expect(page.runEventSubscribers.has(RUN_ID)).toBe(false);
    expect(page.isRunning()).toBe(false);
  });

  it('maps a GraphBackendUnavailableError createRun rejection onto the backend banner', async () => {
    const { page, backendAvailable } = freshPage({
      createRun: () => Promise.reject(new GraphBackendUnavailableError('backend is down')),
    });

    await page.runWorkflow();

    expect(backendAvailable()).toBe(false);
    expect(page.runError()).toBe('backend is down');
    expect(page.isRunning()).toBe(false);
  });

  it('tears down every live run subscriber on page destruction', async () => {
    const { page, disconnect } = freshPage();
    await page.runWorkflow();
    expect(page.runEventSubscribers.size).toBe(1);

    page.ngOnDestroy();

    expect(disconnect).toHaveBeenCalledWith(RUN_ID);
    expect(page.runEventSubscribers.size).toBe(0);
  });
});
