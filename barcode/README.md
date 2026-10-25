# `@decaf-ts/for-angular/barcode`

Framework-agnostic barcode helpers backed by `@bwip-js/browser`. This entry
point has no Angular component and no Decaf model dependency: it renders GS1
DataMatrix, DataMatrix and QR payloads to SVG markup so any host (Angular,
Fabric canvas, print pipeline) can use the same encoder.

## Install

```bash
npm install @decaf-ts/for-angular @bwip-js/browser@^4.11.4
```

`@bwip-js/browser` is an **optional peer dependency** of
`@decaf-ts/for-angular`. Install it only in applications that import
`/barcode`.

### Compatibility

| Package | Tested range |
| --- | --- |
| `@bwip-js/browser` | `^4.11.4` (optional peer) |
| `@decaf-ts/for-angular` | `1.0.x` |

`@bwip-js/browser` is MIT-licensed; see the package `NOTICE`.

### Bare-host / non-Angular install

A plain `npm install @decaf-ts/for-angular` in a truly empty directory can fail
with `ERESOLVE` because npm 11 auto-installs the optional `@angular/cdk` peer,
floats Angular to 22 and collides with this package's `^21.2.17` anchor. That is
an npm optional-peer resolution artifact, not a manifest defect. For a scratch or
non-Angular host use `npm install @decaf-ts/for-angular --legacy-peer-deps`; the
fallback is the supported scratch-host contract for every entry point in this
package (see [`/kanban`](../kanban/README.md) for the full explanation).

## Usage

```ts
import {
  BarcodeTypes,
  renderBarcodeSvg,
  type BarcodeRenderOptions,
} from '@decaf-ts/for-angular/barcode';

const options: BarcodeRenderOptions = {
  bcid: BarcodeTypes.gs1datamatrix,
  options: { scale: 4, height: 16 },
};

const svg = renderBarcodeSvg('(01)09501101530003(17)261231', options);
document.querySelector('#barcode')!.innerHTML = svg;
```

For a ready-made detached element (browser only):

```ts
import { createBarcodeContainer } from '@decaf-ts/for-angular/barcode';

const container = createBarcodeContainer('(01)09501101530003', {
  bcid: 'gs1datamatrix',
  width: '280px',
  height: '280px',
});
if (container) {
  target.replaceChildren(container);
}
```

## Options

`options` overrides are merged onto `DEFAULT_BARCODE_OPTIONS` and validated key
by key before rendering. A key outside the allowlist below — or a value that
does not match the expected shape — throws a `ValidationError`; keys set to
`undefined` are ignored.

| Category | Keys | Accepted values |
| --- | --- | --- |
| Numeric | `scale`, `scaleX`, `scaleY`, `height`, `width`, `padding`, `paddingwidth`, `paddingheight`, `paddingtop`, `paddingleft`, `paddingright`, `paddingbottom`, `textsize`, `textgaps`, `textxoffset`, `textyoffset`, `borderwidth`, `borderleft`, `borderright`, `bordertop`, `borderbottom`, `addontextxoffset`, `addontextyoffset`, `addontextsize`, `guardwidth`, `guardheight`, `guardleftpos`, `guardrightpos`, `guardleftypos`, `guardrightypos`, `inkspread`, `inkspreadh`, `inkspreadv`, `sizelimit` | Finite number, or a string matching `-?\d+(\.\d+)?` (coerced to a number), within its inclusive range (see below) |
| Boolean | `includeBarcodeText`, `includecheck`, `includecheckintext`, `includetext`, `parse`, `parsefnc`, `dotty`, `binarytext`, `showborder`, `guardwhitespace`, `monochrome` | `true` / `false` |
| Hex colour | `backgroundcolor`, `barcolor`, `textcolor`, `bordercolor` | 3, 6 or 8 hex digits with an optional leading `#` |
| Font | `textfont`, `addontextfont` | 1–64 characters of letters, digits, spaces and `_.,+-` |
| Enum | `textxalign`, `textyalign`, `rotate` | `textxalign`: `offleft`, `left`, `center`, `right`, `offright`, `justify` — `textyalign`: `below`, `center`, `above` — `rotate`: `N`, `R`, `L`, `I` |
| Bounded text | `alttext` | At most 1024 characters with no angle brackets |

Numeric options are range-bounded. A value outside its inclusive range —
whether supplied as a number or as a coerced numeric string — throws a
`ValidationError`:

| Inclusive range | Keys |
| --- | --- |
| `0.01`–`100` | `scale`, `scaleX`, `scaleY` |
| `1`–`10000` | `width`, `height` |
| `0`–`1000` | `padding`, `paddingwidth`, `paddingheight`, `paddingtop`, `paddingleft`, `paddingright`, `paddingbottom`, `textsize`, `addontextsize`, `borderwidth`, `borderleft`, `borderright`, `bordertop`, `borderbottom` |
| `-10000`–`10000` | every other numeric key: `textgaps`, `textxoffset`, `textyoffset`, `addontextxoffset`, `addontextyoffset`, `guardwidth`, `guardheight`, `guardleftpos`, `guardrightpos`, `guardleftypos`, `guardrightypos`, `inkspread`, `inkspreadh`, `inkspreadv`, `sizelimit` |

