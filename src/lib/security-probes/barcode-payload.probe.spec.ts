/**
 * SECURITY-REVIEW PROBE — SAA-1630 (Red Team Web Pentester). DO NOT COMMIT.
 *
 * Barcode pipeline probes: user-controlled payload → @bwip-js/browser →
 * validateBarcodeSvg → DomSanitizer.bypassSecurityTrustHtml (both call sites:
 * barcode.page.ts and DatamatrixModalHandler.createBarcodeContainer).
 * Demonstrates that hostile payloads cannot survive into the trusted markup.
 */
import { renderBarcodeSvg, createBarcodeContainer, BarcodeTypes } from '../../barcode/components';

const XSS = 'window.__barcodeExecuted=true';

describe('[SAA-1630 PROBE] barcode user payload → trusted SVG chain', () => {
  beforeAll(() => {
    (window as any)['__barcodeExecuted'] = false;
  });

  it('qr payload containing an img-onerror vector yields no img/handler markup', () => {
    const svg = renderBarcodeSvg(`<img src=x onerror="${XSS}">`, { bcid: BarcodeTypes.qrcode });
    const lower = svg.toLowerCase();
    expect(lower).not.toContain('<img');
    expect(lower).not.toContain('onerror');
    expect(lower).not.toContain('<script');
    expect(lower).not.toContain('text'); // no text nodes, glyphs are paths
    const host = document.createElement('div');
    host.innerHTML = svg; // same parse path as [innerHTML]
    expect(host.querySelector('img')).toBeNull();
    expect((window as any)['__barcodeExecuted']).toBe(false);
  });

  it('datamatrix payload with angle-bracket script markup is encoded, never emitted as markup', () => {
    const svg = renderBarcodeSvg(`<script>${XSS}</script>`, { bcid: BarcodeTypes.datamatrix });
    const lower = svg.toLowerCase();
    expect(lower).not.toContain('<script');
    expect((window as any)['__barcodeExecuted']).toBe(false);
  });

  it('alttext option cannot smuggle markup into the output', () => {
    // quotes survive validation of the option (no angle brackets), but the
    // renderer emits glyph paths only; the validator rejects any text node.
    const svg = renderBarcodeSvg('ALT', { bcid: BarcodeTypes.qrcode, options: { alttext: `" onload="${XSS}` } });
    const lower = svg.toLowerCase();
    expect(lower).not.toContain('onload');
    expect(lower).not.toContain('<text');
  });

  it('createBarcodeContainer: hostile payload still yields a validated svg-only container', () => {
    const container = createBarcodeContainer(`<svg onload="${XSS}"><rect/></svg>`, { bcid: BarcodeTypes.datamatrix });
    // The payload is the ENCODED TEXT, not markup: either it encodes into
    // modules (validated svg output) or fails and returns undefined.
    if (container) {
      const lower = container.innerHTML.toLowerCase();
      expect(lower).not.toContain('onload');
      expect(lower.startsWith('<svg')).toBe(true);
      // container carries only the validated dimension style
      expect(container.getAttribute('style')).toMatch(/^width: \d+px; height: \d+px;$/);
    }
    expect((window as any)['__barcodeExecuted']).toBe(false);
  });

  it('outerHTML round-trip (DatamatrixModalHandler path) serializes without injecting attacker markup', () => {
    const container = createBarcodeContainer('(01)09501101530003', { bcid: BarcodeTypes.datamatrix });
    expect(container).toBeTruthy();
    const outer = container!.outerHTML;
    expect(outer.toLowerCase()).not.toContain('onerror');
    expect(outer.toLowerCase()).not.toContain('<script');
  });
});
