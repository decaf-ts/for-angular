import { Injectable, computed, inject, signal } from "@angular/core";
import { TranslateService } from "@ngx-translate/core";

/**
 * @description Locales shipped by the GenUI renderer UI strings
 * @typedef {string} GenuiLocale
 * @memberOf module:gen-ui
 */
export type GenuiLocale = "en" | "pt";

/**
 * @internal
 * English dictionary; also the per-key fallback for every other locale.
 */
const EN = {
  "block.title": "Generated interface",
  "block.gateReason": "Not available yet",
  "block.fallback": "Unsupported component: {type}",
  "block.empty": "Nothing to display",
  "block.actionProvenance": "Action sent",
  "block.actionName": "Action",
  "block.payload": "Payload",
  "block.noPayload": "No payload",
  "block.panelFallback": "This block is rendered in the session panel.",
  "copy.button": "Copy",
  "copy.copied": "Copied",
  "copy.expand": "Show more",
  "copy.collapse": "Show less",
  "table.total": "Total",
  "table.empty": "No rows",
  "table.exportMarkdown": "Copy Markdown",
  "table.exportCsv": "Copy CSV",
  "image.failed": "Image unavailable",
  "media.failed": "Media unavailable",
  "chart.empty": "No chart data",
  "chart.failed": "Chart could not be rendered",
  "mermaid.failed": "Diagram could not be rendered",
  "mermaid.unsupported": "Unsupported diagram kind: {kind}",
  "plot.failed": "Plot could not be rendered",
  "map.title": "Locations",
  "map.canvas": "Interactive map",
  "map.offline": "Offline coordinate map. No external requests.",
  "map.empty": "No valid locations.",
  "map.select": "Select a location",
  "map.clear": "Clear selection",
  "map.loading": "Loading map…",
  "scene3d.failed": "3D scene could not be rendered",
  "scene3d.loading": "Loading 3D scene…",
  "diagram.empty": "Empty diagram",
  "quiz.correct": "Correct",
  "quiz.incorrect": "Incorrect",
  "quiz.reset": "Try again",
  "choices.selected": "selected",
  "steps.current": "Current step",
  "fileTree.expand": "Expand folder",
  "fileTree.collapse": "Collapse folder",
  "audio.label": "Audio",
  "video.label": "Video",
  "link.open": "Open link",
  "entityCard.source": "Source",
  "panel.title": "GenUI panel",
  "panel.empty": "The panel is empty.",
  "panel.close": "Close panel",
  "panel.badge": "Panel",
  "provenance.title": "GenUI action provenance",
  "provenance.pending": "Sending…",
  "provenance.sent": "Sent to the model",
  "provenance.failed": "Action could not be sent",
  "form.required": "Required",
  "form.submit": "Submit",
  "form.answered": "{answered} of {total} answered",
} as const;

/**
 * @description Key domain of the GenUI dictionaries
 * @typedef {string} GenuiTextKey
 * @memberOf module:gen-ui
 */
export type GenuiTextKey = keyof typeof EN;

/**
 * @internal
 * Portuguese dictionary; complete for every key in {@link EN}.
 */
