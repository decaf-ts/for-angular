import { Component, computed, input, output } from "@angular/core";
import { AgentTranslateFallbackPipe } from "../../i18n/agent-translate-fallback.pipe";

export type DswSessionStatus = "idle" | "running" | "done" | "error";

@Component({
  selector: "ngx-decaf-dsw-session-header",
  templateUrl: "./dsw-session-header.component.html",
  styleUrls: ["./dsw-session-header.component.scss"],
  imports: [AgentTranslateFallbackPipe],
  standalone: true,
})
export class DswSessionHeaderComponent {
  readonly title = input<string>("");
  readonly titleKey = input<string>("");
  readonly titleFallback = input<string>("Session");
  readonly subtitle = input<string>("");
  readonly status = input<DswSessionStatus>("idle");
  readonly showStatus = input<boolean>(true);
  readonly showMenu = input<boolean>(false);
  readonly menuLabelKey = input<string>("agent.dsw.session.menu");
  readonly menuLabelFallback = input<string>("Session actions");

  readonly menu = output<void>();

  readonly statusLabelKey = computed(
    () => `agent.dsw.session.status.${this.status()}`,
  );
  readonly statusLabelFallback = computed(() => {
    switch (this.status()) {
      case "running":
        return "Running";
      case "done":
        return "Done";
      case "error":
        return "Error";
      default:
        return "Idle";
    }
  });
}
