/**
 * @module barcode/barcode-renderer
 * @description Framework-agnostic barcode rendering helpers.
 * @summary Renders GS1 DataMatrix, DataMatrix and QR payloads to SVG markup with
 * `@bwip-js/browser`. The helpers intentionally carry no Angular or Decaf model
 * dependency so they can be consumed from any host, including the app handlers
 * shipped in this repository.
 */

import BwipJs, { BwippOptions } from '@bwip-js/browser';
import { ValidationError } from '@decaf-ts/db-decorators';

/** Supported barcode symbologies. */
export const BarcodeTypes = {
  gs1datamatrix: 'gs1datamatrix',
  datamatrix: 'datamatrix',
  qrcode: 'qrcode',
} as const;

/** A supported barcode symbology name. */
export type BarcodeType = keyof typeof BarcodeTypes;

/** Default rendering options shared by the supported symbologies. */
export const DEFAULT_BARCODE_OPTIONS = {
  text: '',
  includeBarcodeText: true,
  scale: 4,
  height: 16,
  textxalign: 'center',
  textyalign: 'center',
  backgroundcolor: 'ffffff',
  paddingwidth: 4,
  paddingheight: 4,
} as const;

/** Options accepted by {@link renderBarcodeSvg} and {@link createBarcodeContainer}. */
export interface BarcodeRenderOptions {
  /** Symbology to render. Defaults to `datamatrix`. */
  bcid?: BarcodeType;
  /** Overrides merged onto {@link DEFAULT_BARCODE_OPTIONS}. */
  options?: Partial<BwippOptions>;
}

/**
 * Renders a barcode payload to SVG markup.
 * @param text - The encoded payload.
 * @param options - Symbology and rendering overrides.
 * @returns The rendered SVG markup.
 */
export function renderBarcodeSvg(text: string, options: BarcodeRenderOptions = {}): string {
  const { bcid = BarcodeTypes.datamatrix, options: overrides } = options;
  return BwipJs.toSVG({
    ...DEFAULT_BARCODE_OPTIONS,
    ...overrides,
    text,
    bcid,
  });
}

/**
 * Accepted CSS dimension shape for {@link createBarcodeContainer}: up to five
 * digits with an optional `px` suffix, so no arbitrary CSS can reach the
 * container's `style` attribute.
 *
 * @internal
 */
const BARCODE_DIMENSION_PATTERN = /^\d{1,5}(px)?$/;

/**
 * Validates one {@link createBarcodeContainer} dimension before it is written
 * into the container's `style` attribute.
 *
 * @param value - Caller-supplied width or height.
 * @param name - Dimension name used in the validation message.
 * @returns The validated dimension unchanged.
 * @throws {ValidationError} When the value is not a numeric CSS dimension.
 * @internal
 */
function validateBarcodeDimension(
  value: string,
  name: 'width' | 'height'
): string {
  if (!BARCODE_DIMENSION_PATTERN.test(value)) {
    throw new ValidationError(
      `Invalid barcode ${name} '${value}': expected a number of at most five digits, optionally suffixed with 'px'.`
    );
  }
  return value;
}

/**
 * Creates a detached element containing the rendered barcode.
 *
 * `width` and `height` are validated against a bounded numeric pattern before
 * they are interpolated into the `style` attribute; invalid values throw a
 * `ValidationError` instead of being injected into the DOM. The returned
 * container's SVG comes from `@bwip-js/browser` and is trusted markup.
 *
 * @param text - The encoded payload.
 * @param options - Symbology, sizing and rendering overrides.
 * @returns A container element with the SVG markup, or `undefined` when the
 * payload cannot be encoded.
 * @throws {ValidationError} When `width` or `height` is not a bounded numeric
 * dimension.
 */
export function createBarcodeContainer(
  text: string,
  options: BarcodeRenderOptions & { width?: string; height?: string } = {}
): HTMLElement | undefined {
  const { width = '280px', height = '280px', ...renderOptions } = options;
  const validatedWidth = validateBarcodeDimension(width, 'width');
  const validatedHeight = validateBarcodeDimension(height, 'height');
  const container = document.createElement('div');
  container.setAttribute(
    'style',
    `width: ${validatedWidth}; height: ${validatedHeight};`
  );

  try {
    container.innerHTML = renderBarcodeSvg(text, renderOptions);
  } catch (error) {
    console.error('Invalid barcode data supplied:', error);
    return undefined;
  }

  return container;
}
