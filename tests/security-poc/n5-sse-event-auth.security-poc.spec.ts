/**
 * [SECURITY-POC] — N5: SSE event auth is dead code — unbound eventHeaderResolver +
 * shape-incompatible resolver output (independent validation, Exploit Validator, SAA-1632).
 *
 * Finding:  N5 (SAA-1631 candidate, Low / correctness-with-security-impact):
 *           even when DecafAxiosHttpAdapter.token (public static,
 *           src/lib/engine/overrides.ts:32) is set by a consumer, the SSE event
 *           stream and subscribe/unsubscribe calls go out WITHOUT the
 *           Authorization header, silently. Two compounding defects:
 *
 *           D1 (unbound resolver): overrides.ts:40 passes
 *           `eventHeaderResolver: DecafAxiosHttpAdapter.getEventHeaders` as an
 *           unbound function reference. @decaf-ts/for-http invokes it as
 *           `resolver.call(this.config)` (for-http/src/adapter.ts getEventHeaders),
 *           so `this` inside the resolver is the adapter's CONFIG OBJECT, not the
 *           class — `this.token` is undefined and the resolver returns {}.
 *
 *           D2 (shape mismatch): even with correct binding, the resolver returns
 *           the nested shape `{ withCredentials: true, headers: { authorization } }`
 *           (overrides.ts:57-62) while for-http keeps only STRING-valued entries
 *           of the top-level object (for-http/src/adapter.ts
 *           `Object.fromEntries(...filter typeof value === "string")`). Both the
 *           boolean and the nested headers object are dropped → {}.
 *
 * Affected files (pinned revision for-angular abb26f50, v0.12.5):
 *   - src/lib/engine/overrides.ts:28-63 (DecafAxiosHttpAdapter, getEventHeaders)
 *   - node_modules/@decaf-ts/for-http/src/adapter.ts (resolver invocation + projection)
 *
 * Safe effect asserted (no network, no real services — the adapter is constructed
 * against a localhost baseURL and only the header-resolution code path runs):
 *   - adapter.getEventHeaders() (the REAL for-http path) returns {} even with
 *     DecafAxiosHttpAdapter.token set → events are unauthenticated by construction.
 */

import { DecafAxiosHttpAdapter } from '../../src/lib/engine/overrides';

describe('[SECURITY-POC] N5 SSE event authorization is dead code (unbound resolver + shape mismatch)', () => {
  const TEST_TOKEN = 'test-token-for-poc';
  let adapter: DecafAxiosHttpAdapter;

  beforeAll(() => {
    DecafAxiosHttpAdapter.token = TEST_TOKEN;
    DecafAxiosHttpAdapter.disableEvents = false;
    // No request is ever issued; baseURL points at an unused loopback port.
    adapter = new DecafAxiosHttpAdapter({
      protocol: 'http',
      host: '127.0.0.1:9',
      events: true,
    });
  });

  afterAll(() => {
    DecafAxiosHttpAdapter.token = '';
  });

  it('D1: invoked the way for-http invokes it (resolver.call(config)), the resolver returns {} despite token set', () => {
    const resolver = (adapter as unknown as { config: { eventHeaderResolver: () => unknown } }).config
      .eventHeaderResolver;
    expect(typeof resolver).toBe('function');
    // for-http: `resolver.call(this.config)` — this = config object, not the class
    const result = resolver.call((adapter as unknown as { config: object }).config) as Record<string, unknown>;
    expect(result).toEqual({});
  });

  it('D1 corollary: the resolver reads `this.token` off whatever `this` it is called with', () => {
    const resolver = DecafAxiosHttpAdapter.getEventHeaders;
    // with the class as `this` the token WOULD be visible — proving the defect is binding, not logic
    const bound = resolver.call(DecafAxiosHttpAdapter) as Record<string, unknown>;
    expect((bound as { headers?: { authorization?: string } }).headers?.authorization).toBe(`Bearer ${TEST_TOKEN}`);
  });

  it('D2: even correctly bound, the nested resolver shape is discarded by for-http string-only projection', async () => {
    // the REAL for-http code path on the adapter instance:
    const realResult = await (adapter as unknown as { getEventHeaders(): Promise<Record<string, string>> }).getEventHeaders();
    expect(realResult).toEqual({});
  });

  it('IMPACT: with the static token set, event calls still go out with no Authorization header', async () => {
    expect(DecafAxiosHttpAdapter.token).toBe(TEST_TOKEN);
    const headers = await (adapter as unknown as { getEventHeaders(): Promise<Record<string, string>> }).getEventHeaders();
    expect(Object.keys(headers)).toHaveLength(0);
    expect(headers['authorization']).toBeUndefined();
  });
});
