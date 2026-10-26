/**
 * Public API for the `@decaf-ts/for-angular/charts` secondary entry point.
 *
 * Chart and curve-editing surfaces backed by ECharts and the Cortex compute
 * engine. Install `echarts` and `@cortex-js/compute-engine` in the consumer
 * before importing this entry point.
 */
export * from './components/curve-editor/curve-editor.component';
export * from './components/curve-editor/curve-interpolation';
export * from './components/charts/chart.types';
export * from './components/charts/chart-config.models';
export * from './components/charts/chart-options';
export * from './components/charts/virtual-dataset';
export * from './components/charts/base-chart.component';
export * from './components/charts/line-chart.component';
export * from './components/charts/bar-chart.component';
export * from './components/charts/pie-chart.component';
export * from './components/charts/scatter-chart.component';
