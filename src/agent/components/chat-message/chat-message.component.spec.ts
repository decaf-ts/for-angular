import { Component } from "@angular/core";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { By } from "@angular/platform-browser";

import type {
  AgentChatAttachment,
  AgentChatMessagePart,
  AgentChatRole,
} from "../../types";
import { ChatIconComponent } from "../chat-icon/chat-icon.component";
import { ChatMessageComponent } from "./chat-message.component";

@Component({
  standalone: true,
  imports: [ChatMessageComponent],
  template: `
    <ngx-decaf-chat-message [avatar]="avatar" [role]="role" content="">
      <span chatMessageAvatar class="projected-avatar">AV</span>
      <p chatMessageContent class="projected-content">Projected body</p>
    </ngx-decaf-chat-message>
  `,
})
class ChatMessageHostComponent {
  avatar: "default" | "none" = "default";
  role: AgentChatRole = "user";
}

const ATTACHMENT: AgentChatAttachment = {
  id: "att-1",
  name: "orders.csv",
  mime: "text/csv",
  size: 2048,
};

const PARTS: AgentChatMessagePart[] = [
  { id: "p-text", kind: "text", text: "I checked the pipeline.", streaming: true },
  { id: "p-attachment", kind: "attachment", attachment: ATTACHMENT },
  {
    id: "p-tool",
    kind: "tool",
    name: "queryOrders",
    status: "failed",
    input: { status: "delayed", limit: 3 },
    output: { count: 2 },
    error: "upstream timeout",
  },
  {
    id: "p-reasoning",
    kind: "reasoning",
    title: "Why this query",
    content: "Filtered by status.",
    open: true,
  },
  {
    id: "p-code",
    kind: "code",
    filename: "query.ts",
    language: "ts",
    code: "const x = 1;",
  },
];

