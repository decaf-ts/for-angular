import { ComponentFixture, TestBed } from "@angular/core/testing";
import type { GraphRunEventEnvelope } from "@decaf-ts/as-graph/shared";
import { GraphExecutionEventType } from "@decaf-ts/as-graph/shared";

import { AgentChatService } from "../../services/AgentChatService";
import { AGENT_CHAT_TRANSPORT } from "../../tokens/agent-chat.tokens";
import type {
  AgentChatMessageEdit,
  AgentChatMessageView,
  AgentChatSendRequest,
  AgentChatTransport,
  AgentChatTransportHandlers,
} from "../../types";
import { ChatMessageEditorComponent } from "./chat-message-editor.component";

const MESSAGE: AgentChatMessageView = {
  id: "message-1",
  role: "user",
  content: "How many orders shipped?",
  attachments: [],
  knowledgeSourceIds: [],
  createdAt: "2026-10-25T10:00:00.000Z",
};

async function flush(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

function mount(
  inputs: Record<string, unknown> = {},
): ComponentFixture<ChatMessageEditorComponent> {
  const fixture = TestBed.createComponent(ChatMessageEditorComponent);
  for (const [key, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(key, value);
  }
  fixture.detectChanges();
  fixture.detectChanges();
  return fixture;
}

function element(
  fixture: ComponentFixture<ChatMessageEditorComponent>,
): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

function textareaOf(
  fixture: ComponentFixture<ChatMessageEditorComponent>,
): HTMLTextAreaElement {
  return element(fixture).querySelector(
    ".chat-message-editor__input",
  ) as HTMLTextAreaElement;
}

function saveButtonOf(
  fixture: ComponentFixture<ChatMessageEditorComponent>,
): HTMLButtonElement {
  return element(fixture).querySelector(
    ".chat-message-editor__button--save",
  ) as HTMLButtonElement;
}

function cancelButtonOf(
  fixture: ComponentFixture<ChatMessageEditorComponent>,
): HTMLButtonElement {
  return element(fixture).querySelectorAll(
    ".chat-message-editor__button",
  )[1] as HTMLButtonElement;
}

function typeInto(
  fixture: ComponentFixture<ChatMessageEditorComponent>,
  value: string,
): void {
  const textarea = textareaOf(fixture);
  textarea.value = value;
  textarea.dispatchEvent(new Event("input"));
  fixture.detectChanges();
}

function submit(fixture: ComponentFixture<ChatMessageEditorComponent>): void {
  element(fixture)
    .querySelector(".chat-message-editor")!
    .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
}

function terminalEnvelope(runId: string): GraphRunEventEnvelope {
  return {
    runId,
    workflowId: "wf-1",
    sequence: 1,
    type: GraphExecutionEventType.WORKFLOW_COMPLETED,
    timestamp: "2026-10-25T10:00:00.000Z",
  } as GraphRunEventEnvelope;
}

describe("ChatMessageEditorComponent", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [ChatMessageEditorComponent] });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it("prefills the textarea from message.content", () => {
    const fixture = mount({ message: MESSAGE });
    expect(textareaOf(fixture).value).toBe("How many orders shipped?");
  });

  it("prefills the textarea from initialText when no message is supplied", () => {
    const fixture = mount({ message: null, initialText: "Draft text" });
    expect(textareaOf(fixture).value).toBe("Draft text");
  });

  it("associates the label with the textarea and exposes the placeholder", () => {
    const fixture = mount({ message: MESSAGE });
    const textarea = textareaOf(fixture);
    const label = element(fixture).querySelector(
      ".chat-message-editor__label",
    ) as HTMLLabelElement;

    expect(label.getAttribute("for")).toBe(textarea.id);
    expect(textarea.id).toBe(fixture.componentInstance.textareaId);
    expect(textarea.getAttribute("placeholder")).toBe("Update your message…");
  });

  it("disables save for blank text and while running", () => {
    const blank = mount({ message: null, initialText: "   " });
    expect(saveButtonOf(blank).disabled).toBe(true);

    const ready = mount({ message: MESSAGE });
    expect(saveButtonOf(ready).disabled).toBe(false);

    ready.componentRef.setInput("running", true);
    ready.detectChanges();
    expect(saveButtonOf(ready).disabled).toBe(true);
    expect(textareaOf(ready).disabled).toBe(true);
  });

  it("emits the edited payload on save", async () => {
    const fixture = mount({ message: MESSAGE });
    const saves: AgentChatMessageEdit[] = [];
    fixture.componentInstance.save.subscribe((edit) => saves.push(edit));

    typeInto(fixture, "  revised question  ");
    submit(fixture);
    await flush();
    fixture.detectChanges();

    expect(saves).toEqual([
      { messageId: "message-1", text: "revised question" },
    ]);
  });

  it("restores the original text and emits cancel", () => {
    const fixture = mount({ message: MESSAGE });
    const cancels: string[] = [];
    fixture.componentInstance.cancel.subscribe((id) => cancels.push(id));

    typeInto(fixture, "changed");
    cancelButtonOf(fixture).click();
    fixture.detectChanges();

    expect(textareaOf(fixture).value).toBe("How many orders shipped?");
    expect(cancels).toEqual(["message-1"]);
  });

  it("cancels on Escape", () => {
    const fixture = mount({ message: MESSAGE });
    const cancels: string[] = [];
    fixture.componentInstance.cancel.subscribe((id) => cancels.push(id));

    typeInto(fixture, "changed");
    textareaOf(fixture).dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );
    fixture.detectChanges();

    expect(cancels).toEqual(["message-1"]);
    expect(textareaOf(fixture).value).toBe("How many orders shipped?");
  });

  it("saves on Ctrl+Enter and Cmd+Enter", async () => {
    const fixture = mount({ message: MESSAGE });
    const saves: AgentChatMessageEdit[] = [];
    fixture.componentInstance.save.subscribe((edit) => saves.push(edit));

    typeInto(fixture, "ctrl save");
    textareaOf(fixture).dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Enter",
        ctrlKey: true,
        bubbles: true,
      }),
    );
    await flush();
    fixture.detectChanges();

    typeInto(fixture, "meta save");
    textareaOf(fixture).dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Enter",
        metaKey: true,
        bubbles: true,
      }),
    );
    await flush();
    fixture.detectChanges();

    expect(saves.map((edit) => edit.text)).toEqual(["ctrl save", "meta save"]);
  });

  it("surfaces the rejection when the chat service rejects the edit", async () => {
    TestBed.resetTestingModule();
    const editMessage = jest.fn().mockRejectedValue(new Error("edit rejected"));
    TestBed.configureTestingModule({
      imports: [ChatMessageEditorComponent],
      providers: [{ provide: AgentChatService, useValue: { editMessage } }],
    });

    const fixture = mount({ message: MESSAGE });
    const saves: AgentChatMessageEdit[] = [];
    fixture.componentInstance.save.subscribe((edit) => saves.push(edit));

    typeInto(fixture, "cannot save");
    submit(fixture);
    await flush();
    await flush();
    fixture.detectChanges();

    const error = element(fixture).querySelector(
      ".chat-message-editor__error",
    ) as HTMLElement;
    expect(editMessage).toHaveBeenCalledWith("message-1", "cannot save");
    expect(error).not.toBeNull();
    expect(error.getAttribute("role")).toBe("alert");
    expect(error.textContent?.trim()).toBe("edit rejected");
    expect(saves).toEqual([]);
  });

  it("truncates and re-sends through the real chat service", async () => {
    TestBed.resetTestingModule();
    let runSequence = 0;
    const transport = {
      send: jest.fn(
        async (
          _request: AgentChatSendRequest,
          handlers: AgentChatTransportHandlers,
        ) => {
          const runId = `run-${++runSequence}`;
          handlers.onTerminal(terminalEnvelope(runId));
          return { runId, eventsUrl: `/graph/runs/${runId}/events` };
        },
      ),
      replay: jest.fn().mockResolvedValue(undefined),
      cancel: jest.fn().mockResolvedValue(undefined),
    } as unknown as AgentChatTransport & { send: jest.Mock };

    TestBed.configureTestingModule({
      imports: [ChatMessageEditorComponent],
      providers: [
        AgentChatService,
        { provide: AGENT_CHAT_TRANSPORT, useValue: transport },
      ],
    });

    const service = TestBed.inject(AgentChatService);
    await service.send("first question");
    await service.send("second question");
    expect(service.messages()).toHaveLength(2);

    const target = service.messages()[0];
    const fixture = mount({ message: target });
    const saves: AgentChatMessageEdit[] = [];
    fixture.componentInstance.save.subscribe((edit) => saves.push(edit));

    typeInto(fixture, "revised question");
    submit(fixture);
    await flush();
    await flush();
    fixture.detectChanges();

    expect(transport.send).toHaveBeenCalledTimes(3);
    const request = transport.send.mock.calls[2][0] as AgentChatSendRequest;
    expect(request.message).toBe("revised question");
    expect(service.messages()).toHaveLength(1);
    expect(service.messages()[0].content).toBe("revised question");
    expect(saves).toEqual([
      { messageId: target.id, text: "revised question" },
    ]);
  });

  it("does not autofocus the textarea when autoFocus is false", () => {
    const fixture = mount({ message: MESSAGE, autoFocus: false });
    expect(document.activeElement).not.toBe(textareaOf(fixture));
  });
});
