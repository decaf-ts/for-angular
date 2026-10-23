/**
 * @module charts/lib/charts/chart.types
 * @description Shared chart types for the `@decaf-ts/for-angular/charts` entry point.
 * @summary Plain, framework-free types describing the supported ECharts chart
 * families, the per-type configuration shape and the dataset rows a chart can
 * render. Nothing in this module imports ECharts or Angular.
 */

import type { Model } from '@decaf-ts/decorator-validation';

/**
 * @description Chart families exposed by this entry point.
 * @summary Each value maps to a dedicated CRD wrapper component and a decorated
 * configuration model (see `chart-config.models.ts`).
 * @typedef ChartType
 * @memberOf module:charts/lib/charts/chart.types
 */
export type ChartType = 'line' | 'bar' | 'pie' | 'scatter';

/** All chart families supported by the entry point. */
export const CHART_TYPES: readonly ChartType[] = ['line', 'bar', 'pie', 'scatter'];

/**
 * @description A single row rendered by a chart.
 * @summary Charts accept plain records or decaf model instances; the row
 * helpers normalise both into this shape.
 * @typedef ChartRow
 * @memberOf module:charts/lib/charts/chart.types
 */
export type ChartRow = Record<string, unknown>;

/**
 * @description Fields shared by every cartesian chart configuration.
 * @summary Line, bar and scatter configurations extend this shape; pie charts
 * use their own field set instead of an x/y axis.
 * @typedef CartesianChartConfig
 * @memberOf module:charts/lib/charts/chart.types
 */
export interface CartesianChartConfig {
  /** Optional chart title. */
  title?: string;
  /** Field used for the horizontal/category axis. */
  xField?: string;
  /** Field used for the value axis. */
  yField?: string;
  /** Optional field whose distinct values become one series each. */
  seriesField?: string;
  /** Whether the legend is rendered. */
  legend?: boolean;
  /** Whether the tooltip is rendered. */
  tooltip?: boolean;
}

/**
 * @description Configuration accepted by a line chart.
 * @summary Extends {@link CartesianChartConfig} with line-specific styling
 * flags (smoothing and area fill).
 * @typedef LineChartConfig
 * @memberOf module:charts/lib/charts/chart.types
 */
export interface LineChartConfig extends CartesianChartConfig {
  /** Render the line with monotone cubic smoothing. */
  smooth?: boolean;
  /** Fill the area below the line. */
  area?: boolean;
}

/**
 * @description Configuration accepted by a bar chart.
 * @summary Extends {@link CartesianChartConfig} with stacking and horizontal
 * orientation flags.
 * @typedef BarChartConfig
 * @memberOf module:charts/lib/charts/chart.types
 */
export interface BarChartConfig extends CartesianChartConfig {
  /** Stack series on top of each other. */
  stack?: boolean;
  /** Swap the category and value axes. */
  horizontal?: boolean;
}

/**
 * @description Configuration accepted by a scatter chart.
 * @summary Extends {@link CartesianChartConfig} with the rendered symbol size;
 * both axes are value axes (no category axis).
 * @typedef ScatterChartConfig
 * @memberOf module:charts/lib/charts/chart.types
 */
export interface ScatterChartConfig extends CartesianChartConfig {
  /** Rendered symbol size in pixels. */
  symbolSize?: number;
}

/**
 * @description Configuration accepted by a pie chart.
 * @summary Not a cartesian chart: instead of axis fields it maps the slice
 * name/value fields plus the ECharts radius expression.
 * @typedef PieChartConfig
 * @memberOf module:charts/lib/charts/chart.types
 */
export interface PieChartConfig {
  /** Optional chart title. */
  title?: string;
  /** Field used for slice names. */
  nameField?: string;
  /** Field used for slice values. */
  valueField?: string;
  /** ECharts radius expression (for example `'60%'`). */
  radius?: string;
  /** Whether the legend is rendered. */
  legend?: boolean;
  /** Whether the tooltip is rendered. */
  tooltip?: boolean;
}

/**
 * @description Union of every chart configuration.
 * @summary Accepting the union keeps the option builders and config models
 * family-agnostic at the call site.
 * @typedef ChartConfig
 * @memberOf module:charts/lib/charts/chart.types
 */
export type ChartConfig =
  | LineChartConfig
  | BarChartConfig
  | PieChartConfig
  | ScatterChartConfig;

/**
 * @description Accepted value for the `config` input.
 * @summary A plain configuration object, a decorated configuration model
 * instance, or nothing. Model instances are normalised to a plain object before
 * they are merged with chart defaults.
 * @typedef ChartConfigInput
 * @memberOf module:charts/lib/charts/chart.types
 */
export type ChartConfigInput = ChartConfig | Model | null | undefined;

/**
 * @description Serializable source produced from dataset rows.
 * @summary Mirrors the subset of the ECharts `dataset` option this entry point
 * needs without exposing ECharts types through the public API.
 * @typedef ChartDatasetSource
 * @memberOf module:charts/lib/charts/chart.types
 */
export interface ChartDatasetSource {
  /** Rows keyed by dimension name. */
  source: ChartRow[];
  /** Dimension names discovered on the first row. */
  dimensions: string[];
}
