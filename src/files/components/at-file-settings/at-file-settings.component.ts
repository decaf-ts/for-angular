import {
  Component,
  OnInit,
  computed,
  inject,
  input,
  signal,
} from "@angular/core";
import { AgentTranslateFallbackPipe } from "@decaf-ts/for-angular/agent";
import { AtFileService } from "../../services/AtFileService.js";
import type {
  AtFileIgnoreRule,
  AtFileIgnoreRuleInput,
  AtFileSettings,
  AtFileSettingsScope,
} from "../../types.js";
import {
  ignoreRuleKey,
  toIgnoreRule,
} from "../../utils.js";

const DEFAULT_IGNORE_FILES: readonly AtFileIgnoreRuleInput[] = [
  "desktop.ini",
  "Thumbs.db",
  ".DS_Store",
];

/**
 * @description Settings section for workspace file mentions
 * @summary Standalone panel that reads the resolved files settings and edits
 * the `enabled` and `ignorePastedMentions` toggles plus the file-filter rules
 * for the global or selected workspace scope. Rules are validated before they
 * are saved (regex compilation, no path separators in exact names, no
 * duplicates), and every save sends one `{ field, value }` update through
 * {@link AtFileService.updateSettings}, replacing the local settings with the
 * server response.
 * @class AtFileSettingsComponent
 * @category Files UI
 * @example
 * ```html
 * <ngx-decaf-at-file-settings [workspace]="workspaceRoot"></ngx-decaf-at-file-settings>
 * ```
 */
@Component({
  selector: "ngx-decaf-at-file-settings",
  templateUrl: "./at-file-settings.component.html",
  styleUrls: ["./at-file-settings.component.scss"],
  imports: [AgentTranslateFallbackPipe],
  standalone: true,
})
export class AtFileSettingsComponent implements OnInit {
  /** Workspace root whose scoped rules can be edited; empty hides that scope. */
  readonly workspace = input<string>("");

  private readonly service = inject(AtFileService);

  /** Resolved settings, or `null` before the first load. */
  readonly settings = signal<AtFileSettings | null>(null);
  /** Scope currently being edited. */
  readonly scope = signal<AtFileSettingsScope>("global");
  /** Rule type for the next filter. */
  readonly mode = signal<"exact" | "regex">("exact");
  /** Pattern being typed for the next filter. */
  readonly pattern = signal("");
  /** Whether the next filter is case-sensitive. */
  readonly caseSensitive = signal(false);
  /** Whether a settings update is in flight. */
  readonly saving = signal(false);
  /** Last validation or request error message, if any. */
  readonly error = signal<string | null>(null);

  /** Rules of the active scope, normalized to object form. */
  readonly rules = computed<readonly AtFileIgnoreRule[]>(() => {
    const settings = this.settings();
    if (!settings) return [];
    const source =
      this.scope() === "workspace"
        ? settings.workspaceIgnoreFiles.find(
            (entry) => entry.workspace === this.workspace()
          )?.ignoreFiles ?? []
        : settings.ignoreFiles;
    return source.map(toIgnoreRule);
  });

  /** Whether a workspace is set, enabling the workspace scope. */
  readonly canUseWorkspace = computed(() => this.workspace().length > 0);

  /**
   * @description Load the resolved settings
   * @returns {void}
   */
  ngOnInit(): void {
    this.load();
  }

  /**
   * @description Fetch the current settings from the server
   * @returns {void}
   */
  load(): void {
    this.service.getSettings().subscribe({
      next: (settings) => this.settings.set(settings),
      error: (error: unknown) => this.fail(error),
    });
  }

  /**
   * @description Set the rule type for the next filter
   * @param {string} value - `exact` or `regex`; other values are ignored.
   * @returns {void}
   */
  setMode(value: string): void {
    if (value === "exact" || value === "regex") this.mode.set(value);
  }

