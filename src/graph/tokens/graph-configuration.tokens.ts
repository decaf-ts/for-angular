import { InjectionToken } from '@angular/core';

export const GRAPH_HISTORY_LIMIT = new InjectionToken<number>(
  'GRAPH_HISTORY_LIMIT',
  { providedIn: 'root', factory: () => 10 },
);

export const GRAPH_AUTOSAVE_DEBOUNCE_MS = new InjectionToken<number>(
  'GRAPH_AUTOSAVE_DEBOUNCE_MS',
  { providedIn: 'root', factory: () => 500 },
);
