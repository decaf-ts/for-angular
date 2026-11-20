import type { GenuiNode, GenuiWhen } from "./types";

/**
 * @description Current form/answer values used to evaluate conditional nodes
 * @summary Groups the three stores that can satisfy a {@link GenuiWhen} field:
 * free-text/numeric fields, single answers, and multi-select answers. Lookup
 * precedence is answers, then multi-answers, then fields.
 * @typedef {Object} GenuiConditionState
 * @property {Record<string, string>} fields Field id to raw value.
 * @property {Record<string, string>} answers Group id to the chosen label.
 * @property {Record<string, string[]>} multiAnswers Group id to chosen labels.
 * @memberOf module:gen-ui
 */
export interface GenuiConditionState {
  fields: Record<string, string>;
  answers: Record<string, string>;
  multiAnswers: Record<string, string[]>;
}

function readValue(when: GenuiWhen, state: GenuiConditionState): unknown {
  if (Object.hasOwn(state.answers, when.field)) return state.answers[when.field];
  if (Object.hasOwn(state.multiAnswers, when.field)) return state.multiAnswers[when.field];
  if (Object.hasOwn(state.fields, when.field)) return state.fields[when.field];
  return undefined;
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

/**
 * @description Evaluate one conditional predicate against current state
 * @summary Comparison is string-based for equality and membership (so numeric
 * input values match string literals), numeric for the ordering operators, and
 * type-aware for `empty`/`not-empty`/`checked`. Unknown operators return `true`
 * so an unrecognized predicate never hides content.
 * @param {GenuiWhen} when The predicate to evaluate.
 * @param {GenuiConditionState} state Current field and answer values.
 * @returns {boolean} The predicate result.
 * @function
 * @memberOf module:gen-ui
 */
export function evaluateWhen(when: GenuiWhen, state: GenuiConditionState): boolean {
  const current = readValue(when, state);
  switch (when.op) {
    case "eq":
      return String(current ?? "") === String(when.value ?? "");
    case "neq":
      return String(current ?? "") !== String(when.value ?? "");
    case "in":
      return Array.isArray(when.value) && when.value.map(String).includes(String(current ?? ""));
    case "not-in":
      return !Array.isArray(when.value) || !when.value.map(String).includes(String(current ?? ""));
    case "gt":
    case "gte":
    case "lt":
    case "lte": {
      const left = asNumber(current);
      const right = asNumber(when.value);
      if (left === undefined || right === undefined) return false;
      if (when.op === "gt") return left > right;
      if (when.op === "gte") return left >= right;
      if (when.op === "lt") return left < right;
      return left <= right;
    }
    case "empty":
      if (Array.isArray(current)) return current.length === 0;
      return current === undefined || current === null || String(current).trim() === "";
    case "not-empty":
      if (Array.isArray(current)) return current.length > 0;
      return current !== undefined && current !== null && String(current).trim() !== "";
    case "checked":
      if (Array.isArray(current)) return current.length > 0;
      return current === true || current === "true" || current === "on";
    default:
      return true;
  }
}

/**
 * @description Decide whether a node should be rendered
 * @summary A node without `when` is always visible; otherwise the predicate in
 * {@link GenuiWhen} is evaluated against {@link GenuiConditionState}.
 * @param {GenuiNode} node The node to test.
 * @param {GenuiConditionState} state Current field and answer values.
 * @returns {boolean} `true` when the node should render.
 * @function
 * @memberOf module:gen-ui
 */
export function isNodeVisible(node: GenuiNode, state: GenuiConditionState): boolean {
  if (node.when === undefined) return true;
  return evaluateWhen(node.when, state);
}

/**
 * @description Decide whether a node should be interactive
 * @summary A node without `enableWhen` is always enabled; otherwise the
 * predicate is evaluated against current state. Disabled nodes still render so
 * the user can see why they are gated ({@link GenuiNodeComponent.gated}).
 * @param {GenuiNode} node The node to test.
 * @param {GenuiConditionState} state Current field and answer values.
 * @returns {boolean} `true` when the node accepts interaction.
 * @function
 * @memberOf module:gen-ui
 */
export function isNodeEnabled(node: GenuiNode, state: GenuiConditionState): boolean {
  if (node.enableWhen === undefined) return true;
  return evaluateWhen(node.enableWhen, state);
}

function childNodes(node: GenuiNode): GenuiNode[] {
  const anyNode = node as unknown as {
    items?: unknown;
    tabs?: { items?: GenuiNode[] }[];
  };
  const out: GenuiNode[] = [];
  if (Array.isArray(anyNode.items)) {
    for (const item of anyNode.items) {
      if (item !== null && typeof item === "object" && "type" in item) out.push(item as GenuiNode);
    }
  }
  if (Array.isArray(anyNode.tabs)) {
    for (const tab of anyNode.tabs) out.push(...(tab.items ?? []));
  }
  return out;
}

function nodeKeys(node: GenuiNode): string[] {
  const anyNode = node as unknown as {
    id?: unknown;
    group?: unknown;
  };
  const keys: string[] = [];
  if (typeof anyNode.id === "string") keys.push(anyNode.id);
  if (typeof anyNode.group === "string") keys.push(anyNode.group);
  return keys;
}

/**
 * @description Collect ids/groups hidden by conditions anywhere in a tree
 * @summary Walks `items` and `tabs` children; once a node is hidden its own
 * key and its subtree are not traversed, so a hidden container hides the
 * groups beneath it. Used to keep hidden answers out of submission payloads.
 * @param {GenuiNode[]} items Root-level nodes to inspect.
 * @param {GenuiConditionState} state Current field and answer values.
 * @returns {Set<string>} Hidden `id`/`group` keys.
 * @function
 * @memberOf module:gen-ui
 */
export function collectHiddenKeys(items: GenuiNode[], state: GenuiConditionState): Set<string> {
  const hidden = new Set<string>();
  const walk = (nodes: GenuiNode[]): void => {
    for (const node of nodes) {
      if (!isNodeVisible(node, state)) {
        for (const key of nodeKeys(node)) hidden.add(key);
        continue;
      }
      walk(childNodes(node));
    }
  };
  walk(items);
  return hidden;
}
