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
 * SVG element names permitted in validated barcode output.
 *
 * Barcode rendering only needs vector shapes, so any element outside this set
 * (including `script`, `foreignObject`, `image`, and `a`) is rejected.
 *
 * @internal
 */
const ALLOWED_BARCODE_SVG_ELEMENTS = new Set([
  'svg',
  'defs',
  'clippath',
  'rect',
  'path',
]);

/**
 * SVG attribute names permitted in validated barcode output.
 *
 * Presentation attributes are allowlisted explicitly; event handlers, `style`,
 * `href`, and `xlink:href` are intentionally absent so they can never reach
 * markup bound through `[innerHTML]`.
 *
 * @internal
 */
const ALLOWED_BARCODE_SVG_ATTRIBUTES = new Set([
  'viewbox',
  'xmlns',
  'width',
  'height',
  'fill',
  'd',
  'fill-rule',
  'stroke',
  'stroke-width',
  'stroke-linecap',
  'stroke-linejoin',
  'transform',
  'clip-path',
  'clip-rule',
  'id',
  'opacity',
]);

/**
 * Cheap shape pre-check: matches markup whose entire content is a single
 * `<svg>` root element.
 *
 * This is not the security boundary; it rejects obviously malformed input
 * before {@link validateBarcodeSvg} parses the markup into a DOM tree.
 *
 * @internal
 */
const BARCODE_SVG_ROOT_PATTERN = /^<svg[\s\S]*<\/svg>$/;
/**
 * The SVG namespace every validated element must belong to.
 * @internal
 */
const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
/**
 * Matches a `javascript:`, `vbscript:`, or `data:` scheme URI in an attribute
 * value.
 *
 * {@link validateBarcodeSvg} tests the DOM-parsed attribute values, so
 * entity-encoded schemes are inspected after decoding.
 *
 * @internal
 */
const BARCODE_SCHEME_URI_PATTERN = /(?:javascript|vbscript|data)\s*:/i;

/**
 * Rendering options validated as finite numbers (or numeric strings).
 * @internal
 */
const NUMERIC_BARCODE_OPTIONS = new Set([
  'scale',
  'scaleX',
  'scaleY',
  'height',
  'width',
  'padding',
  'paddingwidth',
  'paddingheight',
  'paddingtop',
  'paddingleft',
  'paddingright',
  'paddingbottom',
  'textsize',
  'textgaps',
  'textxoffset',
  'textyoffset',
  'borderwidth',
  'borderleft',
  'borderright',
  'bordertop',
  'borderbottom',
  'addontextxoffset',
  'addontextyoffset',
  'addontextsize',
  'guardwidth',
  'guardheight',
  'guardleftpos',
  'guardrightpos',
  'guardleftypos',
  'guardrightypos',
  'inkspread',
  'inkspreadh',
  'inkspreadv',
  'sizelimit',
]);

/**
 * Rendering options validated as booleans.
 * @internal
 */
const BOOLEAN_BARCODE_OPTIONS = new Set([
  'includeBarcodeText',
  'includecheck',
  'includecheckintext',
  'includetext',
  'parse',
  'parsefnc',
  'dotty',
  'binarytext',
  'showborder',
  'guardwhitespace',
  'monochrome',
]);

/**
 * Rendering options validated as hexadecimal colours.
 * @internal
 */
const COLOR_BARCODE_OPTIONS = new Set([
  'backgroundcolor',
  'barcolor',
  'textcolor',
  'bordercolor',
]);

/**
 * Rendering options restricted to a fixed set of values, keyed by option name.
 * @internal
 */
const ENUM_BARCODE_OPTIONS: Record<string, readonly string[]> = {
  textxalign: ['offleft', 'left', 'center', 'right', 'offright', 'justify'],
  textyalign: ['below', 'center', 'above'],
  rotate: ['N', 'R', 'L', 'I'],
};

/**
 * Rendering options validated as font names.
 * @internal
 */
const FONT_BARCODE_OPTIONS = new Set(['textfont', 'addontextfont']);
/**
 * Rendering options validated as bounded plain text.
 * @internal
 */
