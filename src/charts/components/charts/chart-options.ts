/**
 * @module charts/lib/charts/chart-options
 * @description Pure ECharts option builders for every supported chart family.
 * @summary Framework-free functions that map a chart configuration plus rows
 * onto an ECharts option object. Keeping this out of the component makes the
 * mapping unit-testable without a DOM or an ECharts instance.
 */

import type { EChartsOption } from 'echarts';
import type {
  BarChartConfig,
  ChartConfig,
  ChartConfigInput,
  ChartRow,
  ChartType,
  LineChartConfig,
  PieChartConfig,
  ScatterChartConfig,
} from './chart.types';
import { CHART_CONFIG_DEFAULTS, toPlainChartConfig } from './chart-config.models';

/** Default category field when a configuration omits it. */
const DEFAULT_X_FIELD = 'x';
/** Default value field when a configuration omits it. */
const DEFAULT_Y_FIELD = 'y';
/** Default pie name field when a configuration omits it. */
const DEFAULT_NAME_FIELD = 'name';
/** Default pie value field when a configuration omits it. */
const DEFAULT_VALUE_FIELD = 'value';

/**
 * @description Merges a configuration input with the family defaults.
 * @param type the chart family.
 * @param config the configuration input.
 * @returns the normalised plain configuration.
 * @memberOf module:charts/lib/charts/chart-options
 */
export function normalizeChartConfig(type: ChartType, config?: ChartConfigInput): ChartConfig {
  return {
    ...CHART_CONFIG_DEFAULTS[type],
    ...toPlainChartConfig(config),
  };
}

/**
 * @description Reads a column from a row, coercing it to a string key.
 * @param row the row.
 * @param field the column name.
 * @returns the row value or `undefined`.
 * @memberOf module:charts/lib/charts/chart-options
 */
export function chartRowValue(row: ChartRow, field: string): unknown {
  return row[field];
}

/**
 * @description Groups rows by a series field.
 * @summary When no series field is configured a single unnamed group is
 * returned; otherwise distinct values become named groups, preserving their
 * first-seen order.
 * @param rows the rows to group.
 * @param seriesField the optional grouping field.
 * @returns the grouped rows.
 * @memberOf module:charts/lib/charts/chart-options
 */
export function groupChartRows(
  rows: readonly ChartRow[],
  seriesField?: string
): { name?: string; rows: ChartRow[] }[] {
  if (!seriesField) return [{ rows: [...rows] }];

  const groups = new Map<string, ChartRow[]>();
  for (const row of rows) {
    const key = String(row[seriesField] ?? '');
    const group = groups.get(key);
    if (group) group.push(row);
    else groups.set(key, [row]);
  }
  return [...groups.entries()].map(([name, groupRows]) => ({ name, rows: groupRows }));
}


/**
 * @description Collects the distinct category values across every row.
 * @param rows the rows to scan.
 * @param field the category field.
 * @returns the distinct category values in first-seen order.
 * @memberOf module:charts/lib/charts/chart-options
 */
export function chartCategories(rows: readonly ChartRow[], field: string): unknown[] {
  const seen = new Set<string>();
  const categories: unknown[] = [];
  for (const row of rows) {
    const value = row[field];
    const key = String(value);
    if (!seen.has(key)) {
      seen.add(key);
      categories.push(value);
    }
  }
  return categories;
}

/**
 * @description Aligns one series group with the shared category axis.
 * @summary Missing categories become `null` so grouped series stay aligned
 * instead of collapsing different categories together.
 * @param rows the rows of one series group.
 * @param categoryField the category field.
 * @param valueField the value field.
 * @param categories the shared categories.
 * @returns one value per category.
 * @memberOf module:charts/lib/charts/chart-options
 */
export function seriesValues(
  rows: readonly ChartRow[],
  categoryField: string,
  valueField: string,
  categories: readonly unknown[]
): unknown[] {
  const byCategory = new Map<string, unknown>();
  for (const row of rows) byCategory.set(String(row[categoryField]), row[valueField]);
  return categories.map((category) => byCategory.get(String(category)) ?? null);
}

/**
 * @description Builds the shared cartesian axes and grid for a configuration.
 * @param config the cartesian configuration.
 * @param horizontal whether the category axis is vertical (bar charts).
 * @returns the axis/grid fragment of the ECharts option.
 * @memberOf module:charts/lib/charts/chart-options
 */
function cartesianFragments(
  config: BarChartConfig,
  horizontal: boolean
): {
  grid: Record<string, unknown>;
  xAxis: Record<string, unknown>;
  yAxis: Record<string, unknown>;
} {
  const xField = config.xField || DEFAULT_X_FIELD;
  const categoryAxis = { type: 'category', name: xField };
  const valueAxis = { type: 'value' };
  return {
    grid: {
      left: 48,
      right: 24,
      top: config.title ? 56 : 24,
      bottom: 40,
      containLabel: true,
    },
    xAxis: horizontal ? valueAxis : categoryAxis,
    yAxis: horizontal ? categoryAxis : valueAxis,
  };
}

/**
 * @description Builds the ECharts option for a line chart.
 * @param config the line configuration.
 * @param rows the rows to render.
 * @returns the ECharts option.
 * @memberOf module:charts/lib/charts/chart-options
 */
