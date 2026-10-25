import { ComponentFixture, TestBed } from "@angular/core/testing";

import type {
  AgentChatMessageVoteChange,
  AgentChatVote,
} from "../../types";
import { ChatMessageActionsComponent } from "./chat-message-actions.component";

function mount(
  inputs: Record<string, unknown> = {},
): ComponentFixture<ChatMessageActionsComponent> {
  const fixture = TestBed.createComponent(ChatMessageActionsComponent);
  for (const [key, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(key, value);
  }
  fixture.detectChanges();
  return fixture;
}

function element(
  fixture: ComponentFixture<ChatMessageActionsComponent>,
): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

function actionButton(
  fixture: ComponentFixture<ChatMessageActionsComponent>,
  action: string,
): HTMLButtonElement | null {
  return element(fixture).querySelector(
    `button[data-action="${action}"]`,
  ) as HTMLButtonElement | null;
}

async function flush(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

describe("ChatMessageActionsComponent", () => {
  let clipboardWrite: jest.Mock;

  beforeEach(() => {
    clipboardWrite = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: clipboardWrite },
      configurable: true,
    });
    TestBed.configureTestingModule({ imports: [ChatMessageActionsComponent] });
  });

  afterEach(() => {
    Object.defineProperty(navigator, "clipboard", {
      value: undefined,
      configurable: true,
    });
    TestBed.resetTestingModule();
  });

  it("renders a labelled toolbar", () => {
    const fixture = mount();
    const toolbar = element(fixture).querySelector(
      ".chat-message-actions",
    ) as HTMLElement;

    expect(toolbar.getAttribute("role")).toBe("toolbar");
    expect(toolbar.getAttribute("aria-label")).toBe("Message actions");
  });

  it("shows copy, votes, and delete for assistant messages", () => {
    const fixture = mount({ role: "assistant" });

    expect(actionButton(fixture, "copy")).not.toBeNull();
    expect(actionButton(fixture, "vote-up")).not.toBeNull();
    expect(actionButton(fixture, "vote-down")).not.toBeNull();
    expect(actionButton(fixture, "edit")).toBeNull();
    expect(actionButton(fixture, "delete")).not.toBeNull();
  });

  it("shows copy, edit, and delete but no votes for user messages", () => {
    const fixture = mount({ role: "user" });

    expect(actionButton(fixture, "copy")).not.toBeNull();
    expect(actionButton(fixture, "edit")).not.toBeNull();
    expect(actionButton(fixture, "delete")).not.toBeNull();
    expect(actionButton(fixture, "vote-up")).toBeNull();
    expect(actionButton(fixture, "vote-down")).toBeNull();
  });

  it("shows only delete for system messages", () => {
    const fixture = mount({ role: "system" });

    expect(actionButton(fixture, "copy")).toBeNull();
    expect(actionButton(fixture, "vote-up")).toBeNull();
    expect(actionButton(fixture, "vote-down")).toBeNull();
    expect(actionButton(fixture, "edit")).toBeNull();
    expect(actionButton(fixture, "delete")).not.toBeNull();
  });

  it("honours explicit canCopy/canVote/canEdit/canDelete overrides", () => {
    const fixture = mount({
      role: "assistant",
      canCopy: false,
      canVote: false,
      canEdit: true,
      canDelete: false,
    });

    expect(actionButton(fixture, "copy")).toBeNull();
    expect(actionButton(fixture, "vote-up")).toBeNull();
    expect(actionButton(fixture, "edit")).not.toBeNull();
    expect(actionButton(fixture, "delete")).toBeNull();
  });

  it("copies the text, emits the copy event, and marks itself active", async () => {
    const fixture = mount({
      role: "assistant",
      copyText: "the answer",
      messageId: "m-1",
    });
    const copied: string[] = [];
    fixture.componentInstance.copy.subscribe((value) => copied.push(value));

    actionButton(fixture, "copy")!.click();
    await flush();
    fixture.detectChanges();

    expect(clipboardWrite).toHaveBeenCalledWith("the answer");
    expect(copied).toEqual(["the answer"]);
    expect(fixture.componentInstance.copied()).toBe(true);
    expect(
      actionButton(fixture, "copy")!.classList.contains(
        "chat-message-actions__action--active",
      ),
    ).toBe(true);
  });

  it("still emits the copy event when the clipboard is unavailable", async () => {
    Object.defineProperty(navigator, "clipboard", {
      value: undefined,
      configurable: true,
    });
    const fixture = mount({ role: "assistant", copyText: "fallback" });
    const copied: string[] = [];
    fixture.componentInstance.copy.subscribe((value) => copied.push(value));

    actionButton(fixture, "copy")!.click();
    await flush();

    expect(copied).toEqual(["fallback"]);
  });

  it("still emits the copy event when the clipboard write rejects", async () => {
    clipboardWrite.mockRejectedValue(new Error("denied"));
    const fixture = mount({ role: "assistant", copyText: "guarded" });
    const copied: string[] = [];
    fixture.componentInstance.copy.subscribe((value) => copied.push(value));

    actionButton(fixture, "copy")!.click();
    await flush();

    expect(copied).toEqual(["guarded"]);
  });

  it("toggles a vote on, off, and switches direction", () => {
    const fixture = mount({ role: "assistant", messageId: "m-1" });
    const changes: AgentChatMessageVoteChange[] = [];
    fixture.componentInstance.voteChange.subscribe((change) =>
      changes.push(change),
    );

    actionButton(fixture, "vote-up")!.click();
    fixture.detectChanges();
    expect(changes).toEqual([{ messageId: "m-1", vote: "up" }]);
    expect(actionButton(fixture, "vote-up")!.getAttribute("aria-pressed")).toBe(
      "true",
    );

    actionButton(fixture, "vote-up")!.click();
    fixture.detectChanges();
    expect(changes).toEqual([
      { messageId: "m-1", vote: "up" },
      { messageId: "m-1", vote: null },
    ]);
    expect(actionButton(fixture, "vote-up")!.getAttribute("aria-pressed")).toBe(
      "false",
    );

    actionButton(fixture, "vote-down")!.click();
    fixture.detectChanges();
    expect(changes[changes.length - 1]).toEqual({
      messageId: "m-1",
      vote: "down",
    });
    expect(
      actionButton(fixture, "vote-down")!.getAttribute("aria-pressed"),
    ).toBe("true");
  });

  it("seeds the active vote from the vote input", () => {
    const fixture = mount({ role: "assistant", vote: "down" as AgentChatVote });
    expect(
      actionButton(fixture, "vote-down")!.getAttribute("aria-pressed"),
    ).toBe("true");
  });

  it("emits edit and delete with the message id", () => {
    const fixture = mount({ role: "user", messageId: "m-7" });
    const edits: string[] = [];
    const deletes: string[] = [];
    fixture.componentInstance.edit.subscribe((id) => edits.push(id));
    fixture.componentInstance.deleteMessage.subscribe((id) => deletes.push(id));

    actionButton(fixture, "edit")!.click();
    actionButton(fixture, "delete")!.click();

    expect(edits).toEqual(["m-7"]);
    expect(deletes).toEqual(["m-7"]);
  });

  it("disables every action and suppresses emissions while running", async () => {
    const fixture = mount({
      role: "assistant",
      messageId: "m-1",
      copyText: "text",
      running: true,
    });
    const emissions: unknown[] = [];
    fixture.componentInstance.copy.subscribe(() => emissions.push("copy"));
    fixture.componentInstance.voteChange.subscribe(() =>
      emissions.push("vote"),
    );
    fixture.componentInstance.edit.subscribe(() => emissions.push("edit"));
    fixture.componentInstance.deleteMessage.subscribe(() =>
      emissions.push("delete"),
    );

    const buttons = Array.from(
      element(fixture).querySelectorAll("button"),
    ) as HTMLButtonElement[];
    expect(buttons.length).toBeGreaterThan(0);
    expect(buttons.every((button) => button.disabled)).toBe(true);

    for (const button of buttons) button.click();
    fixture.componentInstance.toggleVote("up");
    await fixture.componentInstance.copyMessage();

    expect(emissions).toEqual([]);
    expect(clipboardWrite).not.toHaveBeenCalled();
  });

  it("applies the persistent class", () => {
    const fixture = mount({ persistent: true });
    expect(
      element(fixture)
        .querySelector(".chat-message-actions")
        ?.classList.contains("chat-message-actions--persistent"),
    ).toBe(true);
  });
});
