import type {
  AtFileCandidate,
  AtFileIgnoreRule,
  AtFileIgnoreRuleInput,
  AtFileDraftMention,
  AtFileEntry,
  AtFileQuery,
} from "./types.js";

/**
 * @description Maximum candidates shown by the picker
 * @summary Hard cap applied after ranking so the list stays responsive.
 * @const MAX_CANDIDATES
 * @type {number}
 * @memberOf module:for-angular.files
 */
export const MAX_CANDIDATES = 50;
/**
 * @description Client cache lifetime for a workspace index
 * @summary {@link AtFileService.search} reuses a cached result for this many
 * milliseconds before requesting a fresh index.
 * @const INDEX_TTL_MS
 * @type {number}
 * @memberOf module:for-angular.files
 */
export const INDEX_TTL_MS = 30_000;
/**
 * @description Invisible marker that tags a pasted `@` token
 * @summary U+2060 is inserted after the `@` of every mention in pasted text so
 * the composer and server can tell pasted mentions from typed ones.
 * @const PASTED_MENTION_MARKER
 * @type {string}
 * @memberOf module:for-angular.files
 */
export const PASTED_MENTION_MARKER = "\u2060";

const MENTION_PATTERN = /@([^\s@]+)/g;

/**
 * @description Basename of a workspace-relative path
 * @param {string} relative - a `/`-separated relative path.
 * @returns {string} the text after the last `/`, or the whole path.
 * @function basenameOf
 * @memberOf module:for-angular.files
 * @example
 * ```typescript
 * import { basenameOf } from "@decaf-ts/for-angular/files";
 *
 * console.log(basenameOf("src/index.ts")); // "index.ts"
 * ```
 */
export function basenameOf(relative: string): string {
  const index = relative.lastIndexOf("/");
  return index < 0 ? relative : relative.slice(index + 1);
}

/**
 * @description Directory part of a workspace-relative path
 * @param {string} relative - a `/`-separated relative path.
 * @returns {string} the text before the last `/`, or an empty string.
 * @function dirnameOf
 * @memberOf module:for-angular.files
 * @example
 * ```typescript
 * import { dirnameOf } from "@decaf-ts/for-angular/files";
 *
 * console.log(dirnameOf("src/index.ts")); // "src"
 * ```
 */
export function dirnameOf(relative: string): string {
  const index = relative.lastIndexOf("/");
  return index < 0 ? "" : relative.slice(0, index);
}

/**
 * @description Mark every `@` token in pasted text
 * @summary Inserts {@link PASTED_MENTION_MARKER} after each `@` that starts a
 * mention so the paste is not treated as a workspace reference.
 * @param {string} text - the pasted text.
 * @returns {string} the text with protected mention markers.
 * @function protectPastedMentions
 * @memberOf module:for-angular.files
 * @example
 * ```typescript
 * import {
 *   protectPastedMentions,
 *   PASTED_MENTION_MARKER,
 * } from "@decaf-ts/for-angular/files";
 *
 * console.log(protectPastedMentions("@src").includes(PASTED_MENTION_MARKER)); // true
 * ```
 */
export function protectPastedMentions(text: string): string {
  return text.replace(/@(?=[^\s@])/gu, `@${PASTED_MENTION_MARKER}`);
}

/**
 * @description Test whether a mention token came from a paste
 * @param {string} token - the token text without the leading `@`.
 * @returns {boolean} `true` when the token carries {@link PASTED_MENTION_MARKER}.
 * @function isProtectedMentionToken
 * @memberOf module:for-angular.files
 */
export function isProtectedMentionToken(token: string): boolean {
  return token.includes(PASTED_MENTION_MARKER);
}

/**
 * @description Remove every pasted-mention marker from text
 * @param {string} text - text that may contain pasted-mention markers.
 * @returns {string} the text without markers.
 * @function stripPastedMentionMarkers
 * @memberOf module:for-angular.files
 */
export function stripPastedMentionMarkers(text: string): string {
  return text.replaceAll(PASTED_MENTION_MARKER, "");
}

