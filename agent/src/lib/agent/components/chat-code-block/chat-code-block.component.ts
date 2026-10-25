import {
  Component,
  DestroyRef,
  computed,
  inject,
  input,
  output,
  signal,
} from "@angular/core";
import { AgentTranslateFallbackPipe } from "../../i18n/agent-translate-fallback.pipe";
import { ChatIconComponent } from "../chat-icon/chat-icon.component";

/** Token categories produced by `tokenizeAgentChatCode`. */
export type AgentChatCodeTokenType =
  | "plain"
  | "comment"
  | "string"
  | "number"
  | "keyword"
  | "literal"
  | "punctuation";

/** One highlighted token of a code block. */
export interface AgentChatCodeToken {
  /** Exact source text covered by this token. */
  text: string;
  /** Highlight category of the token. */
  type: AgentChatCodeTokenType;
}

const COMMON_KEYWORDS = [
  "as",
  "async",
  "await",
  "break",
  "case",
  "catch",
  "class",
  "const",
  "constructor",
  "continue",
  "declare",
  "default",
  "delete",
  "do",
  "else",
  "enum",
  "export",
  "extends",
  "finally",
  "for",
  "from",
  "function",
  "get",
  "if",
  "implements",
  "import",
  "in",
  "instanceof",
  "interface",
  "let",
  "new",
  "of",
  "private",
  "protected",
  "public",
  "readonly",
  "return",
  "set",
  "static",
  "super",
  "switch",
  "this",
  "throw",
  "try",
  "type",
  "typeof",
  "var",
  "void",
  "while",
  "yield",
];

const PYTHON_KEYWORDS = [
  "and",
  "as",
  "assert",
  "async",
  "await",
  "break",
  "class",
  "continue",
  "def",
  "del",
  "elif",
  "else",
  "except",
  "finally",
  "for",
  "from",
  "global",
  "if",
  "import",
  "in",
  "is",
  "lambda",
  "nonlocal",
  "not",
  "or",
  "pass",
  "raise",
  "return",
  "try",
  "while",
  "with",
  "yield",
];

const SHELL_KEYWORDS = [
  "case",
  "cd",
  "do",
  "done",
  "echo",
  "elif",
  "else",
  "esac",
  "export",
  "fi",
  "for",
  "function",
  "if",
  "in",
  "local",
  "return",
  "then",
  "until",
  "while",
];

const LITERALS = new Set([
  "true",
  "false",
  "null",
  "undefined",
  "NaN",
  "Infinity",
  "None",
  "True",
  "False",
]);

function keywordsFor(language: string | null): Set<string> {
  const value = (language ?? "").toLowerCase();
  if (["py", "python"].includes(value)) return new Set(PYTHON_KEYWORDS);
  if (["sh", "bash", "shell", "zsh", "console"].includes(value)) {
    return new Set(SHELL_KEYWORDS);
  }
  return new Set(COMMON_KEYWORDS);
}

function hashCommentsFor(language: string | null): boolean {
  return ["py", "python", "sh", "bash", "shell", "zsh", "yaml", "yml", "ruby"].includes(
    (language ?? "").toLowerCase(),
  );
}

const IDENTIFIER = /[A-Za-z_$]/;
const NUMBER = /[0-9]/;
const IDENTIFIER_PART = /[A-Za-z0-9_$]/;
const PUNCTUATION = /[{}()[\].,;:<>+\-*/%=!&|^~?]/;

/**
 * Splits source code into highlighted tokens using a small language-aware
 * scanner (keywords, literals, strings, comments, numbers, punctuation).
 *
 * @param code - Source text to tokenize.
 * @param language - Fence language used to choose keyword and comment rules.
 * @param highlight - When `false`, returns the whole input as a single plain token.
 * @returns The token sequence preserving the exact source text.
 */
