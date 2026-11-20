import { GENUI_NATIVE_TYPES } from "./schema";
import type { GenuiNode, GenuiSpec } from "./types";

const GENUI_LABEL_PATTERN = /^dsh-ui$/;
const GENUI_TRAILING_PUNCTUATION = /[>`"'.,;:)\]】」』]+$/;

/**
 * @description Canonicalize a fence info string to the GenUI label
 * @summary Trims surrounding whitespace and trailing punctuation artifacts
 * that streaming models sometimes emit (for example `dsh-ui>` or `dsh-ui."`),
 * case-insensitively. Non-GenUI languages are returned unchanged.
 * @param {string} lang The raw fence info string.
 * @returns {string} `"dsh-ui"` for a GenUI fence, otherwise the original value.
 * @function
 * @memberOf module:gen-ui
 */
export function normalizeFenceLanguage(lang: string): string {
  const trimmed = lang.trim();
  if (GENUI_LABEL_PATTERN.test(trimmed.toLowerCase())) return "dsh-ui";
  const stripped = trimmed.replace(GENUI_TRAILING_PUNCTUATION, "").trim().toLowerCase();
  if (GENUI_LABEL_PATTERN.test(stripped)) return "dsh-ui";
  return lang;
}

/**
 * @description Test whether a fence language denotes inline GenUI
 * @summary Accepts `null`/`undefined` safely and delegates to
 * {@link normalizeFenceLanguage}.
 * @param {string|null|undefined} lang The fence info string to inspect.
 * @returns {boolean} `true` when the fence should be rendered as GenUI.
 * @function
 * @memberOf module:gen-ui
 */
export function isGenuiFenceLanguage(lang: string | null | undefined): boolean {
  return typeof lang === "string" && normalizeFenceLanguage(lang) === "dsh-ui";
}

/**
 * @description Plain-text run between GenUI fences
 * @typedef {Object} GenuiTextSegment
 * @property {"text"} kind Discriminator.
 * @property {string} text The verbatim markdown text.
 * @memberOf module:gen-ui
 */
export interface GenuiTextSegment {
  kind: "text";
  text: string;
}

/**
 * @description A parsed inline GenUI fence
 * @typedef {Object} GenuiFenceSegment
 * @property {"genui"} kind Discriminator.
 * @property {string} raw The fence body exactly as received.
 * @property {GenuiSpec|null} spec The parsed spec, or `null` when the body is
 * unusable and the caller should show the raw text.
 * @memberOf module:gen-ui
 */
export interface GenuiFenceSegment {
  kind: "genui";
  raw: string;
  spec: GenuiSpec | null;
}

/**
 * @description Ordered text/GenUI segment produced by fence splitting
 * @typedef {GenuiTextSegment|GenuiFenceSegment} GenuiSegment
 * @memberOf module:gen-ui
 */
export type GenuiSegment = GenuiTextSegment | GenuiFenceSegment;

const OPEN_FENCE = /^(\s*)(`{3,}|~{3,})(.*)$/;

/**
 * @description Split assistant markdown into text and GenUI fence segments
 * @summary Scans fenced blocks line by line, recognizing three-or-more
 * backtick/tilde fences whose language normalizes to `dsh-ui`. Non-GenUI
 * fences and unclosed fences stay in the surrounding text segment, so content
 * is never dropped. Each GenUI body is parsed with
 * {@link resolveFenceSpec} using `settled: true` because an assistant message
 * reaching this method is no longer streaming.
 * @param {string} text The full markdown text of one assistant message.
 * @returns {GenuiSegment[]} Ordered segments that concatenate back to the input.
 * @function
 * @memberOf module:gen-ui
 */
export function splitGenuiFences(text: string): GenuiSegment[] {
  const segments: GenuiSegment[] = [];
  const lines = text.split(/\r?\n/);
  let buffer: string[] = [];
  let index = 0;
  const flushText = (): void => {
    if (buffer.length === 0) return;
    segments.push({ kind: "text", text: buffer.join("\n") });
    buffer = [];
  };
  while (index < lines.length) {
    const line = lines[index]!;
    const open = OPEN_FENCE.exec(line);
    if (open === null) {
      buffer.push(line);
      index += 1;
      continue;
    }
    const fence = open[2]!;
    const info = open[3]!.trim();
    const language = info.split(/\s+/)[0] ?? "";
    const body: string[] = [];
    let cursor = index + 1;
    let closed = false;
    while (cursor < lines.length) {
      const candidate = lines[cursor]!;
      if (candidate.trim().startsWith(fence) && candidate.trim().replace(/[`~]/g, "") === "") {
        closed = true;
        break;
      }
      body.push(candidate);
      cursor += 1;
    }
    if (!closed || !isGenuiFenceLanguage(language)) {
      buffer.push(...lines.slice(index, closed ? cursor + 1 : lines.length));
      index = closed ? cursor + 1 : lines.length;
      continue;
    }
    flushText();
    const raw = body.join("\n");
    segments.push({ kind: "genui", raw, spec: resolveFenceSpec(raw, { settled: true }) });
    index = cursor + 1;
  }
  flushText();
  return segments;
}

/**
 * @description Options controlling fence parsing
 * @typedef {Object} FenceResolveOptions
 * @property {boolean} settled Whether the producing stream has finished. The
 * renderer passes `true` once the message is complete so repair may run.
 * @memberOf module:gen-ui
 */
export interface FenceResolveOptions {
  settled: boolean;
}