/**
 * @description Find the `@path` query under the caret
 * @summary Looks for the last `@` before `caret`, rejects it when the token
 * contains whitespace, another `@`, or a pasted-mention marker, and extends the
 * query to the end of the following non-space run. Returns `null` when the
 * caret is not inside a mention.
 * @param {string} text - the current draft.
 * @param {number} [caret=text.length] - caret offset in the draft.
 * @returns {AtFileQuery | null} the active query and replacement span, or `null`.
 * @function activeAtQuery
 * @memberOf module:for-angular.files
 * @example
 * ```typescript
 * import { activeAtQuery } from "@decaf-ts/for-angular/files";
 *
 * console.log(activeAtQuery("see @src/in", 11));
 * // { query: "src/in", start: 4, end: 11 }
 * ```
 */
export function activeAtQuery(
  text: string,
  caret: number = text.length
): AtFileQuery | null {
  if (caret <= 0) return null;
  const before = text.slice(0, caret);
  const start = before.lastIndexOf("@");
  if (start < 0) return null;
  const token = before.slice(start + 1);
  if (token.length === 0) {
    return { query: "", start, end: caret };
  }
  if (/[\s@]/u.test(token) || isProtectedMentionToken(token)) return null;
  const after = text.slice(caret);
  const suffix = /^\S*/u.exec(after)?.[0] ?? "";
  if (suffix.includes("@") || isProtectedMentionToken(suffix)) return null;
  return { query: `${token}${suffix}`, start, end: caret + suffix.length };
}

/**
 * @description Extract deduplicated `@path` tokens from text
 * @summary Skips pasted tokens, strips one trailing `/`, and keeps the first
 * occurrence of each relative path.
 * @param {string} text - text to scan.
 * @returns {string[]} deduplicated relative paths without the `@`.
 * @function scanMentions
 * @memberOf module:for-angular.files
 * @example
 * ```typescript
 * import { scanMentions } from "@decaf-ts/for-angular/files";
 *
 * console.log(scanMentions("@src/index.ts and @src/index.ts"));
 * // ["src/index.ts"]
 * ```
 */
export function scanMentions(text: string): readonly string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const match of text.matchAll(MENTION_PATTERN)) {
    const raw = match[1] as string;
    if (isProtectedMentionToken(raw)) continue;
    const relative = raw.endsWith("/") ? raw.slice(0, -1) : raw;
    if (relative === "" || seen.has(relative)) continue;
    seen.add(relative);
    out.push(relative);
  }
  return out;
}

/**
 * @description List the referenced tokens present in the draft
 * @summary Keeps only `@path` tokens whose relative path is in `indexed`, so
 * the dock never shows a reference the workspace does not contain. Offsets
 * cover the whole token for removal.
 * @param {string} draft - the current draft.
 * @param {ReadonlySet<string>} indexed - relative paths present in the index.
 * @returns {AtFileDraftMention[]} referenced tokens in draft order.
 * @function draftMentions
 * @memberOf module:for-angular.files
 * @example
 * ```typescript
 * import { draftMentions } from "@decaf-ts/for-angular/files";
 *
 * const mentions = draftMentions("see @src/index.ts", new Set(["src/index.ts"]));
 * console.log(mentions[0]?.relative); // "src/index.ts"
 * ```
 */
export function draftMentions(
  draft: string,
  indexed: ReadonlySet<string>
): readonly AtFileDraftMention[] {
  const seen = new Set<string>();
  const out: AtFileDraftMention[] = [];
  for (const match of draft.matchAll(MENTION_PATTERN)) {
    const raw = match[1] as string;
    if (isProtectedMentionToken(raw)) continue;
    const relative = raw.endsWith("/") ? raw.slice(0, -1) : raw;
    if (relative === "" || !indexed.has(relative) || seen.has(relative)) {
      continue;
    }
    seen.add(relative);
    out.push({
      relative,
      start: match.index as number,
      end: (match.index as number) + match[0].length,
    });
  }
  return out;
}

/**
 * @description Remove one span from the draft
 * @param {string} draft - the current draft.
 * @param {number} start - inclusive start offset to remove.
 * @param {number} end - exclusive end offset to remove.
 * @returns {string} the draft without the span.
 * @function withoutToken
 * @memberOf module:for-angular.files
 */
export function withoutToken(draft: string, start: number, end: number): string {
  return draft.slice(0, start) + draft.slice(end);
}