  /**
   * @description Switch the edited scope
   * @summary Ignores `workspace` when no workspace is set.
   * @param {AtFileSettingsScope} scope - the scope to edit.
   * @returns {void}
   */
  setScope(scope: AtFileSettingsScope): void {
    if (scope === "workspace" && !this.canUseWorkspace()) return;
    this.scope.set(scope);
  }

  /**
   * @description Save the mentions-enabled toggle
   * @param {boolean} enabled - the new value.
   * @returns {void}
   */
  toggleEnabled(enabled: boolean): void {
    this.save({ field: "enabled", value: enabled });
  }

  /**
   * @description Save the pasted-mentions toggle
   * @param {boolean} enabled - the new value.
   * @returns {void}
   */
  togglePastedMentions(enabled: boolean): void {
    this.save({ field: "ignorePastedMentions", value: enabled });
  }

  /**
   * @description Validate and add the typed filter
   * @summary Rejects an empty pattern, a regex that does not compile, an exact
   * name containing a path separator, and a duplicate of an existing rule; each
   * rejection sets {@link error} and returns without saving. A valid rule is
   * appended to the active scope and the pattern resets.
   * @returns {void}
   */
  addRule(): void {
    const pattern = this.pattern().trim();
    if (pattern === "") return;
    if (this.mode() === "regex") {
      try {
        new RegExp(pattern, this.caseSensitive() ? "" : "i");
      } catch {
        this.error.set(
          "Invalid regular expression. Check the pattern and try again."
        );
        return;
      }
    } else if (/[\\/]/u.test(pattern)) {
      this.error.set("A file name filter cannot contain a path separator.");
      return;
    }
    const next: AtFileIgnoreRule = {
      kind: this.mode(),
      pattern,
      caseSensitive: this.caseSensitive(),
    };
    const existing = this.rules().map(ignoreRuleKey);
    if (existing.includes(ignoreRuleKey(next))) {
      this.error.set("This filter already exists.");
      return;
    }
    this.saveRules([...this.rules(), next]);
    this.pattern.set("");
    this.error.set(null);
  }

  /**
   * @description Remove one filter from the active scope
   * @param {AtFileIgnoreRule} rule - the rule to remove.
   * @returns {void}
   */
  removeRule(rule: AtFileIgnoreRule): void {
    const key = ignoreRuleKey(rule);
    this.saveRules(this.rules().filter((rule) => ignoreRuleKey(rule) !== key));
  }

  /**
   * @description Restore the built-in file filters in the active scope
   * @returns {void}
   */
  restoreDefaults(): void {
    this.saveRules([...DEFAULT_IGNORE_FILES]);
  }

  /**
   * @description Clear the workspace-scoped filters for the current workspace
   * @returns {void}
   */
  clearWorkspace(): void {
    this.saveWorkspaceRules([]);
  }

  private saveRules(rules: readonly AtFileIgnoreRuleInput[]): void {
    if (this.scope() === "workspace") {
      this.saveWorkspaceRules(rules);
    } else {
      this.save({ field: "ignoreFiles", value: [...rules] });
    }
  }

  private saveWorkspaceRules(
    rules: readonly AtFileIgnoreRuleInput[]
  ): void {
    const workspace = this.workspace();
    if (workspace === "") return;
    const settings = this.settings();
    if (!settings) return;
    const rest = settings.workspaceIgnoreFiles.filter(
      (entry) => entry.workspace !== workspace
    );
    this.save({
      field: "workspaceIgnoreFiles",
      value: [...rest, { workspace, ignoreFiles: [...rules] }],
    });
  }

  private save(update: Parameters<AtFileService["updateSettings"]>[0]): void {
    this.saving.set(true);
    this.error.set(null);
    this.service.updateSettings(update).subscribe({
      next: (settings) => {
        this.settings.set(settings);
        this.saving.set(false);
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.fail(error);
      },
    });
  }

  private fail(error: unknown): void {
    this.error.set(error instanceof Error ? error.message : String(error));
  }
}
