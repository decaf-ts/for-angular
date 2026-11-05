import { LineChartConfigModel } from './chart-config.models';
import { buildChartOption, groupChartRows, normalizeChartConfig } from './chart-options';

interface OptionSeries {
  type: string;
  name?: string;
  data: unknown[];
  stack?: string;
  radius?: string;
}

interface Option {
  title?: unknown;
  xAxis?: { type?: string; data?: unknown[] };
  yAxis?: { type?: string; data?: unknown[] };
  series?: OptionSeries[];
}

function optionOf(type: Parameters<typeof buildChartOption>[0], config: unknown, rows: unknown[]): Option {
  return buildChartOption(type, config as never, rows as never) as unknown as Option;
}

describe('chart-options', () => {
  describe('normalizeChartConfig', () => {
    it('merges family defaults', () => {
      expect(normalizeChartConfig('line')).toMatchObject({
        xField: 'x',
        yField: 'y',
        legend: true,
      });
    });

    it('accepts a decorated configuration model instance', () => {
      const config = new LineChartConfigModel({ xField: 'month', yField: 'sales' });
      expect(normalizeChartConfig('line', config)).toMatchObject({
        xField: 'month',
        yField: 'sales',
      });
    });
  });

  describe('groupChartRows', () => {
    const rows = [
      { x: 'a', y: 1, series: 'one' },
      { x: 'b', y: 2, series: 'two' },
      { x: 'c', y: 3, series: 'one' },
    ];

    it('returns one unnamed group when no series field is set', () => {
      expect(groupChartRows(rows)).toEqual([{ rows }]);
    });

    it('groups rows by series field preserving first-seen order', () => {
      expect(groupChartRows(rows, 'series')).toEqual([
        { name: 'one', rows: [rows[0], rows[2]] },
        { name: 'two', rows: [rows[1]] },
      ]);
    });
  });

  describe('buildChartOption', () => {
    const rows = [
      { x: 'jan', y: 10, series: 'north' },
      { x: 'feb', y: 20, series: 'north' },
      { x: 'jan', y: 5, series: 'south' },
      { x: 'feb', y: 8, series: 'south' },
    ];

    it('builds a line chart with category data and grouped series', () => {
      const option = optionOf('line', { title: 'Sales', xField: 'x', yField: 'y', seriesField: 'series' }, rows);
      const series = option.series as OptionSeries[];

      expect(option.title).toEqual({ text: 'Sales', left: 'center' });
      expect(option.xAxis?.data).toEqual(['jan', 'feb']);
      expect(series).toHaveLength(2);
      expect(series[0]).toMatchObject({ type: 'line', name: 'north', data: [10, 20] });
      expect(series[1]).toMatchObject({ type: 'line', name: 'south', data: [5, 8] });
    });

    it('builds a bar chart and supports stacking and horizontal axes', () => {
      const option = optionOf('bar', { xField: 'x', yField: 'y', stack: true, horizontal: true }, rows);
      const series = option.series as OptionSeries[];

      expect(option.xAxis?.type).toBe('value');
      expect(option.yAxis?.data).toEqual(['jan', 'feb']);
      expect(series[0]).toMatchObject({ type: 'bar', stack: 'total' });
    });

    it('builds a pie chart using the name/value fields', () => {
      const option = optionOf(
        'pie',
        { nameField: 'x', valueField: 'y', radius: '50%' },
        [{ x: 'a', y: 1 }, { x: 'b', y: 2 }]
      );
      const series = option.series as OptionSeries[];

      expect(series[0].type).toBe('pie');
      expect(series[0].radius).toBe('50%');
      expect(series[0].data).toEqual([
        { name: 'a', value: 1 },
        { name: 'b', value: 2 },
      ]);
    });

    it('builds a scatter chart with paired coordinates', () => {
      const option = optionOf('scatter', { xField: 'x', yField: 'y' }, [{ x: 1, y: 2 }, { x: 3, y: 4 }]);
      const series = option.series as OptionSeries[];

      expect(series[0]).toMatchObject({ type: 'scatter', data: [[1, 2], [3, 4]] });
    });

    it('creates one series by default', () => {
      const option = optionOf('line', {}, [{ x: 'a', y: 1 }]);
      expect(option.series).toHaveLength(1);
    });
  });
});
