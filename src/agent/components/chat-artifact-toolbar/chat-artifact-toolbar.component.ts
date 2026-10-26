import { Component, computed, input, output, signal } from "@angular/core";
import { AgentTranslateFallbackPipe } from "../../i18n/agent-translate-fallback.pipe";
import type { AgentChatArtifactKind, AgentChatArtifactTool } from "../../types";
import { ChatIconComponent } from "../chat-icon/chat-icon.component";

/** Default artifact tools rendered by the toolbar, one per supported artifact kind. */
export const DEFAULT_AGENT_CHAT_ARTIFACT_TOOLS: AgentChatArtifactTool[] = [
  { kind: "text", icon: "file" },
  { kind: "code", icon: "pencil" },
  { kind: "image", icon: "image" },
  { kind: "sheet", icon: "box" },
];

const KIND_ICONS: Record<AgentChatArtifactKind, string> = {
  text: "file",
  code: "pencil",
  image: "image",
  sheet: "box",
};

/** Artifact kind toolbar: renders the available artifact tools (text, code, image, sheet) and emits the selected kind, falling back to internal selection when uncontrolled. */
@Component({
  selector: "ngx-decaf-chat-artifact-toolbar",
  templateUrl: "./chat-artifact-toolbar.component.html",
  styleUrls: ["./chat-artifact-toolbar.component.scss"],
  imports: [AgentTranslateFallbackPipe, ChatIconComponent],
  standalone: true,
})
export class ChatArtifactToolbarComponent {
  /** Artifact tools rendered by the toolbar. */
  readonly tools = input<AgentChatArtifactTool[]>(
    DEFAULT_AGENT_CHAT_ARTIFACT_TOOLS,
  );
  /** Controlled selected kind; when omitted the toolbar tracks its own selection. */
  readonly selected = input<AgentChatArtifactKind | null>(null);
  /** Disables every tool button. */
  readonly disabled = input<boolean>(false);

  /** Emits the kind of the activated tool. */
  readonly toolSelected = output<AgentChatArtifactKind>();

  /** Uncontrolled selection used when `selected` is not bound. */
  readonly internalSelected = signal<AgentChatArtifactKind | null>(null);
  /** Currently active artifact kind. */
  readonly active = computed(() => this.selected() ?? this.internalSelected());

  /** Icon name for a tool, falling back to the kind default. */
  iconFor(tool: AgentChatArtifactTool): string {
    return tool.icon ?? KIND_ICONS[tool.kind];
  }

  /** i18n key for a tool label, falling back to the kind default. */
  labelKeyFor(tool: AgentChatArtifactTool): string {
    return tool.labelKey ?? `agent.chat.artifact.toolbar.${tool.kind}`;
  }

  /** Whether the given tool is the active one. */
  isActive(tool: AgentChatArtifactTool): boolean {
    return this.active() === tool.kind;
  }

  /** Emits the tool selection when the tool is enabled. */
  select(tool: AgentChatArtifactTool): void {
    if (this.disabled() || tool.disabled) return;
    this.internalSelected.set(tool.kind);
    this.toolSelected.emit(tool.kind);
  }

  /** Tracks tool rows by artifact kind. */
  trackTool(_: number, tool: AgentChatArtifactTool): string {
    return tool.kind;
  }
}
