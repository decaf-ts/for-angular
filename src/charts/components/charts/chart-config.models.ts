/**
 * @module charts/lib/charts/chart-config.models
 * @description Decorated configuration models for each chart family.
 * @summary The create/update modes of every chart wrapper render one of these
 * `@uimodel('ngx-decaf-crud-form')` classes through the standard decaf rendering
 * engine, so the per-type configuration form is completely metadata-driven.
 */

import { model, Model, ModelArg, required } from '@decaf-ts/decorator-validation';
import { uielement, uimodel } from '@decaf-ts/ui-decorators';
import type { Constructor } from '@decaf-ts/decoration';
import type {
  BarChartConfig,
  ChartConfig,
  ChartConfigInput,
  ChartType,
  LineChartConfig,
  PieChartConfig,
  ScatterChartConfig,
} from './chart.types';

/** Label used by the title field of every config model. */
const TITLE_LABEL = 'Title';

/**
 * @description Decorated configuration model for line charts.
 * @class LineChartConfigModel
 * @memberOf module:charts/lib/charts/chart-config.models
 */
@uimodel('ngx-decaf-crud-form', { cols: 2, rows: 1 })
@model()
export class LineChartConfigModel extends Model {
  /** Optional chart title. */
  @uielement('ngx-decaf-crud-field', { label: TITLE_LABEL, placeholder: 'Line chart' })
  title: string = '';

  /** Field used for the category axis. */
  @required()
  @uielement('ngx-decaf-crud-field', { label: 'X field', placeholder: 'x' })
  xField: string = 'x';

  /** Field used for the value axis. */
  @required()
  @uielement('ngx-decaf-crud-field', { label: 'Y field', placeholder: 'y' })
  yField: string = 'y';

  /** Optional field used to split the rows into one series each. */
  @uielement('ngx-decaf-crud-field', { label: 'Series field', placeholder: 'series' })
  seriesField: string = '';

  /** Render the line with monotone cubic smoothing. */
  @uielement('ngx-decaf-crud-field', { label: 'Smooth', type: 'checkbox' })
  smooth: boolean = false;

  /** Fill the area below the line. */
  @uielement('ngx-decaf-crud-field', { label: 'Area', type: 'checkbox' })
  area: boolean = false;

  /** Whether the legend is rendered. */
  @uielement('ngx-decaf-crud-field', { label: 'Legend', type: 'checkbox' })
  legend: boolean = true;

  /** Whether the tooltip is rendered. */
  @uielement('ngx-decaf-crud-field', { label: 'Tooltip', type: 'checkbox' })
  tooltip: boolean = true;

  constructor(arg: ModelArg<LineChartConfigModel> = {}) {
    super(arg);
  }
}

/**
 * @description Decorated configuration model for bar charts.
 * @class BarChartConfigModel
 * @memberOf module:charts/lib/charts/chart-config.models
 */
@uimodel('ngx-decaf-crud-form', { cols: 2, rows: 1 })
@model()
export class BarChartConfigModel extends Model {
  /** Optional chart title. */
  @uielement('ngx-decaf-crud-field', { label: TITLE_LABEL, placeholder: 'Bar chart' })
  title: string = '';

  /** Field used for the category axis. */
  @required()
  @uielement('ngx-decaf-crud-field', { label: 'X field', placeholder: 'x' })
  xField: string = 'x';

  /** Field used for the value axis. */
  @required()
  @uielement('ngx-decaf-crud-field', { label: 'Y field', placeholder: 'y' })
  yField: string = 'y';

  /** Optional field used to split the rows into one series each. */
  @uielement('ngx-decaf-crud-field', { label: 'Series field', placeholder: 'series' })
  seriesField: string = '';

  /** Stack series on top of each other. */
  @uielement('ngx-decaf-crud-field', { label: 'Stacked', type: 'checkbox' })
  stack: boolean = false;

  /** Swap the category and value axes. */
  @uielement('ngx-decaf-crud-field', { label: 'Horizontal', type: 'checkbox' })
  horizontal: boolean = false;

  /** Whether the legend is rendered. */
  @uielement('ngx-decaf-crud-field', { label: 'Legend', type: 'checkbox' })
  legend: boolean = true;

  /** Whether the tooltip is rendered. */
  @uielement('ngx-decaf-crud-field', { label: 'Tooltip', type: 'checkbox' })
  tooltip: boolean = true;

  constructor(arg: ModelArg<BarChartConfigModel> = {}) {
    super(arg);
  }
}

/**
 * @description Decorated configuration model for pie charts.
 * @class PieChartConfigModel
 * @memberOf module:charts/lib/charts/chart-config.models
 */
@uimodel('ngx-decaf-crud-form', { cols: 2, rows: 1 })
@model()
export class PieChartConfigModel extends Model {
  /** Optional chart title. */
  @uielement('ngx-decaf-crud-field', { label: TITLE_LABEL, placeholder: 'Pie chart' })
  title: string = '';

  /** Field used for slice names. */
  @required()
  @uielement('ngx-decaf-crud-field', { label: 'Name field', placeholder: 'name' })
  nameField: string = 'name';

  /** Field used for slice values. */
  @required()
  @uielement('ngx-decaf-crud-field', { label: 'Value field', placeholder: 'value' })
  valueField: string = 'value';

  /** ECharts radius expression. */
  @uielement('ngx-decaf-crud-field', { label: 'Radius', placeholder: '60%' })
  radius: string = '60%';

