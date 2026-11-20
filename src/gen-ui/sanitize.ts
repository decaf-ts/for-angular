// Binding security primitives for the GenUI renderer (SAA-2026 A-1, A-2):
// every HTML/SVG sink is allowlist-based, never a blocklist.

const SAFE_SCHEMES = new Set(["https:", "http:", "mailto:"]);
const MEDIA_SCHEMES = new Set(["https:", "http:"]);
// eslint-disable-next-line no-control-regex -- control characters are rejected on purpose
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/;

/**
 * @description Validate a hyperlink destination against an allowlist
 * @summary Accepts only `https:`, `http:`, and `mailto:` URLs with no control
 * characters. Relative URLs are resolved against a dummy origin before the
 * scheme check, then the original (unresolved) value is returned so app-relative
 * navigation keeps working. Returns `null` for anything rejected.
 * @param {unknown} href The candidate destination.
 * @returns {string|null} The accepted value, or `null` when unsafe.
 * @function
 * @memberOf module:gen-ui
 */
export function safeHref(href: unknown): string | null {
  if (typeof href !== "string") return null;
  const value = href.trim();
  if (value === "" || CONTROL_CHARS.test(value)) return null;
  try {
    const url = new URL(value, "https://genui.invalid/");
    if (!SAFE_SCHEMES.has(url.protocol)) return null;
    return value;
  } catch {
    return null;
  }
}

/**
 * @description Validate an image/audio/video source against an allowlist
 * @summary Stricter than {@link safeHref}: only `https:` and `http:` are
 * permitted (no `mailto:`), and control characters are rejected.
 * @param {unknown} src The candidate media source.
 * @returns {string|null} The accepted value, or `null` when unsafe.
 * @function
 * @memberOf module:gen-ui
 */
export function safeMediaSrc(src: unknown): string | null {
  if (typeof src !== "string") return null;
  const value = src.trim();
  if (value === "" || CONTROL_CHARS.test(value)) return null;
  try {
    const url = new URL(value, "https://genui.invalid/");
    if (!MEDIA_SCHEMES.has(url.protocol)) return null;
    return value;
  } catch {
    return null;
  }
}

const SVG_ELEMENTS = new Set([
  "svg",
  "g",
  "path",
  "rect",
  "circle",
  "ellipse",
  "line",
  "polyline",
  "polygon",
  "text",
  "tspan",
  "defs",
  "lineargradient",
  "radialgradient",
  "stop",
  "clippath",
  "mask",
  "pattern",
  "marker",
  "symbol",
  "title",
  "desc",
  "use",
]);

const SVG_ATTRIBUTES = new Set([
  "xmlns",
  "xmlns:xlink",
  "viewbox",
  "width",
  "height",
  "x",
  "y",
  "x1",
  "y1",
  "x2",
  "y2",
  "cx",
  "cy",
  "r",
  "rx",
  "ry",
  "d",
  "points",
  "transform",
  "fill",
  "fill-opacity",
  "fill-rule",
  "stroke",
  "stroke-width",
  "stroke-linecap",
  "stroke-linejoin",
  "stroke-dasharray",
  "stroke-dashoffset",
  "stroke-opacity",
  "opacity",
  "clip-path",
  "mask",
  "id",
  "class",
  "offset",
  "stop-color",
  "stop-opacity",
  "text-anchor",
  "dominant-baseline",
  "font-family",
  "font-size",
  "font-weight",
  "dx",
  "dy",
  "preserveaspectratio",
  "role",
  "aria-label",
  "aria-hidden",
  "href",
  "xlink:href",
]);

const DANGEROUS_VALUE = /(?:javascript|vbscript|data)\s*:/i;

function isSafeSvgValue(name: string, value: string): boolean {
  if (DANGEROUS_VALUE.test(value)) return false;
  if (name === "href" || name === "xlink:href") {
    // External references can exfiltrate or load remote content; allow only
    // same-document fragment references.
    return value.trim().startsWith("#");
  }
  if (name === "style" || name.startsWith("on")) return false;
  return true;
}

function scrubElement(element: Element, doc: Document): Element | null {
  const name = element.localName.toLowerCase();
  if (!SVG_ELEMENTS.has(name)) return null;
  for (const attribute of Array.from(element.attributes)) {
    const attrName = attribute.name.toLowerCase();
    if (!SVG_ATTRIBUTES.has(attrName) || !isSafeSvgValue(attrName, attribute.value)) {
      element.removeAttribute(attribute.name);
    }
  }
  for (const child of Array.from(element.childNodes)) {
    if (child.nodeType === 1) {
      const scrubbed = scrubElement(child as Element, doc);
      if (scrubbed === null) element.removeChild(child);
    } else if (child.nodeType !== 3) {
      element.removeChild(child);
    }
  }
  return element;
}

