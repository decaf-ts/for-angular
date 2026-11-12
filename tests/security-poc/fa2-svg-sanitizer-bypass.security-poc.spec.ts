/**
 * [SECURITY-POC] — FA-2 independent bypass attempt: HTTP SVG -> innerHTML sink via
 * NgxMediaService.loadSvgObserver (independent validation, Exploit Validator, SAA-1632).
 *
 * Finding:  FA-2 round-1 remediation = NgxMediaService.sanitizeSvg
 *           (src/lib/services/NgxMediaService.ts:315-477) feeding the direct-DOM
 *           sink target.innerHTML = cleanSvg (NgxMediaService.ts:505).
 *           SAA-1630 verdict: sanitizer effective (11 vectors neutralized).
 *           This suite is the Exploit Validator's OWN bypass attempt, designed
 *           against the implementation, not a re-run of the discovery probes:
 *
 * Affected surface (pinned revision for-angular abb26f50, v0.12.5):
 *   - src/lib/services/NgxMediaService.ts:315-477 (allowlist sanitizer)
 *   - src/lib/services/NgxMediaService.ts:497-509 (fetch -> sanitize -> innerHTML sink)
 *
 * Bypass classes attempted (all derived independently for this validation):
 *   V1  CDATA smuggling inside an ALLOWED tag (<text><![CDATA[<img ...>]]>) —
 *       XMLSerializer serializes CDATASection data UNESCAPED per DOM spec, so the
 *       raw markup reaches the HTML sink; neutralization must come from the HTML
 *       parser treating CDATA as characters/bogus-comment.
 *   V2  CDATA close-then-element smuggle (]]><img>) inside an allowed tag.
 *   V3  Double-percent-encoded javascript: scheme in xlink:href.
 *   V4  Non-ASCII scheme separator (U+00A0) that the \u0000-\u0020 strip misses.
 *   V5  foreignObject with nested hostile img.
 *   V6  Case tricks (SVG root / ONLOAD attribute casing).
 *   V7  HTML-parser namespace breakout (<svg><p><style><!--</style><img ...>).
 *   V8  data: URI in <use xlink:href>.
 *   V9  Animation elements <animate>/<set> targeting href.
 *   V10 Malformed XML (undefined entity) -> must fail closed to ''.
 *   V11 Non-SVG root -> must fail closed to ''.
 *   V12 BENIGN functional control: defs/symbol/use href="#id" must still render.
 *
 * Safe effects asserted (no execution, no network — HttpClient is mocked in-process):
 *   - sanitized output / target.innerHTML contains NO hostile element or attribute
 *     (img, script, on*, animate, foreignObject, non-# hrefs);
 *   - benign SVG structure survives (fail-open regression guard).
 */

import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { NgxMediaService } from '../../src/lib/services/NgxMediaService';

