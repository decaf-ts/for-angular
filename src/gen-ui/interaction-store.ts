import type { GenuiRenderContext } from "./render-context";

/**
 * @description Serialized per-block interaction state kept in `localStorage`
 * @summary Restores field values, answers, grading lock, and reset round after
 * a remount. Secret field ids are filtered out before this object is returned
 * or persisted, so passwords never reach storage.
 * @typedef {Object} GenuiPersistedState
 * @property {Record<string, string>} fields Non-secret field values.
 * @property {Record<string, string>} numericValues Raw numeric field values.
 * @property {Record<string, string>} answers Single-choice answers by group.
 * @property {Record<string, string[]>} multiAnswers Multi-choice answers by group.
 * @property {boolean} locked Whether the block was submitted/locked.
 * @property {number} round Reset counter used to invalidate stale grades.
 * @memberOf module:gen-ui
 */
export interface GenuiPersistedState {
  fields: Record<string, string>;
  numericValues: Record<string, string>;
  answers: Record<string, string>;
  multiAnswers: Record<string, string[]>;
  locked: boolean;
  round: number;
}

const PREFIX = "decaf.genui.state:";

/**
 * @description Build the storage key for one rendered block
 * @summary Scopes state by session, block, and spec so multiple blocks in a
 * session and re-renders of a new spec never collide.
 * @param {GenuiRenderContext} context The block's render context.
 * @returns {string} The namespaced `localStorage` key.
 * @function
 * @memberOf module:gen-ui
 */
export function genuiStateKey(context: GenuiRenderContext): string {
  return `${PREFIX}${context.sessionId}:${context.blockId}:${context.specId}`;
}

function storage(): Storage | null {
  try {
    if (typeof localStorage === "undefined") return null;
    return localStorage;
  } catch {
    return null;
  }
}

/**
 * @description Load persisted state for a block, filtering secret fields
 * @summary Degrades to `null` when storage is unavailable (private mode, SSR)
 * or the stored payload is corrupt. Answers are returned as-is because they
 * reference labels, not input values.
 * @param {GenuiRenderContext} context The block's render context.
 * @param {ReadonlySet<string>} secretIds Field ids that must never be restored.
 * @returns {GenuiPersistedState|null} The restored state, or `null` when none
 * is available.
 * @function
 * @memberOf module:gen-ui
 */
export function loadBlockState(
  context: GenuiRenderContext,
  secretIds: ReadonlySet<string>,
): GenuiPersistedState | null {
  const store = storage();
  if (store === null) return null;
  try {
    const raw = store.getItem(genuiStateKey(context));
    if (raw === null) return null;
    const parsed = JSON.parse(raw) as Partial<GenuiPersistedState>;
    const fields = Object.fromEntries(
      Object.entries(parsed.fields ?? {}).filter(([id]) => !secretIds.has(id)),
    );
    const numericValues = Object.fromEntries(
      Object.entries(parsed.numericValues ?? {}).filter(([id]) => !secretIds.has(id)),
    );
    return {
      fields,
      numericValues,
      answers: parsed.answers ?? {},
      multiAnswers: parsed.multiAnswers ?? {},
      locked: parsed.locked === true,
      round: typeof parsed.round === "number" ? parsed.round : 0,
    };
  } catch {
    return null;
  }
}

/**
 * @description Persist block state after stripping secret fields
 * @summary Writes synchronously to `localStorage`; quota or private-mode
 * failures are swallowed so interaction state simply stays in memory.
 * @param {GenuiRenderContext} context The block's render context.
 * @param {GenuiPersistedState} state The state snapshot to store.
 * @param {ReadonlySet<string>} secretIds Field ids that must never be stored.
 * @returns {void}
 * @function
 * @memberOf module:gen-ui
 */
export function saveBlockState(
  context: GenuiRenderContext,
  state: GenuiPersistedState,
  secretIds: ReadonlySet<string>,
): void {
  const store = storage();
  if (store === null) return;
  const safe: GenuiPersistedState = {
    ...state,
    fields: Object.fromEntries(Object.entries(state.fields).filter(([id]) => !secretIds.has(id))),
    numericValues: Object.fromEntries(
      Object.entries(state.numericValues).filter(([id]) => !secretIds.has(id)),
    ),
  };
  try {
    store.setItem(genuiStateKey(context), JSON.stringify(safe));
  } catch {
    // Storage quota / private mode: state stays in memory only.
  }
}

/**
 * @description Remove persisted state for one block
 * @summary Safe to call when no state exists or storage is unavailable.
 * @param {GenuiRenderContext} context The block's render context.
 * @returns {void}
 * @function
 * @memberOf module:gen-ui
 */
export function clearBlockState(context: GenuiRenderContext): void {
  const store = storage();
  if (store === null) return;
  try {
    store.removeItem(genuiStateKey(context));
  } catch {
    // ignore
  }
}
