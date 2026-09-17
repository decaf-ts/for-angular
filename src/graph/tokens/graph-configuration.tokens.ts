import { InjectionToken } from '@angular/core';

export const GRAPH_HISTORY_LIMIT = new InjectionToken<number>(
  'GRAPH_HISTORY_LIMIT',
  { providedIn: 'root', factory: () => 10 },
);

export const GRAPH_AUTOSAVE_DEBOUNCE_MS = new InjectionToken<number>(
  'GRAPH_AUTOSAVE_DEBOUNCE_MS',
  { providedIn: 'root', factory: () => 500 },
);

/**
 * Developer-mode flag for the graph demo chrome (G3-36): developer-only
 * affordances (the raw snapshot textarea) render only when this is `true`.
 * Defaults to `false`; the demo app provides `Environment.env === 'development'`.
 */
export const GRAPH_DEV_MODE = new InjectionToken<boolean>('GRAPH_DEV_MODE', {
  providedIn: 'root',
  factory: () => false,
});