const PT: Record<GenuiTextKey, string> = {
  "block.title": "Interface gerada",
  "block.gateReason": "Ainda não disponível",
  "block.fallback": "Componente não suportado: {type}",
  "block.empty": "Nada a mostrar",
  "block.actionProvenance": "Ação enviada",
  "block.actionName": "Ação",
  "block.payload": "Conteúdo",
  "block.noPayload": "Sem conteúdo",
  "block.panelFallback": "Este bloco é apresentado no painel da sessão.",
  "copy.button": "Copiar",
  "copy.copied": "Copiado",
  "copy.expand": "Mostrar mais",
  "copy.collapse": "Mostrar menos",
  "table.total": "Total",
  "table.empty": "Sem linhas",
  "table.exportMarkdown": "Copiar Markdown",
  "table.exportCsv": "Copiar CSV",
  "image.failed": "Imagem indisponível",
  "media.failed": "Multimédia indisponível",
  "chart.empty": "Sem dados para o gráfico",
  "chart.failed": "Não foi possível desenhar o gráfico",
  "mermaid.failed": "Não foi possível desenhar o diagrama",
  "mermaid.unsupported": "Tipo de diagrama não suportado: {kind}",
  "plot.failed": "Não foi possível desenhar o gráfico",
  "map.title": "Localizações",
  "map.canvas": "Mapa interativo",
  "map.offline": "Mapa de coordenadas offline. Sem pedidos externos.",
  "map.empty": "Sem localizações válidas.",
  "map.select": "Selecionar uma localização",
  "map.clear": "Limpar seleção",
  "map.loading": "A carregar mapa…",
  "scene3d.failed": "Não foi possível desenhar a cena 3D",
  "scene3d.loading": "A carregar cena 3D…",
  "diagram.empty": "Diagrama vazio",
  "quiz.correct": "Correto",
  "quiz.incorrect": "Incorreto",
  "quiz.reset": "Tentar novamente",
  "choices.selected": "selecionado",
  "steps.current": "Passo atual",
  "fileTree.expand": "Expandir pasta",
  "fileTree.collapse": "Colapsar pasta",
  "audio.label": "Áudio",
  "video.label": "Vídeo",
  "link.open": "Abrir ligação",
  "entityCard.source": "Fonte",
  "panel.title": "Painel GenUI",
  "panel.empty": "O painel está vazio.",
  "panel.close": "Fechar painel",
  "panel.badge": "Painel",
  "provenance.title": "Proveniência da ação GenUI",
  "provenance.pending": "A enviar…",
  "provenance.sent": "Enviado ao modelo",
  "provenance.failed": "Não foi possível enviar a ação",
  "form.required": "Obrigatório",
  "form.submit": "Submeter",
  "form.answered": "{answered} de {total} respondidos",
};

/**
 * @internal
 * Shipped dictionaries keyed by locale.
 */
const DICTS: Record<GenuiLocale, Record<GenuiTextKey, string>> = { en: EN, pt: PT };

/**
 * @description Resolves localized chrome text for the GenUI renderer
 * @summary Follows the host `TranslateService` current language by default
 * (`pt*` maps to Portuguese, everything else to English) and allows an explicit
 * override through {@link GenuiI18nService.setLocale}. Missing keys fall back to
 * English and then to the key itself, so a partial dictionary can never blank
 * the UI. `{name}` placeholders are interpolated by {@link GenuiI18nService.t}.
 * @class GenuiI18nService
 * @example
 * ```typescript
 * const i18n = inject(GenuiI18nService);
 * i18n.setLocale("pt");
 * console.log(i18n.t("table.empty")); // "Sem linhas"
 * ```
 */
@Injectable({ providedIn: "root" })
export class GenuiI18nService {
  private readonly translate = inject(TranslateService, { optional: true });
  private readonly localeOverride = signal<GenuiLocale | null>(null);

  /**
   * @description Effective locale for GenUI chrome text
   * @summary An explicit override wins; otherwise the host translate service's
   * current language decides, defaulting to English.
   * @returns {GenuiLocale} The active locale.
   */
  readonly locale = computed<GenuiLocale>(() => {
    const override = this.localeOverride();
    if (override !== null) return override;
    const current = this.translate?.currentLang ?? this.translate?.getCurrentLang?.();
    if (typeof current === "string" && current.toLowerCase().startsWith("pt")) return "pt";
    return "en";
  });

  /**
   * @description Override the locale, or return to host-language detection
   * @param {GenuiLocale|null} locale The locale to force, or `null` to clear.
   * @returns {void}
   */
  setLocale(locale: GenuiLocale | null): void {
    this.localeOverride.set(locale);
  }

  /**
   * @description Resolve a localized string and interpolate placeholders
   * @summary Falls back to English and then to the key when a translation is
   * missing. Unknown placeholder names are left intact as `{name}` so the
   * template remains visible instead of silently disappearing.
   * @param {GenuiTextKey} key The dictionary key.
   * @param {Record<string, string|number>} [params] Placeholder values.
   * @returns {string} The resolved text.
   */
  t(key: GenuiTextKey, params?: Record<string, string | number>): string {
    const template = DICTS[this.locale()][key] ?? EN[key] ?? key;
    if (params === undefined) return template;
    return template.replace(/\{(\w+)\}/g, (_, name: string) =>
      params[name] === undefined ? `{${name}}` : String(params[name]),
    );
  }
}