const TEXT_BARCODE_OPTIONS = new Set(['alttext']);

/**
 * Matches a plain decimal number, optionally negative and fractional.
 * @internal
 */
const BARCODE_NUMBER_PATTERN = /^-?\d+(?:\.\d+)?$/;
/**
 * Matches a three-, six-, or eight-digit hexadecimal colour with an optional
 * leading `#`.
 * @internal
 */
const BARCODE_COLOR_PATTERN = /^#?(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
/**
 * Matches a short font name made of letters, digits, spaces, and a few safe
 * punctuation characters.
 * @internal
 */
const BARCODE_FONT_PATTERN = /^[A-Za-z0-9 _.,+-]{1,64}$/;
/**
 * Matches bounded text that contains no angle brackets.
 * @internal
 */
const BARCODE_TEXT_PATTERN = /^[^<>]{0,1024}$/;
/**
 * Maximum accepted payload length for {@link renderBarcodeSvg}; covers the
 * largest supported symbologies while bounding per-render work.
 * @internal
 */
const MAX_BARCODE_TEXT_LENGTH = 4096;
/**
 * Default inclusive range for numeric rendering options.
 * @internal
 */
const DEFAULT_BARCODE_NUMERIC_RANGE: readonly [number, number] = [-10000, 10000];
/**
 * Per-option inclusive ranges that keep rendering work bounded.
 * @internal
 */
const BARCODE_NUMERIC_RANGES: Record<string, readonly [number, number]> = {
  scale: [0.01, 100],
  scaleX: [0.01, 100],
  scaleY: [0.01, 100],
  height: [1, 10000],
  width: [1, 10000],
  textsize: [0, 1000],
  addontextsize: [0, 1000],
  padding: [0, 1000],
  paddingwidth: [0, 1000],
  paddingheight: [0, 1000],
  paddingtop: [0, 1000],
  paddingleft: [0, 1000],
  paddingright: [0, 1000],
  paddingbottom: [0, 1000],
  borderwidth: [0, 1000],
  borderleft: [0, 1000],
  borderright: [0, 1000],
  bordertop: [0, 1000],
  borderbottom: [0, 1000],
};

/**
 * @description Validates barcode SVG markup before it is trusted in the DOM.
 * @summary Parses the trimmed markup with
 * `new DOMParser().parseFromString(markup, 'text/html')` -- the same
 * `text/html` parsing path the `innerHTML` and `[innerHTML]` sinks use -- so
 * validation inspects the tree the browser will actually build. The parsed body
 * must contain exactly one `<svg>` root element in the SVG namespace
 * (`http://www.w3.org/2000/svg`).
 *
 * The DOM walk then enforces two allowlists: elements are limited to the
 * vector primitives the encoder emits (`svg`, `defs`, `clippath`, `rect`, and
 * `path`), and attributes to `viewBox`, `xmlns`, `width`, `height`, `fill`,
 * `d`, `fill-rule`, `stroke`, `stroke-width`, `stroke-linecap`,
 * `stroke-linejoin`, `transform`, `clip-path`, `clip-rule`, `id`, and
 * `opacity`. A supplied `xmlns` must declare the SVG namespace
 * (`http://www.w3.org/2000/svg`). Any non-allowlisted or non-SVG-namespace
 * element is rejected, as are non-allowlisted attributes, namespaced
 * attributes such as `xmlns:xlink` and `xlink:href`, `on*` event-handler
 * attributes, and `style`, `href`, and `data-*` attributes. Every non-`xmlns`
 * attribute value is also checked for decoded `javascript:`, `vbscript:`, and
 * `data:` scheme URIs. Non-whitespace text nodes, comments, CDATA sections,
 * processing instructions, and document-type nodes are rejected;
 * whitespace-only text nodes are tolerated.
 *
 * Validation fails closed: when `DOMParser` is unavailable (for example in a
 * non-browser runtime), the function throws instead of returning unvalidated
 * markup. The input is trimmed before validation and the trimmed markup is
 * returned unchanged; unsafe markup is rejected rather than repaired. Because
 * the result has been checked here, callers can hand it to
 * `DomSanitizer.bypassSecurityTrustHtml` and bind it through `[innerHTML]`.
 *
 * @param {string} svg - SVG markup to validate, typically produced by
 * `@bwip-js/browser`.
 * @returns {string} The trimmed, validated SVG markup.
 * @throws {ValidationError} When the value is not a string, is empty, is not a
 * single SVG-namespace `<svg>` root, contains a disallowed or non-SVG-namespace
 * element, a disallowed, namespaced, or `on*` attribute, an `xmlns` value that
 * is not the SVG namespace, or a scheme URI, or contains a non-whitespace text
 * node, comment, CDATA section, processing instruction, or document-type node.
 * Also thrown when `DOMParser` is not available.
 * @function validateBarcodeSvg
 * @example
 * const svg = validateBarcodeSvg(renderBarcodeSvg('(01)09501101530003'));
 * container.innerHTML = svg;
 */
