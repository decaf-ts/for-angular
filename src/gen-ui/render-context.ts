import { computed, signal } from "@angular/core";
import { evaluateComputed, formatComputedValue } from "./computed";
import type { GenuiConditionState } from "./conditions";
import type { GenuiComputedCell, GenuiComputedRef, GenuiSpec } from "./types";

/**
 * @description Identity of one rendered GenUI block
 * @summary Scopes interaction state and action provenance. `sessionId` ties a
 * block to a chat session, `blockId` to the fence within a message, and
 * `specId` to a particular spec revision.
 * @typedef {Object} GenuiRenderContext
 * @property {string} sessionId Owning chat session.
 * @property {string} blockId Block identifier within the session.
 * @property {string} specId Spec revision identifier.
 * @memberOf module:gen-ui
 */
export interface GenuiRenderContext {
  sessionId: string;
  blockId: string;
  specId: string;
}

/**
 * @description Action emitted by a rendered block
 * @summary Carries the model-defined action name and the collected payload,
 * plus the block/spec identity. {@link GenuiBlockComponent} forwards it to both
 * the host `action` output and, unless auto-relay is disabled, the harness.
 * @typedef {Object} GenuiActionRequest
 * @property {string} name The model-defined action name.
 * @property {Record<string, unknown>} payload Collected form/choice values.
 * @property {string} blockId Originating block id.
 * @property {string} specId Originating spec id.
 * @memberOf module:gen-ui
 */
export interface GenuiActionRequest {
  name: string;
  payload: Record<string, unknown>;
  blockId: string;
  specId: string;
}

/**
 * @description Action event enriched with its session id
 * @summary The shape handed to {@link GenuiActionService.relay} so the server
 * can attribute the action to a session.
 * @typedef {Object} GenuiActionEvent
 * @property {string} name The model-defined action name.
 * @property {Record<string, unknown>} payload Collected form/choice values.
 * @property {string} blockId Originating block id.
 * @property {string} specId Originating spec id.
 * @property {string} sessionId Owning chat session.
 * @extends GenuiActionRequest
 * @memberOf module:gen-ui
 */
export interface GenuiActionEvent extends GenuiActionRequest {
  sessionId: string;
}

/**
 * @description Request to open a link on behalf of a rendered block
 * @summary Emitted instead of navigating directly so the host can apply its
 * own routing or file-open policy.
 * @typedef {Object} GenuiOpenLinkEvent
 * @property {string} href The already-validated destination.
 * @property {string} blockId Originating block id.
 * @property {string} specId Originating spec id.
 * @memberOf module:gen-ui
 */
export interface GenuiOpenLinkEvent {
  href: string;
  blockId: string;
  specId: string;
}

/**
 * @description Empty context used before a real context is supplied
 * @constant
 * @type {GenuiRenderContext}
 * @memberOf module:gen-ui
 */
export const EMPTY_GENUI_CONTEXT: GenuiRenderContext = {
  sessionId: "",
  blockId: "block",
  specId: "spec",
};

/**
 * @description Reactive interaction state for one rendered GenUI block
 * @summary Holds the spec, render context, field values, choice answers, and
 * the submit/lock round as Angular signals. Derived signals expose the
 * condition state and evaluated computed values, so templates and helpers stay
 * in sync without manual subscriptions. Secret input ids are tracked so values
 * are filtered from persistence and submissions.
 * @class GenuiBlockState
 * @example
 * ```typescript
 * const state = new GenuiBlockState();
 * state.configure({ items: [] }, { sessionId: "s", blockId: "b", specId: "1" }, new Set());
 * state.setField("name", "Ada");
 * console.log(state.fields().name); // "Ada"
 * ```
 */
export class GenuiBlockState {
  readonly spec = signal<GenuiSpec>({ items: [] });
  readonly context = signal<GenuiRenderContext>(EMPTY_GENUI_CONTEXT);
  readonly fields = signal<Record<string, string>>({});
  readonly numericValues = signal<Record<string, string>>({});
  readonly answers = signal<Record<string, string>>({});
  readonly multiAnswers = signal<Record<string, string[]>>({});
  readonly locked = signal(false);
  readonly round = signal(0);
  readonly secretIds = signal<ReadonlySet<string>>(new Set<string>());

  onAction?: (name: string, payload: Record<string, unknown>) => void;
  onOpenLink?: (href: string) => void;

  readonly conditions = computed<GenuiConditionState>(() => ({
    fields: this.fields(),
    answers: this.answers(),
    multiAnswers: this.multiAnswers(),
  }));

