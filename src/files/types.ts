/**
 * @description One workspace entry returned by the files API
 * @summary Mirrors the backend `FileEntry`: `path` is the absolute server path,
 * `relative` is workspace-relative with `/` separators, and `kind` separates
 * files from directories.
 * @interface AtFileEntry
 * @property {string} path - absolute server filesystem path.
 * @property {string} relative - workspace-relative path using `/`.
 * @property {"file" | "dir"} kind - entry type.
 * @memberOf module:for-angular.files
 */
export interface AtFileEntry {
  /** Absolute server filesystem path. */
  readonly path: string;
  /** Workspace-relative path using `/` as the separator. */
  readonly relative: string;
  /** Whether the entry is a file or a directory. */
  readonly kind: "file" | "dir";
}

/**
 * @description Result of a workspace index request
 * @summary `truncated` is `true` when the server stopped at its file cap; the
 * picker then prompts the user to refine the query.
 * @interface AtFileSearchResult
 * @property {AtFileEntry[]} files - indexed entries.
 * @property {boolean} truncated - whether the server index hit its file cap.
 * @memberOf module:for-angular.files
 */
export interface AtFileSearchResult {
  /** Indexed entries returned by the server. */
  readonly files: AtFileEntry[];
  /** Whether the server index stopped at its file cap. */
  readonly truncated: boolean;
}

/**
 * @description A normalized file-ignore rule
 * @summary `exact` matches a basename; `regex` tests the basename against
 * `pattern`. `caseSensitive` controls both.
 * @interface AtFileIgnoreRule
 * @property {"exact" | "regex"} kind - matching strategy.
 * @property {string} pattern - basename or regular-expression source.
 * @property {boolean} caseSensitive - whether matching is case-sensitive.
 * @memberOf module:for-angular.files
 */
export interface AtFileIgnoreRule {
  /** Matching strategy: literal basename or regular expression. */
  readonly kind: "exact" | "regex";
  /** Literal basename or regular-expression source. */
  readonly pattern: string;
  /** Whether matching is case-sensitive. */
  readonly caseSensitive: boolean;
}

/**
 * @description Accepted form of an ignore rule
 * @summary A bare string is shorthand for a case-insensitive `exact` rule.
 * @typedef {string | AtFileIgnoreRule} AtFileIgnoreRuleInput
 * @memberOf module:for-angular.files
 */
export type AtFileIgnoreRuleInput = string | AtFileIgnoreRule;

/**
 * @description Per-workspace ignore rules
 * @summary Applied together with the global rules when the workspace matches.
 * @interface AtFileWorkspaceIgnoreFiles
 * @property {string} workspace - workspace root the rules apply to.
 * @property {AtFileIgnoreRuleInput[]} ignoreFiles - rules scoped to that workspace.
 * @memberOf module:for-angular.files
 */
export interface AtFileWorkspaceIgnoreFiles {
  /** Workspace root the rules apply to. */
  readonly workspace: string;
  /** Rules scoped to this workspace. */
  readonly ignoreFiles: AtFileIgnoreRuleInput[];
}

/**
 * @description Resolved `@file` settings used by the UI
 * @summary Mirrors the backend `AtFileSettings`. `ignoreFilesConfigured`
 * distinguishes an explicitly saved empty list from the defaults, and
 * `ignorePastedMentions` controls whether pasted `@` tokens become references.
 * @interface AtFileSettings
 * @property {boolean} enabled - whether `@path` mentions are active.
 * @property {AtFileIgnoreRuleInput[]} ignoreFiles - global ignore rules.
 * @property {boolean} [ignoreFilesConfigured] - whether the global list was explicitly saved.
 * @property {AtFileWorkspaceIgnoreFiles[]} workspaceIgnoreFiles - per-workspace rules.
 * @property {boolean} [ignorePastedMentions] - whether pasted `@` tokens are ignored.
 * @memberOf module:for-angular.files
 */