/**
 * @description Replace the active query with an accepted reference
 * @summary Substitutes the query span with `@relative` plus `/` for
 * directories and a trailing space, and reports the new caret position.
 * @param {string} draft - the current draft.
 * @param {AtFileQuery} query - the active query and its replacement span.
 * @param {string} relative - the accepted workspace-relative path.
 * @param {"file" | "dir"} kind - whether the accepted entry is a directory.
 * @returns {{ text: string, caret: number }} the new draft and caret offset.
 * @function insertReference
 * @memberOf module:for-angular.files
 * @example
 * ```typescript
 * import { insertReference } from "@decaf-ts/for-angular/files";
 *
 * const next = insertReference("see @sr", { query: "sr", start: 4, end: 7 }, "src", "dir");
 * console.log(next.text); // "see @src/ "
 * ```
 */
export function insertReference(
  draft: string,
  query: AtFileQuery,
  relative: string,
  kind: "file" | "dir"
): { text: string; caret: number } {
  const suffix = kind === "dir" ? "/" : "";
  const token = `@${relative}${suffix} `;
  const text = draft.slice(0, query.start) + token + draft.slice(query.end);
  return { text, caret: query.start + token.length };
}

/**
 * @description Build display rows for ranked entries
 * @summary Uses the basename as the row name and, when another entry shares
 * that basename, appends the directory to disambiguate. The directory is also
 * exposed as the row description.
 * @param {AtFileEntry[]} files - ranked entries.
 * @returns {AtFileCandidate[]} picker rows in the same order.
 * @function candidateRows
 * @memberOf module:for-angular.files
 * @example
 * ```typescript
 * import { candidateRows } from "@decaf-ts/for-angular/files";
 *
 * const rows = candidateRows([
 *   { path: "/w/a/index.ts", relative: "a/index.ts", kind: "file" },
 *   { path: "/w/b/index.ts", relative: "b/index.ts", kind: "file" },
 * ]);
 * console.log(rows[0]?.name); // "index.ts - a"
 * ```
 */
export function candidateRows(
  files: readonly AtFileEntry[]
): readonly AtFileCandidate[] {
  const counts = new Map<string, number>();
  for (const file of files) {
    const basename = basenameOf(file.relative);
    counts.set(basename, (counts.get(basename) ?? 0) + 1);
  }
  return files.map((file) => {
    const basename = basenameOf(file.relative);
    const directory = dirnameOf(file.relative);
    const duplicate = (counts.get(basename) as number) > 1;
    return {
      entry: file,
      name: duplicate && directory !== "" ? `${basename} - ${directory}` : basename,
      ...(directory === "" ? {} : { description: directory }),
      kind: file.kind,
    } satisfies AtFileCandidate;
  });
}

/**
 * @description Rank workspace entries against the picker query
 * @summary An empty query browses by depth, directories first, then
 * alphabetically. A query scores basename matches (`exact`, prefix, substring,
 * then subsequence) and, for queries containing `/`, scores each segment in
 * path order with a bonus when the last match is the basename. Ties prefer
 * files, then shorter paths, then alphabetical order. Entries that do not match
 * are dropped and the result is capped at `limit`.
 * @param {AtFileEntry[]} files - entries to rank.
 * @param {string} query - the query typed after `@`.
 * @param {number} limit - maximum rows to return.
 * @returns {AtFileEntry[]} the best entries in rank order.
 * @function rankEntries
 * @memberOf module:for-angular.files
 * @example
 * ```typescript
 * import { rankEntries } from "@decaf-ts/for-angular/files";
 *
 * const best = rankEntries(
 *   [{ path: "/w/src/index.ts", relative: "src/index.ts", kind: "file" }],
 *   "index",
 *   10,
 * );
 * console.log(best[0]?.relative); // "src/index.ts"
 * ```
 */
export function rankEntries(
  files: readonly AtFileEntry[],
  query: string,
  limit: number
): readonly AtFileEntry[] {
  const q = query.trim().toLowerCase();
  if (q === "") {
    return [...files].sort(byBrowse).slice(0, limit);
  }
  return files
    .map((file) => ({ file, score: scorePath(file.relative, q) }))
    .filter((entry) => entry.score >= 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        (a.file.kind === "dir" ? 1 : 0) - (b.file.kind === "dir" ? 1 : 0) ||
        a.file.relative.length - b.file.relative.length ||
        (a.file.relative < b.file.relative ? -1 : 1)
    )
    .slice(0, limit)
    .map((entry) => entry.file);
}

