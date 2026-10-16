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

/** Byte/line rendering cap for a node I/O panel (SAA-722). */
export interface GraphIoPanelLimit {
  /** Maximum rendered payload size in UTF-8 bytes. */
  bytes: number;
  /** Maximum rendered payload line count. */
  lines: number;
}

/** Default node I/O rendering cap: 256 KB or 2000 lines (SAA-722). */
export const GRAPH_IO_PANEL_LIMIT_DEFAULT: GraphIoPanelLimit = {
  bytes: 256 * 1024,
  lines: 2000,
};

/**
 * Configurable node I/O panel rendering cap (SAA-722): the browser never
 * renders more than this many bytes/lines of a node's inputs/outputs, so a large
 * run payload cannot overflow the page. Hosts may override the default with their
 * own provider; the full untruncated payload stays downloadable.
 */
export const GRAPH_IO_PANEL_LIMIT = new InjectionToken<GraphIoPanelLimit>(
  'GRAPH_IO_PANEL_LIMIT',
  { providedIn: 'root', factory: () => GRAPH_IO_PANEL_LIMIT_DEFAULT },
);