export interface AtFileSettings {
  /** Whether `@path` mentions are active. */
  readonly enabled: boolean;
  /** Global ignore rules applied to every workspace. */
  readonly ignoreFiles: AtFileIgnoreRuleInput[];
  /** Whether the global list was explicitly saved rather than defaulted. */
  readonly ignoreFilesConfigured?: boolean;
  /** Per-workspace ignore rules. */
  readonly workspaceIgnoreFiles: AtFileWorkspaceIgnoreFiles[];
  /** Whether pasted `@` tokens are treated as plain text. */
  readonly ignorePastedMentions?: boolean;
}

/**
 * @description One settings mutation sent to `PUT /files/settings`
 * @summary Only one `{ field, value }` pair is sent per request; `value` is
 * typed per field.
 * @typedef {object} AtFileSettingsUpdate
 * @property {"enabled" | "ignoreFiles" | "workspaceIgnoreFiles" | "ignorePastedMentions"} field - the settings field to change.
 * @property {boolean | AtFileIgnoreRuleInput[] | AtFileWorkspaceIgnoreFiles[]} value - the new value for that field.
 * @memberOf module:for-angular.files
 */
export type AtFileSettingsUpdate =
  | { readonly field: "enabled"; readonly value: boolean }
  | { readonly field: "ignoreFiles"; readonly value: AtFileIgnoreRuleInput[] }
  | {
      readonly field: "workspaceIgnoreFiles";
      readonly value: AtFileWorkspaceIgnoreFiles[];
    }
  | { readonly field: "ignorePastedMentions"; readonly value: boolean };

/**
 * @description A picker row for one ranked entry
 * @summary `name` is the basename, disambiguated with the directory when two
 * entries share it; `description` carries the directory for display.
 * @interface AtFileCandidate
 * @property {AtFileEntry} entry - the underlying workspace entry.
 * @property {string} name - display name, disambiguated when duplicated.
 * @property {string} [description] - directory shown as secondary text.
 * @property {"file" | "dir"} kind - entry type, used to pick an icon.
 * @memberOf module:for-angular.files
 */
export interface AtFileCandidate {
  /** The underlying workspace entry. */
  readonly entry: AtFileEntry;
  /** Display name, disambiguated when the basename is duplicated. */
  readonly name: string;
  /** Directory shown as secondary text. */
  readonly description?: string;
  /** Entry type, used to pick an icon. */
  readonly kind: "file" | "dir";
}

/**
 * @description A referenced `@path` token inside the draft
 * @summary `start` and `end` are offsets into the draft string and cover the
 * whole `@relative` token, so the dock can remove it.
 * @interface AtFileDraftMention
 * @property {string} relative - workspace-relative path.
 * @property {number} start - inclusive start offset in the draft.
 * @property {number} end - exclusive end offset in the draft.
 * @memberOf module:for-angular.files
 */
export interface AtFileDraftMention {
  /** Workspace-relative path of the referenced entry. */
  readonly relative: string;
  /** Inclusive start offset of the token in the draft. */
  readonly start: number;
  /** Exclusive end offset of the token in the draft. */
  readonly end: number;
}

/**
 * @description The active `@path` query under the caret
 * @summary `query` excludes the leading `@`; `start` and `end` are the offsets
 * to replace when a candidate is accepted.
 * @interface AtFileQuery
 * @property {string} query - text typed after `@`.
 * @property {number} start - inclusive start offset of the `@`.
 * @property {number} end - exclusive end offset of the query.
 * @memberOf module:for-angular.files
 */
export interface AtFileQuery {
  /** Text typed after the leading `@`. */
  readonly query: string;
  /** Inclusive start offset of the `@` in the draft. */
  readonly start: number;
  /** Exclusive end offset of the query in the draft. */
  readonly end: number;
}

/**
 * @description Scope edited by the settings panel
 * @summary `global` rules apply to every workspace; `workspace` rules apply
 * only to the currently selected workspace.
 * @typedef {"global" | "workspace"} AtFileSettingsScope
 * @memberOf module:for-angular.files
 */
export type AtFileSettingsScope = "global" | "workspace";