export function tokenizeAgentChatCode(
  code: string,
  language: string | null,
  highlight: boolean,
): AgentChatCodeToken[] {
  if (!code) return [];
  if (!highlight) return [{ text: code, type: "plain" }];
  const keywords = keywordsFor(language);
  const hashComments = hashCommentsFor(language);
  const tokens: AgentChatCodeToken[] = [];
  const push = (text: string, type: AgentChatCodeTokenType): void => {
    if (text) tokens.push({ text, type });
  };
  let index = 0;
  while (index < code.length) {
    const char = code[index];
    if (
      (char === "/" && code[index + 1] === "/") ||
      (hashComments && char === "#")
    ) {
      const end = code.indexOf("\n", index);
      const stop = end === -1 ? code.length : end;
      push(code.slice(index, stop), "comment");
      index = stop;
      continue;
    }
    if (char === "/" && code[index + 1] === "*") {
      const end = code.indexOf("*/", index + 2);
      const stop = end === -1 ? code.length : end + 2;
      push(code.slice(index, stop), "comment");
      index = stop;
      continue;
    }
    if (char === "'" || char === '"' || char === "`") {
      let cursor = index + 1;
      let escaped = false;
      while (cursor < code.length) {
        const current = code[cursor];
        if (escaped) {
          escaped = false;
          cursor += 1;
          continue;
        }
        if (current === "\\") {
          escaped = true;
          cursor += 1;
          continue;
        }
        if (current === char) {
          cursor += 1;
          break;
        }
        cursor += 1;
      }
      push(code.slice(index, cursor), "string");
      index = cursor;
      continue;
    }
    if (NUMBER.test(char) || (char === "." && NUMBER.test(code[index + 1] ?? ""))) {
      let cursor = index + 1;
      while (cursor < code.length && /[0-9a-fA-FxX._]/.test(code[cursor])) {
        cursor += 1;
      }
      push(code.slice(index, cursor), "number");
      index = cursor;
      continue;
    }
    if (IDENTIFIER.test(char)) {
      let cursor = index + 1;
      while (cursor < code.length && IDENTIFIER_PART.test(code[cursor])) {
        cursor += 1;
      }
      const word = code.slice(index, cursor);
      push(
        word,
        keywords.has(word)
          ? "keyword"
          : LITERALS.has(word)
            ? "literal"
            : "plain",
      );
      index = cursor;
      continue;
    }
    if (PUNCTUATION.test(char)) {
      push(char, "punctuation");
      index += 1;
      continue;
    }
    let cursor = index + 1;
    while (cursor < code.length) {
      const current = code[cursor];
      if (
        IDENTIFIER.test(current) ||
        NUMBER.test(current) ||
        current === "'" ||
        current === '"' ||
        current === "`" ||
        current === "#" ||
        (current === "/" &&
          (code[cursor + 1] === "/" || code[cursor + 1] === "*")) ||
        PUNCTUATION.test(current)
      ) {
        break;
      }
      cursor += 1;
    }
    push(code.slice(index, cursor), "plain");
    index = cursor;
  }
  return tokens;
}

/** Syntax-highlighted code block: optional filename/title header, a lightweight tokenizer for common languages, and copy-to-clipboard with a temporary confirmation state. */
@Component({
  selector: "ngx-decaf-chat-code-block",
  templateUrl: "./chat-code-block.component.html",
  styleUrls: ["./chat-code-block.component.scss"],
  imports: [ChatIconComponent, AgentTranslateFallbackPipe],
  standalone: true,
})
export class ChatCodeBlockComponent {
  /** Source code rendered by the block. */
  readonly code = input<string>("");
  /** Fence language used to pick keywords and comment syntax. */
  readonly language = input<string | null>(null);
  /** Optional filename shown in the header. */
  readonly filename = input<string | null>(null);
  /** Optional title shown in the header. */
  readonly title = input<string | null>(null);
  /** Whether the copy action is offered. */
  readonly copyable = input<boolean>(true);
  /** Whether syntax highlighting is applied. */
  readonly highlight = input<boolean>(true);
  /** Whether the block header is rendered. */
  readonly showHeader = input<boolean>(true);

  /** Emits the copied source code. */
  readonly copy = output<string>();
  /** Whether the copy confirmation is currently shown. */
  readonly copied = signal(false);

  /** Highlighted tokens for the current code and language. */
  readonly tokens = computed(() =>
    tokenizeAgentChatCode(this.code(), this.language(), this.highlight()),
  );

  private readonly destroyRef = inject(DestroyRef);
  private copiedTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.destroyRef.onDestroy(() => {
      if (this.copiedTimer) clearTimeout(this.copiedTimer);
    });
  }

  /** Copies the source code and emits the copy event. */
  async copyCode(): Promise<void> {
    const text = this.code();
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        this.copied.set(false);
      }
    }
    this.copied.set(true);
    this.copy.emit(text);
    if (this.copiedTimer) clearTimeout(this.copiedTimer);
    this.copiedTimer = setTimeout(() => this.copied.set(false), 2000);
  }
}
