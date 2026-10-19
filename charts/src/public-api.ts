/**
 * Public API for the `@decaf-ts/for-angular/charts` secondary entry point.
 *
 * Chart and curve-editing surfaces backed by ECharts and the Cortex compute
 * engine. Install `echarts` and `@cortex-js/compute-engine` in the consumer
 * before importing this entry point.
 */
export * from './lib/curve-editor/curve-editor.component';
export * from './lib/curve-editor/curve-interpolation';
export * from './lib/charts/chart.types';
export * from './lib/charts/chart-config.models';
export * from './lib/charts/chart-options';
export * from './lib/charts/virtual-dataset';
export * from './lib/charts/base-chart.component';
export * from './lib/charts/line-chart.component';
export * from './lib/charts/bar-chart.component';
export * from './lib/charts/pie-chart.component';
export * from './lib/charts/scatter-chart.component';
