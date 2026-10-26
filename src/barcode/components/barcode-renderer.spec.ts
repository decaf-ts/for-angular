import { ValidationError } from '@decaf-ts/db-decorators';
import {
  BarcodeType,
  BarcodeTypes,
  createBarcodeContainer,
  renderBarcodeSvg,
  validateBarcodeSvg,
} from './barcode-renderer';

const GS1_PAYLOAD = '(01)09501101530003(17)261231';
const PLAIN_PAYLOAD = 'https://example.test/barcode?batch=42';

const SYMBOLOGIES: BarcodeType[] = [
  BarcodeTypes.gs1datamatrix,
  BarcodeTypes.datamatrix,
  BarcodeTypes.qrcode,
];

const ALLOWED_SVG_ELEMENTS = new Set(['svg', 'defs', 'clippath', 'rect', 'path']);
const ALLOWED_SVG_ATTRIBUTES = new Set([
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
const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
const XMLNS_NAMESPACE = 'http://www.w3.org/2000/xmlns/';
const SVG_SCHEME_URI_PATTERN = /(?:javascript|vbscript|data)\s*:/i;
const SVG_TAG_PATTERN = /<\/?([a-zA-Z][\w:.-]*)/g;
const SVG_ATTRIBUTE_PATTERN = /\s([a-zA-Z_:][\w:.-]*)\s*=/g;

/**
 * Bypasses reported by the SAA-1501 security gate against the regex-based
 * validator. They target the HTML parser's view of the markup rather than the
 * textual token stream, so only a parsed-DOM oracle can prove they never reach
 * the sink.
 */
const PARSER_DIFFERENTIAL_POCS = [
  '<svg><path d="M0 0"onmouseover="alert(document.domain)"/></svg>',
  "<svg><path d='M0 0'onmouseover='alert(1)'/></svg>",
  '<svg><path d="M0 0"href="https://attacker.example/"/></svg>',
  '<svg><path d="M0 0"href="&#106;avascript:alert(document.domain)"/></svg>',
  '<svg><path d="&#106;avascript:alert(document.domain)"/></svg>',
  '<svg><path d="&#100;ata:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg=="/></svg>',
  '<svg></svg><svg></svg>',
  '<svg></svg>alert(1)<svg></svg>',
];

/** Payload fuzz corpus built from the SAA-1501 parser-differential constructs. */
const PARSER_DIFFERENTIAL_PAYLOADS = [
  '<svg><path d="M0 0"onmouseover="alert(1)"/></svg>',
  '"><svg><path d="M0 0"onmouseover="alert(1)"/></svg>',
  "' onload='alert(1)",
  'M0 0"onmouseover="alert(1)',
  '&#106;avascript:alert(document.domain)',
  '<svg></svg><svg></svg>',
  '<svg></svg>alert(1)<svg></svg>',
];

/** Option overrides that attempt the same constructs through encoder options. */
const PARSER_DIFFERENTIAL_OPTIONS: Array<Record<string, unknown>> = [
  { alttext: '"><path d="M0 0"onmouseover="alert(1)"/>' },
  { backgroundcolor: '"><path onmouseover="alert(1)"/>' },
  { textfont: "Arial' onload='alert(1)" },
  { barcolor: '&#106;avascript:alert(1)' },
  { rotate: 'N"><path onmouseover="alert(1)"/>' },
  { textxalign: 'center"onmouseover="alert(1)' },
];

const MALICIOUS_PAYLOADS = [
  '<script>alert(1)</script>',
  '"><script>alert(1)</script>',
  'onload=alert(1)',
  'javascript:alert(1)',
  'vbscript:msgbox(1)',
  'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==',
  '"double quotes"',
  "'single quotes'",
  'left < angle',
  'right > angle',
  'MiXeD<ScRiPt>CaSe</ScRiPt>',
  '<img src=x onerror=alert(1)>',
];

const MALICIOUS_OPTION_VALUES = [
  { backgroundcolor: '#ffffff" onload="alert(1)' },
  { backgroundcolor: 'javascript:alert(1)' },
  { backgroundcolor: '<script>alert(1)</script>' },
  { barcolor: '#ff0000" onload="alert(1)' },
  { barcolor: 'url(javascript:alert(1))' },
  { textcolor: '<script>alert(1)</script>' },
  { textcolor: '" onload="alert(1)' },
  { bordercolor: 'red;background:url(javascript:alert(1))' },
  { bordercolor: '<script>alert(1)</script>' },
  { textfont: '<script>alert(1)</script>' },
  { textfont: 'Arial;background:url(javascript:alert(1))' },
  { alttext: '<script>alert(1)</script>' },
  { alttext: '"><img src=x onerror=alert(1)>' },
  { foo: '<script>' },
  { rotate: 'X' },
  { rotate: '<script>' },
  { textxalign: 'middle' },
  { textyalign: '<script>' },
  { includetext: 'true' },
  { scale: 'not-a-number' },
  { scale: Number.NaN },
  { scale: Number.POSITIVE_INFINITY },
  { height: {} },
  { width: '12px' },
  { paddingwidth: '<script>' },
];

/**
 * Parser-oracle assertion for barcode output.
 *
 * Parses the markup with the same HTML sink semantics the application uses
 * (`DOMParser` -> `text/html`) and inspects the resulting DOM rather than the
 * source string. This is the assertion that closes the SAA-1501 parser
 * differential: an attribute that is only adjacent to a quoted value, or whose
 * scheme is entity-encoded in the source, still has to survive this walk.
 *
 * `xmlns` is the single tolerated namespaced attribute because the HTML parser
 * places it in the XMLNS namespace; every other namespaced attribute (for
 * example `xlink:href`) fails, and every attribute still has to be allowlisted.
 */
function expectSafeParsedSvg(svg: string): void {
  expect(typeof svg).toBe('string');

  const parsed = new DOMParser().parseFromString(svg, 'text/html');
  const roots = Array.from(parsed.body.children);
  expect(roots).toHaveLength(1);

  const root = roots[0];
  expect(root.namespaceURI).toBe(SVG_NAMESPACE);
  expect(root.localName.toLowerCase()).toBe('svg');

  const strayBodyNodes = Array.from(parsed.body.childNodes).filter(
    (node) =>
      node !== root &&
      !(node.nodeType === 3 && (node.textContent ?? '').trim().length === 0)
  );
  expect(strayBodyNodes).toHaveLength(0);

  const elements = [root, ...Array.from(root.querySelectorAll('*'))];
  expect(elements.length).toBeGreaterThan(0);

  for (const element of elements) {
    expect(element.namespaceURI).toBe(SVG_NAMESPACE);
    const elementName = element.localName.toLowerCase();
    expect(ALLOWED_SVG_ELEMENTS.has(elementName)).toBe(true);

    for (const attribute of Array.from(element.attributes)) {
      const attributeName = attribute.localName.toLowerCase();
      expect(attributeName.startsWith('on')).toBe(false);
      expect(ALLOWED_SVG_ATTRIBUTES.has(attributeName)).toBe(true);
      expect(SVG_SCHEME_URI_PATTERN.test(attribute.value)).toBe(false);

      if (attribute.namespaceURI !== null) {
        expect(attributeName).toBe('xmlns');
        expect(attribute.namespaceURI).toBe(XMLNS_NAMESPACE);
      }

      if (attributeName === 'xmlns') {
        expect(attribute.value).toBe(SVG_NAMESPACE);
      }
    }

    for (const child of Array.from(element.childNodes)) {
      if (child.nodeType === 3) {
        expect((child.textContent ?? '').trim()).toBe('');
      }
    }
  }
}

/**
 * Asserts the shared output contract from SAA-1459 F1 / SAA-1490.
 */
function expectSafeSvg(svg: string): void {
  expect(typeof svg).toBe('string');
  expect(svg).toMatch(/^<svg[\s\S]*<\/svg>$/);
  expect(svg).not.toMatch(/<script/i);
  expect(svg).not.toMatch(/(?:^|[\s/])on[a-z][\w:-]*\s*=/i);
  expect(svg).not.toMatch(/(?:javascript|vbscript|data)\s*:/i);
  expect(svg).not.toMatch(/\b(?:href|xlink:href)\s*=/i);

  const elements = Array.from(svg.matchAll(SVG_TAG_PATTERN), (match) =>
    match[1].toLowerCase()
  );
  expect(elements.length).toBeGreaterThan(0);
  for (const element of elements) {
    expect(ALLOWED_SVG_ELEMENTS.has(element)).toBe(true);
  }

  const attributes = Array.from(svg.matchAll(SVG_ATTRIBUTE_PATTERN), (match) =>
    match[1].toLowerCase()
  );
  for (const attribute of attributes) {
    expect(attribute.startsWith('on')).toBe(false);
    expect(attribute).not.toBe('href');
    expect(attribute).not.toBe('xlink:href');
  }

  expectSafeParsedSvg(svg);
}

function renderOrThrow(
  text: unknown,
  options?: unknown
): { markup?: string; error?: unknown } {
  try {
    return {
      markup: renderBarcodeSvg(text as string, options as never),
    };
  } catch (error) {
    return { error };
  }
}

describe('barcode-renderer', () => {
  describe('renderBarcodeSvg payload fuzzing', () => {
    it.each(MALICIOUS_PAYLOADS)(
      'never emits unsafe markup for datamatrix payload %j',
      (payload) => {
        const { markup, error } = renderOrThrow(payload, {
          bcid: BarcodeTypes.datamatrix,
        });

        if (error) {
          expect(error).toBeInstanceOf(ValidationError);
          expect(markup).toBeUndefined();
          return;
        }

        expectSafeSvg(markup as string);
      }
    );

    it.each(MALICIOUS_PAYLOADS)(
      'never emits unsafe markup for qrcode payload %j',
      (payload) => {
        const { markup, error } = renderOrThrow(payload, {
          bcid: BarcodeTypes.qrcode,
        });

        if (error) {
          expect(error).toBeInstanceOf(ValidationError);
          expect(markup).toBeUndefined();
          return;
        }

        expectSafeSvg(markup as string);
      }
    );

    it.each(MALICIOUS_PAYLOADS)(
      'rejects or safely encodes gs1datamatrix payload %j',
      (payload) => {
        const { markup, error } = renderOrThrow(payload, {
          bcid: BarcodeTypes.gs1datamatrix,
        });

        // GS1 DataMatrix is strict about its application-identifier grammar, so
        // arbitrary payloads are rejected by the encoder itself rather than by
        // the option/text validators. Either way no markup may be returned.
        if (error) {
          expect(markup).toBeUndefined();
          return;
        }

        expectSafeSvg(markup as string);
      }
    );

    it('renders a valid GS1 payload without echoing the payload as markup', () => {
      const markup = renderBarcodeSvg(GS1_PAYLOAD, {
        bcid: BarcodeTypes.gs1datamatrix,
      });

      expectSafeSvg(markup);
      expect(markup).not.toContain(GS1_PAYLOAD);
    });

    it('validates the real output for every supported symbology', () => {
      for (const bcid of SYMBOLOGIES) {
        const text = bcid === BarcodeTypes.gs1datamatrix ? GS1_PAYLOAD : PLAIN_PAYLOAD;
        const markup = renderBarcodeSvg(text, { bcid });

        expectSafeSvg(markup);
        expect(() => validateBarcodeSvg(markup)).not.toThrow();
      }
    });
  });

  describe('validateBarcodeSvg parser-differential PoCs (SAA-1501)', () => {
    it.each(PARSER_DIFFERENTIAL_POCS)('rejects %j', (svg) => {
      expect(() => validateBarcodeSvg(svg)).toThrow(ValidationError);
    });

    it('accepts a minimal safe svg through the parsed-DOM oracle', () => {
      const svg = '<svg><path d="M0 0"/></svg>';

      expect(validateBarcodeSvg(svg)).toBe(svg);
      expectSafeParsedSvg(svg);
    });
  });

  describe('renderBarcodeSvg parser-differential fuzzing (SAA-1501)', () => {
    for (const bcid of SYMBOLOGIES) {
      it.each(PARSER_DIFFERENTIAL_PAYLOADS)(
        `renders or rejects ${bcid} payload %j with only safe parsed DOM output`,
        (payload) => {
          const { markup, error } = renderOrThrow(payload, { bcid });

          if (error) {
            expect(markup).toBeUndefined();
            return;
          }

          expectSafeParsedSvg(markup as string);
        }
      );

      it.each(PARSER_DIFFERENTIAL_OPTIONS)(
        `renders or rejects ${bcid} option %j with only safe parsed DOM output`,
        (options) => {
          const text = bcid === BarcodeTypes.gs1datamatrix ? GS1_PAYLOAD : PLAIN_PAYLOAD;
          const { markup, error } = renderOrThrow(text, {
            bcid,
            options: options as never,
          });

          if (error) {
            expect(markup).toBeUndefined();
            return;
          }

          expectSafeParsedSvg(markup as string);
        }
      );
    }
  });

  describe('bounded options and payload length (F-3)', () => {
    it.each([
      ['a numeric 1e9', 1e9],
      ['the numeric string 1e9', '1000000000'],
      ['the exponential string 1e9', '1e9'],
    ])('rejects scale supplied as %s', (_name, scale) => {
      const { markup, error } = renderOrThrow(PLAIN_PAYLOAD, {
        options: { scale } as never,
      });

      expect(error).toBeInstanceOf(ValidationError);
      expect(markup).toBeUndefined();
    });

    it('rejects a payload longer than 4096 characters', () => {
      const { markup, error } = renderOrThrow('A'.repeat(4097), {
        bcid: BarcodeTypes.datamatrix,
      });

      expect(error).toBeInstanceOf(ValidationError);
      expect(markup).toBeUndefined();
    });

    it('still renders with an in-range scale', () => {
      const markup = renderBarcodeSvg(PLAIN_PAYLOAD, {
        bcid: BarcodeTypes.datamatrix,
        options: { scale: 4 } as never,
      });

      expectSafeSvg(markup);
      expect(markup).toContain('<path');
    });
  });

  describe('renderBarcodeSvg option fuzzing', () => {
    it.each(MALICIOUS_OPTION_VALUES)(
      'rejects dangerous option value %j with a ValidationError',
      (badOptions) => {
        const { markup, error } = renderOrThrow(PLAIN_PAYLOAD, {
          options: badOptions,
        });

        expect(error).toBeInstanceOf(ValidationError);
        expect(markup).toBeUndefined();
      }
    );

    it('throws ValidationError and returns no markup for every dangerous option', () => {
      for (const badOptions of MALICIOUS_OPTION_VALUES) {
        const { markup, error } = renderOrThrow(PLAIN_PAYLOAD, {
          options: badOptions,
        });

        expect(markup).toBeUndefined();
        expect(error).toBeInstanceOf(ValidationError);
      }
    });

    it('never leaks a malicious option marker verbatim into returned markup', () => {
      const marker = 'XSS_MARKER_9f3c2b';
      const maliciousOptions = [
        { alttext: `${marker}<script>` },
        { backgroundcolor: `${marker}" onload="alert(1)` },
        { textfont: `${marker};background:url(javascript:alert(1))` },
        { foo: marker },
      ];

      for (const options of maliciousOptions) {
        const { markup, error } = renderOrThrow(PLAIN_PAYLOAD, { options });

        expect(error).toBeInstanceOf(ValidationError);
        expect(markup).toBeUndefined();
        if (markup !== undefined) {
          expect(markup).not.toContain(marker);
          expect(markup).not.toMatch(/<script|onload\s*=|javascript:/i);
        }
      }
    });
  });

  describe('renderBarcodeSvg argument validation', () => {
    it.each(['code128', 'ean13', '<script>', 'DATAMATRIX', ''])(
      'rejects unsupported bcid %j',
      (bcid) => {
        const { markup, error } = renderOrThrow(PLAIN_PAYLOAD, { bcid });

        expect(error).toBeInstanceOf(ValidationError);
        expect(markup).toBeUndefined();
      }
    );

    it('defaults to datamatrix when bcid is omitted', () => {
      const markup = renderBarcodeSvg(PLAIN_PAYLOAD);

      expectSafeSvg(markup);
      expect(markup).toContain('<path');
    });

    it.each([[42], [null], [undefined], [{}], [[]], [true]])(
      'rejects non-string text %j',
      (text) => {
        const { markup, error } = renderOrThrow(text, {
          bcid: BarcodeTypes.qrcode,
        });

        expect(error).toBeInstanceOf(ValidationError);
        expect(markup).toBeUndefined();
      }
    );
  });

  describe('renderBarcodeSvg valid overrides', () => {
    const overrides: Array<Record<string, unknown>> = [
      { scale: 4 },
      { backgroundcolor: '#003366' },
      { barcolor: '123456', includetext: true },
      { rotate: 'R' },
      { textxalign: 'center' },
    ];

    for (const bcid of SYMBOLOGIES) {
      it.each(overrides)(`renders ${bcid} with %j`, (options) => {
        const text = bcid === BarcodeTypes.gs1datamatrix ? GS1_PAYLOAD : PLAIN_PAYLOAD;
        const markup = renderBarcodeSvg(text, { bcid, options: options as never });

        expectSafeSvg(markup);
        expect(markup.length).toBeGreaterThan(0);
      });
    }

    it('applies the background colour override to the rendered markup', () => {
      const markup = renderBarcodeSvg(PLAIN_PAYLOAD, {
        bcid: BarcodeTypes.datamatrix,
        options: { backgroundcolor: '#003366' },
      });

      expect(markup).toContain('#003366');
      expectSafeSvg(markup);
    });
  });

  describe('validateBarcodeSvg', () => {
    it('accepts real renderBarcodeSvg output', () => {
      const markup = renderBarcodeSvg(PLAIN_PAYLOAD, {
        bcid: BarcodeTypes.qrcode,
      });

      expect(validateBarcodeSvg(markup)).toBe(markup);
      expect(validateBarcodeSvg(`  ${markup}\n`)).toBe(markup);
    });

    it.each([
      ['a non-svg root', '<div>hello</div>'],
      ['an empty string', ''],
      ['a non-string value', 123 as unknown as string],
      ['markup outside the root element', '<svg></svg><script>alert(1)</script>'],
      ['a script element', '<svg><script>alert(1)</script></svg>'],
      ['an event-handler attribute', '<svg onload="alert(1)"></svg>'],
      ['a javascript URI', '<svg><path d="javascript:alert(1)" /></svg>'],
      ['a vbscript URI', '<svg><path d="vbscript:msgbox(1)" /></svg>'],
      ['a data URI', '<svg><path d="data:text/html,<script>alert(1)</script>" /></svg>'],
      ['a foreignObject element', '<svg><foreignObject></foreignObject></svg>'],
      ['an anchor element', '<svg><a href="https://example.test">x</a></svg>'],
      ['an href attribute', '<svg><path href="https://example.test" /></svg>'],
      ['an xlink:href attribute', '<svg><path xlink:href="https://example.test" /></svg>'],
      ['a style attribute', '<svg style="background:url(javascript:alert(1))"></svg>'],
      ['an unlisted element', '<svg><image /></svg>'],
      ['an unlisted attribute', '<svg><path data-x="1" /></svg>'],
    ])('rejects %s', (_name, svg) => {
      expect(() => validateBarcodeSvg(svg)).toThrow(ValidationError);
    });
  });

  describe('createBarcodeContainer', () => {
    let consoleErrorSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    });

    afterEach(() => {
      consoleErrorSpy.mockRestore();
    });

    it('returns an element whose innerHTML is validated SVG', () => {
      const container = createBarcodeContainer(PLAIN_PAYLOAD, {
        bcid: BarcodeTypes.datamatrix,
        width: '280px',
        height: '120',
      });

      expect(container).toBeInstanceOf(HTMLElement);
      expect(container?.innerHTML).toMatch(/^<svg[\s\S]*<\/svg>$/);
      expect(() => validateBarcodeSvg(container?.innerHTML ?? '')).not.toThrow();
      expectSafeSvg(container?.innerHTML ?? '');
      expect(container?.getAttribute('style')).toBe(
        'width: 280px; height: 120;'
      );
    });

    it('returns an element for a valid GS1 payload', () => {
      const container = createBarcodeContainer(GS1_PAYLOAD, {
        bcid: BarcodeTypes.gs1datamatrix,
      });

      expect(container).toBeInstanceOf(HTMLElement);
      expect(() => validateBarcodeSvg(container?.innerHTML ?? '')).not.toThrow();
    });

    it.each(SYMBOLOGIES)(
      'inherits the DOM-based validation for %s output',
      (bcid) => {
        const text = bcid === BarcodeTypes.gs1datamatrix ? GS1_PAYLOAD : PLAIN_PAYLOAD;
        const container = createBarcodeContainer(text, { bcid });

        expect(container).toBeInstanceOf(HTMLElement);
        expect(() => validateBarcodeSvg(container?.innerHTML ?? '')).not.toThrow();
        expectSafeParsedSvg(container?.innerHTML ?? '');
      }
    );

    it.each(PARSER_DIFFERENTIAL_POCS)(
      'never exposes the SAA-1501 PoC %j through the container',
      (payload) => {
        const container = createBarcodeContainer(payload, {
          bcid: BarcodeTypes.datamatrix,
        });

        if (container === undefined) {
          expect(consoleErrorSpy).toHaveBeenCalled();
          return;
        }

        expectSafeParsedSvg(container.innerHTML);
        expect(container.innerHTML).not.toMatch(SVG_SCHEME_URI_PATTERN);
      }
    );

    it.each(MALICIOUS_OPTION_VALUES)(
      'returns undefined when options are rejected (%j)',
      (badOptions) => {
        const container = createBarcodeContainer(PLAIN_PAYLOAD, {
          options: badOptions as never,
        });

        expect(container).toBeUndefined();
        expect(consoleErrorSpy).toHaveBeenCalled();
      }
    );

    it.each([
      '280px; background: url(javascript:alert(1))',
      'auto',
      '12rem',
      '123456',
      '<script>',
      '280 px',
    ])('still throws ValidationError for invalid width %j', (width) => {
      expect(() =>
        createBarcodeContainer(PLAIN_PAYLOAD, { width })
      ).toThrow(ValidationError);
    });

    it.each([
      '280px; background: url(javascript:alert(1))',
      'auto',
      '12rem',
      '123456',
      '<script>',
      '280 px',
    ])('still throws ValidationError for invalid height %j', (height) => {
      expect(() =>
        createBarcodeContainer(PLAIN_PAYLOAD, { height })
      ).toThrow(ValidationError);
    });
  });
});
