/**
 * @module for-angular/agent/components/agent-chat
 * @summary Standalone `ngx-decaf-agent-chat` component: agent conversation UI
 * on top of {@link AgentChatService} (slice U3 of SAA-836).
 * @description Renders the full agent chat surface:
 *
 * - A transcript `<section role="log" aria-live="polite">` with per-role
 *   styling, action chips, attachment chips, and auto-scroll to the newest
 *   message (deferred to `ngAfterViewChecked` via a `scrollPending` flag so
 *   the DOM is measured after rendering).
 * - A composer with Enter-to-send / Shift+Enter-newline handling, UI-only
 *   attachments (metadata only; file contents are never read), and a
 *   knowledge-base selector whose selections are forwarded as
 *   `knowledgeBaseIds` run inputs.
 * - A collapsible telemetry strip fed by
 *   {@link AgentChatRoundtripTelemetry} rows.
 * - A structured-object (use-object) panel reusing
 *   {@link GraphIoViewerComponent} for the latest
 *   {@link AgentChatStructuredObjectView}.
 * - Namespace chips derived from `graphAuthMetadataOf` on the configured
 *   workflow document's metadata, advertising the document's required
 *   authorization namespaces.
 *
 * All user-facing strings flow through the {@link AgentTranslateFallbackPipe}
 * over the `agent.chat.*` i18n subtree so a missing key degrades to the
 * hardcoded English fallback instead of a raw key.
 */
