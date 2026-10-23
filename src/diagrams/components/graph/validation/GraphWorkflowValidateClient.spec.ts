/**
 * @module for-angular/graph/validation/GraphWorkflowValidateClient.spec
 * @summary Gate-2 P0 #5 (D5) — `POST /graph/workflows/validate` client contract.
 * @description Proves the frontend validate client (DECAF-50 §4.22/D5,
 * §4.24 P0 #5) against the real source module:
 *
 * - `graphWorkflowValidationResultOf` normalizes untrusted payloads: `null`
 *   for malformed/non-result bodies (unavailable, never invalid), `valid: true`
 *   only when `valid === true` and no issues, `valid: false` when issues are
 *   present, and malformed issue entries are dropped.
 * - `GraphWorkflowValidateClient.validate` POSTs `{ document }` to the canonical
 *   route with `credentials: 'include'`, parses a 2xx result, maps a 422
 *   `{ message, issues }` rejection to a structured invalid result, and maps
 *   transport/HTTP failures onto the Decaf error hierarchy.
 */
import { TestBed } from '@angular/core/testing';
import { BadRequestError, InternalError, NotFoundError } from '@decaf-ts/db-decorators';
import { AuthorizationError, ForbiddenError } from '@decaf-ts/core';

import {
  GRAPH_BACKEND_URL,
  GraphBackendUnavailableError,
} from '../execution/GraphExecutionService';
import {
  GraphWorkflowValidateClient,
  graphWorkflowValidationResultOf,
  type GraphValidationIssue,
} from './GraphWorkflowValidateClient';

const BACKEND_URL = 'http://backend.test';

/** Minimal literal issue carrying every field the projection reads. */
function issue(extra: Partial<GraphValidationIssue> = {}): GraphValidationIssue {
  return {
    code: 'graph.edge.dangling',
    path: 'edges.0',
    message: 'Edge target is missing',
    ...extra,
  };
}

/** Minimal canonical document (only the id matters to the client). */
const DOCUMENT = {
  id: 'text-pipeline-workflow',
  name: 'Text pipeline',
  inputs: [],
  outputs: [],
  nodes: [],
  edges: [],
} as never;

/** Fetch `Response`-shaped stub; the client only reads `ok`/`status`/`json`. */
function httpResponse(body: unknown, status = 200): Response {
  const text = JSON.stringify(body);
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    text: () => Promise.resolve(text),
    json: () => Promise.resolve(body),
  } as never as Response;
}

describe('graphWorkflowValidationResultOf (D5 payload normalizer)', () => {
  it('returns null for non-result payloads (unavailable, not invalid)', () => {
    expect(graphWorkflowValidationResultOf(null)).toBeNull();
    expect(graphWorkflowValidationResultOf(undefined)).toBeNull();
    expect(graphWorkflowValidationResultOf('valid')).toBeNull();
    expect(graphWorkflowValidationResultOf([{ valid: true, issues: [] }])).toBeNull();
    expect(graphWorkflowValidationResultOf({})).toBeNull();
    expect(graphWorkflowValidationResultOf({ valid: 'yes', issues: [] })).toBeNull();
    expect(graphWorkflowValidationResultOf({ issues: [issue()] })).toBeNull();
  });

  it('returns valid: true only when valid === true and there are no issues', () => {
    expect(graphWorkflowValidationResultOf({ valid: true, issues: [] })).toEqual({
      valid: true,
      issues: [],
    });
    expect(graphWorkflowValidationResultOf({ valid: true })).toEqual({
      valid: true,
      issues: [],
    });
  });

  it('returns valid: false when issues are present, even if the payload claims valid: true', () => {
    const malformed = graphWorkflowValidationResultOf({
      valid: true,
      issues: [issue()],
    });
    expect(malformed).toEqual({ valid: false, issues: [issue()] });

    expect(graphWorkflowValidationResultOf({ valid: false, issues: [issue()] })).toEqual({
      valid: false,
      issues: [issue()],
    });
  });

  it('drops malformed issue entries without corrupting the projection', () => {
    const result = graphWorkflowValidationResultOf({
      valid: false,
      issues: [
        issue({ nodeId: 'n1' }),
        null,
        'not-an-issue',
        { code: 'only.code', path: 'edges.0' },
        { code: 'x', path: 'y' },
        issue({ edgeId: 'e1', details: { port: 'value' } }),
      ],
    });

    expect(result).toEqual({
      valid: false,
      issues: [
        issue({ nodeId: 'n1' }),
        issue({ edgeId: 'e1', details: { port: 'value' } }),
      ],
    });
  });

  it('treats a non-array issues field as no issues', () => {
    expect(graphWorkflowValidationResultOf({ valid: false, issues: 'nope' })).toEqual({
      valid: false,
      issues: [],
    });
  });
});

