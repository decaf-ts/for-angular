/**
 * [SECURITY-POC] — N5: SSE event auth is dead code — unbound eventHeaderResolver +
 * shape-incompatible resolver output (independent validation, Exploit Validator, SAA-1632).
 *
 * Finding:  N5 (SAA-1631 candidate, Low / correctness-with-security-impact):
 *           even when DecafAxiosHttpAdapter.token (public static) is set by a
 *           consumer, the SSE event stream and subscribe/unsubscribe calls went
 *           out WITHOUT the Authorization header, silently. Two compounding defects:
 *
 *           D1 (unbound resolver): for-http invokes the resolver as
 *           `resolver.call(this.config)` (for-http/src/adapter.ts getEventHeaders),
 *           so `this` inside the resolver is the adapter's CONFIG OBJECT, not the
 *           class — the old `this.token` read was always undefined → {}.
 *
 *           D2 (shape mismatch): the resolver returned the nested shape
 *           `{ withCredentials: true, headers: { authorization } }` while for-http
 *           keeps only STRING-valued entries of the top-level object — both the
 *           boolean and the nested headers object were dropped → {}.
 *
 * R2-3 REMEDIATION (this tree):
 *   - the resolver is now `this`-free (reads the static token off the class directly)
 *     and returns a FLAT string header map (`{ authorization: "Bearer ..." }`), which
 *     survives for-http's string-only projection;
 *   - `request()` now MERGES context-derived headers over the static token instead of
 *     discarding them — context-scoped auth wins.
 *
 * The tests below were the bypass demonstration at the pinned revision abb26f50; they
 * now assert the remediation holds on the REAL for-http code path.
 *
 * Safe effect asserted (no network, no real services — the adapter is constructed
 * against a localhost baseURL and only the header-resolution code path runs).
 */

import { DecafAxiosHttpAdapter } from '../../src/lib/engine/overrides';

describe('[SECURITY-POC] N5 SSE event authorization — R2-3 REMEDIATED (was: dead code)', () => {
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

  it('R2-3 FIXED (D1): invoked the way for-http invokes it (resolver.call(config)), the resolver returns the auth header', () => {
    const resolver = (adapter as unknown as { config: { eventHeaderResolver: () => unknown } }).config
      .eventHeaderResolver;
    expect(typeof resolver).toBe('function');
    // for-http: `resolver.call(this.config)` — this = config object, not the class;
    // the this-free resolver must still resolve the token.
    const result = resolver.call((adapter as unknown as { config: object }).config) as Record<string, unknown>;
    expect(result).toEqual({ authorization: `Bearer ${TEST_TOKEN}` });
  });

  it('R2-3 FIXED (D2): the flat resolver shape survives the real for-http string-only projection', async () => {
    const headers = await (adapter as unknown as { getEventHeaders(): Promise<Record<string, string>> }).getEventHeaders();
    expect(headers).toEqual({ authorization: `Bearer ${TEST_TOKEN}` });
  });

  it('IMPACT: with the static token set, event calls go out WITH the Authorization header', async () => {
    expect(DecafAxiosHttpAdapter.token).toBe(TEST_TOKEN);
    const headers = await (adapter as unknown as { getEventHeaders(): Promise<Record<string, string>> }).getEventHeaders();
    expect(headers['authorization']).toBe(`Bearer ${TEST_TOKEN}`);
  });

  it('IMPACT: with the static token cleared, event calls carry no stale authorization header', async () => {
    const previous = DecafAxiosHttpAdapter.token;
    try {
      DecafAxiosHttpAdapter.token = '';
      const headers = await (adapter as unknown as { getEventHeaders(): Promise<Record<string, string>> }).getEventHeaders();
      expect(headers).toEqual({});
    } finally {
      DecafAxiosHttpAdapter.token = previous;
    }
  });
});