import {
  AfterViewChecked,
  Component,
  ElementRef,
  OnInit,
  computed,
  effect,
  inject,
  input,
  signal,
  viewChild,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import type { GraphWorkflowDocument } from "@decaf-ts/as-graph/shared";
import { graphAuthMetadataOf } from "@decaf-ts/as-graph/shared";
import { GraphTranslateService, GraphIoViewerComponent } from "@decaf-ts/for-angular/diagrams";
import { AgentTranslateFallbackPipe } from "../../i18n/agent-translate-fallback.pipe";
import { AgentChatService } from "../../services/AgentChatService";
import type {
  AgentChatAttachment,
  AgentChatKnowledgeSource,
  AgentChatRunDescriptor,
} from "../../types";

/**
 * The agent chat component. Provides a fresh {@link AgentChatService} instance
 * per component (see `providers`), configures it from the inputs on
 * `ngOnInit`, and keeps all conversation state in signals.
 */
@Component({
  selector: "ngx-decaf-agent-chat",
  templateUrl: "./agent-chat.component.html",
  styleUrls: ["./agent-chat.component.scss"],
  imports: [CommonModule, GraphIoViewerComponent, AgentTranslateFallbackPipe],
  providers: [AgentChatService],
  standalone: true,
})
export class AgentChatComponent implements OnInit, AfterViewChecked {
  /** Inline workflow document to run for each message; overrides `workflowId` when set. */
  readonly workflow = input<GraphWorkflowDocument | null>(null);
  /** Backend workflow id used when no inline document is provided. */
  readonly workflowId = input<string | null>(null);
  /** Explicit conversation session id; generated per service when omitted. */
  readonly sessionId = input<string | null>(null);
  /** i18n key for the header title (default `agent.chat.title`). */
  readonly headerTitleKey = input<string>("agent.chat.title");
  /** Fallback text for the header title when the key is missing. */
  readonly headerTitleFallback = input<string>("Agent chat");
  /** Knowledge-base entries offered by the composer's selector. */
  readonly knowledgeSources = input<AgentChatKnowledgeSource[]>([]);

  /** Conversation state service owned by this component instance. */
  readonly service = inject(AgentChatService);
  private readonly translate = inject(GraphTranslateService);
  private readonly host = inject(ElementRef<HTMLElement>);

  /** Composer draft text. */
  readonly draft = signal("");
  /** Attachments staged for the next send (UI metadata only). */
  readonly attachments = signal<AgentChatAttachment[]>([]);
  /** Knowledge-base ids staged for the next send. */
  readonly selectedKnowledgeIds = signal<string[]>([]);
  /** Whether the telemetry strip is expanded. */
  readonly showTelemetry = signal(false);
  /** Whether the structured-object panel is expanded. */
  readonly showStructured = signal(false);

  /** Transcript messages (from {@link AgentChatService.messages}). */
  readonly messages = computed(() => this.service.messages());
  /** Per-run telemetry rows (from {@link AgentChatService.roundtrips}). */
  readonly roundtrips = computed(() => this.service.roundtrips());
  /** Whether a roundtrip is in flight. */
  readonly running = computed(() => this.service.running());
  /** Last surfaced error, or `null`. */
  readonly error = computed(() => this.service.error());
  /** Latest structured object, or `null`. */
  readonly structuredObject = computed(() => this.service.structuredObject());
  /** Tri-state backend reachability (from {@link AgentChatService.backendAvailable}). */
  readonly backendAvailable = computed(() => this.service.backendAvailable());

  /** Transcript scroll container (queried after view init for auto-scroll). */
  readonly transcript = viewChild.required<ElementRef<HTMLElement>>("transcript");
  /** Set whenever new messages/roundtrips land; consumed by `ngAfterViewChecked` to auto-scroll. */
  private scrollPending = false;

  /** Header title resolved through the translation service with the configured key/fallback. */
  readonly title = computed(() =>
    this.translate.key(this.headerTitleKey(), this.headerTitleFallback()),
  );

  /**
   * Required authorization namespaces advertised as header chips, derived from
   * `graphAuthMetadataOf` on the configured workflow document's metadata
   * (empty when no workflow is configured).
   */
  readonly requiredNamespaces = computed<string[]>(() => {
    const document = this.workflow();
    const auth = document
      ? graphAuthMetadataOf(document.metadata as Record<string, unknown> | null)
      : undefined;
    return auth?.namespaces ?? [];
  });

  /** Whether the composer can send: not running and non-blank draft. */
  readonly canSend = computed(
    () => !this.running() && this.draft().trim().length > 0,
  );

  /** Static class counter backing staged attachment ids (`attachment:<n>`). */
  private static attachmentSequence = 0;

  constructor() {
    effect(() => {
      void this.messages().length;
      void this.roundtrips().length;
      this.running();
      this.scrollPending = true;
    });
  }

  /** Configures {@link service} from the current inputs (workflow, workflowId, sessionId). */
  ngOnInit(): void {
    this.service.configure({
      workflow: this.workflow() ?? undefined,
      workflowId: this.workflowId(),
      sessionId: this.sessionId(),
    });
  }

  /** Consumes the `scrollPending` flag by scrolling the transcript to its newest content. */
  ngAfterViewChecked(): void {
    if (!this.scrollPending) return;
    this.scrollPending = false;
    const element = this.transcript()?.nativeElement;
    if (element) element.scrollTop = element.scrollHeight;
  }

  /** Updates the composer draft signal from the textarea's `input` event.
   *
   * @param value - The textarea's current value.
   */
  onDraftInput(value: string): void {
    this.draft.set(value);
  }

  /**
   * Composer keyboard handling: `Enter` sends the message, `Shift+Enter`
   * inserts a newline.
   *
   * @param event - The composer textarea's keydown event.
   */
  onComposerKeydown(event: KeyboardEvent): void {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void this.send();
    }
  }

  /**
   * Sends the current draft with staged attachments/knowledge selections,
   * clearing them first so the composer is ready while the roundtrip streams.
   * No-op when {@link canSend} is `false`.
   */
  async send(): Promise<void> {
    if (!this.canSend()) return;
    const text = this.draft().trim();
    const attachments = this.attachments();
    const knowledgeIds = this.selectedKnowledgeIds();
    this.draft.set("");
    this.attachments.set([]);
    this.selectedKnowledgeIds.set([]);
    this.scrollPending = true;
    await this.service.send(text, attachments, knowledgeIds);
  }

  /** Cancels the active run via {@link AgentChatService.cancel}. */
  async cancel(): Promise<void> {
    await this.service.cancel();
  }

  /** Replays a recorded run's envelopes via {@link AgentChatService.replay}.
   *
   * @param descriptor - The recorded run descriptor to replay.
   */
  async replay(descriptor: AgentChatRunDescriptor): Promise<void> {
    await this.service.replay(descriptor);
  }

  /** Opens the hidden file input (metadata-only attachments; contents are never read).
   *
   * @param event - The triggering mouse/touch event (prevented).
   * @param input - The hidden file input to open.
   */
  openAttachments(event: Event, input: HTMLInputElement): void {
    event.preventDefault();
    input.click();
  }

  /** Converts selected files into staged attachment chips (id/name/mime/size) and resets the input.
   *
   * @param event - The file input's `change` event.
   */
  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (!files) return;
    const added = Array.from(files).map((file) => ({
      id: `attachment:${++AgentChatComponent.attachmentSequence}`,
      name: file.name,
      mime: file.type || "application/octet-stream",
      size: file.size,
    }));
    this.attachments.set([...this.attachments(), ...added]);
    input.value = "";
  }

  /** Removes a staged attachment by id.
   *
   * @param id - The staged attachment id to remove.
   */
  removeAttachment(id: string): void {
    this.attachments.set(this.attachments().filter((entry) => entry.id !== id));
  }

  /** Toggles a knowledge-base id in the staged selection.
   *
   * @param id - The knowledge-base id to toggle.
   */
  toggleKnowledge(id: string): void {
    const selected = this.selectedKnowledgeIds();
    this.selectedKnowledgeIds.set(
      selected.includes(id)
        ? selected.filter((entry) => entry !== id)
        : [...selected, id],
    );
  }

  /** Shows/hides the telemetry strip. */
  toggleTelemetry(): void {
    this.showTelemetry.update((visible) => !visible);
  }

  /** Shows/hides the structured-object viewer. */
  toggleStructured(): void {
    this.showStructured.update((visible) => !visible);
  }

  /** `@for` track-by: transcript messages are identified by their `id`.
   *
   * @param _ - Unused Angular track-by index.
   * @param message - The iterated message view.
   * @returns The message's tracking id.
   */
  trackMessage(_: number, message: { id: string }): string {
    return message.id;
  }

  /** `@for` track-by: telemetry rows are identified by their `runId`.
   *
   * @param _ - Unused Angular track-by index.
   * @param roundtrip - The iterated telemetry row.
   * @returns The row's tracking run id.
   */
  trackRoundtrip(_: number, roundtrip: { runId: string }): string {
    return roundtrip.runId;
  }
}