  readonly computedValues = computed<Record<string, number>>(() =>
    evaluateComputed(this.spec(), { ...this.fields(), ...this.numericValues() }),
  );

/**
 * @description Install the spec and treating secrets for this block
 * @summary Replaces the spec and context signals and records the secret field
 * ids; it does not reset interaction values (use {@link GenuiBlockState.hydrate}
 * or {@link GenuiBlockState.reset}).
 * @param {GenuiSpec} spec The spec to render.
 * @param {GenuiRenderContext} context The block identity.
 * @param {ReadonlySet<string>} secretIds Secret field ids to filter out.
 * @returns {void}
 */
  configure(spec: GenuiSpec, context: GenuiRenderContext, secretIds: ReadonlySet<string>): void {
    this.spec.set(spec);
    this.context.set(context);
    this.secretIds.set(secretIds);
  }

/**
 * @description Replace interaction values from a persisted snapshot
 * @summary Drops any stored values whose ids are currently secret, then
 * restores answers, multi-answers, lock, and round.
 * @param {Object} state The snapshot to restore.
 * @param {Record<string, string>} [state.fields] Field restore values.
 * @param {Record<string, string>} [state.numericValues] Numeric restore values.
 * @param {Record<string, string>} [state.answers] Single answers.
 * @param {Record<string, string[]>} [state.multiAnswers] Multi answers.
 * @param {boolean} [state.locked] Lock flag.
 * @param {number} [state.round] Reset round.
 * @returns {void}
 */
  hydrate(state: {
    fields?: Record<string, string>;
    numericValues?: Record<string, string>;
    answers?: Record<string, string>;
    multiAnswers?: Record<string, string[]>;
    locked?: boolean;
    round?: number;
  }): void {
    const secret = this.secretIds();
    this.fields.set(
      Object.fromEntries(Object.entries(state.fields ?? {}).filter(([id]) => !secret.has(id))),
    );
    this.numericValues.set(
      Object.fromEntries(Object.entries(state.numericValues ?? {}).filter(([id]) => !secret.has(id))),
    );
    this.answers.set(state.answers ?? {});
    this.multiAnswers.set(state.multiAnswers ?? {});
    this.locked.set(state.locked === true);
    this.round.set(state.round ?? 0);
  }

/**
 * @description Read the current interaction values as a serializable snapshot
 * @summary Used by {@link saveBlockState}; secret filtering happens at the
 * persistence boundary, not here.
 * @returns {Object} The current fields, answers, lock, and round.
 */
  snapshot(): {
    fields: Record<string, string>;
    numericValues: Record<string, string>;
    answers: Record<string, string>;
    multiAnswers: Record<string, string[]>;
    locked: boolean;
    round: number;
  } {
    return {
      fields: this.fields(),
      numericValues: this.numericValues(),
      answers: this.answers(),
      multiAnswers: this.multiAnswers(),
      locked: this.locked(),
      round: this.round(),
    };
  }

/**
 * @description Store a field value in both the text and numeric stores
 * @param {string} id Field id.
 * @param {string} value Raw value as entered.
 * @returns {void}
 */
  setField(id: string, value: string): void {
    this.fields.update((current) => ({ ...current, [id]: value }));
    this.numericValues.update((current) => ({ ...current, [id]: value }));
  }

/**
 * @description Record a single-choice answer for a group
 * @param {string} group Answer group id.
 * @param {string} choice Selected label.
 * @returns {void}
 */
  setAnswer(group: string, choice: string): void {
    this.answers.update((current) => ({ ...current, [group]: choice }));
  }

/**
 * @description Add or remove a multi-choice answer for a group
 * @param {string} group Answer group id.
 * @param {string} choice The label to toggle.
 * @param {boolean} checked Whether the label is selected.
 * @returns {void}
 */
  toggleMulti(group: string, choice: string, checked: boolean): void {
    this.multiAnswers.update((current) => {
      const existing = current[group] ?? [];
      const next = checked
        ? existing.includes(choice)
          ? existing
          : [...existing, choice]
        : existing.filter((entry) => entry !== choice);
      return { ...current, [group]: next };
    });
  }

/**
 * @description Clear all interaction values and advance the reset round
 * @summary The incremented round invalidates any in-flight grade or stale
 * form submission.
 * @returns {void}
 */
  reset(): void {
    this.fields.set({});
    this.numericValues.set({});
    this.answers.set({});
    this.multiAnswers.set({});
    this.locked.set(false);
    this.round.update((value) => value + 1);
  }

/**
 * @description Read a non-empty field value
 * @summary Returns `undefined` for a missing id or an empty string so callers
 * can distinguish "not set" from "set to empty".
 * @param {string|undefined} id Field id.
 * @returns {string|undefined} The value or `undefined`.
 */
  fieldValue(id: string | undefined): string | undefined {
    if (id === undefined) return undefined;
    const value = this.fields()[id];
    return value === undefined || value === "" ? undefined : value;
  }

/**
 * @description Resolve a computed reference to its numeric value
 * @param {string|GenuiComputedRef} ref A computed id or `{ $computed }` ref.
 * @returns {number|undefined} The resolved value, or `undefined` when unresolved.
 */
  resolveComputedRef(ref: string | GenuiComputedRef): number | undefined {
    const id = typeof ref === "string" ? ref : ref.$computed;
    return this.computedValues()[id];
  }

/**
 * @description Emit an action through the configured callback
 * @summary Ignores empty/whitespace action names; the callback is supplied by
 * {@link GenuiBlockComponent} and fans out to the host output and relay.
 * @param {string|undefined} name The action name.
 * @param {Record<string, unknown>} payload Collected values.
 * @returns {void}
 */
  fire(name: string | undefined, payload: Record<string, unknown>): void {
    if (name === undefined || name.trim() === "") return;
    this.onAction?.(name.trim(), payload);
  }

/**
 * @description Report a validated link request to the host
 * @param {string} href The already-validated link destination.
 * @returns {void}
 */
  fireFileLink(href: string): void {
    this.onOpenLink?.(href);
  }

/**
 * @description Render a table cell to display text
 * @summary Handles computed refs (formatted through the field definition),
 * preformatted computed cells, `null`, and primitives.
 * @param {unknown} cell The raw cell value.
 * @returns {string} Display text.
 */
  resolveCell(cell: unknown): string {
    if (cell !== null && typeof cell === "object" && "$computed" in cell) {
      const value = this.resolveComputedRef(cell as GenuiComputedRef);
      return value === undefined ? "" : formatComputedValue(value, this.spec(), (cell as GenuiComputedRef).$computed);
    }
    if (cell !== null && typeof cell === "object" && "formatted" in cell) {
      return String((cell as GenuiComputedCell).formatted);
    }
    return cell === null || cell === undefined ? "" : String(cell);
  }

/**
 * @description Coerce a table cell to a finite number when possible
 * @summary Accepts numbers, computed refs/cells, and numeric strings with
 * thousands separators. Returns `undefined` for non-numeric text so bar/delta
 * cells can fall back to plain text.
 * @param {unknown} cell The raw cell value.
 * @returns {number|undefined} The numeric value, or `undefined`.
 */
  numericCell(cell: unknown): number | undefined {
    if (typeof cell === "number") return Number.isFinite(cell) ? cell : undefined;
    if (cell !== null && typeof cell === "object" && "$computed" in cell) {
      return this.resolveComputedRef(cell as GenuiComputedRef);
    }
    if (cell !== null && typeof cell === "object" && "value" in cell) {
      const value = Number((cell as GenuiComputedCell).value);
      return Number.isFinite(value) ? value : undefined;
    }
    if (typeof cell === "string") {
      const parsed = Number(cell.replace(/,/g, "").trim());
      return Number.isFinite(parsed) && cell.trim() !== "" ? parsed : undefined;
    }
    return undefined;
  }
}

/**
 * @description Collect ids of password inputs that must never leave the client
 * @summary Walks `items` and `tabs` children and records the `id` of every
 * `input` node whose `inputType` is `password`.
 * @param {GenuiSpec} spec The spec to scan.
 * @returns {ReadonlySet<string>} Secret field ids.
 * @function
 * @memberOf module:gen-ui
 */
export function collectSecretIds(spec: GenuiSpec): ReadonlySet<string> {
  const secret = new Set<string>();
  const walk = (nodes: unknown[]): void => {
    for (const node of nodes) {
      if (node === null || typeof node !== "object") continue;
      const anyNode = node as { type?: string; id?: string; inputType?: string; items?: unknown[]; tabs?: { items?: unknown[] }[] };
      if (anyNode.type === "input" && anyNode.inputType === "password" && typeof anyNode.id === "string") {
        secret.add(anyNode.id);
      }
      if (Array.isArray(anyNode.items)) walk(anyNode.items);
      if (Array.isArray(anyNode.tabs)) {
        for (const tab of anyNode.tabs) if (Array.isArray(tab.items)) walk(tab.items);
      }
    }
  };
  walk(spec.items);
  return secret;
}
