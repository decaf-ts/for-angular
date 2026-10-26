import { Component, input } from "@angular/core";
import { AgentTranslateFallbackPipe } from "../../i18n/agent-translate-fallback.pipe";

/** Layout variant of the artifact skeleton: a full panel or an inline row. */
export type ChatArtifactSkeletonVariant = "full" | "inline";

/** Loading placeholder for artifact content; renders a fixed number of shimmering lines in full or inline layout. */
@Component({
  selector: "ngx-decaf-chat-artifact-skeleton",
  templateUrl: "./chat-artifact-skeleton.component.html",
  styleUrls: ["./chat-artifact-skeleton.component.scss"],
  imports: [AgentTranslateFallbackPipe],
  standalone: true,
})
export class ChatArtifactSkeletonComponent {
  /** Layout variant of the skeleton. */
  readonly variant = input<ChatArtifactSkeletonVariant>("full");
  /** Number of placeholder lines to render (minimum one). */
  readonly lines = input<number>(4);
  /** Optional accessible loading label. */
  readonly label = input<string | null>(null);

  /** Zero-based indexes used to render the placeholder lines. */
  lineRange(): number[] {
    const count = Math.max(1, Math.floor(this.lines()));
    return Array.from({ length: count }, (_, index) => index);
  }
}