/**
 * @description Sanitize untrusted SVG markup through an element/attribute allowlist
 * @summary Parses the markup as XML, rejects parser errors and non-`svg` roots,
 * removes non-allowlisted elements and attributes, strips event handlers and
 * style, and permits `href`/`xlink:href` only for same-document `#fragment`
 * references. Returns an empty string when the input is unusable, in which case
 * callers show a localized failure instead of rendering anything.
 * @param {unknown} markup Candidate SVG source.
 * @returns {string} Sanitized SVG markup, or `""` when rejected.
 * @function
 * @memberOf module:gen-ui
 */
export function sanitizeSvg(markup: unknown): string {
  if (typeof markup !== "string" || markup.trim() === "") return "";
  if (typeof DOMParser === "undefined") return "";
  const doc = new DOMParser().parseFromString(markup, "image/svg+xml");
  if (doc.getElementsByTagName("parsererror").length > 0) return "";
  const root = doc.documentElement;
  if (root === null || root.localName.toLowerCase() !== "svg") return "";
  const cleaned = scrubElement(root, doc);
  if (cleaned === null) return "";
  return new XMLSerializer().serializeToString(cleaned);
}

const ECHART_DANGEROUS_KEY = /^(?:on\w+|graphic|html|renderer)$/i;

/**
 * @description Sanitize a raw ECharts option before handing it to the engine
 * @summary Recursively drops dangerous keys (`on*`, `graphic`, `html`, and
 * `renderer`), removes `url(...)` and `javascript:`/`vbscript:`/`data:`
 * payloads from strings, truncates arrays and depth, and forces a rich-text
 * tooltip. Only plain JSON values survive; executable values never reach the
 * chart library.
 * @param {unknown} option Candidate ECharts option object.
 * @param {number} [maxDepth=10] Maximum object/array depth.
 * @param {number} [maxArray=500] Maximum retained array length.
 * @returns {Record<string, unknown>} A sanitized option object.
 * @function
 * @memberOf module:gen-ui
 */
export function sanitizeEChartOption(option: unknown, maxDepth = 10, maxArray = 500): Record<string, unknown> {
  const walk = (value: unknown, depth: number): unknown => {
    if (depth > maxDepth) return null;
    if (typeof value === "string") {
      if (DANGEROUS_VALUE.test(value) || /url\s*\(/i.test(value)) {
        return value.replace(/url\s*\([^)]*\)/gi, "").replace(DANGEROUS_VALUE, "");
      }
      return value;
    }
    if (Array.isArray(value)) {
      return value.slice(0, maxArray).map((entry) => walk(entry, depth + 1));
    }
    if (typeof value === "object" && value !== null) {
      const out: Record<string, unknown> = {};
      for (const [key, entry] of Object.entries(value)) {
        if (ECHART_DANGEROUS_KEY.test(key)) continue;
        out[key] = walk(entry, depth + 1);
      }
      return out;
    }
    if (typeof value === "number" || typeof value === "boolean" || value === null) return value;
    return undefined;
  };
  const sanitized = walk(option ?? {}, 0);
  const result = sanitized !== null && typeof sanitized === "object" && !Array.isArray(sanitized)
    ? (sanitized as Record<string, unknown>)
    : {};
  const tooltip = result["tooltip"];
  result["tooltip"] = {
    ...(tooltip !== null && typeof tooltip === "object" && !Array.isArray(tooltip) ? tooltip : {}),
    renderMode: "richText",
  };
  return result;
}

/**
 * @description Remove secret field values from a submission payload
 * @summary Filters top-level keys listed in `secretIds` and recurses into a
 * nested `fields` object, which is the shape used by form submissions. Other
 * nested objects are copied as-is, so callers should keep secret ids flat or
 * under `fields`.
 * @param {T} payload The payload to copy.
 * @param {ReadonlySet<string>} secretIds Field ids that must be removed.
 * @returns {Record<string, unknown>} A filtered shallow copy.
 * @template T The payload object type.
 * @function
 * @memberOf module:gen-ui
 */
export function stripSecretFields<T extends Record<string, unknown>>(
  payload: T,
  secretIds: ReadonlySet<string>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (secretIds.has(key)) continue;
    if (key === "fields" && value !== null && typeof value === "object" && !Array.isArray(value)) {
      out[key] = stripSecretFields(value as Record<string, unknown>, secretIds);
      continue;
    }
    out[key] = value;
  }
  return out;
}
