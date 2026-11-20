import { Component, computed, input, output } from "@angular/core";
import { AgentTranslateFallbackPipe } from "../../i18n/agent-translate-fallback.pipe";

export type DswSidebarPluginState = "active" | "inactive" | "error";

export interface DswSidebarPluginStatus {
  id: string;
  label: string;
  state: DswSidebarPluginState;
  detail?: string;
}

let sidebarSequence = 0;

@Component({
  selector: "ngx-decaf-dsw-sidebar",
  templateUrl: "./dsw-sidebar.component.html",
  styleUrls: ["./dsw-sidebar.component.scss"],
  imports: [AgentTranslateFallbackPipe],
  standalone: true,
})
export class DswSidebarComponent {
  readonly collapsed = input<boolean>(false);
  readonly collapsible = input<boolean>(true);

  readonly title = input<string>("");
  readonly titleKey = input<string>("");
  readonly titleFallback = input<string>("Harness");

  readonly newSessionLabelKey = input<string>("agent.dsw.sidebar.newSession");
  readonly newSessionLabelFallback = input<string>("New session");
  readonly newSessionDisabled = input<boolean>(false);

  readonly plugins = input<DswSidebarPluginStatus[]>([]);
  readonly showPluginStatus = input<boolean>(true);

  readonly ariaLabelKey = input<string>("");
  readonly ariaLabelFallback = input<string>("Sidebar");
  readonly sessionsLabelKey = input<string>("agent.dsw.sidebar.sessions");
  readonly sessionsLabelFallback = input<string>("Sessions");
  readonly pluginsLabelKey = input<string>("agent.dsw.sidebar.plugins");
  readonly pluginsLabelFallback = input<string>("Plugin status");

  readonly collapseLabelKey = input<string>("agent.dsw.sidebar.collapse");
  readonly collapseLabelFallback = input<string>("Collapse sidebar");
  readonly expandLabelKey = input<string>("agent.dsw.sidebar.expand");
  readonly expandLabelFallback = input<string>("Expand sidebar");

  readonly newSession = output<void>();
  readonly pluginOpen = output<DswSidebarPluginStatus>();
  readonly collapseChange = output<boolean>();

  readonly sidebarId = `dsw-sidebar-${++sidebarSequence}`;
  readonly sessionsId = `${this.sidebarId}-sessions`;

  readonly toggleLabelKey = computed(() =>
    this.collapsed() ? this.expandLabelKey() : this.collapseLabelKey(),
  );
  readonly toggleLabelFallback = computed(() =>
    this.collapsed() ? this.expandLabelFallback() : this.collapseLabelFallback(),
  );

  toggleCollapsed(): void {
    if (!this.collapsible()) return;
    this.collapseChange.emit(!this.collapsed());
  }

  pluginStateKey(state: DswSidebarPluginState): string {
    return `agent.dsw.sidebar.plugin.${state}`;
  }

  pluginStateFallback(state: DswSidebarPluginState): string {
    switch (state) {
      case "active":
        return "Active";
      case "error":
        return "Error";
      default:
        return "Inactive";
    }
  }
}
