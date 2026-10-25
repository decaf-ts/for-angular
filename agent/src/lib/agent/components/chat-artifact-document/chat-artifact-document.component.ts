import { Component, computed, effect, inject, input, output, signal } from "@angular/core";
import { GraphTranslateService } from "@decaf-ts/for-angular/diagrams";
import { AgentTranslateFallbackPipe } from "../../i18n/agent-translate-fallback.pipe";
import type {
  AgentChatArtifactDocument,
  AgentChatArtifactDocumentStatus,
} from "../../types";
import { ChatArtifactSkeletonComponent } from "../chat-artifact-skeleton/chat-artifact-skeleton.component";
import { ChatIconComponent } from "../chat-icon/chat-icon.component";

type DocumentLoader = (id: string) => Promise<AgentChatArtifactDocument>;

/** Artifact document viewer with its own load lifecycle: renders a preview or URL, loads content through an injected loader, and exposes loading, failure, and reload states. */
@Component({
  selector: "ngx-decaf-chat-artifact-document",
  templateUrl: "./chat-artifact-document.component.html",
  styleUrls: ["./chat-artifact-document.component.scss"],
  imports: [
    AgentTranslateFallbackPipe,
    ChatArtifactSkeletonComponent,
    ChatIconComponent,
  ],
  standalone: true,
})
export class ChatArtifactDocumentComponent {
  /** Externally supplied document status. */
  readonly status = input<AgentChatArtifactDocumentStatus>("pending");
  /** Id of the document to load when no document object is supplied. */
  readonly documentId = input<string | null>(null);
  /** Preloaded document; when supplied, no loader is invoked. */
  readonly document = input<AgentChatArtifactDocument | null>(null);
  /** Async loader used to fetch the document by id. */
  readonly loader = input<DocumentLoader | null>(null);
  /** External error message override. */
  readonly error = input<string | null>(null);
  /** Name of the tool that produced the document. */
  readonly toolName = input<string | null>(null);

  /** Emits the document once it loads successfully. */
  readonly loaded = output<AgentChatArtifactDocument>();
  /** Emits the error message when loading fails. */
  readonly failed = output<string>();
  /** Emits the document id when a reload is requested. */
  readonly reloadRequested = output<string>();

  private readonly translate = inject(GraphTranslateService);

  /** Document loaded by this component. */
  readonly internalDocument = signal<AgentChatArtifactDocument | null>(null);
  /** Load status tracked by this component. */
  readonly internalStatus = signal<AgentChatArtifactDocumentStatus | null>(
    null,
  );
  /** Load error tracked by this component. */
  readonly internalError = signal<string | null>(null);

  /** Document to render (external over internal). */
  readonly effectiveDocument = computed(
    () => this.document() ?? this.internalDocument(),
  );

  /** Status to render, derived from the document or lifecycle. */
  readonly effectiveStatus = computed<AgentChatArtifactDocumentStatus>(() => {
    if (this.document()) return "succeeded";
    if (this.status() !== "pending") return this.status();
    return this.internalStatus() ?? "pending";
  });

  /** Error text to render, with a translated fallback. */
  readonly errorMessage = computed(
    () =>
      this.internalError() ??
      this.error() ??
      this.translate.key(
        "agent.chat.artifact.document.error",
        "The document could not be loaded.",
      ),
  );

  private requestedId: string | null = null;

  constructor() {
    effect(() => {
      const document = this.document();
      const documentId = this.documentId();
      const loader = this.loader();
      if (document || !documentId || !loader) return;
      if (this.requestedId === documentId) return;
      if (this.internalDocument()?.id === documentId) return;
      this.requestedId = documentId;
      void this.load(documentId, loader);
    });
  }

  /** Reloads the document and emits the reload request. */
  async reload(): Promise<void> {
    const documentId = this.documentId();
    const loader = this.loader();
    if (!documentId || !loader) return;
    this.requestedId = documentId;
    this.reloadRequested.emit(documentId);
    await this.load(documentId, loader);
  }

  private async load(documentId: string, loader: DocumentLoader): Promise<void> {
    this.internalStatus.set("loading");
    this.internalError.set(null);
    try {
      const document = await loader(documentId);
      this.internalDocument.set(document);
      this.internalStatus.set("succeeded");
      this.loaded.emit(document);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error ?? "");
      this.internalStatus.set("failed");
      this.internalError.set(message || null);
      this.failed.emit(message);
    }
  }

  /** Truncated preview of a document's content or URL. */
  previewOf(document: AgentChatArtifactDocument): string {
    const content = document.content ?? document.url ?? "";
    return content.length > 240 ? `${content.slice(0, 240)}…` : content;
  }

  /** i18n key for a document's kind label. */
  kindLabelKey(document: AgentChatArtifactDocument): string {
    return `agent.chat.artifact.kind.${document.kind}`;
  }
}
