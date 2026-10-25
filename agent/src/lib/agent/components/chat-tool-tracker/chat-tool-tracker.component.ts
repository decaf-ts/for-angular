import { Component, computed, input } from "@angular/core";
import { AgentTranslateFallbackPipe } from "../../i18n/agent-translate-fallback.pipe";
import type { AgentChatTrackerStatus } from "../../types";
import { ChatIconComponent } from "../chat-icon/chat-icon.component";

interface TrackerStepView {
  readonly id: "box" | "gps" | "home";
  readonly icon: string;
  readonly threshold: number;
  readonly labelFallback: string;
}

const TRACKER_STEPS: TrackerStepView[] = [
  { id: "box", icon: "box", threshold: 34, labelFallback: "Order packed" },
  { id: "gps", icon: "gps", threshold: 71, labelFallback: "In transit" },
  { id: "home", icon: "home", threshold: 100, labelFallback: "Delivered" },
];

const TRACKER_PROGRESS: Record<AgentChatTrackerStatus, number> = {
  ordered: 34,
  shipped: 71,
  delivered: 100,
  cancelled: 0,
};

/** Delivery tracker tool-result renderer: three-step progress (packed, in transit, delivered), derived percentage, and status copy. */
@Component({
  selector: "ngx-decaf-chat-tool-tracker",
  templateUrl: "./chat-tool-tracker.component.html",
  styleUrls: ["./chat-tool-tracker.component.scss"],
  imports: [AgentTranslateFallbackPipe, ChatIconComponent],
  standalone: true,
})
export class ChatToolTrackerComponent {
  /** Delivery status reported by the tool. */
  readonly status = input<AgentChatTrackerStatus>("ordered");
  /** Explicit progress override (0-100); defaults to the status threshold. */
  readonly progress = input<number | null>(null);
  /** Optional title override. */
  readonly label = input<string | null>(null);
  /** Optional description override. */
  readonly description = input<string | null>(null);

  /** Tracker steps rendered by the component. */
  readonly steps = computed(() => TRACKER_STEPS);
  /** Effective progress percentage clamped to 0-100. */
  readonly progressValue = computed(() => {
    const override = this.progress();
    if (override !== null) return Math.min(100, Math.max(0, override));
    return TRACKER_PROGRESS[this.status()];
  });
  /** Index of the step matching the current status, or `-1` when cancelled. */
  readonly statusIndex = computed(() => {
    switch (this.status()) {
      case "ordered":
        return 0;
      case "shipped":
        return 1;
      case "delivered":
        return 2;
      default:
        return -1;
    }
  });
  /** English fallback label for the current status. */
  readonly statusFallback = computed(() => {
    switch (this.status()) {
      case "ordered":
        return "Order confirmed";
      case "shipped":
        return "On the way";
      case "delivered":
        return "Delivered";
      default:
        return "Cancelled";
    }
  });
  /** English fallback description for the current status. */
  readonly descriptionFallback = computed(() => {
    switch (this.status()) {
      case "ordered":
        return "Your parcel has been packed and is waiting for the courier.";
      case "shipped":
        return "The courier picked up your parcel and it is heading your way.";
      case "delivered":
        return "Your parcel was delivered. Thanks for shopping with us.";
      default:
        return "This delivery was cancelled.";
    }
  });

  /** Visual state of a step index for the current progress. */
  stepState(index: number): string {
    if (this.status() === "cancelled") return "cancelled";
    const step = TRACKER_STEPS[index];
    if (this.progressValue() >= step.threshold) return "complete";
    if (this.statusIndex() + 1 === index) return "active";
    return "pending";
  }
}
