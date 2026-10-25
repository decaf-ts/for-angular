import { Component, computed, input } from "@angular/core";
import { AgentTranslateFallbackPipe } from "../../i18n/agent-translate-fallback.pipe";
import type { AgentChatWeatherState } from "../../types";
import { ChatIconComponent } from "../chat-icon/chat-icon.component";

/** Tool-result renderer for the demo weather tool: location, condition, temperature range, and loading/error states. */
@Component({
  selector: "ngx-decaf-chat-weather",
  templateUrl: "./chat-tool-weather.component.html",
  styleUrls: ["./chat-tool-weather.component.scss"],
  imports: [AgentTranslateFallbackPipe, ChatIconComponent],
  standalone: true,
})
export class ChatToolWeatherComponent {
  /** Location the forecast applies to. */
  readonly location = input<string>("");
  /** Condition text override; falls back to the day/night default. */
  readonly condition = input<string | null>(null);
  /** Forecast high temperature in `unit`. */
  readonly high = input<number>(0);
  /** Forecast low temperature in `unit`. */
  readonly low = input<number>(0);
  /** Temperature unit suffix. */
  readonly unit = input<string>("°C");
  /** Whether the forecast is for the night variant. */
  readonly night = input<boolean>(false);
  /** Lifecycle state of the tool call. */
  readonly state = input<AgentChatWeatherState>("success");
  /** Error message rendered in the error state. */
  readonly error = input<string | null>(null);

  /** Whether the tool call is still loading. */
  readonly isLoading = computed(() => this.state() === "loading");
  /** Whether the tool call failed. */
  readonly isError = computed(() => this.state() === "error");
  /** i18n key for the condition label. */
  readonly conditionKey = computed(
    () =>
      `agent.chat.tool.weather.condition.${this.night() ? "night" : "day"}`,
  );
  /** English fallback for the condition label. */
  readonly conditionFallback = computed(() =>
    this.night() ? "Clear night" : "Sunny",
  );
}
