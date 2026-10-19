/**
 * @module for-angular/agent
 * @summary Public barrel for the `for-angular/agent` chat UI export (slice U3
 * of SAA-836).
 * @description Re-exports the complete agent chat surface: transport contract
 * types, injection tokens, decaf ui-decorator models, the envelope fold and
 * transport/service implementations, the translation fallback pipe, and the
 * standalone `ngx-decaf-agent-chat` component.
 */
export * from "./types";
export * from "./tokens/agent-chat.tokens";
export * from "./models/AgentChatComposerModel";
export * from "./models/AgentChatMessageModel";
export * from "./services/agentEnvelopeFold";
export * from "./services/GraphRunAgentChatTransport";
export * from "./services/AgentChatService";
export * from "./i18n/agent-translate-fallback.pipe";
export * from "./components/agent-chat/agent-chat.component";
