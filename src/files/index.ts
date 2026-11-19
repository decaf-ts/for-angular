/**
 * @namespace files
 * @description Codex-style `@path` workspace reference UI for the agent composer
 * @summary Public entry point of `@decaf-ts/for-angular/files`. It groups the
 * workspace-index types, the ranking and paste helpers, the `at.file.*`
 * translation dictionaries, {@link AtFileService}, and the standalone
 * `ngx-decaf-at-file-*` components: the composer wrapper, the path picker, the
 * reference dock, and the settings panel. The UI only ever receives path
 * metadata from the server; file content is never sent to the model.
 * @memberOf module:for-angular
 */
export * from "./types.js";
export * from "./utils.js";
export * from "./locales.js";
export * from "./services/AtFileService.js";
export * from "./components/at-file-picker/at-file-picker.component.js";
export * from "./components/at-file-dock/at-file-dock.component.js";
export * from "./components/at-file-composer/at-file-composer.component.js";
export * from "./components/at-file-settings/at-file-settings.component.js";