  /** Whether the legend is rendered. */
  @uielement('ngx-decaf-crud-field', { label: 'Legend', type: 'checkbox' })
  legend: boolean = true;

  /** Whether the tooltip is rendered. */
  @uielement('ngx-decaf-crud-field', { label: 'Tooltip', type: 'checkbox' })
  tooltip: boolean = true;

  constructor(arg: ModelArg<PieChartConfigModel> = {}) {
    super(arg);
  }
}

/**
 * @description Decorated configuration model for scatter charts.
 * @class ScatterChartConfigModel
 * @memberOf module:charts/lib/charts/chart-config.models
 */
@uimodel('ngx-decaf-crud-form', { cols: 2, rows: 1 })
@model()
export class ScatterChartConfigModel extends Model {
  /** Optional chart title. */
  @uielement('ngx-decaf-crud-field', { label: TITLE_LABEL, placeholder: 'Scatter chart' })
  title: string = '';

  /** Field used for the horizontal value axis. */
  @required()
  @uielement('ngx-decaf-crud-field', { label: 'X field', placeholder: 'x' })
  xField: string = 'x';

  /** Field used for the vertical value axis. */
  @required()
  @uielement('ngx-decaf-crud-field', { label: 'Y field', placeholder: 'y' })
  yField: string = 'y';

  /** Optional field used to split the rows into one series each. */
  @uielement('ngx-decaf-crud-field', { label: 'Series field', placeholder: 'series' })
  seriesField: string = '';

  /** Rendered symbol size in pixels. */
  @uielement('ngx-decaf-crud-field', { label: 'Symbol size', type: 'number' })
  symbolSize: number = 10;

  /** Whether the legend is rendered. */
  @uielement('ngx-decaf-crud-field', { label: 'Legend', type: 'checkbox' })
  legend: boolean = true;

  /** Whether the tooltip is rendered. */
  @uielement('ngx-decaf-crud-field', { label: 'Tooltip', type: 'checkbox' })
  tooltip: boolean = true;

  constructor(arg: ModelArg<ScatterChartConfigModel> = {}) {
    super(arg);
  }
}

/** Constructor type accepted by the chart config registry. */
export type ChartConfigModelConstructor = Constructor<Model>;

/**
 * @description Maps each chart family to its decorated configuration model.
 * @summary The map is the single source of truth used by both the base chart
 * component (form rendering) and the pure option builders (defaults).
 * @memberOf module:charts/lib/charts/chart-config.models
 */
export const CHART_CONFIG_MODELS: Record<ChartType, ChartConfigModelConstructor> = {
  line: LineChartConfigModel,
  bar: BarChartConfigModel,
  pie: PieChartConfigModel,
  scatter: ScatterChartConfigModel,
};

/**
 * @description Default configuration values for each chart family.
 * @memberOf module:charts/lib/charts/chart-config.models
 */
export const CHART_CONFIG_DEFAULTS: {
  line: LineChartConfig;
  bar: BarChartConfig;
  pie: PieChartConfig;
  scatter: ScatterChartConfig;
} = {
  line: {
    title: '',
    xField: 'x',
    yField: 'y',
    seriesField: '',
    smooth: false,
    area: false,
    legend: true,
    tooltip: true,
  },
  bar: {
    title: '',
    xField: 'x',
    yField: 'y',
    seriesField: '',
    stack: false,
    horizontal: false,
    legend: true,
    tooltip: true,
  },
  pie: {
    title: '',
    nameField: 'name',
    valueField: 'value',
    radius: '60%',
    legend: true,
    tooltip: true,
  },
  scatter: {
    title: '',
    xField: 'x',
    yField: 'y',
    seriesField: '',
    symbolSize: 10,
    legend: true,
    tooltip: true,
  },
};

/**
 * @description Resolves the decorated config model for a chart family.
 * @param type the chart family.
 * @returns the decorated model constructor.
 * @memberOf module:charts/lib/charts/chart-config.models
 */
export function chartConfigModelFor(type: ChartType): ChartConfigModelConstructor {
  return CHART_CONFIG_MODELS[type];
}

/**
 * @description Converts a configuration input into a plain configuration object.
 * @summary Model instances, plain objects and `undefined` are all accepted; the
 * result only contains data properties, so it can safely be merged with
 * defaults or persisted.
 * @param config the configuration input.
 * @returns a plain configuration object.
 * @memberOf module:charts/lib/charts/chart-config.models
 */
export function toPlainChartConfig(config: ChartConfigInput): ChartConfig {
  if (!config) return {};
  const source = config as Record<string, unknown>;
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(source)) {
    if (key === '__proto__' || key === 'constructor') continue;
    if (typeof value !== 'function' && value !== undefined) result[key] = value;
  }
  return result as ChartConfig;
}

/**
 * @description Builds a decorated configuration model instance for a chart.
 * @summary Defaults for the family are merged with the supplied configuration,
 * then the family's decorated model class is instantiated so the rendering
 * engine can build the create/update form.
 * @param type the chart family.
 * @param config the current configuration input.
 * @returns the configuration model instance.
 * @memberOf module:charts/lib/charts/chart-config.models
 */
export function buildChartConfigModel(type: ChartType, config?: ChartConfigInput): Model {
  const defaults = CHART_CONFIG_DEFAULTS[type];
  return new (chartConfigModelFor(type))({
    ...defaults,
    ...toPlainChartConfig(config),
  });
}

export type { ChartConfigInput } from './chart.types';
