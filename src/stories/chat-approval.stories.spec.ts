import { ChatApprovalComponent } from "@decaf-ts/for-angular/agent";

import stories, {
  approved,
  customResumeData,
  disabled,
  pending,
  rejected,
  withoutPayload,
} from "./chat-approval.stories";

function argsOf(story: unknown): any {
  return ((story as { args?: any })?.args ?? {}) as any;
}

describe("chat-approval.stories — Storybook contract", () => {
  it("exposes the Agent/Chat/Approval meta and every story", () => {
    expect(stories.title).toBe("Agent/Chat/Approval");
    expect(stories.component).toBe(ChatApprovalComponent);
    expect(pending).toBeDefined();
    expect(approved).toBeDefined();
    expect(rejected).toBeDefined();
    expect(customResumeData).toBeDefined();
    expect(disabled).toBeDefined();
    expect(withoutPayload).toBeDefined();
  });

  it("wires the default args", () => {
    const metaArgs: any = stories.args ?? {};
    expect(metaArgs.runId).toBe("run-approval-7");
    expect(metaArgs.toolName).toBe("refundOrder");
    expect(metaArgs.payload).toMatchObject({
      tool: "refundOrder",
      orderId: "ORD-2026-0114",
    });
    expect(metaArgs.resumeData).toBeUndefined();
    expect(metaArgs.rejectReason).toBeNull();
    expect(metaArgs.status).toBe("pending");
    expect(metaArgs.disabled).toBe(false);
  });

  it("wires the per-story args", () => {
    expect(argsOf(pending)).toEqual({});
    expect(argsOf(approved).status).toBe("approved");
    expect(argsOf(rejected)).toMatchObject({
      status: "rejected",
      rejectReason: "Refund exceeds the policy limit.",
    });
    expect(argsOf(customResumeData).resumeData).toEqual({
      approvedAmount: "€99.00",
      approvedBy: "agent-chat",
    });
    expect(argsOf(disabled).disabled).toBe(true);
    expect(argsOf(withoutPayload).payload).toBeUndefined();
  });
});
