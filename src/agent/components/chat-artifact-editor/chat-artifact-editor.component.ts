import { Component, computed, inject, input, output } from "@angular/core";
import { GraphTranslateService } from "@decaf-ts/for-angular/diagrams";
import { CodeEditorComponent } from "@decaf-ts/for-angular/code-editor";
import { AgentTranslateFallbackPipe } from "../../i18n/agent-translate-fallback.pipe";
import type { AgentChatArtifactKind } from "../../types";
import { ChatIconComponent } from "../chat-icon/chat-icon.component";
import { safeMediaUrl } from "../../utils/agentMediaUrl";

const KIND_ICONS: Record<AgentChatArtifactKind, string> = {
  text: "file",
  code: "pencil",
  image: "image",
  sheet: "box",
};

/** Artifact content editor: switches between the code editor and a plain formula field based on artifact kind, renders image sources, and emits every content change. */
@Component({
  selector: "ngx-decaf-chat-artifact-editor",
  templateUrl: "./chat-artifact-editor.component.html",
  styleUrls: ["./chat-artifact-editor.component.scss"],
  imports: [
    AgentTranslateFallbackPipe,
    ChatIconComponent,
    CodeEditorComponent,
  ],
  standalone: true,
})
export class ChatArtifactEditorComponent {
  /** Kind of artifact being edited. */
  readonly kind = input<AgentChatArtifactKind>("text");
  /** Current artifact content. */
  readonly content = input<string>("");
  /** Language hint passed to the code editor. */
  readonly language = input<string | null>(null);
  /** Whether the content can be edited. */
  readonly editable = input<boolean>(true);
  /** Explicit image source override. */
  readonly src = input<string | null>(null);
  /** Alternative text for image artifacts. */
  readonly imageAlt = input<string | null>(null);
  /** Editor placeholder override. */
  readonly placeholder = input<string | null>(null);
  /** Accessible label override for the editor. */
  readonly ariaLabel = input<string | null>(null);

  /** Emits every content change. */
  readonly contentChange = output<string>();

  private readonly translate = inject(GraphTranslateService);

  /** Editor mode derived from the artifact kind. */
  readonly editorMode = computed<"code" | "formula">(() =>
    this.kind() === "code" ? "code" : "formula",
  );

  /** Icon name for the artifact kind. */
  readonly kindIcon = computed(() => KIND_ICONS[this.kind()]);

  /**
   * Image source to render for image artifacts: the explicit `src` when set,
   * otherwise the content, both restricted to allowlisted `http(s)`, `blob`,
   * and `data:image` URLs. `null` for other kinds or blocked sources.
   */
  readonly imageSrc = computed(() => {
    if (this.kind() !== "image") return null;
    const explicit = this.src();
    if (explicit) return safeMediaUrl(explicit);
    return safeMediaUrl(this.content());
  });

  /** Accessible label with translated fallback. */
  readonly resolvedAriaLabel = computed(
    () =>
      this.ariaLabel() ??
      this.translate.key("agent.chat.artifact.editor.label", "Artifact editor"),
  );

  /** Placeholder with translated fallback. */
  readonly resolvedPlaceholder = computed(
    () =>
      this.placeholder() ??
      this.translate.key(
        "agent.chat.artifact.editor.placeholder",
        "Start writing…",
      ),
  );

  /** Forwards editor content changes to consumers. */
  onContentChange(value: string): void {
    this.contentChange.emit(value);
  }
}
