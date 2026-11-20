/**
 * @module gen-ui
 * @description Angular renderer for the harness GenUI `dsh-ui` fence
 * @summary Entry point for `@decaf-ts/for-angular/gen-ui`. Exposes the spec
 * type vocabulary ({@link GenuiSpec}, {@link GenuiNode}), fence parsing and
 * panel merging, conditional/computed evaluation, sandboxed math, sanitizers,
 * the reactive {@link GenuiBlockState}, persistence helpers, configuration
 * providers, the action/asset/panel/i18n services, and the standalone
 * components that render a block, a fence, the session panel dock, action
 * provenance, and the lazy SVG/Mermaid/ECharts/plot/3D/map/diagram engines.
 *
 * The vocabulary is a whitelist: every node maps to a real Angular/DOM
 * primitive and no arbitrary HTML path exists. The authoritative validator is
 * the server-side guard in `@decaf-ts/harness-genui`; this package consumes its
 * repaired output and degrades per node when a spec is malformed.
 */
export * from "./types";
export * from "./limits";
export * from "./schema";
export * from "./sanitize";
export * from "./fence";
export * from "./panel";
export * from "./conditions";
export * from "./computed";
export * from "./safe-math";
export * from "./interaction-store";
export * from "./render-context";
export * from "./genui.config";
export * from "./genui-action.service";
export * from "./genui-asset-loader.service";
export * from "./genui-panel.service";
export * from "./i18n/genui-i18n";
export * from "./components/genui-block/genui-block.component";
export * from "./components/genui-node/genui-node.component";
export * from "./components/genui-fence/genui-fence.component";
export * from "./components/genui-panel-dock/genui-panel-dock.component";
export * from "./components/genui-action-provenance/genui-action-provenance.component";
export * from "./components/engines/genui-svg.component";
export * from "./components/engines/genui-mermaid.component";
export * from "./components/engines/genui-echart.component";
export * from "./components/engines/genui-plot.component";
export * from "./components/engines/genui-scene3d.component";
export * from "./components/engines/genui-map.component";
export * from "./components/engines/genui-diagram.component";
export * from "./genui.module";
