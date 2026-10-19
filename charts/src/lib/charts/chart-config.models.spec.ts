import { Model } from '@decaf-ts/decorator-validation';
import '@decaf-ts/overrides/ui-decorators';
import {
  BarChartConfigModel,
  CHART_CONFIG_DEFAULTS,
  CHART_CONFIG_MODELS,
  LineChartConfigModel,
  PieChartConfigModel,
  ScatterChartConfigModel,
  buildChartConfigModel,
  chartConfigModelFor,
  toPlainChartConfig,
} from './chart-config.models';

interface UiElementMetadataView {
  tag: string;
  props?: Record<string, unknown>;
}

interface UiModelApi {
  uiModelOf(ctor: unknown): UiElementMetadataView | undefined;
  uiElementOf(ctor: unknown, prop: string): UiElementMetadataView | undefined;
  uiPropertiesOf(ctor: unknown): string[] | undefined;
}

const ui = Model as unknown as UiModelApi;

describe('chart config models', () => {
  it('maps each chart family to its decorated model', () => {
    expect(chartConfigModelFor('line')).toBe(LineChartConfigModel);
    expect(chartConfigModelFor('bar')).toBe(BarChartConfigModel);
    expect(chartConfigModelFor('pie')).toBe(PieChartConfigModel);
    expect(chartConfigModelFor('scatter')).toBe(ScatterChartConfigModel);
    expect(Object.keys(CHART_CONFIG_MODELS)).toEqual(['line', 'bar', 'pie', 'scatter']);
  });

  it('registers every model as a crud-form ui model', () => {
    for (const ctor of Object.values(CHART_CONFIG_MODELS)) {
      const metadata = ui.uiModelOf(ctor);
      expect(metadata).toBeDefined();
      expect(metadata?.tag).toBe('ngx-decaf-crud-form');
    }
  });

  it('decorates the fields with crud-field elements', () => {
    const element = ui.uiElementOf(LineChartConfigModel, 'xField');
    expect(element).toBeDefined();
    expect(element?.tag).toBe('ngx-decaf-crud-field');
    expect(element?.props).toMatchObject({ label: 'X field', placeholder: 'x' });
  });

  it('exposes the fields through the ui model properties', () => {
    expect(ui.uiPropertiesOf(LineChartConfigModel)).toEqual([
      'title',
      'xField',
      'yField',
      'seriesField',
      'smooth',
      'area',
      'legend',
      'tooltip',
    ]);
  });

  it('builds a model instance with family defaults', () => {
    const model = buildChartConfigModel('pie', { nameField: 'label' });

    expect(model).toBeInstanceOf(PieChartConfigModel);
    expect(model).toMatchObject({
      nameField: 'label',
      valueField: 'value',
      radius: '60%',
      legend: true,
    });
  });

  it('accepts a decorated model instance as override source', () => {
    const current = new BarChartConfigModel({ xField: 'month', stack: true });
    const model = buildChartConfigModel('bar', current);

    expect(model).toBeInstanceOf(BarChartConfigModel);
    expect(model).toMatchObject({ xField: 'month', stack: true, yField: 'y' });
  });

  it('keeps defaults per family', () => {
    expect(CHART_CONFIG_DEFAULTS.line.xField).toBe('x');
    expect(CHART_CONFIG_DEFAULTS.pie.nameField).toBe('name');
    expect(CHART_CONFIG_DEFAULTS.scatter.symbolSize).toBe(10);
  });

  describe('toPlainChartConfig', () => {
    it('returns an empty object for missing input', () => {
      expect(toPlainChartConfig(undefined)).toEqual({});
    });

    it('drops functions and undefined values', () => {
      const source = { a: 1, b: undefined, c: () => 1 };
      expect(toPlainChartConfig(source as never)).toEqual({ a: 1 });
    });

    it('drops __proto__ and constructor keys', () => {
      const source = JSON.parse(
        '{"a":1,"__proto__":{"polluted":true},"constructor":{"prototype":{"polluted":true}}}'
      );
      const plain = toPlainChartConfig(source as never);

      expect(plain).toEqual({ a: 1 });
      expect(Object.prototype.hasOwnProperty.call(plain, '__proto__')).toBe(false);
      expect(Object.prototype.hasOwnProperty.call(plain, 'constructor')).toBe(false);
      expect(({} as { polluted?: boolean }).polluted).toBeUndefined();
    });
  });
});
