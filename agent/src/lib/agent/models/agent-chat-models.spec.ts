import { Model } from "@decaf-ts/decorator-validation";
import "@decaf-ts/overrides/ui-decorators";
import {
  AgentChatComposerModel,
} from "./AgentChatComposerModel";
import {
  AGENT_CHAT_ROLES,
  AgentChatMessageModel,
} from "./AgentChatMessageModel";

interface UiElementMetadataView {
  tag: string;
  props?: Record<string, unknown>;
}

interface UiModelApi {
  uiModelOf(ctor: unknown): UiElementMetadataView | undefined;
  uiElementOf(ctor: unknown, prop: string): UiElementMetadataView | undefined;
  uiPropertiesOf(ctor: unknown): string[] | undefined;
}

const ui = Model as unknown as UiModelApi;

describe("AgentChatComposerModel — validation and UI decoration", () => {
  it("requires the message field", () => {
    const errors = new AgentChatComposerModel({}).hasErrors();

    expect(errors).toBeDefined();
    expect(errors?.["message"]).toBeDefined();
  });

  it("enforces the message minimum length of one", () => {
    const errors = new AgentChatComposerModel({ message: "" }).hasErrors();

    expect(errors).toBeDefined();
    expect(errors?.["message"]).toBeDefined();
  });

  it("accepts a non-empty message", () => {
    const model = new AgentChatComposerModel({ message: "hello agent" });

    expect(model.hasErrors()).toBeUndefined();
  });

  it("registers the composer as a ui model for the crud form tag", () => {
    const uiModel = ui.uiModelOf(AgentChatComposerModel);

    expect(uiModel).toBeDefined();
    expect(uiModel?.tag).toBe("ngx-decaf-crud-form");
  });

  it("registers the message field as a textarea uielement with chat labels", () => {
    const element = ui.uiElementOf(AgentChatComposerModel, "message");

    expect(element).toBeDefined();
    expect(element?.tag).toBe("ngx-decaf-crud-field");
    expect(element?.props).toMatchObject({
      label: "agent.chat.composer.message.label",
      placeholder: "agent.chat.composer.message.placeholder",
      type: "textarea",
    });
  });

  it("exposes every model property through the ui model properties", () => {
    expect(ui.uiPropertiesOf(AgentChatComposerModel)).toEqual(["message"]);
  });
});

describe("AgentChatMessageModel — validation and UI decoration", () => {
  it("requires the role field", () => {
    const errors = new AgentChatMessageModel({ content: "hello" }).hasErrors();

    expect(errors).toBeDefined();
    expect(errors?.["role"]).toBeDefined();
  });

  it("requires the content field", () => {
    const errors = new AgentChatMessageModel({ role: "user" }).hasErrors();

    expect(errors).toBeDefined();
    expect(errors?.["content"]).toBeDefined();
  });

  it("accepts a message with role and content and optional metadata", () => {
    const model = new AgentChatMessageModel({
      role: "assistant",
      content: "the answer",
      runId: "run-1",
      createdAt: "2026-01-01T00:00:00.000Z",
    });

    expect(model.hasErrors()).toBeUndefined();
    expect(model.role).toBe("assistant");
    expect(model.runId).toBe("run-1");
  });

  it("offers the four chat roles as select options", () => {
    expect(AGENT_CHAT_ROLES.map((role) => role.value)).toEqual([
      "user",
      "assistant",
      "system",
      "error",
    ]);
    expect(AGENT_CHAT_ROLES[0].text).toBe("agent.chat.role.user");
  });

  it("registers the message model as a ui model for the crud form tag", () => {
    const uiModel = ui.uiModelOf(AgentChatMessageModel);

    expect(uiModel).toBeDefined();
    expect(uiModel?.tag).toBe("ngx-decaf-crud-form");
  });

  it("registers role and content uielements and leaves optional metadata renderable", () => {
    const role = ui.uiElementOf(AgentChatMessageModel, "role");
    const content = ui.uiElementOf(AgentChatMessageModel, "content");
    const runId = ui.uiElementOf(AgentChatMessageModel, "runId");

    expect(role?.tag).toBe("ngx-decaf-crud-field");
    expect(role?.props).toMatchObject({ type: "select" });
    expect(content?.props).toMatchObject({
      label: "agent.chat.transcript.content.label",
      type: "textarea",
    });
    expect(runId?.tag).toBe("ngx-decaf-crud-field");
    expect(ui.uiPropertiesOf(AgentChatMessageModel)).toEqual([
      "role",
      "content",
      "runId",
      "createdAt",
    ]);
  });
});