export function validateBarcodeSvg(svg: string): string {
  const markup = typeof svg === 'string' ? svg.trim() : '';
  if (!BARCODE_SVG_ROOT_PATTERN.test(markup)) {
    throw new ValidationError(
      'Invalid barcode output: expected a single <svg> root element.'
    );
  }
  if (typeof DOMParser === 'undefined') {
    throw new ValidationError(
      'Invalid barcode output: a DOM parser is required to validate markup.'
    );
  }

  const parsed = new DOMParser().parseFromString(markup, 'text/html');
  const roots = Array.from(parsed.body.children);
  if (
    roots.length !== 1 ||
    roots[0].namespaceURI !== SVG_NAMESPACE ||
    roots[0].localName.toLowerCase() !== 'svg'
  ) {
    throw new ValidationError(
      'Invalid barcode output: expected exactly one <svg> root element.'
    );
  }

  const reject = (reason: string): never => {
    throw new ValidationError(`Invalid barcode output: ${reason}`);
  };

  const visit = (node: Node): void => {
    switch (node.nodeType) {
      case 1: {
        const element = node as Element;
        if (element.namespaceURI !== SVG_NAMESPACE) {
          reject(`<${element.localName}> elements are not allowed.`);
        }
        const elementName = element.localName.toLowerCase();
        if (!ALLOWED_BARCODE_SVG_ELEMENTS.has(elementName)) {
          reject(`<${elementName}> elements are not allowed.`);
        }
        for (const attribute of Array.from(element.attributes)) {
          const attributeName = attribute.name.toLowerCase();
          if (attributeName === 'xmlns') {
            if (attribute.value !== SVG_NAMESPACE) {
              reject(`'xmlns' must declare the SVG namespace.`);
            }
            continue;
          }
          if (
            attribute.namespaceURI !== null ||
            !ALLOWED_BARCODE_SVG_ATTRIBUTES.has(attribute.localName.toLowerCase())
          ) {
            reject(`'${attributeName}' attributes are not allowed.`);
          }
          if (BARCODE_SCHEME_URI_PATTERN.test(attribute.value)) {
            reject('scheme URIs are not allowed.');
          }
        }
        for (const child of Array.from(node.childNodes)) {
          visit(child);
        }
        break;
      }
      case 3:
        if ((node.textContent ?? '').trim().length > 0) {
          reject('text content is not allowed.');
        }
        break;
      case 4:
      case 7:
      case 8:
      case 10:
        reject('comments, CDATA, and processing instructions are not allowed.');
        break;
      default:
        break;
    }
  };

  for (const child of Array.from(parsed.body.childNodes)) {
    visit(child);
  }

  return markup;
}