describe('GraphWorkflowValidateClient (D5 validate endpoint client)', () => {
  let client: GraphWorkflowValidateClient;
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    TestBed.configureTestingModule({
      providers: [
        GraphWorkflowValidateClient,
        { provide: GRAPH_BACKEND_URL, useValue: BACKEND_URL },
      ],
    });
    client = TestBed.inject(GraphWorkflowValidateClient);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    TestBed.resetTestingModule();
  });

  it('POSTs { document } to the canonical validate route with credentials', async () => {
    const fetchMock = jest.fn().mockResolvedValue(
      httpResponse({ valid: true, issues: [] }),
    );
    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;

    const result = await client.validate(DOCUMENT);

    expect(result).toEqual({ valid: true, issues: [] });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      `${BACKEND_URL}/graph/workflows/validate`,
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      }),
    );
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(String(init.body))).toEqual({ document: DOCUMENT });
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it('parses a 2xx invalid result with structured issues', async () => {
    const payload = { valid: false, issues: [issue({ nodeId: 'n1' })] };
    globalThis.fetch = jest
      .fn()
      .mockResolvedValue(httpResponse(payload)) as unknown as typeof globalThis.fetch;

    await expect(client.validate(DOCUMENT)).resolves.toEqual(payload);
  });

  it('maps a 422 { message, issues } rejection to a structured invalid result', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue(
      httpResponse({ message: 'Document rejected', issues: [issue({ nodeId: 'n1' })] }, 422),
    ) as unknown as typeof globalThis.fetch;

    await expect(client.validate(DOCUMENT)).resolves.toEqual({
      valid: false,
      issues: [issue({ nodeId: 'n1' })],
    });
  });

  it('throws an InternalError for an out-of-contract 2xx body', async () => {
    globalThis.fetch = jest
      .fn()
      .mockResolvedValue(httpResponse({ hello: 'world' })) as unknown as typeof globalThis.fetch;

    await expect(client.validate(DOCUMENT)).rejects.toBeInstanceOf(InternalError);
  });

  it('throws GraphBackendUnavailableError on a network failure', async () => {
    globalThis.fetch = jest
      .fn()
      .mockRejectedValue(new TypeError('Failed to fetch')) as unknown as typeof globalThis.fetch;

    await expect(client.validate(DOCUMENT)).rejects.toBeInstanceOf(
      GraphBackendUnavailableError,
    );
  });

  it('throws GraphBackendUnavailableError with the timeout message on an AbortSignal timeout', async () => {
    const timeout = new Error('The operation was aborted due to timeout');
    timeout.name = 'TimeoutError';
    globalThis.fetch = jest
      .fn()
      .mockRejectedValue(timeout) as unknown as typeof globalThis.fetch;

    await expect(client.validate(DOCUMENT)).rejects.toThrow(/within 10 seconds/u);
  });

  it.each([
    [400, BadRequestError],
    [401, AuthorizationError],
    [403, ForbiddenError],
    [404, NotFoundError],
    [500, InternalError],
    [503, InternalError],
  ])('maps HTTP %i onto %p', async (status, expected) => {
    globalThis.fetch = jest
      .fn()
      .mockResolvedValue(httpResponse({ message: 'nope' }, status)) as unknown as typeof globalThis.fetch;

    await expect(client.validate(DOCUMENT)).rejects.toBeInstanceOf(expected);
  });
});