function byBrowse(a: AtFileEntry, b: AtFileEntry): number {
  const depth =
    a.relative.split("/").length - b.relative.split("/").length;
  if (depth !== 0) return depth;
  if (a.kind !== b.kind) return a.kind === "dir" ? -1 : 1;
  return a.relative < b.relative ? -1 : 1;
}

function scorePath(path: string, q: string): number {
  const lowerPath = path.toLowerCase();
  const pathSegments = lowerPath.split("/");
  const normalizedQuery = q.replaceAll("\\", "/");
  const querySegments = normalizedQuery.split("/").filter(Boolean);
  if (!normalizedQuery.includes("/")) {
    return scoreName(
      pathSegments.at(-1) as string,
      querySegments[0] as string
    );
  }
  if (querySegments.length === 0) return -1;
  if (normalizedQuery.endsWith("/")) {
    const prefix = normalizedQuery.slice(0, -1);
    if (!lowerPath.startsWith(`${prefix}/`)) return -1;
    const depth = lowerPath.slice(prefix.length + 1).split("/").length;
    return 6000 - (depth - 1) * 100 - path.length;
  }

  let cursor = 0;
  let total = 0;
  let lastMatch = -1;
  for (const querySegment of querySegments) {
    let matchedIndex = -1;
    let matchedScore = -1;
    for (let index = cursor; index < pathSegments.length; index++) {
      const score = scoreName(pathSegments[index] as string, querySegment);
      if (score < 0) continue;
      matchedScore = score;
      matchedIndex = index;
      break;
    }
    if (matchedIndex < 0) return -1;
    total += matchedScore;
    lastMatch = matchedIndex;
    cursor = matchedIndex + 1;
  }
  const basenameBonus = lastMatch === pathSegments.length - 1 ? 1000 : 0;
  return total + basenameBonus - path.length;
}

function scoreName(name: string, query: string): number {
  if (name === query) return 5000;
  if (name.startsWith(query)) return 4500 - name.length;
  const contained = name.indexOf(query);
  if (contained >= 0) return 4000 - contained * 10 - name.length;
  let first = -1;
  let previous = -1;
  let gaps = 0;
  let at = 0;
  for (const ch of query) {
    const found = name.indexOf(ch, at);
    if (found < 0) return -1;
    if (first < 0) first = found;
    if (previous >= 0) gaps += found - previous - 1;
    previous = found;
    at = found + 1;
  }
  return 3000 - first * 10 - gaps * 5 - name.length;
}

/**
 * @description Normalize an ignore-rule input to object form
 * @param {AtFileIgnoreRuleInput} input - a rule string or object.
 * @returns {AtFileIgnoreRule} the object form; strings become case-insensitive exact rules.
 * @function toIgnoreRule
 * @memberOf module:for-angular.files
 * @example
 * ```typescript
 * import { toIgnoreRule } from "@decaf-ts/for-angular/files";
 *
 * console.log(toIgnoreRule("Thumbs.db"));
 * // { kind: "exact", pattern: "Thumbs.db", caseSensitive: false }
 * ```
 */
export function toIgnoreRule(
  input: AtFileIgnoreRuleInput
): AtFileIgnoreRule {
  return typeof input === "string"
    ? { kind: "exact", pattern: input, caseSensitive: false }
    : input;
}

/**
 * @description Build a stable identity key for an ignore rule
 * @summary Lowercases case-insensitive exact patterns so duplicates collapse.
 * @param {AtFileIgnoreRuleInput} input - the rule to key.
 * @returns {string} a stable key for comparison and deduplication.
 * @function ignoreRuleKey
 * @memberOf module:for-angular.files
 * @example
 * ```typescript
 * import { ignoreRuleKey } from "@decaf-ts/for-angular/files";
 *
 * console.log(ignoreRuleKey("Thumbs.db") === ignoreRuleKey("thumbs.db")); // true
 * ```
 */
export function ignoreRuleKey(input: AtFileIgnoreRuleInput): string {
  const rule = toIgnoreRule(input);
  const pattern =
    rule.kind === "exact" && !rule.caseSensitive
      ? rule.pattern.toLowerCase()
      : rule.pattern;
  return JSON.stringify([rule.kind, pattern, rule.caseSensitive]);
}
