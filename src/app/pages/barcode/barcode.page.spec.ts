/**
 * @module for-angular/app/pages/barcode/barcode.page.spec
 * @summary SAA-1473 `/barcode` demo page contract.
 * @description Proves the page re-renders the SVG when the payload or the
 * symbology changes, clears the preview for an empty payload, and restores the
 * defaults through the reset control. `DomSanitizer` is wrapped so the spec can
 * assert on the generated SVG markup instead of the opaque `SafeHtml` wrapper.
 */
import type { Signal, WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DomSanitizer } from '@angular/platform-browser';
import { BarcodeTypes, type BarcodeType } from '@decaf-ts/for-angular/barcode';
import { BarcodePage } from './barcode.page';

interface RenderedBarcode {
  svg: string | null;
  error: boolean;
}

interface BarcodePageInternals {
  payload: WritableSignal<string>;
  symbology: WritableSignal<BarcodeType>;
  scale: WritableSignal<number>;
  rendered: Signal<RenderedBarcode>;
  onPayloadInput(event: Event): void;
  onSymbologyChange(event: Event): void;
  onScaleInput(event: Event): void;
  reset(): void;
}

function createPage(): BarcodePageInternals {
  return TestBed.runInInjectionContext(
    () => new BarcodePage()
  ) as unknown as BarcodePageInternals;
}

function inputEvent(value: string): Event {
  return { target: { value } } as unknown as Event;
}

describe('BarcodePage — preview rendering (SAA-1473)', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: DomSanitizer,
          useValue: { bypassSecurityTrustHtml: (value: string) => value },
        },
      ],
    });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('renders the default DataMatrix payload as SVG', () => {
    const page = createPage();

    expect(page.payload()).toBe('DECAF-1234-5678');
    expect(page.symbology()).toBe(BarcodeTypes.datamatrix);
    const rendered = page.rendered();
    expect(rendered.error).toBe(false);
    expect(rendered.svg).toContain('<svg');
  });

  it('re-renders the SVG when the payload changes', () => {
    const page = createPage();
    const initial = page.rendered().svg;

    page.onPayloadInput(inputEvent('NEW-PAYLOAD-0001'));

    expect(page.payload()).toBe('NEW-PAYLOAD-0001');
    expect(page.rendered().svg).toContain('<svg');
    expect(page.rendered().svg).not.toBe(initial);
  });

  it('re-renders the SVG when the symbology changes', () => {
    const page = createPage();
    const dataMatrix = page.rendered().svg;

    page.onSymbologyChange(inputEvent(BarcodeTypes.qrcode));

    expect(page.symbology()).toBe(BarcodeTypes.qrcode);
    expect(page.rendered().svg).toContain('<svg');
    expect(page.rendered().svg).not.toBe(dataMatrix);
  });

  it('clears the preview for an empty payload', () => {
    const page = createPage();

    page.onPayloadInput(inputEvent('   '));

    expect(page.rendered()).toEqual({ svg: null, error: false });
  });

  it('reflects the requested scale and restores the defaults on reset', () => {
    const page = createPage();
    const initial = page.rendered().svg;

    page.onScaleInput(inputEvent('8'));
    expect(page.scale()).toBe(8);
    expect(page.rendered().svg).not.toBe(initial);

    page.onPayloadInput(inputEvent('CHANGED'));
    page.onSymbologyChange(inputEvent(BarcodeTypes.gs1datamatrix));
    page.reset();

    expect(page.payload()).toBe('DECAF-1234-5678');
    expect(page.symbology()).toBe(BarcodeTypes.datamatrix);
    expect(page.scale()).toBe(4);
  });

  it('falls back to a scale of 1 when the range value is not numeric', () => {
    const page = createPage();

    page.onScaleInput(inputEvent('not-a-number'));

    expect(page.scale()).toBe(1);
  });
});
