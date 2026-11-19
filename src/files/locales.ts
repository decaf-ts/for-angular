/**
 * @description Translation namespace of the files UI
 * @summary Every key in {@link AT_FILE_EN} and {@link AT_FILE_PT} starts with
 * `at.file.`; the namespace is used when registering the dictionaries with the
 * translation loader.
 * @const AT_FILE_NAMESPACE
 * @type {string}
 * @memberOf module:for-angular.files
 */
export const AT_FILE_NAMESPACE = "at-file";

/**
 * @description English copy for the files UI
 * @summary Source dictionary of the `at.file.*` keys consumed by the picker,
 * dock, composer error, and settings panel. The labels state the
 * path-only privacy contract: only the path is sent, never file content.
 * @typedef {object} AtFileTranslations
 * @property {string} at.file.picker.aria - accessible label of the path picker.
 * @property {string} at.file.picker.empty - shown when no path matches.
 * @property {string} at.file.picker.loading - shown while the index loads.
 * @property {string} at.file.picker.truncated - shown when the index hit its cap.
 * @property {string} at.file.dock.aria - accessible label of the reference dock.
 * @property {string} at.file.dock.remove - remove-button label; `{name}` is the path.
 * @property {string} at.file.composer.error - shown when the files API is unavailable.
 * @property {string} at.file.settings.title - settings section title.
 * @property {string} at.file.settings.subtitle - settings section explanation.
 * @property {string} at.file.settings.enabled - enable-mentions toggle label.
 * @property {string} at.file.settings.enabledDesc - enable-mentions toggle description.
 * @property {string} at.file.settings.ignorePastedMentions - ignore-pasted toggle label.
 * @property {string} at.file.settings.ignorePastedMentionsDesc - ignore-pasted toggle description.
 * @property {string} at.file.settings.scope - filter-scope field label.
 * @property {string} at.file.settings.global - global scope option.
 * @property {string} at.file.settings.workspace - workspace scope option.
 * @property {string} at.file.settings.globalDesc - global scope explanation.
 * @property {string} at.file.settings.workspaceDesc - workspace scope explanation.
 * @property {string} at.file.settings.empty - shown when the scope has no filters.
 * @property {string} at.file.settings.ruleType - rule-type field label.
 * @property {string} at.file.settings.kind.exact - exact-rule option.
 * @property {string} at.file.settings.kind.regex - regex-rule option.
 * @property {string} at.file.settings.caseSensitive - case-sensitive option label.
 * @property {string} at.file.settings.caseInsensitive - case-insensitive option label.
 * @property {string} at.file.settings.caseSensitiveOption - case-sensitivity field label.
 * @property {string} at.file.settings.namePlaceholder - placeholder for exact rules.
 * @property {string} at.file.settings.regexPlaceholder - placeholder for regex rules.
 * @property {string} at.file.settings.ignoreFiles - file-filter list label.
 * @property {string} at.file.settings.add - add-filter action label.
 * @property {string} at.file.settings.remove - remove-filter label; `{name}` is the filter.
 * @property {string} at.file.settings.restoreDefaults - restore-defaults action label.
 * @property {string} at.file.settings.clearWorkspace - clear-workspace action label.
 * @property {string} at.file.settings.saving - shown while a settings update is in flight.
 * @memberOf module:for-angular.files
 */
export const AT_FILE_EN = {
  "at.file.picker.aria": "Workspace paths",
  "at.file.picker.empty": "No matching workspace paths",
  "at.file.picker.loading": "Indexing workspace paths…",
  "at.file.picker.truncated":
    "The workspace index is truncated; refine the query.",
  "at.file.dock.aria": "Referenced workspace paths",
  "at.file.dock.remove": "Remove {name}",
  "at.file.composer.error": "Workspace paths are unavailable.",
  "at.file.settings.title": "Workspace file mentions",
  "at.file.settings.subtitle":
    "Type @ to search and reference a workspace path; only the path is sent, never the file content.",
  "at.file.settings.enabled": "Enable @ file mentions",
  "at.file.settings.enabledDesc":
    "Turning this off hides the @ picker and reference dock and stops marking selected paths.",
  "at.file.settings.ignorePastedMentions":
    "Ignore @ mentions in pasted text",
  "at.file.settings.ignorePastedMentionsDesc":
    "Pasted @ tokens stay plain text and are not treated as workspace references.",
  "at.file.settings.scope": "Filter scope",
  "at.file.settings.global": "Global",
  "at.file.settings.workspace": "Workspace",
  "at.file.settings.globalDesc": "Applied to every workspace.",
  "at.file.settings.workspaceDesc":
    "Applied only to the selected workspace, alongside the global rules.",
  "at.file.settings.empty": "There are no file filters in this scope.",
  "at.file.settings.ruleType": "Rule type",
  "at.file.settings.kind.exact": "Exact",
  "at.file.settings.kind.regex": "Regex",
  "at.file.settings.caseSensitive": "Case-sensitive",
  "at.file.settings.caseInsensitive": "Case-insensitive",
  "at.file.settings.caseSensitiveOption": "Case-sensitive",
  "at.file.settings.namePlaceholder": "For example, desktop.ini",
  "at.file.settings.regexPlaceholder": "For example, ^test-",
  "at.file.settings.ignoreFiles": "File filters",
  "at.file.settings.add": "Add",
  "at.file.settings.remove": "Remove {name}",
  "at.file.settings.restoreDefaults": "Restore defaults",
  "at.file.settings.clearWorkspace": "Clear this workspace",
  "at.file.settings.saving": "Saving…",
} as const;

