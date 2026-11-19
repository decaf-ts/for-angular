import { Component, computed, input, output } from "@angular/core";
import { AgentTranslateFallbackPipe } from "@decaf-ts/for-angular/agent";
import type { AtFileDraftMention } from "../../types.js";
import { draftMentions } from "../../utils.js";

/**
 * @description Reference dock for `@path` tokens in the draft
 * @summary Standalone presentational dock that lists the `@path` tokens in the
 * draft whose relative path exists in the current index, so only real
 * workspace references are shown. Removing a mention emits the token span and
 * the host edits the draft; activating a path emits `open` for the host to
 * handle.
 * @class AtFileDockComponent
 * @category Files UI
 * @example
 * ```html
 * <ngx-decaf-at-file-dock
 *   [draft]="draft"
 *   [indexed]="indexed"
 *   [enabled]="enabled"
 *   (remove)="onRemove($event)"
 *   (open)="onOpen($event)">
 * </ngx-decaf-at-file-dock>
 * ```
 */
@Component({
  selector: "ngx-decaf-at-file-dock",
  templateUrl: "./at-file-dock.component.html",
  styleUrls: ["./at-file-dock.component.scss"],
  imports: [AgentTranslateFallbackPipe],
  standalone: true,
})
export class AtFileDockComponent {
  /** Current draft text scanned for referenced tokens. */
  readonly draft = input<string>("");
  /** Workspace-relative paths present in the index. */
  readonly indexed = input<string[]>([]);
  /** Whether the dock is shown; when false no mentions are computed. */
  readonly enabled = input<boolean>(true);

  /** Emits the span of a reference the user removed. */
  readonly remove = output<{ start: number; end: number }>();
  /** Emits the relative path of a reference the user activated. */
  readonly open = output<string>();

  /** Referenced tokens that exist in the index, in draft order. */
  readonly mentions = computed<readonly AtFileDraftMention[]>(() => {
    if (!this.enabled()) return [];
    return draftMentions(this.draft(), new Set(this.indexed()));
  });

  /**
   * @description Remove one referenced token
   * @summary Emits the token span; the host owns the draft edit.
   * @param {AtFileDraftMention} mention - the reference to remove.
   * @returns {void}
   */
  removeMention(mention: AtFileDraftMention): void {
    this.remove.emit({ start: mention.start, end: mention.end });
  }
}