function mount(
  inputs: Record<string, unknown> = {},
): ComponentFixture<ChatMessageComponent> {
  const fixture = TestBed.createComponent(ChatMessageComponent);
  for (const [key, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(key, value);
  }
  fixture.detectChanges();
  fixture.detectChanges();
  return fixture;
}

function element(fixture: ComponentFixture<ChatMessageComponent>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

function articleOf(fixture: ComponentFixture<ChatMessageComponent>): HTMLElement {
  return element(fixture).querySelector(".chat-message") as HTMLElement;
}

describe("ChatMessageComponent", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [ChatMessageComponent] });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it("applies the role class and data-role for every role", () => {
    const fixture = mount();

    for (const role of ["user", "assistant", "system", "error"] as AgentChatRole[]) {
      fixture.componentRef.setInput("role", role);
      fixture.detectChanges();

      const article = articleOf(fixture);
      expect(article.classList.contains(`chat-message--${role}`)).toBe(true);
      expect(article.getAttribute("data-role")).toBe(role);
      expect(
        article.querySelector(".chat-message__role")?.textContent?.trim(),
      ).toBe(role);
    }
  });

  it("renders the roleLabel override", () => {
    const fixture = mount({ role: "assistant", roleLabel: "Assistant agent" });
    expect(
      element(fixture).querySelector(".chat-message__role")?.textContent?.trim(),
    ).toBe("Assistant agent");
  });

  it("renders createdAt as a time element", () => {
    const fixture = mount({
      createdAt: "2026-10-25T10:00:04.000Z",
    });
    const time = element(fixture).querySelector(
      "time.chat-message__time",
    ) as HTMLTimeElement;

    expect(time).not.toBeNull();
    expect(time.getAttribute("datetime")).toBe("2026-10-25T10:00:04.000Z");
    expect(time.textContent?.trim()).toBe("2026-10-25T10:00:04.000Z");
  });

  it("renders the default avatar icon per role", () => {
    const fixture = mount();
    const expected: Record<AgentChatRole, string> = {
      user: "user",
      assistant: "bot",
      system: "info",
      error: "x",
    };

    for (const role of Object.keys(expected) as AgentChatRole[]) {
      fixture.componentRef.setInput("role", role);
      fixture.detectChanges();

      const avatar = fixture.debugElement.query(
        By.css(".chat-message__avatar"),
      );
      expect(avatar).not.toBeNull();
      expect(avatar.nativeElement.getAttribute("aria-hidden")).toBe("true");
      const icon = avatar.query(By.directive(ChatIconComponent));
      expect((icon.componentInstance as ChatIconComponent).name()).toBe(
        expected[role],
      );
    }
  });

  it("honours the avatarIcon override", () => {
    const fixture = mount({ role: "assistant", avatarIcon: "send" });
    const icon = fixture.debugElement
      .query(By.css(".chat-message__avatar"))
      .query(By.directive(ChatIconComponent));

    expect((icon.componentInstance as ChatIconComponent).name()).toBe("send");
  });

  it("renders the content fallback when there are no parts", () => {
    const fixture = mount({ content: "the answer" });
    expect(
      element(fixture).querySelector(".chat-message__text")?.textContent?.trim(),
    ).toBe("the answer");
  });

  it("renders every nested part kind", () => {
    const fixture = mount({ content: "", parts: PARTS });
    const html = element(fixture);

    const text = html.querySelector(
      ".chat-message__text",
    ) as HTMLElement;
    expect(text.textContent?.trim()).toBe("I checked the pipeline.");
    expect(text.classList.contains("chat-message__text--streaming")).toBe(true);

    const attachment = html.querySelector(
      ".chat-message__attachment",
    ) as HTMLElement;
    expect(attachment.textContent).toContain("orders.csv");
    expect(attachment.textContent).toContain("text/csv, 2048B");

    const tool = html.querySelector(
      ".chat-message__part--tool",
    ) as HTMLElement;
    expect(tool.getAttribute("data-status")).toBe("failed");
    expect(tool.querySelector(".chat-message__tool-name")?.textContent?.trim()).toBe(
      "queryOrders",
    );
    expect(
      tool.querySelector(".chat-message__tool-status")?.textContent?.trim(),
    ).toBe("failed");
    const toolError = tool.querySelector(
      ".chat-message__tool-error",
    ) as HTMLElement;
    expect(toolError.getAttribute("role")).toBe("alert");
    expect(toolError.textContent?.trim()).toBe("upstream timeout");
    const details = tool.querySelector(
      ".chat-message__tool-details",
    ) as HTMLDetailsElement;
    expect(details).not.toBeNull();
    const json = Array.from(
      tool.querySelectorAll(".chat-message__tool-json"),
    ).map((node) => node.textContent ?? "");
    expect(json.join("\n")).toContain('"limit": 3');
    expect(json.join("\n")).toContain('"count": 2');

    const reasoning = html.querySelector("ngx-decaf-chat-reasoning");
    expect(reasoning).not.toBeNull();
    expect(
      reasoning?.querySelector(".chat-reasoning__title")?.textContent?.trim(),
    ).toBe("Why this query");
    expect(
      reasoning?.querySelector(".chat-reasoning__content")?.textContent,
    ).toContain("Filtered by status.");

    const code = html.querySelector("ngx-decaf-chat-code-block");
    expect(code).not.toBeNull();
    expect(
      code?.querySelector(".chat-code-block__title")?.textContent?.trim(),
    ).toBe("query.ts");
    expect(
      code?.querySelector(".chat-code-block__token--keyword")?.textContent,
    ).toBe("const");
  });

  it("suppresses the content fallback when parts are present", () => {
    const fixture = mount({
      content: "outer content",
      parts: [{ id: "p-text", kind: "text", text: "inner content" }],
    });
    const text = element(fixture).querySelector(".chat-message__text");

    expect(text?.textContent?.trim()).toBe("inner content");
    expect(element(fixture).textContent).not.toContain("outer content");
  });

  it("renders attachment chips only when no attachment part exists", () => {
    const withAttachments = mount({
      attachments: [ATTACHMENT],
      parts: [],
    });
    const chips = withAttachments.nativeElement.querySelectorAll(
      "ul.chat-message__attachments li",
    ) as NodeListOf<HTMLElement>;
    expect(chips).toHaveLength(1);
    expect(chips[0].textContent).toContain("orders.csv");
    expect(chips[0].textContent).toContain("text/csv, 2048B");

    const withPart = mount({ attachments: [ATTACHMENT], parts: PARTS });
    expect(
      withPart.nativeElement.querySelector("ul.chat-message__attachments"),
    ).toBeNull();
  });

  it("renders action chips with an accessible label", () => {
    const fixture = mount({
      actions: ["lookup-orders", "summarize"],
    });
    const list = element(fixture).querySelector(
      "ul.chat-message__actions",
    ) as HTMLElement;
    const chips = list.querySelectorAll(".chat-message__action-chip");

    expect(list.getAttribute("aria-label")).toBe("Agent actions");
    expect(chips).toHaveLength(2);
    expect(chips[0].textContent?.trim()).toBe("lookup-orders");
    expect(chips[1].textContent?.trim()).toBe("summarize");
  });

  it("renders the streaming caret, label, and aria-busy state", () => {
    const fixture = mount({ content: "", streaming: true });
    const article = articleOf(fixture);

    expect(article.classList.contains("chat-message--streaming")).toBe(true);
    expect(article.getAttribute("aria-busy")).toBe("true");
    expect(
      element(fixture).querySelector(".chat-message__caret"),
    ).not.toBeNull();
    expect(
      element(fixture).querySelector(".chat-message__streaming")?.textContent?.trim(),
    ).toBe("Streaming…");
  });

  it("marks pending messages busy without a streaming caret", () => {
    const fixture = mount({ pending: true, streaming: false });
    const article = articleOf(fixture);

    expect(article.classList.contains("chat-message--pending")).toBe(true);
    expect(article.getAttribute("aria-busy")).toBe("true");
    expect(element(fixture).querySelector(".chat-message__caret")).toBeNull();

    fixture.componentRef.setInput("pending", false);
    fixture.detectChanges();
    expect(article.getAttribute("aria-busy")).toBeNull();
  });

  it("projects content and avatar slots and supports avatar=none", () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ imports: [ChatMessageHostComponent] });
    const fixture = TestBed.createComponent(ChatMessageHostComponent);
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector(".projected-content")?.textContent?.trim(),
    ).toBe("Projected body");
    expect(
      fixture.nativeElement.querySelector(
        ".chat-message__avatar .projected-avatar",
      ),
    ).not.toBeNull();
    expect(
      fixture.nativeElement.querySelector(".chat-message__text"),
    ).toBeNull();
    fixture.destroy();

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ imports: [ChatMessageHostComponent] });
    const withoutAvatar = TestBed.createComponent(ChatMessageHostComponent);
    withoutAvatar.componentInstance.avatar = "none";
    withoutAvatar.detectChanges();

    expect(
      withoutAvatar.nativeElement.querySelector(".chat-message__avatar"),
    ).toBeNull();
    expect(
      withoutAvatar.nativeElement.querySelector(".projected-content"),
    ).not.toBeNull();
    expect(
      withoutAvatar.nativeElement.querySelector("ngx-decaf-chat-icon"),
    ).toBeNull();
  });
});
