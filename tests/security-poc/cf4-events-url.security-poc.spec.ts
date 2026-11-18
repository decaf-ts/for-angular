/**
 * [SECURITY-POC] — CF-4: backend-supplied `eventsUrl` concatenated into a
 * credentialed EventSource without relative-path validation
 * (independent validation, Exploit Validator, SAA-1632).
 *
 * Finding:  CF-4 (SAA-1629 white-box candidate, Low / hardening):
 *           GraphRunEventClient.open built
 *           `new this.sourceCtor(`${this.backendUrl}${descriptor.eventsUrl}?afterSequence=${offset}`, { withCredentials: true })`
 *           with `eventsUrl` (backend-supplied from the 202 create response) only
 *           checked to be a non-empty string — never a same-origin RELATIVE path.
 *           A protocol-relative (`//host/...`) or absolute cross-origin URL yielded
 *           a CROSS-ORIGIN credentialed SSE connection.
 *
 * R2-4 REMEDIATION (this tree):
 *   - `GraphRunClient.createRun` validates the 202 payload with
 *     `isSameOriginRelativePath` (out-of-contract `SerializationError` otherwise);
 *   - `GraphRunEventClient.open` fails closed at the point of use (`InternalError`)
 *     before handing any non-relative path to the credentialed `EventSource`.
 *
 * The two bypass tests below were the demonstration at the pinned revision abb26f50;
 * they now assert the remediation: hostile paths never reach the EventSource
 * constructor, while well-formed relative paths still connect with credentials.
 *
 * Safe effects asserted (no network — GRAPH_RUN_EVENT_SOURCE is a stub ctor).
 */

import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { GraphRunEventClient } from '../../src/diagrams/components/graph/runs/GraphRunEventClient';
import { GRAPH_RUN_EVENT_SOURCE } from '../../src/diagrams/components/graph/runs/GraphRunEventClient';
import { GRAPH_BACKEND_URL } from '../../src/diagrams/components/graph/execution/GraphExecutionService';

class FakeEventSource {
  static captured: { url: string; init?: EventSourceInit }[] = [];
  constructor(url: string, init?: EventSourceInit) {
    FakeEventSource.captured.push({ url, init });
  }
}

const noopSubscriber = {
  onEvent: jest.fn(),
  onTerminal: jest.fn(),
  onError: jest.fn(),
};

describe('[SECURITY-POC] CF-4 eventsUrl — R2-4 REMEDIATED (same-origin relative validation)', () => {
  let client: GraphRunEventClient;

  beforeEach(() => {
    FakeEventSource.captured = [];
    TestBed.configureTestingModule({
      providers: [
        { provide: GRAPH_RUN_EVENT_SOURCE, useValue: FakeEventSource },
        { provide: GRAPH_BACKEND_URL, useValue: '' },
        { provide: HttpClient, useValue: { get: jest.fn() } },
      ],
    });
    client = TestBed.inject(GraphRunEventClient);
  });

  it('R2-4 FIXED: protocol-relative eventsUrl never reaches the credentialed EventSource', () => {
    expect(() =>
      client.connect({ runId: 'r1', eventsUrl: '//evil.example/steal-events' }, noopSubscriber)
    ).toThrow(/same-origin relative/);
    expect(FakeEventSource.captured).toHaveLength(0);
  });

  it('R2-4 FIXED: absolute cross-origin eventsUrl never reaches the credentialed EventSource', () => {
    expect(() =>
      client.connect({ runId: 'r2', eventsUrl: 'https://evil.example/steal-events' }, noopSubscriber)
    ).toThrow(/same-origin relative/);
    expect(FakeEventSource.captured).toHaveLength(0);
  });

  it('CONTROL: a well-formed relative eventsUrl still connects credentialed to the same origin', () => {
    client.connect(
      { runId: 'r3', eventsUrl: '/graph/runs/r3/events' },
      noopSubscriber
    );
    expect(FakeEventSource.captured[0].url).toBe('/graph/runs/r3/events?afterSequence=0');
    expect(FakeEventSource.captured[0].init?.withCredentials).toBe(true);
  });

  it('R2-4 FIXED: createRun contract check rejects a 202 payload carrying non-relative URLs', async () => {
    const { GraphRunClient } = await import(
      '../../src/diagrams/components/graph/runs/GraphRunClient'
    );
    const runClient = TestBed.inject(GraphRunClient);
    const responsePayload = {
      runId: 'r9',
      workflowId: 'w',
      status: 'queued',
      eventsUrl: '//evil.example/steal-events',
      resultUrl: '/graph/runs/r9/result',
    };
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 202,
      json: async () => responsePayload,
      text: async () => JSON.stringify(responsePayload),
    } as unknown as Response);
    const originalFetch = globalThis.fetch;
    (globalThis as { fetch: unknown }).fetch = fetchMock;
    try {
      await expect(runClient.createRun({ workflowId: 'w' })).rejects.toThrow(
        /out of contract/
      );
    } finally {
      (globalThis as { fetch: unknown }).fetch = originalFetch;
    }
  });
});
