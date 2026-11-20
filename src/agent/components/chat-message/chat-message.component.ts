import { Component, computed, input } from "@angular/core";
import {
  GenuiBlockComponent,
  GenuiFenceComponent,
  isGenuiSpec,
  splitGenuiFences,
  type GenuiRenderContext,
  type GenuiSpec,
} from "@decaf-ts/for-angular/gen-ui";
import { AgentTranslateFallbackPipe } from "../../i18n/agent-translate-fallback.pipe";
import type {
  AgentChatAttachment,
  AgentChatAttachmentPart,
  AgentChatCodePart,
  AgentChatMessagePart,
  AgentChatReasoningPart,
  AgentChatRole,
  AgentChatTextPart,
  AgentChatToolPart,
} from "../../types";
import { ChatCodeBlockComponent } from "../chat-code-block/chat-code-block.component";
import { ChatIconComponent } from "../chat-icon/chat-icon.component";
import { ChatReasoningComponent } from "../chat-reasoning/chat-reasoning.component";

/** Single chat message: role avatar/label, text content, nested message parts (text, attachments, tools, reasoning, code), and an optional action list. */
@Component({
  selector: "ngx-decaf-chat-message",
  templateUrl: "./chat-message.component.html",
  styleUrls: ["./chat-message.component.scss"],
  imports: [
    ChatIconComponent,
    ChatReasoningComponent,
    ChatCodeBlockComponent,
    AgentTranslateFallbackPipe,
    GenuiFenceComponent,
    GenuiBlockComponent,
  ],
  standalone: true,
})
export class ChatMessageComponent {
  /** Author role driving the avatar and default styling. */
  readonly role = input<AgentChatRole>("assistant");
  /** Plain text content of the message. */
  readonly content = input<string>("");
  /** ISO timestamp rendered under the message. */
  readonly createdAt = input<string | null>(null);
  /** Attachments attached directly to the message. */
  readonly attachments = input<AgentChatAttachment[]>([]);
  /** Structured parts rendered in order inside the message. */
  readonly parts = input<AgentChatMessagePart[]>([]);
  /** Action ids offered for the message. */
  readonly actions = input<string[]>([]);
  /** Whether the message is still streaming. */
  readonly streaming = input<boolean>(false);
  /** Whether the message is queued and not yet rendered as final. */
  readonly pending = input<boolean>(false);
  /** Avatar display mode. */
  readonly avatar = input<"default" | "none">("default");
  /** Explicit avatar icon override. */
  readonly avatarIcon = input<string | null>(null);
  /** Optional role label override. */
  readonly roleLabel = input<string | null>(null);
  /**
   * @description Conversation session id used as the GenUI action/provenance scope
   * @summary Forwarded into every {@link GenuiRenderContext} built by
   * {@link ChatMessageComponent.genuiContext}, so inline GenUI blocks and the
   * session panel resolve the same interaction state and action provenance.
   */
  readonly sessionId = input<string>("");

  /** Whether structured parts are present. */
  readonly hasParts = computed(() => this.parts().length > 0);
  /** Whether the standalone attachment list is shown (no attachment part present). */
  readonly showsAttachmentList = computed(
    () =>
      this.attachments().length > 0 &&
      !this.parts().some((part) => part.kind === "attachment"),
  );
  /** Resolved avatar icon name for the role. */
  readonly avatarName = computed(() => {
    const override = this.avatarIcon();
    if (override) return override;
    switch (this.role()) {
      case "user":
        return "user";
      case "assistant":
        return "bot";
      case "system":
        return "info";
      default:
        return "x";
    }
  });

  /** Narrows a message part to its text shape for the template. */
  asText(part: AgentChatMessagePart): AgentChatTextPart {
    return part as AgentChatTextPart;
  }

  /** Narrows a message part to its attachment shape for the template. */
  asAttachment(part: AgentChatMessagePart): AgentChatAttachmentPart {
    return part as AgentChatAttachmentPart;
  }

  /** Narrows a message part to its tool shape for the template. */
  asTool(part: AgentChatMessagePart): AgentChatToolPart {
    return part as AgentChatToolPart;
  }

  /** Narrows a message part to its reasoning shape for the template. */
  asReasoning(part: AgentChatMessagePart): AgentChatReasoningPart {
    return part as AgentChatReasoningPart;
  }

  /** Narrows a message part to its code shape for the template. */
  asCode(part: AgentChatMessagePart): AgentChatCodePart {
    return part as AgentChatCodePart;
  }

  /**
   * @description Whether a text part contains at least one `dsh-ui` fence
   * @summary Cheaply skips plain text (no triple backticks) before splitting
   * fences, then reports whether any segment parsed as GenUI. The template uses
   * this to choose the fence renderer over the plain text renderer.
   * @param {string} text The message part text.
   * @returns {boolean} `true` when at least one GenUI fence is present.
   */
  hasGenui(text: string): boolean {
    return text.includes("```") && splitGenuiFences(text).some((segment) => segment.kind === "genui");
  }

  /**
   * @description Build the GenUI render context for one inline part
   * @summary Uses the message part id as the block id and derives a stable
   * inline spec id, keeping each fence's interaction state independent.
   * @param {AgentChatMessagePart} part The part being rendered.
   * @returns {GenuiRenderContext} The context for the inline fence.
   */
  genuiContext(part: AgentChatMessagePart): GenuiRenderContext {
    return {
      sessionId: this.sessionId(),
      blockId: part.id,
      specId: `${part.id}:inline`,
    };
  }

  /**
   * @description Read the repaired spec carried by a `render_ui` tool result
   * @summary Accepts either a spec directly in `meta` or a spec under
   * `meta.presentationMeta`. Returns `null` when the tool carried no valid spec,
   * in which case the tool row renders without a presentation.
   * @param {AgentChatToolPart} tool The tool part.
   * @returns {GenuiSpec|null} The presentation spec, or `null`.
   */
  presentationSpec(tool: AgentChatToolPart): GenuiSpec | null {
    const meta = tool.meta;
    if (meta === null || typeof meta !== "object") return null;
    if (isGenuiSpec(meta)) return meta;
    if (!("presentationMeta" in meta)) return null;
    const spec = (meta as { presentationMeta?: unknown }).presentationMeta;
    return isGenuiSpec(spec) ? spec : null;
  }

  /** Tracks message parts by id. */
  trackPart(_: number, part: AgentChatMessagePart): string {
    return part.id;
  }

  /** Serializes a tool payload for display, falling back to `String` on cyclic values. */
  stringify(value: unknown): string {
    try {
      return JSON.stringify(value, null, 2) ?? String(value);
    } catch {
      return String(value);
    }
  }
}
