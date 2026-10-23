/**
 * @module for-angular/agent/i18n/agent-translate-fallback.pipe
 * @summary Impure translate pipe with mandatory fallback for the agent chat
 * surface (slice U3 of SAA-836).
 * @description Resolves a translation key through
 * {@link GraphTranslateService.key} and renders the given fallback string
 * whenever the key is missing (or not yet loaded), so `ngx-decaf-agent-chat`
 * templates never render a raw key. Declared `pure: false` because the
 * translation service's locale can change without the pipe's input changing.
 */
import { Pipe, PipeTransform, inject } from "@angular/core";
import { GraphTranslateService } from "@decaf-ts/for-angular/diagrams";

/**
 * Usage: `{{ 'agent.chat.title' | translateFallback: 'Agent chat' }}`.
 *
 * @param key - Translation key (the `agent.chat.*` subtree); missing/empty keys render the fallback directly.
 * @param fallback - Text rendered when the key is absent or empty.
 * @returns The translated string, or the fallback.
 */
@Pipe({
  name: "translateFallback",
  standalone: true,
  pure: false,
})
export class AgentTranslateFallbackPipe implements PipeTransform {
  private readonly translate = inject(GraphTranslateService);

  transform(key: string | undefined, fallback: string): string {
    if (!key) return fallback;
    return this.translate.key(key, fallback);
  }
}
