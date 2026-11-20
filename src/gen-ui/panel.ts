import type { GenuiSpec, GenuiTab } from "./types";

function asTabs(spec: GenuiSpec): GenuiTab[] | null {
  if (spec.items.length !== 1) return null;
  const only = spec.items[0];
  if (only?.type !== "tabs" || !Array.isArray((only as { tabs?: unknown }).tabs)) return null;
  return (only as { tabs: GenuiTab[] }).tabs;
}

// Appends `next` into `prev`: matching tab labels grow in place, new labels are
// added; otherwise root items append to the tail. The previous title wins.
/**
 * @description Merge a panel update into the previously published spec
 * @summary Supports incremental panel output. When both specs are a single
 * `tabs` node, tabs with the same label grow in place and new labels are
 * appended; otherwise the new root items append to the end. Computed fields
 * accumulate and the previous title wins. A `next.append !== true` update is
 * handled by the caller ({@link GenuiPanelService}) and replaces the panel
 * instead of calling this function.
 * @param {GenuiSpec|null} prev The currently published spec, or `null`.
 * @param {GenuiSpec} next The incoming spec to merge in.
 * @returns {GenuiSpec} The merged spec.
 * @function
 * @memberOf module:gen-ui
 */
export function mergePanelSpecs(prev: GenuiSpec | null, next: GenuiSpec): GenuiSpec {
  if (prev === null || (prev.items.length === 0 && (prev.computed?.length ?? 0) === 0)) return next;
  const title = prev.title ?? next.title;
  const computed = [...(prev.computed ?? []), ...(next.computed ?? [])];
  const base: GenuiSpec = {
    ...prev,
    ...(title === undefined ? {} : { title }),
    ...(computed.length === 0 ? {} : { computed }),
  };
  const prevTabs = asTabs(prev);
  const nextTabs = asTabs(next);
  if (prevTabs !== null && nextTabs !== null) {
    const merged = new Map(prevTabs.map((tab) => [tab.label, { label: tab.label, items: [...tab.items] }]));
    for (const tab of nextTabs) {
      const existing = merged.get(tab.label);
      if (existing !== undefined) existing.items.push(...tab.items);
      else merged.set(tab.label, { label: tab.label, items: [...tab.items] });
    }
    return { ...base, items: [{ type: "tabs", tabs: [...merged.values()] }] };
  }
  return { ...base, items: [...prev.items, ...next.items] };
}
