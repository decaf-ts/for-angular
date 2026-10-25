/**
 * @module for-angular/agent
 * @summary Public barrel for the `for-angular/agent` chat UI export.
 * @description Re-exports the complete agent chat surface: transport contract
 * types, injection tokens, decaf ui-decorator models, the envelope fold,
 * transcript renderer, transport/service implementations (including the
 * deterministic fake transport and in-memory data sources), the translation
 * fallback pipe, the standalone `ngx-decaf-agent-chat` composition root, and
 * every per-family chat component (`ngx-decaf-chat-*`).
 */
export * from "./types";
export * from "./tokens/agent-chat.tokens";
export * from "./models/AgentChatComposerModel";
export * from "./models/AgentChatMessageModel";
export * from "./services/agentEnvelopeFold";
export * from "./services/agentTranscriptMarkdown";
export * from "./services/GraphRunAgentChatTransport";
export * from "./services/AgentChatFakeTransport";
export * from "./services/AgentChatService";
export * from "./i18n/agent-translate-fallback.pipe";
export * from "./components/agent-chat/agent-chat.component";
export * from "./components/chat-header/chat-header.component";
export * from "./components/chat-icon/chat-icon.component";
export * from "./components/chat-conversation/chat-conversation.component";
export * from "./components/chat-message/chat-message.component";
export * from "./components/chat-message-actions/chat-message-actions.component";
export * from "./components/chat-message-editor/chat-message-editor.component";
export * from "./components/chat-thinking-message/chat-thinking-message.component";
export * from "./components/chat-greeting/chat-greeting.component";
export * from "./components/chat-code-block/chat-code-block.component";
export * from "./components/chat-reasoning/chat-reasoning.component";
export * from "./services/InMemoryAgentChatHistorySource";
export * from "./services/InMemoryAgentKnowledgeBaseSource";
export * from "./components/chat-history/chat-history.component";
export * from "./components/chat-history-item/chat-history-item.component";
export * from "./components/chat-knowledge-base-selector/chat-knowledge-base-selector.component";
export * from "./components/chat-composer/chat-composer.component";
export * from "./components/chat-attachment-input/chat-attachment-input.component";
export * from "./components/chat-attachment-preview/chat-attachment-preview.component";
export * from "./components/chat-attachment-part/chat-attachment-part.component";
export * from "./components/chat-suggested-actions/chat-suggested-actions.component";
export * from "./components/chat-slash-commands/chat-slash-commands.component";
export * from "./components/chat-model-selector/chat-model-selector.component";
export * from "./components/chat-visibility-selector/chat-visibility-selector.component";
export * from "./components/chat-suggestion-dialog/chat-suggestion-dialog.component";
export * from "./components/chat-structured-object/chat-structured-object.component";
export * from "./components/chat-notification/chat-notification.component";
export * from "./components/chat-artifact/chat-artifact.component";
export * from "./components/chat-artifact-document/chat-artifact-document.component";
export * from "./components/chat-artifact-skeleton/chat-artifact-skeleton.component";
export * from "./components/chat-artifact-toolbar/chat-artifact-toolbar.component";
export * from "./components/chat-artifact-version-footer/chat-artifact-version-footer.component";
export * from "./components/chat-artifact-diff/chat-artifact-diff.component";
export * from "./components/chat-artifact-console/chat-artifact-console.component";
export * from "./components/chat-artifact-editor/chat-artifact-editor.component";
export * from "./components/chat-tool/chat-tool.component";
export * from "./components/chat-tool-orders/chat-tool-orders.component";
export * from "./components/chat-tool-tracker/chat-tool-tracker.component";
export * from "./components/chat-tool-weather/chat-tool-weather.component";
export * from "./components/chat-workflow-status/chat-workflow-status.component";
export * from "./components/chat-agent-step/chat-agent-step.component";
export * from "./components/chat-nested-agent/chat-nested-agent.component";
export * from "./components/chat-progress/chat-progress.component";
export * from "./components/chat-approval/chat-approval.component";
export * from "./components/chat-telemetry/chat-telemetry.component";
