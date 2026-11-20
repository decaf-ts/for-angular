// Whitelisted component vocabulary mirrored from the harness GenUI guard.
// A type absent from this set renders the visible fallback, never an error.

/**
 * @description Whitelisted GenUI component type names
 * @summary Mirrors the server-side guard vocabulary. Every member maps to a
 * real Angular/DOM primitive in {@link GenuiNodeComponent}; a type absent from
 * this set renders the localized unsupported-component fallback rather than
 * failing the block.
 * @constant
 * @type {ReadonlySet<string>}
 * @memberOf module:gen-ui
 */
export const GENUI_NATIVE_TYPES: ReadonlySet<string> = new Set([
  "arrow",
  "accordion",
  "audio",
  "avatar",
  "badge",
  "breadcrumb",
  "button",
  "callout",
  "card",
  "carousel",
  "image-group",
  "editor",
  "entity-card",
  "popover",
  "choices",
  "compare",
  "chart",
  "checkbox",
  "code",
  "col",
  "copy",
  "diagram",
  "diff",
  "divider",
  "echart",
  "file-tree",
  "grid",
  "blocks",
  "icon",
  "image",
  "input",
  "date-picker",
  "json",
  "keyvalue",
  "link",
  "list",
  "map",
  "mermaid",
  "svg",
  "plot",
  "progress",
  "quiz",
  "radio",
  "row",
  "scene3d",
  "select",
  "segmented-control",
  "slider",
  "spacer",
  "hero",
  "stat",
  "steps",
  "submit",
  "switch",
  "table",
  "tabs",
  "text",
  "textarea",
  "timeline",
  "video",
]);

/**
 * @description Test whether a node type belongs to the renderer vocabulary
 * @summary Returns `true` only for names present in {@link GENUI_NATIVE_TYPES};
 * callers use this to choose between a real renderer and the fallback.
 * @param {string} type The declared node `type` value.
 * @returns {boolean} `true` when the type has a whitelisted renderer.
 * @function
 * @memberOf module:gen-ui
 */
export function isGenuiNativeType(type: string): boolean {
  return GENUI_NATIVE_TYPES.has(type);
}

/**
 * @description Mermaid diagram-kind allowlist
 * @summary Kept identical to the audited server-side guard list. The Mermaid
 * engine is only asked to render a diagram whose first token is a member of
 * this set; anything else fails closed with a localized message.
 * @constant
 * @type {ReadonlySet<string>}
 * @memberOf module:gen-ui
 */
export const MERMAID_DIAGRAM_KINDS: ReadonlySet<string> = new Set([
  "flowchart",
  "graph",
  "sequenceDiagram",
  "classDiagram",
  "stateDiagram",
  "stateDiagram-v2",
  "erDiagram",
  "journey",
  "gantt",
  "pie",
  "mindmap",
  "timeline",
  "quadrantChart",
  "gitGraph",
  "requirementDiagram",
  "C4Context",
  "sankey-beta",
  "block-beta",
  "packet-beta",
  "architecture-beta",
]);

/**
 * @description ECharts preset names understood by the eager chart adapter
 * @summary `GenuiEchartComponent` maps each preset onto a small option object
 * before the option reaches `echarts.init`; a raw `option` bypasses presets but
 * still passes through {@link sanitizeEChartOption}.
 * @constant
 * @type {ReadonlySet<string>}
 * @memberOf module:gen-ui
 */
export const ECHART_PRESETS: ReadonlySet<string> = new Set([
  "bar",
  "line",
  "area",
  "pie",
  "scatter",
  "radar",
  "gauge",
  "funnel",
  "treemap",
  "sankey",
  "graph",
  "heatmap",
  "bigline",
  "wordCloud",
]);
