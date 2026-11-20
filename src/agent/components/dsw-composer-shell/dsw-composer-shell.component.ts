import { Component, computed, contentChild, input, output } from "@angular/core";
import { AgentTranslateFallbackPipe } from "../../i18n/agent-translate-fallback.pipe";
import { ChatComposerComponent } from "../chat-composer/chat-composer.component";

@Component({
  selector: "ngx-decaf-dsw-composer-shell",
  templateUrl: "./dsw-composer-shell.component.html",
  styleUrls: ["./dsw-composer-shell.component.scss"],
  imports: [ChatComposerComponent, AgentTranslateFallbackPipe],
  standalone: true,
})
export class DswComposerShellComponent {
  readonly value = input<string>("");
  readonly running = input<boolean>(false);
  readonly disabled = input<boolean>(false);
  readonly placeholder = input<string | null>(null);
  readonly minRows = input<number>(1);
  readonly maxRows = input<number>(6);

  readonly notice = input<string>("");
  readonly noticeKey = input<string>("");

  readonly showPermissions = input<boolean>(false);
  readonly permissionsActive = input<boolean>(false);
  readonly permissionsLabelKey = input<string>("agent.dsw.composer.permissions");
  readonly permissionsLabelFallback = input<string>("Permissions");

  readonly send = output<string>();
  readonly stop = output<void>();
  readonly valueChange = output<string>();
  readonly slashQuery = output<string | null>();
  readonly permissionsOpen = output<void>();

  readonly accessory = contentChild("[dswComposerAccessory]");
  readonly dock = contentChild("[dswComposerDock]");
  readonly tools = contentChild("[dswComposerTools]");
  readonly footer = contentChild("[dswComposerFooter]");

  readonly hasAccessory = computed(() => this.accessory() !== undefined);
  readonly hasDock = computed(() => this.dock() !== undefined);
  readonly hasTools = computed(() => this.tools() !== undefined);
  readonly hasFooter = computed(() => this.footer() !== undefined);
  readonly hasNotice = computed(() => !!this.notice() || !!this.noticeKey());
  readonly showsToolsRow = computed(
    () => this.showPermissions() || this.hasTools(),
  );
}
