import { Adapter } from '@decaf-ts/core';
import { AxiosFlavour } from '@decaf-ts/for-http';
import { DecafAxiosHttpAdapter } from './overrides';

describe('DecafAxiosHttpAdapter bookmark pagination', () => {
  let adapter: DecafAxiosHttpAdapter;

  const baseUrl = 'https://api.example.com/batch/statement/paginateBy/updatedAt';

  beforeEach(() => {
    // DecafAxiosHttpAdapter always registers itself under the fixed `AxiosFlavour`
    // alias (its `alias` constructor param is unused), so each instance must be
    // unregistered between tests to avoid an "already registered" error.
    adapter = new DecafAxiosHttpAdapter({ protocol: 'https', host: 'api.example.com', events: false });
  });

  afterEach(() => {
    Adapter.unregister(AxiosFlavour);
  });

  function pageUrl(offset: number, bookmark?: string): string {
    const params = `direction=desc&limit=10&offset=${offset}${bookmark ? `&bookmark=${bookmark}` : ''}`;
    return `${baseUrl}?${params}`;
  }

  it('does not touch page 1 (no bookmark involved)', () => {
    const url = adapter.parseStatementURL(pageUrl(1));
    expect(url).toBe(pageUrl(1));
  });

  it('caches the bookmark used to reach a given offset while navigating forward', () => {
    // page 1 -> page 2, paginator sends the bookmark it got from page 1's response
    const page2Request = pageUrl(2, 'bookmarkFromPage1');
    const parsed = adapter.parseStatementURL(page2Request);
    expect(parsed).toBe(page2Request);

    // page 2 -> page 3, paginator sends the bookmark it got from page 2's response
    const page3Request = pageUrl(3, 'bookmarkFromPage2');
    expect(adapter.parseStatementURL(page3Request)).toBe(page3Request);
  });

  it('recovers a missing bookmark param when navigating backward past the last known one', () => {
    // Forward traversal populates the cache for offsets 2 and 3.
    adapter.parseStatementURL(pageUrl(2, 'bookmarkFromPage1'));
    adapter.parseStatementURL(pageUrl(3, 'bookmarkFromPage2'));

    // Reaching the last page leaves the paginator's own bookmark empty, so going
    // back (`previous()`) sends a request for offset=2 with NO bookmark param at
    // all — this used to 500 against a real backend.
    const brokenBackRequest = pageUrl(2);
    expect(brokenBackRequest).not.toContain('bookmark=');

    const fixed = adapter.parseStatementURL(brokenBackRequest);
    expect(fixed).toContain('bookmark=bookmarkFromPage1');
    expect(fixed).toContain('offset=2');
  });

  it('recovers a stale bookmark param (present but wrong) when navigating backward', () => {
    adapter.parseStatementURL(pageUrl(2, 'bookmarkFromPage1'));
    adapter.parseStatementURL(pageUrl(3, 'bookmarkFromPage2'));

    // Some paginator versions might resend the *last known* bookmark (from page 3)
    // instead of omitting it entirely. Either way offset=2 must resolve back to
    // the bookmark that was actually used to fetch page 2 the first time.
    const staleBackRequest = pageUrl(2, 'bookmarkFromPage2');
    const fixed = adapter.parseStatementURL(staleBackRequest);
    expect(fixed).toContain('bookmark=bookmarkFromPage1');
  });

  it('strips a stale bookmark when navigating all the way back to page 1', () => {
    adapter.parseStatementURL(pageUrl(2, 'B1'));
    adapter.parseStatementURL(pageUrl(3, 'B2'));

    // The core Paginator's `previous()` never clears its internal bookmark, so
    // by the time you navigate back down to page 1 it can still be resending
    // page 3's bookmark (B2) on the offset=1 request. Sending that stale
    // bookmark to the backend resumes pagination from B2's cursor instead of
    // returning page 1 — which reads as "going back to page 1 shows the last
    // page" — and can come back with no bookmark of its own, disabling "Next".
    const staleFirstPageRequest = pageUrl(1, 'B2');
    const fixed = adapter.parseStatementURL(staleFirstPageRequest);
    expect(fixed).not.toContain('bookmark=');
    expect(fixed).toContain('offset=1');
  });

  it('a clean page-1 request without a bookmark still yields correct forward paging afterwards', () => {
    adapter.parseStatementURL(pageUrl(2, 'B1'));
    adapter.parseStatementURL(pageUrl(3, 'B2'));

    // Simulate returning to page 1 with a stale bookmark, then paging forward
    // again — the cache reset on offset=1 must not leave behind anything that
    // would corrupt the next forward traversal.
    adapter.parseStatementURL(pageUrl(1, 'B2'));
    const forwardAgain = adapter.parseStatementURL(pageUrl(2, 'B1'));
    expect(forwardAgain).toContain('bookmark=B1');
  });

  it('supports repeated forward/backward navigation consistently', () => {
    // 1 -> 2 -> 3
    adapter.parseStatementURL(pageUrl(2, 'B1'));
    adapter.parseStatementURL(pageUrl(3, 'B2'));

    // 3 -> back to 2 (missing bookmark, recovered from cache)
    let url = adapter.parseStatementURL(pageUrl(2));
    expect(url).toContain('bookmark=B1');

    // 2 -> back to 1 resets the cache for a fresh forward run
    url = adapter.parseStatementURL(pageUrl(1));
    expect(url).toBe(pageUrl(1));

    // 1 -> forward to 2 again: paginator resends B1 (from page 1's response)
    url = adapter.parseStatementURL(pageUrl(2, 'B1'));
    expect(url).toContain('bookmark=B1');

    // 2 -> forward to 3 again: must still resolve to B2
    url = adapter.parseStatementURL(pageUrl(3, 'B2'));
    expect(url).toContain('bookmark=B2');
  });

  it('keeps different tables/entities isolated from each other', () => {
    adapter.parseStatementURL(pageUrl(2, 'batchBookmark'));
    const productUrl = 'https://api.example.com/product/statement/paginateBy/updatedAt?direction=desc&limit=10&offset=2&bookmark=productBookmark';
    expect(adapter.parseStatementURL(productUrl)).toBe(productUrl);

    const batchBack = adapter.parseStatementURL(`${baseUrl}?direction=desc&limit=10&offset=2`);
    expect(batchBack).toContain('bookmark=batchBookmark');
  });
});