/**
 * @description Key of the files UI translation dictionary
 * @summary Union of every `at.file.*` key in {@link AT_FILE_EN}; the
 * Portuguese dictionary must implement all of them.
 * @typedef {keyof typeof AT_FILE_EN} AtFileKey
 * @memberOf module:for-angular.files
 */
export type AtFileKey = keyof typeof AT_FILE_EN;

/**
 * @description Portuguese copy for the files UI
 * @summary Complete translation of {@link AT_FILE_EN}; every {@link AtFileKey}
 * must be present.
 * @const AT_FILE_PT
 * @type {Record<AtFileKey, string>}
 * @memberOf module:for-angular.files
 */
export const AT_FILE_PT: Record<AtFileKey, string> = {
  "at.file.picker.aria": "Caminhos do espaço de trabalho",
  "at.file.picker.empty": "Nenhum caminho correspondente",
  "at.file.picker.loading": "A indexar caminhos do espaço de trabalho…",
  "at.file.picker.truncated":
    "O índice do espaço de trabalho está truncado; refine a pesquisa.",
  "at.file.dock.aria": "Caminhos referenciados",
  "at.file.dock.remove": "Remover {name}",
  "at.file.composer.error": "Os caminhos do espaço de trabalho não estão disponíveis.",
  "at.file.settings.title": "Referências a ficheiros",
  "at.file.settings.subtitle":
    "Escreva @ para pesquisar e referenciar um caminho; apenas o caminho é enviado, nunca o conteúdo.",
  "at.file.settings.enabled": "Ativar referências @ a ficheiros",
  "at.file.settings.enabledDesc":
    "Ao desativar, o seletor @ e a barra de referências desaparecem e os caminhos deixam de ser marcados.",
  "at.file.settings.ignorePastedMentions":
    "Ignorar @ em texto colado",
  "at.file.settings.ignorePastedMentionsDesc":
    "Os tokens @ colados permanecem texto simples e não são tratados como referências.",
  "at.file.settings.scope": "Âmbito dos filtros",
  "at.file.settings.global": "Global",
  "at.file.settings.workspace": "Espaço de trabalho",
  "at.file.settings.globalDesc": "Aplicado a todos os espaços de trabalho.",
  "at.file.settings.workspaceDesc":
    "Aplicado apenas ao espaço de trabalho selecionado, em conjunto com as regras globais.",
  "at.file.settings.empty": "Não existem filtros neste âmbito.",
  "at.file.settings.ruleType": "Tipo de regra",
  "at.file.settings.kind.exact": "Exata",
  "at.file.settings.kind.regex": "Regex",
  "at.file.settings.caseSensitive": "Sensível a maiúsculas",
  "at.file.settings.caseInsensitive": "Insensível a maiúsculas",
  "at.file.settings.caseSensitiveOption": "Sensível a maiúsculas",
  "at.file.settings.namePlaceholder": "Por exemplo, desktop.ini",
  "at.file.settings.regexPlaceholder": "Por exemplo, ^test-",
  "at.file.settings.ignoreFiles": "Filtros de ficheiros",
  "at.file.settings.add": "Adicionar",
  "at.file.settings.remove": "Remover {name}",
  "at.file.settings.restoreDefaults": "Restaurar predefinições",
  "at.file.settings.clearWorkspace": "Limpar este espaço de trabalho",
  "at.file.settings.saving": "A guardar…",
};
