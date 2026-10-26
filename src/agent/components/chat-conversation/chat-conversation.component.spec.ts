import { Component } from "@angular/core";
import { ComponentFixture, TestBed } from "@angular/core/testing";

import type {
  AgentChatMessageView,
  AgentChatTranscriptDownload,
} from "../../types";
import { ChatConversationComponent } from "./chat-conversation.component";

const urlApi = URL as unknown as {
  createObjectURL?: (blob: Blob) => string;
  revokeObjectURL?: (url: string) => void;
};

const originalCreateObjectURL = urlApi.createObjectURL;
const originalRevokeObjectURL = urlApi.revokeObjectURL;

@Component({
  standalone: true,
  imports: [ChatConversationComponent],
  template: `
    <ngx-decaf-chat-conversation
      [messages]="messages"
      [emptyMessage]="emptyMessage"
    >
      <p class="custom-empty" chatConversationEmpty>Custom empty slot</p>
    </ngx-decaf-chat-conversation>
  `,
})
class ChatConversationHostComponent {
  messages: AgentChatMessageView[] = [];
  emptyMessage: string | null = null;
}

function message(
  id: string,
  role: AgentChatMessageView["role"] = "user",
  content = "Hello",
): AgentChatMessageView {
  return {
    id,
    role,
    content,
    attachments: [],
    knowledgeSourceIds: [],
    createdAt: "2026-10-25T10:00:00.000Z",
  };
}

function mount(): ComponentFixture<ChatConversationComponent> {
  const fixture = TestBed.createComponent(ChatConversationComponent);
  fixture.detectChanges();
  return fixture;
}

function element(
  fixture: ComponentFixture<ChatConversationComponent>,
): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

function transcriptOf(
  fixture: ComponentFixture<ChatConversationComponent>,
): HTMLElement {
  return element(fixture).querySelector(
    ".chat-conversation__transcript",
  ) as HTMLElement;
}

