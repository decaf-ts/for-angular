/**
 * @module for-angular/agent/utils/agentMediaUrl
 * @summary Media-URL scheme allowlist shared by the agent chat components.
 * @description Normalizes user- or model-supplied media sources before they
 * reach an image `src` binding. Only `http:`, `https:`, `blob:`, and
 * `data:image/*` URLs are accepted; scheme-less strings, script-bearing
 * schemes, non-image `data:` payloads, and values hiding control characters
 * (for example `java\tscript:`) are rejected as `null`.
 */
const MEDIA_URL_SCHEME = /^([a-z][a-z0-9+.-]*):/i;
const ALLOWED_MEDIA_URL_SCHEMES = new Set(["https:", "http:", "blob:"]);
const DATA_IMAGE_PREFIX = /^data:image\//i;
// eslint-disable-next-line no-control-regex -- Untrusted media URLs must reject ASCII control characters.
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;

/**
 * Returns the media URL when it is safe to bind to an image source, or `null`
 * when it is absent, malformed, or uses a disallowed scheme.
 *
 * The value is trimmed before inspection and the trimmed URL is returned
 * unchanged (original casing preserved) so signed or object URLs keep working;
 * only the scheme comparison is case-insensitive. Whitespace-only
 * values, relative or scheme-less paths, `javascript:` and other non-media
 * schemes, and `data:` payloads that are not `data:image/*` are rejected.
 *
 * @example
 * ```ts
 * safeMediaUrl("https://example.test/photo.png"); // "https://example.test/photo.png"
 * safeMediaUrl("data:image/png;base64,AAAA"); // accepted as an inline image
 * safeMediaUrl("javascript:alert(1)"); // null
 * safeMediaUrl(null); // null
 * ```
 *
 * @param value - Candidate media URL, typically from a chat artifact or attachment; may be `null` or `undefined`.
 * @returns The trimmed URL when its scheme is allowlisted, otherwise `null`.
 */
export function safeMediaUrl(value: string | null | undefined): string | null {
  const url = value?.trim();
  if (!url || CONTROL_CHARACTERS.test(url)) return null;
  const scheme = MEDIA_URL_SCHEME.exec(url)?.[1]?.toLowerCase();
  if (!scheme) return null;
  const normalized = `${scheme}:`;
  if (ALLOWED_MEDIA_URL_SCHEMES.has(normalized)) return url;
  if (normalized === "data:" && DATA_IMAGE_PREFIX.test(url)) return url;
  return null;
}
