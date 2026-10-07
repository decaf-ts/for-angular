/**
 * @module for-angular/graph/i18n/graph-translate
 * @summary Locale-key resolver for the graph editor surfaces (§13 "Locale rule").
 * @description Resolves graph editor strings through `@ngx-translate` when the
 * application provides it, and falls back to the supplied default when it does not
 * (unit-test / consumed-widget contexts). Every user-facing graph string is a
 * locale key under `graph.editor.*` (grouped per node category where the key is
 * node-specific), so no string is hardcoded in a template.
 */
import { Injectable, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

@Injectable({ providedIn: 'root' })
export class GraphTranslateService {
  private readonly translate = inject(TranslateService, { optional: true });

  /**
   * Resolves one graph-editor locale key. When the translation service is absent
   * or the key is not loaded, the supplied fallback is returned.
   */
  key(key: string, fallback: string): string {
    if (!this.translate) return fallback;
    const translated = this.translate.instant(key);
    return translated === key ? fallback : translated;
  }
}
