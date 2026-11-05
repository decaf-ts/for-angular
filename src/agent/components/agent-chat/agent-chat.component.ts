/**
 * @module for-angular/agent/components/agent-chat
 * @summary Standalone `ngx-decaf-agent-chat` composition root: the complete
 * agent conversation surface built from the chat component suite.
 * @description Composes the per-component chat primitives into one public
 * contract. The selector (`ngx-decaf-agent-chat`) and the existing inputs
 * (`workflow`, `workflowId`, `sessionId`, `headerTitleKey`,
 * `headerTitleFallback`, `knowledgeSources`) are unchanged; the template now
 * delegates rendering to `chat-conversation`, `chat-message`,
 * `chat-message-actions`, `chat-message-editor`, `chat-thinking-message`,
 * `chat-greeting`, `chat-composer`, the attachment family,
 * `chat-suggested-actions`, `chat-slash-commands`, the model/visibility
 * selectors, `chat-history`, `chat-knowledge-base-selector`,
 * `chat-telemetry`, and `chat-structured-object`.
 *
 * Conversation state still lives in {@link AgentChatService}; the component
 * only owns UI state (draft, staged attachments, open drawers, inline editing,
 * votes and selectors). Every user-facing string is resolved through
 * {@link AgentTranslateFallbackPipe} over the `agent.chat.*` i18n subtree.
 */