describe('[SECURITY-POC] FA-2 SVG sanitizer bypass attempt (NgxMediaService.loadSvgObserver)', () => {
  let service: NgxMediaService;
  let httpMock: { get: jest.Mock };

  const fetchInto = async (svg: string): Promise<HTMLElement> => {
    const target = document.createElement('div');
    httpMock.get.mockReturnValue(of(svg));
    service.loadSvgObserver(httpMock as unknown as HttpClient, '/mock.svg', target);
    await Promise.resolve();
    await Promise.resolve();
    return target;
  };

  const noHostileContent = (html: string): boolean =>
    !/<\s*(script|img|iframe|foreignobject|animate|set|style|body|p|embed|object|video|audio|form|input|button|link|meta|base)\b/i.test(
      html
    ) && !/on\w+\s*=/i.test(html) && !/(javascript|vbscript|data)\s*:/i.test(html);

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(NgxMediaService);
    httpMock = { get: jest.fn() };
  });

  it('V1: CDATA-smuggled <img onerror> inside allowed <text> does not become markup at the sink', async () => {
    const target = await fetchInto(
      '<svg xmlns="http://www.w3.org/2000/svg"><text><![CDATA[<img src=x onerror="window.__POC_FA2__=1">]]></text></svg>'
    );
    // Empirically (jsdom XMLSerializer, and per HTML foreign-content parsing rules if a
    // serializer preserved CDATA markers): CDATA content is character data, never elements.
    // Assert element/attribute absence rather than string absence — the inert <img> string
    // may legitimately survive as escaped text.
    expect(target.querySelector('img')).toBeNull();
    expect(target.querySelector('[onerror]')).toBeNull();
    expect(target.querySelectorAll('*').length).toBe(2); // svg + text only
    expect((window as unknown as Record<string, unknown>)['__POC_FA2__']).toBeUndefined();
  });

  it('V2: CDATA close + real <img> element inside allowed <text> is removed', async () => {
    const target = await fetchInto(
      '<svg xmlns="http://www.w3.org/2000/svg"><text><![CDATA[]]><img src=x onerror="alert(1)"></text></svg>'
    );
    expect(noHostileContent(target.innerHTML)).toBe(true);
    expect(target.querySelector('img')).toBeNull();
  });

  it('V3: double-percent-encoded javascript: xlink:href is removed', async () => {
    const target = await fetchInto(
      '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><a xlink:href="%256A%61vascript%3Aalert(1)"><rect width="1" height="1"/></a></svg>'
    );
    const a = target.querySelector('a');
    expect(a).toBeTruthy();
    expect(a?.getAttribute('xlink:href') || a?.getAttributeNS('http://www.w3.org/1999/xlink', 'href')).toBeFalsy();
  });

  it('V4: non-ASCII scheme separator (U+00A0) does not smuggle a javascript: href', async () => {
    const target = await fetchInto(
      '<svg xmlns="http://www.w3.org/2000/svg"><a href="java\u00A0script:alert(1)"><rect width="1" height="1"/></a></svg>'
    );
    const a = target.querySelector('a');
    expect(a).toBeTruthy();
    expect(a?.getAttribute('href')).toBeFalsy();
  });

  it('V5: foreignObject subtree with hostile <img> is removed (attributes quoted so the XML parses)', async () => {
    const target = await fetchInto(
      '<svg xmlns="http://www.w3.org/2000/svg"><foreignObject><body xmlns="http://www.w3.org/1999/xhtml"><img src="x" onerror="alert(1)"/></body></foreignObject><rect width="1" height="1"/></svg>'
    );
    expect(target.querySelector('foreignObject')).toBeNull();
    expect(target.querySelector('img')).toBeNull();
    expect(target.querySelector('rect')).toBeTruthy();
  });

  it('V6: casing tricks (<SVG ONLOAD=...>) are normalized away', async () => {
    const target = await fetchInto('<SVG ONLOAD="alert(1)"><RECT WIDTH="1" HEIGHT="1"/></SVG>');
    expect(target.querySelector('svg')).toBeTruthy();
    expect(target.querySelector('[onload]')).toBeNull();
    expect(/onload/i.test(target.innerHTML)).toBe(false);
  });

  it('V7: HTML namespace breakout (<svg><p><style><!--</style><img onerror>) is stripped', async () => {
    const target = await fetchInto(
      '<svg xmlns="http://www.w3.org/2000/svg"><p><style><!--</style><img src=x onerror="alert(1)">--></style></p></svg>'
    );
    expect(noHostileContent(target.innerHTML)).toBe(true);
    expect(target.querySelector('img')).toBeNull();
    expect(target.querySelector('style')).toBeNull();
    expect(target.querySelector('p')).toBeNull();
  });

  it('V8: data: URI in <use xlink:href> is removed; in-document #ref survives', async () => {
    const target = await fetchInto(
      '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><defs><rect id="r1" width="1" height="1"/></defs><use xlink:href="data:image/svg+xml;base64,PHN2Zz48L3N2Zz4="></use><use xlink:href="#r1"></use></svg>'
    );
    const uses = target.querySelectorAll('use');
    expect(uses.length).toBe(2);
    expect(uses[0].getAttribute('xlink:href')).toBeFalsy();
    expect(uses[1].getAttribute('xlink:href') || uses[1].getAttributeNS('http://www.w3.org/1999/xlink', 'href')).toBe('#r1');
  });

  it('V9: <animate>/<set> targeting href are removed', async () => {
    const target = await fetchInto(
      '<svg xmlns="http://www.w3.org/2000/svg"><a href="#x"><animate attributeName="href" values="javascript:alert(1)"/><set attributeName="href" to="javascript:alert(1)"/><rect width="1" height="1"/></a></svg>'
    );
    expect(target.querySelector('animate')).toBeNull();
    expect(target.querySelector('set')).toBeNull();
    expect(target.querySelector('a')).toBeTruthy();
  });

  it('V10: malformed XML (undefined entity) fails closed to empty output', async () => {
    const target = await fetchInto(
      '<svg xmlns="http://www.w3.org/2000/svg"><text>&unknownentity;</text></svg>'
    );
    expect(target.innerHTML).toBe('');
  });

  it('V11: non-SVG root fails closed to empty output', async () => {
    const target = await fetchInto('<html><body><img src=x onerror="alert(1)"/></body></html>');
    expect(target.innerHTML).toBe('');
  });

  it('V12 BENIGN CONTROL: defs/symbol/use #ref structure still renders after sanitization', async () => {
    const target = await fetchInto(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><defs><symbol id="ic" viewBox="0 0 24 24"><path d="M0 0h24v24H0z"/></symbol></defs><use href="#ic"/><circle cx="12" cy="12" r="10"/></svg>'
    );
    expect(target.querySelector('symbol')).toBeTruthy();
    expect(target.querySelector('path')).toBeTruthy();
    expect(target.querySelector('use')).toBeTruthy();
    expect(target.querySelector('circle')).toBeTruthy();
    const useEl = target.querySelector('use');
    expect(useEl?.getAttribute('href')).toBe('#ic');
  });
});
