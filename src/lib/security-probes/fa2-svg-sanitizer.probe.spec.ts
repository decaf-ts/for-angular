/**
 * SECURITY-REVIEW PROBE — SAA-1630 (Red Team Web Pentester). DO NOT COMMIT.
 *
 * FA-2 runtime re-verification: HTTP SVG → innerHTML in
 * NgxMediaService.loadSvgObserver. The current revision routes responses
 * through sanitizeSvg (XML parse + tag/attr allow-list + #-only hrefs).
 * This battery drives the REAL loadSvgObserver path with a mocked HttpClient
 * and a hostile payload set, then inspects the DOM the browser will build.
 */
import { TestBed, waitForAsync } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { NgxMediaService } from '../services/NgxMediaService';

describe('[SAA-1630 PROBE] FA-2 SVG sanitizer re-verification', () => {
  let service: NgxMediaService;

  const XSS = 'window.__fa2Executed=true';

  function loadWith(svg: string): HTMLElement {
    const mockHttp = { get: jest.fn(() => of(svg)) } as unknown as HttpClient;
    const target = document.createElement('div');
    service.loadSvgObserver(mockHttp, '/assets/hostile.svg', target);
    return target;
  }

  const FORBIDDEN = [
    '<script',
    'onerror=',
    'onload=',
    'onclick=',
    'javascript:',
    'vbscript:',
    '<foreignobject',
    '<image',
    '<iframe',
    '<embed',
    '<object',
    '<meta',
    '<style',
    '<animate',
    '<set',
    'data:image/svg+xml',
  ];

  function expectSanitized(target: HTMLElement) {
    const html = target.innerHTML.toLowerCase();
    for (const token of FORBIDDEN) {
      expect(html).not.toContain(token);
    }
    // no external hrefs survive (only #-references)
    const hrefs = Array.from(target.querySelectorAll('[href], [*|href]')).map((el) =>
      (el.getAttribute('href') || el.getAttribute('xlink:href') || '').toLowerCase()
    );
    for (const h of hrefs) {
      expect(h.startsWith('#')).toBe(true);
    }
    expect((window as any)['__fa2Executed']).toBe(false);
  }

  beforeAll(() => {
    (window as any)['__fa2Executed'] = false;
  });

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({}).compileComponents();
    service = TestBed.inject(NgxMediaService);
  }));

  it('drops <script> inside svg', () => {
    const target = loadWith(`<svg xmlns="http://www.w3.org/2000/svg"><script>${XSS}</script><rect width="1" height="1"/></svg>`);
    expectSanitized(target);
  });

  it('drops onload on the svg root', () => {
    const target = loadWith(`<svg xmlns="http://www.w3.org/2000/svg" onload="${XSS}"><rect width="1" height="1"/></svg>`);
    expectSanitized(target);
  });

  it('drops foreignObject payloads', () => {
    const target = loadWith(
      `<svg xmlns="http://www.w3.org/2000/svg"><foreignObject><body xmlns="http://www.w3.org/1999/xhtml"><img src=x onerror="${XSS}"></body></foreignObject></svg>`
    );
    expectSanitized(target);
  });

  it('rejects javascript: xlink:href on <a>', () => {
    const target = loadWith(
      `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><a xlink:href="javascript:${XSS}"><text x="10" y="10">click</text></a></svg>`
    );
    expectSanitized(target);
  });

  it('rejects percent- and tab-obfuscated javascript: hrefs', () => {
    const target = loadWith(
      `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><a xlink:href="jav&#x09;ascript%3A${XSS}"><text x="1" y="1">x</text></a></svg>`
    );
    expectSanitized(target);
  });

  it('rejects data: use hrefs', () => {
    const target = loadWith(
      `<svg xmlns="http://www.w3.org/2000/svg"><use href="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxzY3JpcHQ+YWxlcnQoMSk8L3NjcmlwdD48L3N2Zz4=#x"/></svg>`
    );
    expectSanitized(target);
  });

  it('drops <animate>/<set> attribute animation vectors and <style>', () => {
    const target = loadWith(
      `<svg xmlns="http://www.w3.org/2000/svg"><style>@import url("http://evil.test/x.css");</style><animate attributeName="href" values="javascript:${XSS}"/><set attributeName="onload" to="${XSS}"/><rect width="1" height="1"/></svg>`
    );
    expectSanitized(target);
  });

  it('neutralizes HTML-parser namespace breakout attempts (p/style/img/comment mix)', () => {
    const target = loadWith(
      `<svg xmlns="http://www.w3.org/2000/svg"><p><style><!--</style><img src=x onerror="${XSS}">--></p></svg>`
    );
    expectSanitized(target);
  });

  it('neutralizes CDATA-embedded markup in text nodes', () => {
    const target = loadWith(
      `<svg xmlns="http://www.w3.org/2000/svg"><text><![CDATA[<script>${XSS}</script>]]></text></svg>`
    );
    expectSanitized(target);
  });

  it('neutralizes <title>-wrapped markup', () => {
    const target = loadWith(
      `<svg xmlns="http://www.w3.org/2000/svg"><title><img src=x onerror="${XSS}"></title></svg>`
    );
    expectSanitized(target);
  });

  it('rejects a non-svg root (parsererror / html content)', () => {
    const target = loadWith(`<html><body><img src=x onerror="${XSS}"></body></html>`);
    expect(target.innerHTML).toBe('');
    const target2 = loadWith(`not xml at all <`);
    expect(target2.innerHTML).toBe('');
  });

  it('functional: benign svg with shapes and an in-document use reference survives', () => {
    const target = loadWith(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><defs><symbol id="p"><circle cx="5" cy="5" r="4" fill="#000"/></symbol></defs><use href="#p"/></svg>`
    );
    expect(target.querySelector('circle')).toBeTruthy();
    expect(target.querySelector('use')).toBeTruthy();
  });
});