import {
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import type { GraphWorkflowDocument } from "@decaf-ts/as-graph/shared";
import { graphAuthMetadataOf } from "@decaf-ts/as-graph/shared";
import { GraphTranslateService } from "@decaf-ts/for-angular/diagrams";
import { AgentTranslateFallbackPipe } from "../../i18n/agent-translate-fallback.pipe";
import { AgentChatService } from "../../services/AgentChatService";
import {
  AGENT_CHAT_HISTORY_SOURCE,
  AGENT_CHAT_KNOWLEDGE_BASE_SOURCE,
} from "../../tokens/agent-chat.tokens";
import type {
  AgentChatAttachment,
  AgentChatHistoryEntry,
  AgentChatKnowledgeBaseEntry,
  AgentChatKnowledgeSource,
  AgentChatMessageEdit,
  AgentChatMessageVoteChange,
  AgentChatModel,
  AgentChatRunDescriptor,
  AgentChatSlashCommand,
  AgentChatStagedAttachment,
  AgentChatTranscriptDownload,
  AgentChatVisibility,
} from "../../types";
import { ChatConversationComponent } from "../chat-conversation/chat-conversation.component";
import { ChatMessageComponent } from "../chat-message/chat-message.component";
import { ChatMessageActionsComponent } from "../chat-message-actions/chat-message-actions.component";
import { ChatMessageEditorComponent } from "../chat-message-editor/chat-message-editor.component";
import { ChatThinkingMessageComponent } from "../chat-thinking-message/chat-thinking-message.component";
import { ChatGreetingComponent } from "../chat-greeting/chat-greeting.component";
import { ChatComposerComponent } from "../chat-composer/chat-composer.component";
import { ChatAttachmentInputComponent } from "../chat-attachment-input/chat-attachment-input.component";
import { ChatAttachmentPreviewComponent } from "../chat-attachment-preview/chat-attachment-preview.component";
import { ChatSuggestedActionsComponent } from "../chat-suggested-actions/chat-suggested-actions.component";
import { ChatSlashCommandsComponent } from "../chat-slash-commands/chat-slash-commands.component";
import { ChatModelSelectorComponent } from "../chat-model-selector/chat-model-selector.component";
import { ChatVisibilitySelectorComponent } from "../chat-visibility-selector/chat-visibility-selector.component";
import { ChatHistoryComponent } from "../chat-history/chat-history.component";
import { ChatKnowledgeBaseSelectorComponent } from "../chat-knowledge-base-selector/chat-knowledge-base-selector.component";
import { ChatTelemetryComponent } from "../chat-telemetry/chat-telemetry.component";
import { ChatStructuredObjectComponent } from "../chat-structured-object/chat-structured-object.component";
import { ChatHeaderComponent } from "../chat-header/chat-header.component";

/**
 * Composition root of the agent chat UI. Projects the conversation signals from
 * {@link AgentChatService} into the component suite, owns transient UI state
 * (draft, attachments, drawers, inline edit, selectors), and forwards user
 * actions back to the service and transport.
 */
@Component({
  selector: "ngx-decaf-agent-chat",
  templateUrl: "./agent-chat.component.html",
  styleUrls: ["./agent-chat.component.scss"],
  imports: [
    CommonModule,
    AgentTranslateFallbackPipe,
    ChatConversationComponent,
    ChatMessageComponent,
    ChatMessageActionsComponent,
    ChatMessageEditorComponent,
    ChatThinkingMessageComponent,
    ChatGreetingComponent,
    ChatComposerComponent,
    ChatAttachmentInputComponent,
    ChatAttachmentPreviewComponent,
    ChatSuggestedActionsComponent,
    ChatSlashCommandsComponent,
    ChatModelSelectorComponent,
    ChatVisibilitySelectorComponent,
    ChatHistoryComponent,
    ChatKnowledgeBaseSelectorComponent,
    ChatTelemetryComponent,
    ChatStructuredObjectComponent,
    ChatHeaderComponent,
  ],
  providers: [AgentChatService],
  standalone: true,
})
export class AgentChatComponent implements OnInit {
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
  /** Suggested prompts shown above the composer on an empty transcript. */
  readonly suggestions = input<string[]>([]);
  /** Slash commands offered by the composer popover. */
  readonly slashCommands = input<AgentChatSlashCommand[]>([]);
  /** Models offered by the composer's model selector. */
  readonly models = input<AgentChatModel[]>([]);
  /** Initial conversation visibility. */
  readonly visibility = input<AgentChatVisibility>("private");
  /** Whether the history rail is shown. */
  readonly showHistory = input<boolean>(true);
  /** Whether the knowledge-base selector is available. */
  readonly showKnowledgeBase = input<boolean>(true);
  /** Emits the transcript download payload produced by the conversation toolbar. */
  readonly download = output<AgentChatTranscriptDownload>();
  /** Emits the selected chat-history entry. */
  readonly historySelected = output<AgentChatHistoryEntry>();

  /** Conversation state service owned by this component instance. */
  readonly service = inject(AgentChatService);
  private readonly historySource = inject(AGENT_CHAT_HISTORY_SOURCE);
  private readonly knowledgeBaseSource = inject(AGENT_CHAT_KNOWLEDGE_BASE_SOURCE);
  private readonly translate = inject(GraphTranslateService);
  private readonly destroyRef = inject(DestroyRef);

  /** Composer draft text. */
  readonly draft = signal("");
  /** Staged attachments (metadata plus optional original file for previews). */
  readonly attachments = signal<AgentChatStagedAttachment[]>([]);
  /** Knowledge-base ids staged for the next send. */
  readonly selectedKnowledgeIds = signal<string[]>([]);
  /** Whether the telemetry panel is expanded. */
  readonly telemetryOpen = signal(false);
  /** Whether the history rail is expanded. */
  readonly historyOpen = signal(true);
  /** Whether the knowledge-base selector is open. */
  readonly knowledgeOpen = signal(false);
  /** Id of the message currently being edited inline, or `null`. */
  readonly editingMessageId = signal<string | null>(null);
  /** Active slash-command query, or `null` when not composing one. */
  readonly slashQuery = signal<string | null>(null);
  /** Loaded history entries. */
  readonly historyEntries = signal<AgentChatHistoryEntry[]>([]);
  /** Loaded knowledge-base entries. */
  readonly knowledgeEntries = signal<AgentChatKnowledgeBaseEntry[]>([]);
  /** Active history entry id. */
  readonly activeHistoryId = signal<string | null>(null);
  /** Selected model, or `null` when the selector is idle. */
  readonly selectedModel = signal<AgentChatModel | string | null>(null);
  /** Local visibility state (optimistic; there is no backend in demo mode). */
  readonly currentVisibility = signal<AgentChatVisibility>("private");
  /** Reference to the composed composer for slash-command insertion and focus. */
  readonly composer = viewChild(ChatComposerComponent);
  /** Hidden attachment input reference used by the legacy attach action. */
  readonly attachmentInput = viewChild(ChatAttachmentInputComponent);

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
  /** Header title resolved through the translation service. */
  readonly title = computed(() =>
    this.translate.key(this.headerTitleKey(), this.headerTitleFallback()),
  );
  /** Required authorization namespaces advertised as header chips. */
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
  /** The thinking placeholder shows only while no assistant text is streaming. */
  readonly showThinking = computed(
    () =>
      this.running() &&
      !this.messages().some((message) => message.streaming === true),
  );
  /** Number of staged knowledge-base ids. */
  readonly selectedKnowledgeCount = computed(
    () => this.selectedKnowledgeIds().length,
  );
  /** Suggested prompts only make sense before the first exchange. */
  readonly showSuggestions = computed(
    () => !this.messages().length && this.suggestions().length > 0,
  );
  /** Slash-command popover visibility. */
  readonly showSlashCommands = computed(
    () => this.slashQuery() !== null && this.slashCommands().length > 0,
  );
  /** Knowledge entries: the loaded source when available, else input sources. */
  readonly effectiveKnowledgeEntries = computed<AgentChatKnowledgeBaseEntry[]>(
    () => {
      const entries = this.knowledgeEntries();
      if (entries.length) return entries;
      return this.knowledgeSources().map((source) => ({ ...source }));
    },
  );
  /** The message currently being edited, or `null`. */
  readonly editingMessage = computed(() => {
    const id = this.editingMessageId();
    return id ? this.messages().find((message) => message.id === id) ?? null : null;
  });
  /** Structured object carrying partial (streaming) state. */
  readonly structuredPartial = computed(
    () => !!this.structuredObject() && this.running(),
  );

  /** Static class counter backing staged attachment ids (`attachment:<n>`). */
  private static attachmentSequence = 0;

  constructor() {
    this.currentVisibility.set(this.visibility());
  }

  /** Configures the service from the current inputs and loads the data sources. */
  ngOnInit(): void {
    this.service.configure({
      workflow: this.workflow() ?? undefined,
      workflowId: this.workflowId(),
      sessionId: this.sessionId(),
    });
    this.historySource
      .list({ page: 1, pageSize: 20 })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((entries) => this.historyEntries.set(entries ?? []));
    this.knowledgeBaseSource
      .list()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((entries) => this.knowledgeEntries.set(entries ?? []));
  }

  /** Keeps the composer draft in sync with the textarea. */
  onDraftInput(value: string): void {
    this.draft.set(value);
  }

  /** Sends the trimmed draft with staged attachments and knowledge selections. */
  async send(message: string = this.draft()): Promise<void> {
    const text = message.trim();
    if (!text || this.running()) return;
    const attachments = this.attachments().map(toAttachment);
    const knowledgeIds = this.selectedKnowledgeIds();
    this.draft.set("");
    this.attachments.set([]);
    this.selectedKnowledgeIds.set([]);
    this.slashQuery.set(null);
    await this.service.send(text, attachments, knowledgeIds);
  }

  /** Sends a suggested prompt immediately. */
  async sendSuggestion(suggestion: string): Promise<void> {
    if (this.running()) return;
    this.draft.set(suggestion);
    await this.send(suggestion);
  }

  /** Cancels the active run. */
  async cancel(): Promise<void> {
    await this.service.cancel();
  }

  /** Replays a recorded run's envelopes. */
  async replay(descriptor: AgentChatRunDescriptor): Promise<void> {
    await this.service.replay(descriptor);
  }

  /** Adds files selected through the composed attachment input. */
  onFilesSelected(files: File[]): void {
    const added = files.map<AgentChatStagedAttachment>((file) => ({
      id: `attachment:${++AgentChatComponent.attachmentSequence}`,
      name: file.name,
      mime: file.type || "application/octet-stream",
      size: file.size,
      file,
    }));
    this.attachments.set([...this.attachments(), ...added]);
  }

  /** Removes a staged attachment by id. */
  removeAttachment(id: string): void {
    this.attachments.set(this.attachments().filter((entry) => entry.id !== id));
  }

  /** Opens the knowledge-base selector. */
  openKnowledgeBase(): void {
    this.knowledgeOpen.set(true);
  }

  /** Closes the knowledge-base selector. */
  closeKnowledgeBase(open: boolean): void {
    this.knowledgeOpen.set(open);
  }

  /** Syncs the staged knowledge-selection ids. */
  onKnowledgeSelection(ids: string[]): void {
    this.selectedKnowledgeIds.set(ids);
  }

  /** Refreshes the knowledge-base entries after an upload. */
  onKnowledgeEntries(entries: AgentChatKnowledgeBaseEntry[]): void {
    this.knowledgeEntries.set(entries ?? []);
  }

  /** Toggles a knowledge-base id (compatibility inline path). */
  toggleKnowledge(id: string): void {
    const selected = this.selectedKnowledgeIds();
    this.selectedKnowledgeIds.set(
      selected.includes(id)
        ? selected.filter((entry) => entry !== id)
        : [...selected, id],
    );
  }

  /** Toggles the telemetry panel. */
  toggleTelemetry(): void {
    this.telemetryOpen.update((open) => !open);
  }

  /** Toggles the history rail. */
  toggleHistory(): void {
    this.historyOpen.update((open) => !open);
  }

  /** Opens a history entry (in-memory: resets the transcript and marks it active). */
  onSelectHistory(entry: AgentChatHistoryEntry): void {
    if (this.running()) return;
    this.activeHistoryId.set(entry.id);
    this.editingMessageId.set(null);
    this.service.reset();
    this.historySelected.emit(entry);
  }

  /** Starts a fresh conversation. */
  onNewChat(): void {
    if (this.running()) return;
    this.activeHistoryId.set(null);
    this.editingMessageId.set(null);
    this.service.reset();
  }

  /** Deletes a history entry through the injected source. */
  async onDeleteHistory(entry: AgentChatHistoryEntry): Promise<void> {
    const result = this.historySource.delete?.(entry.id);
    if (result) await Promise.resolve(result);
    this.historyEntries.set(
      this.historyEntries().filter((candidate) => candidate.id !== entry.id),
    );
    if (this.activeHistoryId() === entry.id) this.activeHistoryId.set(null);
  }

  /** Tracks the composer slash query and opens the command popover. */
  onSlashQuery(query: string | null): void {
    this.slashQuery.set(query);
  }

  /** Inserts the selected slash command into the composer. */
  onSlashCommand(command: AgentChatSlashCommand): void {
    this.composer()?.acceptSlashCommand(command.name);
    this.slashQuery.set(null);
  }

  /** Closes the slash-command popover. */
  closeSlashCommands(): void {
    this.slashQuery.set(null);
  }

  /** Records the selected model. */
  onModelChange(model: AgentChatModel): void {
    this.selectedModel.set(model);
  }

  /** Records the selected conversation visibility. */
  onVisibilityChange(visibility: AgentChatVisibility): void {
    this.currentVisibility.set(visibility);
  }

  /** Starts inline editing for a message. */
  startEdit(messageId: string): void {
    if (this.running()) return;
    this.editingMessageId.set(messageId);
  }

  /** Saves an inline edit and re-sends the message. */
  async saveEdit(edit: AgentChatMessageEdit): Promise<void> {
    this.editingMessageId.set(null);
    await this.service.editMessage(edit.messageId, edit.text);
  }

  /** Cancels inline editing. */
  cancelEdit(): void {
    this.editingMessageId.set(null);
  }

  /** Records a vote change on a message. */
  onVoteChange(change: AgentChatMessageVoteChange): void {
    this.service.setVote(change.messageId, change.vote);
  }

  /** Removes a message from the local transcript. */
  onDeleteMessage(messageId: string): void {
    if (this.editingMessageId() === messageId) this.editingMessageId.set(null);
    this.service.removeMessage(messageId);
  }

  /** Forwards the transcript download payload to consumers. */
  onDownload(payload: AgentChatTranscriptDownload): void {
    this.download.emit(payload);
  }

  /** `@for` track-by for transcript messages. */
  trackMessage(_: number, message: { id: string }): string {
    return message.id;
  }
}

/** Strips the browser file from a staged attachment before sending it. */
function toAttachment(attachment: AgentChatStagedAttachment): AgentChatAttachment {
  const { file: _file, ...metadata } = attachment;
  return metadata;
}