/**
 * @description Parse a fence body, applying deterministic tier-1 repair
 * @summary Tries a strict JSON parse first, then a conservative repair pass
 * that only drops a dangling trailing comma and closes obviously truncated
 * arrays/objects. The server guard remains the authoritative repairer; this
 * helper exists so near-complete inline fences still render while the model is
 * done streaming.
 * @param {string} raw The fence body.
 * @param {FenceResolveOptions} _options Resolution options (reserved for the
 * settled/streaming distinction).
 * @returns {GenuiSpec|null} A renderable spec, or `null` when repair cannot
 * produce one.
 * @function
 * @memberOf module:gen-ui
 */
export function resolveFenceSpec(raw: string, _options: FenceResolveOptions): GenuiSpec | null {
  const direct = parseGenuiSpec(raw);
  if (direct !== null) return direct;
  // Deterministic tier-1 repair: drop trailing separators and close simple
  // truncated arrays/objects. The server guard performs the authoritative
  // repair; this only rescues near-complete inline fences.
  const repaired = repairFenceJson(raw);
  return repaired === null ? null : parseGenuiSpec(repaired);
}

function repairFenceJson(raw: string): string | null {
  let text = raw.trim();
  if (text === "") return null;
  text = text.replace(/,\s*$/, "");
  const openBraces = (text.match(/\{/g) ?? []).length;
  const closeBraces = (text.match(/\}/g) ?? []).length;
  const openBrackets = (text.match(/\[/g) ?? []).length;
  const closeBrackets = (text.match(/\]/g) ?? []).length;
  if (openBraces < closeBraces || openBrackets < closeBrackets) return null;
  if (openBraces > 0 || openBrackets > 0) {
    text += "]".repeat(openBrackets - closeBrackets);
    text += "}".repeat(openBraces - closeBraces);
  }
  return text;
}

/**
 * @description Test whether a parsed value is a lone component, not a spec
 * @summary Distinguishes `{ type: "card", ... }` from `{ items: [...] }` so a
 * model that forgets the spec envelope can still be rendered.
 * @param {unknown} value Candidate parsed JSON value.
 * @returns {boolean} `true` for an object with a non-empty string `type` that
 * is not a spec-shaped wrapper.
 * @function
 * @memberOf module:gen-ui
 */
export function isComponentRoot(value: unknown): boolean {
  if (typeof value !== "object" || value === null) return false;
  const v = value as { type?: unknown; items?: unknown; children?: unknown };
  if (typeof v.type !== "string" || v.type === "") return false;
  if (!Array.isArray(v.items)) return true;
  return v.type !== "genui" && !(v.type === "stack" && Array.isArray(v.children));
}

/**
 * @description Wrap a bare component object in a minimal spec envelope
 * @summary Moves a stray `title` on ordinary nodes into the spec title (unless
 * the node type owns its own title), and preserves the `panel`/`append`
 * layout flags so panel routing still works.
 * @param {unknown} value Candidate parsed JSON value.
 * @returns {GenuiSpec|null} A one-item spec, or `null` when the value is not a
 * component object.
 * @function
 * @memberOf module:gen-ui
 */
export function wrapSingleComponentRoot(value: unknown): GenuiSpec | null {
  if (typeof value !== "object" || value === null) return null;
  const v = value as { type?: unknown; title?: unknown; panel?: unknown; append?: unknown };
  if (typeof v.type !== "string" || v.type === "") return null;
  const node = { ...(value as Record<string, unknown>) };
  const hasTitleField = v.type === "callout" || v.type === "card" || v.type === "hero";
  const title = typeof v.title === "string" && !hasTitleField ? v.title : undefined;
  if (title !== undefined) delete node["title"];
  return {
    items: [node as unknown as GenuiNode],
    ...(title === undefined ? {} : { title }),
    ...(v.panel === true ? { panel: true } : {}),
    ...(v.append === true ? { append: true } : {}),
  };
}

/**
 * @description Structural type guard for a GenUI spec envelope
 * @summary Checks only the envelope contract (`items` array plus optional
 * `title`/`gap` types); per-node validation is the server guard's job and the
 * renderer falls back per node.
 * @param {unknown} value Candidate parsed value.
 * @returns {boolean} `true` when the value looks like a spec.
 * @function
 * @memberOf module:gen-ui
 */
export function isGenuiSpec(value: unknown): value is GenuiSpec {
  if (typeof value !== "object" || value === null) return false;
  if (isComponentRoot(value)) return false;
  const v = value as { items?: unknown; title?: unknown; gap?: unknown };
  if (!Array.isArray(v.items)) return false;
  if (v.title !== undefined && typeof v.title !== "string") return false;
  if (v.gap !== undefined && typeof v.gap !== "number") return false;
  return true;
}

/**
 * @description Parse a fence body into a spec, accepting single components
 * @summary Returns `null` for empty or non-JSON input, a spec when the envelope
 * validates, and a wrapped one-item spec when the model wrote a bare component.
 * @param {string} raw The fence body.
 * @returns {GenuiSpec|null} The parsed spec, or `null` when unusable.
 * @function
 * @memberOf module:gen-ui
 */
export function parseGenuiSpec(raw: string): GenuiSpec | null {
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  let value: unknown;
  try {
    value = JSON.parse(trimmed);
  } catch {
    return null;
  }
  if (isGenuiSpec(value)) return value;
  return wrapSingleComponentRoot(value);
}

/**
 * @description Test whether a node type has a whitelisted renderer
 * @summary Thin alias over {@link GENUI_NATIVE_TYPES} retained for call sites
 * that only need the membership check.
 * @param {string} type The declared node type.
 * @returns {boolean} `true` when the type is part of the renderer vocabulary.
 * @function
 * @memberOf module:gen-ui
 */
export function isKnownNodeType(type: string): boolean {
  return GENUI_NATIVE_TYPES.has(type);
}