/**
 * @description Validates one barcode rendering override against its allowlisted
 * type and numeric bounds.
 * @summary Looks the key up in the numeric, boolean, colour, font, text, or
 * enumerated option sets and coerces or rejects the value accordingly.
 *
 * - Numeric options accept a finite number or a numeric string and are coerced
 *   to numbers. `scale`, `scaleX`, and `scaleY` must fall within `[0.01, 100]`;
 *   `height` and `width` within `[1, 10000]`; `textsize`, `addontextsize`, and
 *   the `padding*`, `borderwidth`, and `border*` options within `[0, 1000]`.
 *   Every other numeric option (`textgaps`, offsets, guards, ink spread, and
 *   `sizelimit`) uses the default inclusive range `[-10000, 10000]`.
 * - Boolean options require a real boolean.
 * - Colour options require a three-, six-, or eight-digit hexadecimal colour
 *   with an optional leading `#`.
 * - Font options require a short font name of at most 64 safe characters.
 * - `alttext` accepts at most 1024 characters and must not contain angle
 *   brackets.
 * - Enumerated options must match one of their declared values.
 *
 * Unknown keys are rejected so caller-supplied overrides cannot reach
 * `@bwip-js/browser` unvalidated.
 *
 * @param {string} key - Option name supplied through
 * {@link BarcodeRenderOptions.options}.
 * @param {unknown} value - Candidate value for that option.
 * @returns {string|number|boolean} The validated value, with numeric strings
 * coerced to numbers.
 * @throws {ValidationError} When the key is not allowlisted, the value does not
 * match the type declared for that key, or a numeric value falls outside its
 * inclusive range.
 * @function validateBarcodeOption
 * @internal
 */
function validateBarcodeOption(key: string, value: unknown): string | number | boolean {
  if (NUMERIC_BARCODE_OPTIONS.has(key)) {
    let numericValue: number | undefined;
    if (typeof value === 'number' && Number.isFinite(value)) {
      numericValue = value;
    } else if (typeof value === 'string' && BARCODE_NUMBER_PATTERN.test(value)) {
      numericValue = Number(value);
    }
    if (numericValue === undefined) {
      throw new ValidationError(
        `Invalid barcode option '${key}': expected a finite number.`
      );
    }
    const [min, max] = BARCODE_NUMERIC_RANGES[key] ?? DEFAULT_BARCODE_NUMERIC_RANGE;
    if (numericValue < min || numericValue > max) {
      throw new ValidationError(
        `Invalid barcode option '${key}': expected a number between ${min} and ${max}.`
      );
    }
    return numericValue;
  }
  if (BOOLEAN_BARCODE_OPTIONS.has(key)) {
    if (typeof value === 'boolean') {
      return value;
    }
    throw new ValidationError(`Invalid barcode option '${key}': expected a boolean.`);
  }
  if (COLOR_BARCODE_OPTIONS.has(key)) {
    if (typeof value === 'string' && BARCODE_COLOR_PATTERN.test(value)) {
      return value;
    }
    throw new ValidationError(
      `Invalid barcode option '${key}': expected a hexadecimal colour.`
    );
  }
  if (FONT_BARCODE_OPTIONS.has(key)) {
    if (typeof value === 'string' && BARCODE_FONT_PATTERN.test(value)) {
      return value;
    }
    throw new ValidationError(`Invalid barcode option '${key}': expected a font name.`);
  }
  if (TEXT_BARCODE_OPTIONS.has(key)) {
    if (typeof value === 'string' && BARCODE_TEXT_PATTERN.test(value)) {
      return value;
    }
    throw new ValidationError(
      `Invalid barcode option '${key}': expected bounded text without angle brackets.`
    );
  }
  const allowedValues = ENUM_BARCODE_OPTIONS[key];
  if (allowedValues) {
    if (typeof value === 'string' && allowedValues.includes(value)) {
      return value;
    }
    throw new ValidationError(
      `Invalid barcode option '${key}': expected one of ${allowedValues.join(', ')}.`
    );
  }
  throw new ValidationError(`Invalid barcode option '${key}': option is not allowed.`);
}

