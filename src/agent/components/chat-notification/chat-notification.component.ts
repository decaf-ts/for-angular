import { Component, DestroyRef, computed, effect, inject, input, output, signal } from "@angular/core";
import { AgentTranslateFallbackPipe } from "../../i18n/agent-translate-fallback.pipe";
import type {
  AgentChatNotification,
  AgentChatNotificationSeverity,
} from "../../types";
import { ChatIconComponent } from "../chat-icon/chat-icon.component";

const DEFAULT_AUTO_DISMISS_MS = 6000;

const SEVERITY_ICONS: Record<AgentChatNotificationSeverity, string> = {
  info: "info",
  success: "check",
  warning: "info",
  error: "x",
};

/** Toast stack for chat notifications: severity icons, optional auto-dismiss timers, manual dismissal, and action forwarding. */
@Component({
  selector: "ngx-decaf-chat-notification",
  templateUrl: "./chat-notification.component.html",
  styleUrls: ["./chat-notification.component.scss"],
  imports: [AgentTranslateFallbackPipe, ChatIconComponent],
  standalone: true,
})
export class ChatNotificationComponent {
  /** Notifications currently queued in the stack. */
  readonly notifications = input<AgentChatNotification[]>([]);
  /** Default auto-dismiss delay in milliseconds; `0` disables auto-dismiss. */
  readonly autoDismissMs = input<number>(DEFAULT_AUTO_DISMISS_MS);
  /** Whether notifications expose a manual dismiss control. */
  readonly dismissible = input<boolean>(true);

  /** Emits the id of a dismissed notification. */
  readonly dismissed = output<string>();
  /** Emits the id of the notification whose action was invoked. */
  readonly action = output<string>();

  /** Ids dismissed during this component's lifetime. */
  readonly dismissedIds = signal<ReadonlySet<string>>(new Set());

  /** Notifications not yet dismissed. */
  readonly visible = computed(() =>
    this.notifications().filter(
      (notification) => !this.dismissedIds().has(notification.id),
    ),
  );

  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    effect(() => {
      const notifications = this.notifications();
      const dismissed = this.dismissedIds();
      const activeIds = new Set(notifications.map((entry) => entry.id));
      for (const [id, timer] of this.timers) {
        if (!activeIds.has(id) || dismissed.has(id)) {
          clearTimeout(timer);
          this.timers.delete(id);
        }
      }
      for (const notification of notifications) {
        if (dismissed.has(notification.id) || this.timers.has(notification.id)) {
          continue;
        }
        const delay = notification.autoDismissMs ?? this.autoDismissMs();
        if (delay <= 0) continue;
        const timer = setTimeout(() => {
          this.timers.delete(notification.id);
          this.dismiss(notification.id);
        }, delay);
        this.timers.set(notification.id, timer);
      }
    });

    this.destroyRef.onDestroy(() => {
      for (const timer of this.timers.values()) clearTimeout(timer);
      this.timers.clear();
    });
  }

  /** Effective severity of a notification. */
  severityOf(notification: AgentChatNotification): AgentChatNotificationSeverity {
    return notification.severity ?? "info";
  }

  /** Icon name for a notification's severity. */
  iconOf(notification: AgentChatNotification): string {
    return SEVERITY_ICONS[this.severityOf(notification)];
  }

  /** Dismisses a notification once and cancels its timer. */
  dismiss(id: string): void {
    if (this.dismissedIds().has(id)) return;
    this.dismissedIds.update((ids) => new Set([...ids, id]));
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }
    this.dismissed.emit(id);
  }

  /** Forwards the action of a notification. */
  runAction(id: string): void {
    this.action.emit(id);
  }

  /** Tracks notification rows by id. */
  trackNotification(_: number, notification: AgentChatNotification): string {
    return notification.id;
  }
}
