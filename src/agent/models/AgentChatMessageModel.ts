/**
 * @module for-angular/agent/models/AgentChatMessageModel
 * @summary Decaf ui-decorator model for editing/inspecting a chat transcript
 * entry (slice U3 of SAA-836).
 * @description Declared for rendering a transcript message through the
 * `ngx-decaf-crud-form` engine: a `role` select fed by {@link AGENT_CHAT_ROLES}
 * and a required `content` textarea, plus read-only metadata fields for the
 * originating run id and creation timestamp. All field labels reference the
 * `agent.chat.*` i18n subtree resolved at render time. (No component/story
 * consumes the model yet; the rendering engine wiring is the slice U3
 * deliverable.)
 */
import {
  model,
  Model,
  ModelArg,
  required,
} from "@decaf-ts/decorator-validation";
import { uielement, uimodel } from "@decaf-ts/ui-decorators";

/** Role options for the message model's `role` select, each carrying its `agent.chat.role.*` i18n key. */
export const AGENT_CHAT_ROLES: { value: string; text: string }[] = [
  { value: "user", text: "agent.chat.role.user" },
  { value: "assistant", text: "agent.chat.role.assistant" },
  { value: "system", text: "agent.chat.role.system" },
  { value: "error", text: "agent.chat.role.error" },
];

/** Transcript entry model mirroring the chat message view for form rendering.
 *
 * @example
 * ```ts
 * const entry = new AgentChatMessageModel({ role: "user", content: "Hello" });
 * entry.hasErrors(); // {} — role/content satisfied
 * ```
 */
@uimodel("ngx-decaf-crud-form")
@model()
export class AgentChatMessageModel extends Model {
  /** Message role; required, rendered as a select over {@link AGENT_CHAT_ROLES}. */
  @required()
  @uielement("ngx-decaf-crud-field", {
    label: "agent.chat.role.label",
    type: "select",
    options: AGENT_CHAT_ROLES,
  })
  role!: string;

  /** Message text; required, rendered as a textarea. */
  @required()
  @uielement("ngx-decaf-crud-field", {
    label: "agent.chat.transcript.content.label",
    placeholder: "agent.chat.transcript.content.placeholder",
    type: "textarea",
  })
  content!: string;

  /** Run id the message belongs to (optional metadata field). */
  @uielement("ngx-decaf-crud-field", {
    label: "agent.chat.roundtrip.label",
  })
  runId?: string;

  /** ISO creation timestamp (optional metadata field). */
  @uielement("ngx-decaf-crud-field", {
    label: "agent.chat.transcript.created.label",
  })
  createdAt?: string;

  constructor(arg: ModelArg<AgentChatMessageModel> = {}) {
    super(arg);
  }
}
