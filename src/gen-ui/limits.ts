
/**
 * @description Renderer-side safety limits for a GenUI spec
 * @summary Mirrors the harness guard's limits so the browser never trusts a
 * spec that skipped server validation. The renderer applies these caps while
 * building views (depth, row/column counts, engine payload sizes) instead of
 * rejecting the whole block, which keeps partial output usable. All values are
 * inclusive maximums unless the property name says otherwise.
 * @typedef {Object} GenuiLimits
 * @property {number} maxDepth Maximum nesting depth walked by the node renderer.
 * @property {number} maxNodes Maximum total nodes rendered for one block.
 * @property {number} maxString Maximum characters in a plain text string.
 * @property {number} maxCode Maximum characters of code/content payloads.
 * @property {number} maxCopyPreview Maximum characters echoed in a copy preview.
 * @property {number} maxCopyPreviewLines Maximum preview lines in a copy node.
 * @property {number} maxMermaid Maximum characters of Mermaid source.
 * @property {number} maxGridCols Maximum columns in a grid layout.
 * @property {number} maxTabs Maximum tabs rendered by a tabs node.
 * @property {number} maxCarouselItems Maximum carousel children.
 * @property {number} maxImageGroupItems Maximum images in an image group.
 * @property {number} maxAccordionItems Maximum accordion sections.
 * @property {number} maxListItems Maximum list entries.
 * @property {number} maxOptions Maximum select/radio/segmented options.
 * @property {number} maxTableRows Maximum table body rows.
 * @property {number} maxTableCols Maximum table columns.
 * @property {number} maxChartPoints Maximum data points per chart series.
 * @property {number} maxPlotSeries Maximum plotted expressions.
 * @property {number} maxPlotParams Maximum sliders per plot series.
 * @property {number} maxComputedFields Maximum computed field definitions.
 * @property {number} maxMeshes Maximum meshes in a 3D scene.
 * @property {number} maxMapLocations Maximum map locations.
 * @property {number} maxMapRoutes Maximum map routes.
 * @property {number} maxMapRoutePoints Maximum points per map route.
 * @property {number} maxEditorChars Maximum characters in an editor node.
 * @property {number} maxEntityMetadata Maximum entity-card metadata rows.
 * @property {number} maxEntityActions Maximum entity-card actions.
 * @property {number} maxQuizOptions Maximum quiz options.
 * @property {number} maxSteps Maximum steps in a steps node.
 * @property {number} maxTimelineItems Maximum timeline entries.
 * @property {number} maxBreadcrumbItems Maximum breadcrumb items.
 * @property {number} maxKeyValuePairs Maximum key/value pairs.
 * @property {number} maxTreeDepth Maximum file-tree depth.
 * @property {number} maxBlocksRows Maximum blocks-matrix rows.
 * @property {number} maxBlocksCells Maximum blocks-matrix cells per row.
 * @property {number} maxDiagramNodes Maximum diagram nodes.
 * @property {number} maxDiagramEdges Maximum diagram edges.
 * @property {number} maxDiagramZones Maximum diagram zones.
 * @property {number} maxDiagramFocal Maximum focal nodes in a diagram.
 * @property {number} maxDiagramLabel Maximum diagram label length.
 * @property {number} maxEChartOptionDepth Maximum raw ECharts option depth.
 * @property {number} maxEChartArrayLen Maximum raw ECharts array length.
 * @property {number} maxEChartOptionNodes Maximum raw ECharts option nodes.
 * @property {number} maxJsonDepth Maximum depth of a JSON viewer payload.
 * @memberOf module:gen-ui
 */

/**
 * @description Frozen renderer safety limits
 * @summary Concrete values used by the components and by
 * {@link sanitizeEChartOption}; treat the object as read-only.
 * @constant
 * @type {GenuiLimits}
 * @memberOf module:gen-ui
 */
export const GENUI_LIMITS = {
  
  maxDepth: 8,
  
  maxNodes: 200,
  
  maxString: 2000,
  
  maxCode: 12_000,
  
  maxCopyPreview: 2000,
  maxCopyPreviewLines: 30,
  
  maxMermaid: 8000,
  
  maxGridCols: 12,
  
  maxTabs: 12,
  
  maxCarouselItems: 24,
  maxImageGroupItems: 24,
  
  maxAccordionItems: 24,
  
  maxListItems: 50,
  
  maxOptions: 50,
  
  maxTableRows: 50,
  maxTableCols: 12,
  
  maxChartPoints: 60,
  
  maxPlotSeries: 8,
  maxPlotParams: 6,
  
  maxComputedFields: 50,
  
  maxMeshes: 5,
  maxMapLocations: 50,
  maxMapRoutes: 8,
  maxMapRoutePoints: 500,
  
  maxEditorChars: 12_000,
  maxEntityMetadata: 24,
  maxEntityActions: 8,
  
  maxQuizOptions: 8,
  
  maxSteps: 24,
  maxTimelineItems: 24,
  maxBreadcrumbItems: 12,
  maxKeyValuePairs: 24,
  
  maxTreeDepth: 6,
  
  maxBlocksRows: 14,
  maxBlocksCells: 16,
  
  maxDiagramNodes: 9,
  maxDiagramEdges: 12,
  maxDiagramZones: 3,
  maxDiagramFocal: 2,
  maxDiagramLabel: 14,
  
  maxEChartOptionDepth: 10,
  
  maxEChartArrayLen: 500,
  
  maxEChartOptionNodes: 2000,
  
  maxJsonDepth: 32,
} as const