describe("ChatConversationComponent", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [ChatConversationComponent] });
  });

  afterEach(() => {
    urlApi.createObjectURL = originalCreateObjectURL;
    urlApi.revokeObjectURL = originalRevokeObjectURL;
    TestBed.resetTestingModule();
  });

  it("renders an aria-live log and reflects the running state in aria-busy", () => {
    const fixture = mount();
    const transcript = transcriptOf(fixture);

    expect(transcript.getAttribute("role")).toBe("log");
    expect(transcript.getAttribute("aria-live")).toBe("polite");
    expect(transcript.getAttribute("aria-relevant")).toBe("additions");
    expect(transcript.getAttribute("aria-busy")).not.toBe("true");

    fixture.componentRef.setInput("running", true);
    fixture.detectChanges();
    expect(transcript.getAttribute("aria-busy")).toBe("true");
  });

  it("renders the default empty message when there are no messages", () => {
    const fixture = mount();

    expect(element(fixture).querySelector(".chat-conversation__empty")).not.toBeNull();
    expect(
      element(fixture).querySelector(".chat-conversation__empty-message")
        ?.textContent?.trim(),
    ).toBe("Start the conversation by sending a message.");
  });

  it("honours the emptyMessage override", () => {
    const fixture = mount();
    fixture.componentRef.setInput("emptyMessage", "Nothing here yet");
    fixture.detectChanges();

    expect(
      element(fixture).querySelector(".chat-conversation__empty-message")
        ?.textContent?.trim(),
    ).toBe("Nothing here yet");
  });

  it("suppresses the default empty text with showEmptyMessage=false", () => {
    const fixture = mount();
    fixture.componentRef.setInput("showEmptyMessage", false);
    fixture.detectChanges();

    expect(
      element(fixture).querySelector(".chat-conversation__empty"),
    ).not.toBeNull();
    expect(
      element(fixture).querySelector(".chat-conversation__empty-message"),
    ).toBeNull();
  });

  it("projects a custom empty slot and hides the empty state once messages exist", () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ imports: [ChatConversationHostComponent] });
    const fixture = TestBed.createComponent(ChatConversationHostComponent);
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector(".custom-empty")?.textContent?.trim(),
    ).toBe("Custom empty slot");

    fixture.componentInstance.messages = [message("m-1")];
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector(".chat-conversation__empty"),
    ).toBeNull();
  });

  it("autoscrolls the transcript when messages arrive", () => {
    const fixture = mount();
    const transcript = transcriptOf(fixture);
    let scrollTop = 0;
    Object.defineProperty(transcript, "scrollHeight", {
      value: 640,
      configurable: true,
    });
    Object.defineProperty(transcript, "clientHeight", {
      value: 200,
      configurable: true,
    });
    Object.defineProperty(transcript, "scrollTop", {
      get: () => scrollTop,
      set: (value: number) => {
        scrollTop = value;
      },
      configurable: true,
    });

    fixture.componentRef.setInput("messages", [message("m-1")]);
    fixture.detectChanges();
    fixture.detectChanges();

    expect(scrollTop).toBe(640);
  });

  it("shows the scroll-to-bottom button when scrolled up and scrolls down on click", () => {
    const fixture = mount();
    const transcript = transcriptOf(fixture);
    let scrollTop = 100;
    Object.defineProperty(transcript, "scrollHeight", {
      value: 1000,
      configurable: true,
    });
    Object.defineProperty(transcript, "clientHeight", {
      value: 200,
      configurable: true,
    });
    Object.defineProperty(transcript, "scrollTop", {
      get: () => scrollTop,
      set: (value: number) => {
        scrollTop = value;
      },
      configurable: true,
    });

    transcript.dispatchEvent(new Event("scroll"));
    fixture.detectChanges();

    const button = element(fixture).querySelector(
      ".chat-conversation__scroll",
    ) as HTMLButtonElement;
    expect(button).not.toBeNull();
    expect(button.getAttribute("aria-label")).toBe(
      "Scroll to the newest message",
    );

    button.click();
    fixture.detectChanges();

    expect(scrollTop).toBe(1000);
    expect(
      element(fixture).querySelector(".chat-conversation__scroll"),
    ).toBeNull();
  });

  it("emits a markdown transcript with the configured filename and title", () => {
    const fixture = mount();
    fixture.componentRef.setInput("messages", [
      message("m-1", "user", "Hello"),
      message("m-2", "assistant", "Hi there"),
    ]);
    fixture.componentRef.setInput("downloadFilename", "session.md");
    fixture.componentRef.setInput("downloadTitle", "Session");
    fixture.detectChanges();

    const downloads: AgentChatTranscriptDownload[] = [];
    fixture.componentInstance.download.subscribe((event) =>
      downloads.push(event),
    );

    fixture.componentInstance.downloadTranscript();

    expect(downloads).toHaveLength(1);
    expect(downloads[0].filename).toBe("session.md");
    expect(downloads[0].markdown).toContain("# Session");
    expect(downloads[0].markdown).toContain("## User");
    expect(downloads[0].markdown).toContain("Hello");
    expect(downloads[0].markdown).toContain("## Assistant");
    expect(downloads[0].markdown).toContain("Hi there");
  });

  it("prefers downloadText over the generated transcript", () => {
    const fixture = mount();
    fixture.componentRef.setInput("messages", [message("m-1")]);
    fixture.componentRef.setInput("downloadText", "custom transcript");
    fixture.detectChanges();

    const downloads: AgentChatTranscriptDownload[] = [];
    fixture.componentInstance.download.subscribe((event) =>
      downloads.push(event),
    );

    fixture.componentInstance.downloadTranscript();

    expect(downloads[0].markdown).toBe("custom transcript");
  });

  it("creates and revokes an object URL when the browser supports it", () => {
    const createObjectURL = jest.fn(() => "blob:mock");
    const revokeObjectURL = jest.fn();
    urlApi.createObjectURL = createObjectURL;
    urlApi.revokeObjectURL = revokeObjectURL;
    const anchorClick = jest
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => undefined);

    const fixture = mount();
    fixture.componentRef.setInput("messages", [message("m-1")]);
    fixture.componentRef.setInput("downloadFilename", "session.md");
    fixture.detectChanges();

    fixture.componentInstance.downloadTranscript();

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect((createObjectURL.mock.calls[0] as unknown as [Blob])[0]).toBeInstanceOf(Blob);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:mock");
    expect(anchorClick).toHaveBeenCalledTimes(1);

    anchorClick.mockRestore();
  });

  it("hides the download toolbar when downloadEnabled is false", () => {
    const fixture = mount();
    fixture.componentRef.setInput("downloadEnabled", false);
    fixture.detectChanges();

    expect(
      element(fixture).querySelector(".chat-conversation__toolbar"),
    ).toBeNull();
    expect(
      element(fixture).querySelector(".chat-conversation__download"),
    ).toBeNull();
  });
});
