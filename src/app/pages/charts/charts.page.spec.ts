/**
 * @module for-angular/app/pages/charts/charts.page.spec
 * @summary SAA-1473 `/charts` demo page contract.
 * @description Proves editing the backing rows updates the chart dataset and
 * that switching the chart family rebuilds the family-specific configuration
 * (axis fields, stacking, pie fields, scatter symbols) while add/remove row and
 * the line/legend/tooltip toggles keep the configuration in sync.
 */
import type { Signal, WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { I18nFakeLoader } from 'src/lib/i18n';
import type {
  CurveInterpolation,
  CurvePoint,
} from '@decaf-ts/for-angular/charts';
import { ChartsPage } from './charts.page';

type ChartFamily = 'line' | 'bar' | 'pie' | 'scatter';

interface DemoChartRow {
  category: string;
  value: number;
  weight: number;
  series: string;
}

interface AnyChartConfig {
  title?: string;
  xField?: string;
  yField?: string;
  seriesField?: string;
  legend?: boolean;
  tooltip?: boolean;
  smooth?: boolean;
  area?: boolean;
  stack?: boolean;
  horizontal?: boolean;
  symbolSize?: number;
  nameField?: string;
  valueField?: string;
  radius?: string;
}

interface ChartsPageInternals {
  family: WritableSignal<ChartFamily>;
  rows: WritableSignal<DemoChartRow[]>;
  smooth: WritableSignal<boolean>;
  area: WritableSignal<boolean>;
  stack: WritableSignal<boolean>;
  legend: WritableSignal<boolean>;
  tooltip: WritableSignal<boolean>;
  points: WritableSignal<CurvePoint[]>;
  formula: WritableSignal<string>;
  interpolation: WritableSignal<CurveInterpolation>;
  chartData: Signal<DemoChartRow[]>;
  chartConfig: Signal<AnyChartConfig>;
  onFamilyChange(event: Event): void;
  onCategoryInput(index: number, event: Event): void;
  onValueInput(index: number, event: Event): void;
  onWeightInput(index: number, event: Event): void;
  onSeriesInput(index: number, event: Event): void;
  addRow(): void;
  removeRow(index: number): void;
  onSmoothChange(event: Event): void;
  onAreaChange(event: Event): void;
  onStackChange(event: Event): void;
  onLegendChange(event: Event): void;
  onTooltipChange(event: Event): void;
  onInterpolationChange(event: Event): void;
}

function createPage(): ChartsPageInternals {
  return TestBed.runInInjectionContext(
    () => new ChartsPage()
  ) as unknown as ChartsPageInternals;
}

function inputEvent(value: string): Event {
  return { target: { value } } as unknown as Event;
}

function checkboxEvent(checked: boolean): Event {
  return { target: { checked } } as unknown as Event;
}

describe('ChartsPage — dataset and family configuration (SAA-1473)', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        TranslateModule.forRoot({
          loader: { provide: TranslateLoader, useClass: I18nFakeLoader },
        }),
      ],
    });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('starts as a smooth line chart over the seeded rows', () => {
    const page = createPage();

    expect(page.family()).toBe('line');
    expect(page.chartData()).toHaveLength(5);
    const config = page.chartConfig();
    expect(config.xField).toBe('category');
    expect(config.yField).toBe('value');
    expect(config.smooth).toBe(true);
    expect(config.area).toBe(false);
    expect(config.legend).toBe(true);
    expect(config.tooltip).toBe(true);
  });

  it('updates the chart dataset when a row value, category, weight, or series changes', () => {
    const page = createPage();

    page.onValueInput(0, inputEvent('99'));
    page.onCategoryInput(1, inputEvent('Week 2 (edited)'));
    page.onWeightInput(2, inputEvent('11'));
    page.onSeriesInput(3, inputEvent('Forecast'));

    expect(page.chartData()).toEqual([
      { category: 'Week 1', value: 99, weight: 4, series: 'Revenue' },
      { category: 'Week 2 (edited)', value: 26, weight: 6, series: 'Revenue' },
      { category: 'Week 3', value: 21, weight: 11, series: 'Revenue' },
      { category: 'Week 4', value: 34, weight: 8, series: 'Forecast' },
      { category: 'Week 5', value: 30, weight: 7, series: 'Revenue' },
    ]);
  });

  it('coerces a non-numeric value edit to zero instead of NaN', () => {
    const page = createPage();

    page.onValueInput(0, inputEvent(''));

    expect(page.chartData()[0].value).toBe(0);
  });

  it('adds and removes rows in place', () => {
    const page = createPage();

    page.addRow();
    expect(page.chartData()).toHaveLength(6);
    expect(page.chartData()[5].category).toBe('Week 6');
    expect(page.chartData()[5].value).toBe(0);

    page.removeRow(1);
    expect(page.chartData()).toHaveLength(5);
    expect(page.chartData()[1].category).toBe('Week 3');
  });

  it('rebuilds the configuration when switching to the bar family', () => {
    const page = createPage();

    page.onFamilyChange(inputEvent('bar'));

    expect(page.family()).toBe('bar');
    const config = page.chartConfig();
    expect(config.xField).toBe('category');
    expect(config.yField).toBe('value');
    expect(config.stack).toBe(false);

    page.onStackChange(checkboxEvent(true));
    expect(page.stack()).toBe(true);
    expect(page.chartConfig().stack).toBe(true);
  });

  it('rebuilds the configuration when switching to the pie family', () => {
    const page = createPage();

    page.onFamilyChange(inputEvent('pie'));

    const config = page.chartConfig();
    expect(config.nameField).toBe('category');
    expect(config.valueField).toBe('value');
    expect(config.radius).toBe('62%');
  });

  it('rebuilds the configuration when switching to the scatter family', () => {
    const page = createPage();

    page.onFamilyChange(inputEvent('scatter'));

    const config = page.chartConfig();
    expect(config.xField).toBe('value');
    expect(config.yField).toBe('weight');
    expect(config.symbolSize).toBe(14);
  });

  it('keeps the common legend, tooltip, smooth, and area toggles in sync', () => {
    const page = createPage();

    page.onLegendChange(checkboxEvent(false));
    page.onTooltipChange(checkboxEvent(false));
    page.onSmoothChange(checkboxEvent(false));
    page.onAreaChange(checkboxEvent(true));

    const config = page.chartConfig();
    expect(config.legend).toBe(false);
    expect(config.tooltip).toBe(false);
    expect(config.smooth).toBe(false);
    expect(config.area).toBe(true);
  });

  it('updates the curve editor interpolation and formula signals', () => {
    const page = createPage();

    page.onInterpolationChange(inputEvent('linear'));

    expect(page.interpolation()).toBe('linear');
    expect(page.points()).toHaveLength(5);
    expect(page.formula()).toBe('');
  });
});
