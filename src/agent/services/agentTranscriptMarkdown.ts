import type {
  AgentChatAttachment,
  AgentChatMessagePart,
  AgentChatMessageView,
} from "../types";

function roleHeading(role: AgentChatMessageView["role"]): string {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function attachmentLine(attachment: AgentChatAttachment): string {
  return `- ${attachment.name} (${attachment.mime}, ${attachment.size} B)`;
}

function fenced(value: string, language = ""): string {
  const fence = "```";
  return `${fence}${language}\n${value}\n${fence}`;
}

function jsonFence(value: unknown): string {
  try {
    return fenced(JSON.stringify(value, null, 2), "json");
  } catch {
    return fenced(String(value));
  }
}

function partMarkdown(part: AgentChatMessagePart): string {
  switch (part.kind) {
    case "text":
      return part.text;
    case "attachment":
      return attachmentLine(part.attachment);
    case "tool": {
      const lines = [`**tool ${part.name} (${part.status})**`];
      if (part.error) lines.push(`> ${part.error}`);
      if (part.input !== undefined) lines.push(jsonFence(part.input));
      if (part.output !== undefined) lines.push(jsonFence(part.output));
      return lines.join("\n");
    }
    case "reasoning":
      return `**reasoning**\n\n${part.content}`;
    case "code":
      return fenced(part.code, part.language ?? "");
    default:
      return "";
  }
}

/**
 * Renders a chat transcript as Markdown: one section per message with role
 * headings, timestamps, content, structured parts (text, attachments, tool
 * calls, reasoning, code), and a trailing newline.
 *
 * @param messages - Transcript messages in display order.
 * @param options - Optional document options; `title` adds a top-level heading.
 * @returns The complete Markdown transcript.
 */
export function agentChatTranscriptMarkdown(
  messages: AgentChatMessageView[],
  options: { title?: string } = {},
): string {
  const sections: string[] = [];
  if (options.title) sections.push(`# ${options.title}`);
  for (const message of messages) {
    const lines = [`## ${roleHeading(message.role)}`];
    if (message.createdAt) lines.push(`_${message.createdAt}_`);
    if (message.content) lines.push("", message.content);
    for (const part of message.parts ?? []) {
      const rendered = partMarkdown(part);
      if (rendered) lines.push("", rendered);
    }
    if (message.attachments?.length) {
      lines.push("");
      for (const attachment of message.attachments) {
        lines.push(attachmentLine(attachment));
      }
    }
    sections.push(lines.join("\n"));
  }
  return `${sections.join("\n\n").trimEnd()}\n`;
}