/**
 * @description Validates a set of barcode rendering overrides.
 * @summary Iterates the supplied overrides, skips `undefined` values, and
 * returns a new object containing only validated entries. Each entry is checked
 * by {@link validateBarcodeOption}, so the per-option numeric ranges, the
 * boolean, colour, font, text, and enumerated rules, and unknown-key rejection
 * all apply. Building a fresh object keeps unvalidated keys out of the options
 * spread that reaches `@bwip-js/browser`.
 *
 * @param {Partial<BwippOptions>} [options] - Overrides from
 * {@link BarcodeRenderOptions.options}; omitted values are skipped.
 * @returns {Partial<BwippOptions>} A new object with the validated overrides,
 * empty when `options` is omitted.
 * @throws {ValidationError} When a supplied option key is not allowlisted, its
 * value does not match the declared type, or a numeric value is outside its
 * inclusive range.
 * @function validateBarcodeOptions
 * @internal
 */
function validateBarcodeOptions(
  options: Partial<BwippOptions> | undefined
): Partial<BwippOptions> {
  if (!options) {
    return {};
  }
  const validated: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(options)) {
    if (value === undefined) {
      continue;
    }
    validated[key] = validateBarcodeOption(key, value);
  }
  return validated as Partial<BwippOptions>;
}

/**
 * @description Renders a barcode payload to validated SVG markup.
 * @summary Encodes `text` with `@bwip-js/browser` for the requested symbology,
 * merges the validated overrides onto {@link DEFAULT_BARCODE_OPTIONS}, and runs
 * the encoder output through {@link validateBarcodeSvg}. Overrides are checked
 * by {@link validateBarcodeOptions}, so unknown keys are rejected, numeric
 * options are range-bounded, and only validated values reach the encoder.
 *
 * `text` is capped at 4096 characters (the `MAX_BARCODE_TEXT_LENGTH` payload
 * limit) to bound per-render work, and `bcid` must be an own key of
 * {@link BarcodeTypes}. The returned markup is therefore safe to trust for
 * `[innerHTML]` binding through an Angular sanitizer bypass.
 *
 * @param {string} text - The encoded payload; at most 4096 characters.
 * @param {BarcodeRenderOptions} [options={}] - Symbology and rendering
 * overrides; `bcid` defaults to `datamatrix`.
 * @returns {string} The trimmed, validated SVG markup.
 * @throws {ValidationError} When `text` is not a string or exceeds 4096
 * characters, `bcid` is not a supported symbology, an override is not
 * allowlisted, has the wrong type, or falls outside its numeric range, or the
 * encoder output fails {@link validateBarcodeSvg}.
 * @function renderBarcodeSvg
 * @example
 * const svg = renderBarcodeSvg('https://example.test/item/42', {
 *   bcid: BarcodeTypes.qrcode,
 *   options: { scale: 6, backgroundcolor: '#ffffff' },
 * });
 */
export function renderBarcodeSvg(text: string, options: BarcodeRenderOptions = {}): string {
  const { bcid = BarcodeTypes.datamatrix, options: overrides } = options;
  if (typeof text !== 'string') {
    throw new ValidationError('Invalid barcode text: expected a string.');
  }
  if (text.length > MAX_BARCODE_TEXT_LENGTH) {
    throw new ValidationError(
      `Invalid barcode text: expected at most ${MAX_BARCODE_TEXT_LENGTH} characters.`
    );
  }
  if (!Object.prototype.hasOwnProperty.call(BarcodeTypes, bcid)) {
    throw new ValidationError(`Invalid barcode symbology '${bcid}'.`);
  }
  return validateBarcodeSvg(
    BwipJs.toSVG({
      ...DEFAULT_BARCODE_OPTIONS,
      ...validateBarcodeOptions(overrides),
      text,
      bcid,
    })
  );
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
 * `ValidationError` instead of being injected into the DOM. The contained SVG
 * is produced by `@bwip-js/browser` and checked by {@link validateBarcodeSvg}
 * before it is assigned through `innerHTML`.
 *
 * @param text - The encoded payload.
 * @param options - Symbology, sizing and rendering overrides.
 * @returns A container element with the SVG markup, or `undefined` when the
 * payload cannot be encoded or its options fail validation.
 * @throws {ValidationError} When `width` or `height` is not a bounded numeric
 * dimension.
 * @function createBarcodeContainer
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
