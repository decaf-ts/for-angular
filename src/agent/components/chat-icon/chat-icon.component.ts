import { Component, input } from "@angular/core";

/** Icon names supported by `ngx-decaf-chat-icon`. */
export const AGENT_CHAT_ICON_NAMES = [
  "attachment",
  "bot",
  "box",
  "check",
  "chevron-down",
  "chevron-up",
  "copy",
  "download",
  "file",
  "gps",
  "home",
  "image",
  "info",
  "invoice",
  "loader",
  "menu",
  "pencil",
  "refresh",
  "send",
  "sparkles",
  "stop",
  "trash",
  "unchecked",
  "upload",
  "user",
  "vote-down",
  "vote-up",
  "x",
] as const;

/** Union of the icon names supported by `ngx-decaf-chat-icon`. */
export type AgentChatIconName = (typeof AGENT_CHAT_ICON_NAMES)[number];

/** Inline SVG icon renderer for the chat suite. Renders only names from `AGENT_CHAT_ICON_NAMES` and accepts an optional accessible title. */
@Component({
  selector: "ngx-decaf-chat-icon",
  templateUrl: "./chat-icon.component.html",
  styleUrls: ["./chat-icon.component.scss"],
  standalone: true,
})
export class ChatIconComponent {
  /** Icon name to render; unknown names fall back to the bot glyph. */
  readonly name = input<string>("bot");
  /** Rendered icon size in pixels. */
  readonly size = input<number>(20);
  /** SVG stroke width. */
  readonly strokeWidth = input<number>(1.75);
  /** Optional accessible title; when omitted the icon is decorative. */
  readonly title = input<string | null>(null);
}