function buildLineOption(config: LineChartConfig, rows: readonly ChartRow[]): EChartsOption {
  const xField = config.xField || DEFAULT_X_FIELD;
  const yField = config.yField || DEFAULT_Y_FIELD;
  const groups = groupChartRows(rows, config.seriesField || undefined);
  const categories = chartCategories(rows, xField);
  const fragments = cartesianFragments(config, false);

  return {
    ...fragments,
    xAxis: { ...fragments.xAxis, data: categories },
    title: config.title ? { text: config.title, left: 'center' } : undefined,
    tooltip: config.tooltip === false ? undefined : { trigger: 'axis' },
    legend: { show: config.legend !== false, top: 24 },
    series: groups.map((group) => ({
      type: 'line',
      name: group.name ?? yField,
      smooth: config.smooth === true,
      showSymbol: rows.length <= 32,
      areaStyle: config.area === true ? {} : undefined,
      data: seriesValues(group.rows, xField, yField, categories),
    })),
  } as EChartsOption;
}

/**
 * @description Builds the ECharts option for a bar chart.
 * @param config the bar configuration.
 * @param rows the rows to render.
 * @returns the ECharts option.
 * @memberOf module:charts/lib/charts/chart-options
 */
function buildBarOption(config: BarChartConfig, rows: readonly ChartRow[]): EChartsOption {
  const xField = config.xField || DEFAULT_X_FIELD;
  const yField = config.yField || DEFAULT_Y_FIELD;
  const horizontal = config.horizontal === true;
  const groups = groupChartRows(rows, config.seriesField || undefined);
  const categories = chartCategories(rows, xField);
  const fragments = cartesianFragments(config, horizontal);

  return {
    ...fragments,
    ...(horizontal
      ? { yAxis: { ...fragments.yAxis, data: categories } }
      : { xAxis: { ...fragments.xAxis, data: categories } }),
    title: config.title ? { text: config.title, left: 'center' } : undefined,
    tooltip: config.tooltip === false ? undefined : { trigger: 'axis' },
    legend: { show: config.legend !== false, top: 24 },
    series: groups.map((group) => ({
      type: 'bar',
      name: group.name ?? yField,
      stack: config.stack === true ? 'total' : undefined,
      data: seriesValues(group.rows, xField, yField, categories),
    })),
  } as EChartsOption;
}

/**
 * @description Builds the ECharts option for a scatter chart.
 * @param config the scatter configuration.
 * @param rows the rows to render.
 * @returns the ECharts option.
 * @memberOf module:charts/lib/charts/chart-options
 */
function buildScatterOption(config: ScatterChartConfig, rows: readonly ChartRow[]): EChartsOption {
  const xField = config.xField || DEFAULT_X_FIELD;
  const yField = config.yField || DEFAULT_Y_FIELD;
  const groups = groupChartRows(rows, config.seriesField || undefined);

  return {
    grid: {
      left: 48,
      right: 24,
      top: config.title ? 56 : 24,
      bottom: 40,
      containLabel: true,
    },
    xAxis: { type: 'value', name: xField },
    yAxis: { type: 'value', name: yField },
    title: config.title ? { text: config.title, left: 'center' } : undefined,
    tooltip: config.tooltip === false ? undefined : { trigger: 'item' },
    legend: { show: config.legend !== false, top: 24 },
    series: groups.map((group) => ({
      type: 'scatter',
      name: group.name ?? yField,
      symbolSize: config.symbolSize ?? 10,
      data: group.rows.map((row) => [row[xField], row[yField]]),
    })),
  } as EChartsOption;
}

/**
 * @description Builds the ECharts option for a pie chart.
 * @param config the pie configuration.
 * @param rows the rows to render.
 * @returns the ECharts option.
 * @memberOf module:charts/lib/charts/chart-options
 */
function buildPieOption(config: PieChartConfig, rows: readonly ChartRow[]): EChartsOption {
  const nameField = config.nameField || DEFAULT_NAME_FIELD;
  const valueField = config.valueField || DEFAULT_VALUE_FIELD;

  return {
    title: config.title ? { text: config.title, left: 'center' } : undefined,
    tooltip: config.tooltip === false ? undefined : { trigger: 'item' },
    legend: { show: config.legend !== false, top: 24 },
    series: [
      {
        type: 'pie',
        radius: config.radius || '60%',
        data: rows.map((row, index) => ({
          name: String(row[nameField] ?? index),
          value: Number(row[valueField] ?? 0),
        })),
      },
    ],
  } as EChartsOption;
}

/**
 * @description Builds the ECharts option for a chart family.
 * @summary The function is pure and deterministic: identical config and rows
 * always produce the same option graph.
 * @param type the chart family.
 * @param config the configuration input.
 * @param rows the rows to render.
 * @returns the ECharts option.
 * @memberOf module:charts/lib/charts/chart-options
 */
export function buildChartOption(
  type: ChartType,
  config: ChartConfigInput,
  rows: readonly ChartRow[] = []
): EChartsOption {
  const normalized = normalizeChartConfig(type, config);

  switch (type) {
    case 'bar':
      return buildBarOption(normalized as BarChartConfig, rows);
    case 'pie':
      return buildPieOption(normalized as PieChartConfig, rows);
    case 'scatter':
      return buildScatterOption(normalized as ScatterChartConfig, rows);
    case 'line':
    default:
      return buildLineOption(normalized as LineChartConfig, rows);
  }
}