The arguments are validated as well: `text` must be a string of at most 4096
characters and `bcid` must be one of the `BarcodeTypes` keys (exact case);
anything else — or a numeric option outside its inclusive range — throws a
`ValidationError`.

## Safe output

Barcode SVG is typically injected through Angular's
`DomSanitizer.bypassSecurityTrustHtml` (or raw `innerHTML`), which disables
sanitization. This entry point therefore validates its own output centrally
before returning it:

- `renderBarcodeSvg` runs every result through `validateBarcodeSvg` before
  returning it.
- `createBarcodeContainer` goes through `renderBarcodeSvg`, so its `innerHTML`
  is validated markup too.

`validateBarcodeSvg(svg)` is DOM-parser based: the trimmed markup is parsed
with `DOMParser.parseFromString(markup, 'text/html')` — the same parsing path
the `innerHTML`/`[innerHTML]` sinks use — so validation inspects the tree the
browser will actually build. The parsed body must contain exactly one root
element, an `<svg>` in the SVG namespace (`http://www.w3.org/2000/svg`), and
the DOM walk then enforces:

- **Elements** are limited to what `@bwip-js/browser` emits: `svg`, `defs`,
  `clipPath`, `rect` and `path`. Every element must belong to the SVG
  namespace; anything else (including `<script>`) is rejected.
- **Attributes** are limited to `viewBox`, `xmlns`, `width`, `height`,
  `fill`, `d`, `fill-rule`, `stroke`, `stroke-width`, `stroke-linecap`,
  `stroke-linejoin`, `transform`, `clip-path`, `clip-rule`, `id` and
  `opacity`. Namespaced attributes such as `xmlns:xlink` and `xlink:href`
  are rejected, as are `on*` event handlers and `style`, `href` or `data-*`
  attributes; a supplied `xmlns` must declare the SVG namespace. Every other
  attribute value is checked for entity-decoded
  `javascript:`/`vbscript:`/`data:` scheme URIs.
- **Text and non-element nodes** are rejected: non-whitespace text nodes,
  comments, CDATA sections, processing instructions and document-type nodes
  all throw; whitespace-only text is tolerated.

On violation it throws a `ValidationError`; otherwise it returns the trimmed
markup. Validation fails closed: when no `DOMParser` is available in the
runtime, it throws instead of returning unvalidated markup.

If a host renders or transforms barcode markup by other means, it must pass
the final string through `validateBarcodeSvg` before trusting it as HTML.

## API

| Export | Purpose |
| --- | --- |
| `BarcodeTypes` | Supported symbologies: `gs1datamatrix`, `datamatrix`, `qrcode`. |
| `BarcodeType` | Union of the supported symbology names. |
| `DEFAULT_BARCODE_OPTIONS` | Baseline `@bwip-js/browser` options (scale, padding, text alignment, background). |
| `BarcodeRenderOptions` | `{ bcid?, options? }` accepted by both helpers; `options` overrides are validated against the allowlist (see [Options](#options)). |
| `renderBarcodeSvg(text, options?)` | Returns SVG markup for the payload. Defaults to `datamatrix`; the result is validated against the output allowlist (see [Safe output](#safe-output)). |
| `validateBarcodeSvg(svg)` | Validates SVG markup against the output allowlist and returns the trimmed markup; throws `ValidationError` on any disallowed element, attribute, event handler or URI. |
| `createBarcodeContainer(text, options?)` | Returns a detached `HTMLElement` containing the SVG, or `undefined` when the payload cannot be encoded. |

### Behaviour

- These helpers do not validate GS1 application identifiers or check digits;
  they encode exactly the payload they are given. Validate business rules in
  the host.
- Invalid payloads throw from `renderBarcodeSvg` (the barcode library's
  contract); invalid arguments, disallowed option keys, out-of-range option
  values, or a payload over 4096 characters throw a `ValidationError` before
  encoding starts (see [Options](#options)).
  `createBarcodeContainer` catches the error, logs it and returns
  `undefined` so a caller cannot insert a broken barcode silently.
- `renderBarcodeSvg` returns trusted SVG markup generated by
  `@bwip-js/browser` and validated against the output allowlist (see
  [Safe output](#safe-output)); it does not echo the raw payload as HTML.
- `createBarcodeContainer` accepts `width`/`height` values matching
  `/^\d{1,5}(px)?$/` (for example `280px` or `120`). Any other value throws a
  `ValidationError` before the container is built, so caller input never
  reaches the `style` attribute unchecked.
- No DOM is touched by `renderBarcodeSvg`. `createBarcodeContainer` requires a
  browser DOM and must only be called client-side.

## License

`@bwip-js/browser` is MIT-licensed. It is an external optional peer and is not
vendored.
