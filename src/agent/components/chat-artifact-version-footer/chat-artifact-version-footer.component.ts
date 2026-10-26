import { Component, computed, input, output } from "@angular/core";
import { AgentTranslateFallbackPipe } from "../../i18n/agent-translate-fallback.pipe";
import type { AgentChatArtifactVersionEntry } from "../../types";
import { ChatIconComponent } from "../chat-icon/chat-icon.component";

/** Artifact version footer: current/total version navigation, active version label, and older/newer controls. */
@Component({
  selector: "ngx-decaf-chat-artifact-version-footer",
  templateUrl: "./chat-artifact-version-footer.component.html",
  styleUrls: ["./chat-artifact-version-footer.component.scss"],
  imports: [AgentTranslateFallbackPipe, ChatIconComponent],
  standalone: true,
})
export class ChatArtifactVersionFooterComponent {
  /** One-based index of the displayed version. */
  readonly currentVersion = input<number>(1);
  /** Total version count used when no version list is supplied. */
  readonly totalVersions = input<number>(1);
  /** Known version entries, indexed oldest to newest. */
  readonly versions = input<AgentChatArtifactVersionEntry[]>([]);

  /** Emits the requested one-based version index. */
  readonly versionChange = output<number>();

  /** Effective total version count (at least one). */
  readonly total = computed(() => {
    const explicit = this.totalVersions();
    const listed = this.versions().length;
    return Math.max(1, listed || explicit);
  });

  /** Effective current version clamped to the available range. */
  readonly current = computed(() =>
    Math.min(Math.max(1, Math.floor(this.currentVersion())), this.total()),
  );

  /** Whether an older version exists. */
  readonly canGoOlder = computed(() => this.current() > 1);
  /** Whether a newer version exists. */
  readonly canGoNewer = computed(() => this.current() < this.total());

  /** Label of the displayed version entry, when known. */
  readonly activeLabel = computed(() => {
    const entries = this.versions();
    if (!entries.length) return null;
    return entries[this.current() - 1]?.label ?? null;
  });

  /** Requests the previous version when available. */
  goOlder(): void {
    if (!this.canGoOlder()) return;
    this.versionChange.emit(this.current() - 1);
  }

  /** Requests the next version when available. */
  goNewer(): void {
    if (!this.canGoNewer()) return;
    this.versionChange.emit(this.current() + 1);
  }
}
