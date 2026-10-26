import { ComponentFixture, TestBed } from "@angular/core/testing";
import { TranslateService } from "@ngx-translate/core";

import type {
  AgentChatApprovalDenial,
  AgentChatApprovalResume,
  AgentChatApprovalStatus,
} from "../../types";
import { ChatApprovalComponent } from "./chat-approval.component";

class FakeTranslateService {
  readonly dictionary: Record<string, string> = {};

  instant(key: string): string {
    return this.dictionary[key] ?? key;
  }
}

let translate: FakeTranslateService;

const PAYLOAD = {
  tool: "refundOrder",
  orderId: "ORD-2026-0114",
  amount: "€149.00",
};

function mount(
  inputs: Record<string, unknown> = {},
): ComponentFixture<ChatApprovalComponent> {
  const fixture = TestBed.createComponent(ChatApprovalComponent);
  for (const [key, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(key, value);
  }
  fixture.detectChanges();
  fixture.detectChanges();
  return fixture;
}

function element(fixture: ComponentFixture<ChatApprovalComponent>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

function approveButton(
  fixture: ComponentFixture<ChatApprovalComponent>,
): HTMLButtonElement {
  return element(fixture).querySelector(
    ".chat-approval__button--approve",
  ) as HTMLButtonElement;
}

function rejectButton(
  fixture: ComponentFixture<ChatApprovalComponent>,
): HTMLButtonElement {
  return element(fixture).querySelector(
    ".chat-approval__button--reject",
  ) as HTMLButtonElement;
}

function normalize(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

describe("ChatApprovalComponent", () => {
  beforeEach(() => {
    translate = new FakeTranslateService();
    TestBed.configureTestingModule({
      imports: [ChatApprovalComponent],
      providers: [{ provide: TranslateService, useValue: translate }],
    });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it("marks the root as a suspended tool call and renders the run id", () => {
    const fixture = mount({ runId: "run-approval-7" });

    expect(
      element(fixture).querySelector(".chat-approval")?.getAttribute(
        "data-tool-call-suspended",
      ),
    ).toBe("true");
    expect(
      element(fixture).querySelector(".chat-approval__run-id")
        ?.textContent?.trim(),
    ).toBe("run-approval-7");
  });

  it("renders the tool name and the payload JSON", () => {
    const fixture = mount({
      runId: "run-approval-7",
      toolName: "refundOrder",
      payload: PAYLOAD,
    });

    expect(
      element(fixture).querySelector(".chat-approval__tool")
        ?.textContent?.trim(),
    ).toBe("refundOrder");
    expect(
      element(fixture).querySelector(".chat-approval__json")?.textContent,
    ).toContain('"orderId": "ORD-2026-0114"');
  });

  it("uses descending h3/h4 headings and an accessible scrollable payload", () => {
    const fixture = mount({
      runId: "run-approval-7",
      toolName: "refundOrder",
      payload: PAYLOAD,
    });

    expect(
      element(fixture).querySelector(".chat-approval__title")?.tagName,
    ).toBe("H3");
    expect(
      element(fixture).querySelector(".chat-approval__payload-title")?.tagName,
    ).toBe("H4");

    const json = element(fixture).querySelector(
      ".chat-approval__json",
    ) as HTMLElement;
    expect(json.tagName).toBe("PRE");
    expect(json.getAttribute("tabindex")).toBe("0");
    expect(json.getAttribute("aria-label")).toBe("Suspended payload");
  });

  it("renders the empty payload state when no payload is provided", () => {
    const fixture = mount({ runId: "run-approval-7" });

    expect(element(fixture).querySelector(".chat-approval__json")).toBeNull();
    expect(
      normalize(
        element(fixture).querySelector(".chat-approval__empty-payload")
          ?.textContent,
      ),
    ).toBe("No payload was provided.");
  });

  it("approves with the payload as resumeData by default", () => {
    const fixture = mount({ runId: "run-approval-7", payload: PAYLOAD });
    const emitted: AgentChatApprovalResume[] = [];
    fixture.componentInstance.approve.subscribe((value) => emitted.push(value));

    approveButton(fixture).click();
    fixture.detectChanges();

    expect(emitted).toEqual([
      { type: "resume", runId: "run-approval-7", resumeData: PAYLOAD },
    ]);
  });

  it("lets an explicit resumeData override the payload on approve", () => {
    const override = { approvedAmount: "€99.00" };
    const fixture = mount({
      runId: "run-approval-7",
      payload: PAYLOAD,
      resumeData: override,
    });
    const emitted: AgentChatApprovalResume[] = [];
    fixture.componentInstance.approve.subscribe((value) => emitted.push(value));

    approveButton(fixture).click();
    fixture.detectChanges();

    expect(emitted[0].resumeData).toBe(override);
  });

  it("rejects with the reason only when one is provided", () => {
    const fixture = mount({ runId: "run-approval-7" });
    const emitted: AgentChatApprovalDenial[] = [];
    fixture.componentInstance.reject.subscribe((value) => emitted.push(value));

    rejectButton(fixture).click();
    fixture.detectChanges();
    expect(emitted).toEqual([{ type: "deny", runId: "run-approval-7" }]);
    expect("reason" in emitted[0]).toBe(false);

    fixture.componentRef.setInput("rejectReason", "Exceeds the policy limit.");
    fixture.detectChanges();
    rejectButton(fixture).click();
    fixture.detectChanges();
    expect(emitted[1]).toEqual({
      type: "deny",
      runId: "run-approval-7",
      reason: "Exceeds the policy limit.",
    });
  });

  it("does not emit and disables both buttons once decided", () => {
    const cases: AgentChatApprovalStatus[] = ["approved", "rejected"];
    const fixture = mount({ runId: "run-approval-7", payload: PAYLOAD });
    const approvals: AgentChatApprovalResume[] = [];
    const rejections: AgentChatApprovalDenial[] = [];
    fixture.componentInstance.approve.subscribe((value) =>
      approvals.push(value),
    );
    fixture.componentInstance.reject.subscribe((value) =>
      rejections.push(value),
    );

    for (const status of cases) {
      fixture.componentRef.setInput("status", status);
      fixture.detectChanges();

      expect(approveButton(fixture).disabled).toBe(true);
      expect(rejectButton(fixture).disabled).toBe(true);
      approveButton(fixture).click();
      rejectButton(fixture).click();
      fixture.detectChanges();
    }

    expect(approvals).toEqual([]);
    expect(rejections).toEqual([]);
  });

  it("does not emit and disables both buttons when disabled", () => {
    const fixture = mount({ runId: "run-approval-7", disabled: true });
    const approvals: AgentChatApprovalResume[] = [];
    const rejections: AgentChatApprovalDenial[] = [];
    fixture.componentInstance.approve.subscribe((value) =>
      approvals.push(value),
    );
    fixture.componentInstance.reject.subscribe((value) =>
      rejections.push(value),
    );

    expect(approveButton(fixture).disabled).toBe(true);
    expect(rejectButton(fixture).disabled).toBe(true);
    approveButton(fixture).click();
    rejectButton(fixture).click();
    fixture.detectChanges();

    expect(approvals).toEqual([]);
    expect(rejections).toEqual([]);
  });

  it("renders the status chip for all three states", () => {
    const cases: Array<[AgentChatApprovalStatus, string]> = [
      ["pending", "Awaiting approval"],
      ["approved", "Approved"],
      ["rejected", "Rejected"],
    ];
    const fixture = mount({ runId: "run-approval-7" });

    for (const [status, label] of cases) {
      fixture.componentRef.setInput("status", status);
      fixture.detectChanges();

      expect(
        element(fixture).querySelector(".chat-approval")?.getAttribute(
          "data-status",
        ),
      ).toBe(status);
      expect(
        normalize(
          element(fixture).querySelector(".chat-approval__chip")?.textContent,
        ),
      ).toBe(label);
    }
  });

  it("renders the approve and reject button labels", () => {
    const fixture = mount({ runId: "run-approval-7" });

    expect(normalize(approveButton(fixture).textContent)).toBe("Approve");
    expect(normalize(rejectButton(fixture).textContent)).toBe("Reject");
  });

  it("resolves the action labels through AgentTranslateFallbackPipe", () => {
    translate.dictionary["agent.chat.approval.approve"] = "Aprovar";
    translate.dictionary["agent.chat.approval.reject"] = "Rejeitar";
    const fixture = mount({ runId: "run-approval-7" });

    expect(normalize(approveButton(fixture).textContent)).toBe("Aprovar");
    expect(normalize(rejectButton(fixture).textContent)).toBe("Rejeitar");
  });
});
