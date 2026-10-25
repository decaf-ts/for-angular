import { Component, computed, input, output } from "@angular/core";
import { AgentTranslateFallbackPipe } from "../../i18n/agent-translate-fallback.pipe";
import type { AgentChatOrder } from "../../types";
import { ChatIconComponent } from "../chat-icon/chat-icon.component";

/** Tool-result renderer for order lists produced by the demo order tool; emits the selected order for follow-up actions. */
@Component({
  selector: "ngx-decaf-chat-tool-orders",
  templateUrl: "./chat-tool-orders.component.html",
  styleUrls: ["./chat-tool-orders.component.scss"],
  imports: [AgentTranslateFallbackPipe, ChatIconComponent],
  standalone: true,
})
export class ChatToolOrdersComponent {
  /** Orders returned by the tool call. */
  readonly orders = input<AgentChatOrder[]>([]);
  /** Optional section title override. */
  readonly title = input<string | null>(null);

  /** Emits the order selected by the user. */
  readonly orderSelect = output<AgentChatOrder>();

  /** Whether the result contains any orders. */
  readonly hasOrders = computed(() => this.orders().length > 0);

  /** Emits the selected order when the list is interactive. */
  select(order: AgentChatOrder): void {
    this.orderSelect.emit(order);
  }
}
