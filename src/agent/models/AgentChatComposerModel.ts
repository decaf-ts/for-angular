/**
 * @module for-angular/agent/models/AgentChatComposerModel
 * @summary Decaf ui-decorator model backing the agent chat composer fields
 * (slice U3 of SAA-836).
 * @description Declared for rendering the composer's message textarea through
 * the `ngx-decaf-crud-form` rendering engine, carrying the `agent.chat.*` i18n
 * label/placeholder keys the engine resolves. The `message` field is required
 * with a minimum length of one character, mirroring the component's own
 * `canSend` guard. (No component/story consumes the model yet; the rendering
 * engine wiring is the slice U3 deliverable.)
 */
import {
  minlength,
  model,
  Model,
  ModelArg,
  required,
} from "@decaf-ts/decorator-validation";
import { uielement, uimodel } from "@decaf-ts/ui-decorators";

/** Composer model holding the message text the user is about to send.
 *
 * @example
 * ```ts
 * const composer = new AgentChatComposerModel({ message: "" });
 * composer.hasErrors(); // { message: … } — required + minlength(1)
 * ```
 */
@uimodel("ngx-decaf-crud-form")
@model()
export class AgentChatComposerModel extends Model {
  /** Message text; required and non-empty (renders as a textarea). */
  @required()
  @minlength(1)
  @uielement("ngx-decaf-crud-field", {
    label: "agent.chat.composer.message.label",
    placeholder: "agent.chat.composer.message.placeholder",
    type: "textarea",
  })
  message!: string;

  constructor(arg: ModelArg<AgentChatComposerModel> = {}) {
    super(arg);
  }
}
