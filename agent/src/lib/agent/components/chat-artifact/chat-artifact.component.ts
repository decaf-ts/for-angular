import { Component, computed, input, output } from "@angular/core";
import { AgentTranslateFallbackPipe } from "../../i18n/agent-translate-fallback.pipe";
import type {
  AgentChatArtifactKind,
  AgentChatArtifactVisibility,
} from "../../types";
import { ChatIconComponent } from "../chat-icon/chat-icon.component";
import { safeMediaUrl } from "../../utils/agentMediaUrl";

const KIND_ICONS: Record<AgentChatArtifactKind, string> = {
  text: "file",
  code: "pencil",
  image: "image",
  sheet: "box",
};

const VISIBILITY_ICONS: Record<AgentChatArtifactVisibility, string> = {
  private: "user",
  shared: "file",
  public: "bot",
};

/** Artifact panel header/content shell: title, kind and visibility badges, streamed text or image media, and an optional close action. */
@Component({
  selector: "ngx-decaf-chat-artifact",
  templateUrl: "./chat-artifact.component.html",
  styleUrls: ["./chat-artifact.component.scss"],
  imports: [AgentTranslateFallbackPipe, ChatIconComponent],
  standalone: true,
})
export class ChatArtifactComponent {
  /** Artifact title. */
  readonly title = input<string>("");
  /** Artifact kind controlling the icon and label. */
  readonly kind = input<AgentChatArtifactKind>("text");
  /** Artifact visibility controlling the icon and label. */
  readonly visibility = input<AgentChatArtifactVisibility>("private");
  /** Whether the artifact content is still streaming. */
  readonly streaming = input<boolean>(false);
  /** Artifact text content or image source. */
  readonly content = input<string | null>(null);
  /** Alternative text for image artifacts. */
  readonly imageAlt = input<string | null>(null);
  /** Whether the close action is rendered. */
  readonly closable = input<boolean>(true);

  /** Emits when the artifact is closed. */
  readonly close = output<void>();

  /** Icon name for the current kind. */
  readonly kindIcon = computed(() => KIND_ICONS[this.kind()]);
  /** i18n key for the current kind label. */
  readonly kindLabelKey = computed(
    () => `agent.chat.artifact.kind.${this.kind()}`,
  );
  /** Icon name for the current visibility. */
  readonly visibilityIcon = computed(
    () => VISIBILITY_ICONS[this.visibility()],
  );
  /** i18n key for the current visibility label. */
  readonly visibilityLabelKey = computed(
    () => `agent.chat.artifact.visibility.${this.visibility()}`,
  );
  /** Image source when the artifact is a safely addressable image. */
  readonly imageUrl = computed(() =>
    this.kind() === "image" ? safeMediaUrl(this.content()) : null,
  );
  /**
   * Whether the artifact declares image media; the actual render still depends
   * on {@link imageUrl} accepting the content through the media-URL allowlist.
   */
  readonly hasMedia = computed(
    () => this.kind() === "image" && Boolean(this.content()),
  );

  /** Emits the close request. */
  closeArtifact(): void {
    this.close.emit();
  }
}
