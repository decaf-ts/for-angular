import { Component, computed, inject, signal } from '@angular/core';
import { IonContent } from '@ionic/angular/standalone';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { OperationKeys } from '@decaf-ts/db-decorators';
import {
  BarChartComponent,
  CurveEditorComponent,
  LineChartComponent,
  PieChartComponent,
  ScatterChartComponent,
  type ChartConfig,
  type ChartRow,
  type CurveInterpolation,
  type CurvePoint,
} from '@decaf-ts/for-angular/charts';
import { HeaderComponent } from 'src/app/components/header/header.component';
import { ContainerComponent } from 'src/lib/components';

type ChartFamily = 'line' | 'bar' | 'pie' | 'scatter';

interface DemoChartRow {
  category: string;
  value: number;
  weight: number;
  series: string;
}

const INITIAL_ROWS: DemoChartRow[] = [
  { category: 'Week 1', value: 18, weight: 4, series: 'Revenue' },
  { category: 'Week 2', value: 26, weight: 6, series: 'Revenue' },
  { category: 'Week 3', value: 21, weight: 5, series: 'Revenue' },
  { category: 'Week 4', value: 34, weight: 8, series: 'Revenue' },
  { category: 'Week 5', value: 30, weight: 7, series: 'Revenue' },
];

const INITIAL_POINTS: CurvePoint[] = [
  { x: 0, y: 0 },
  { x: 0.25, y: 0.15 },
  { x: 0.5, y: 0.6 },
  { x: 0.75, y: 0.85 },
  { x: 1, y: 1 },
];

/**
 * `/charts` demo page: exercises the line, bar, pie and scatter chart components
 * and the curve editor from `@decaf-ts/for-angular/charts` with editable demo
 * rows, per-family configuration and interpolated curve points.
 *
 * @category Demo Pages
 */
@Component({
  selector: 'app-charts-page',
  imports: [
    IonContent,
    HeaderComponent,
    ContainerComponent,
    TranslatePipe,
    LineChartComponent,
    BarChartComponent,
    PieChartComponent,
    ScatterChartComponent,
    CurveEditorComponent,
  ],
  templateUrl: './charts.page.html',
  styleUrl: './charts.page.scss',
})
export class ChartsPage {
  protected readonly readOperation = OperationKeys.READ;

  protected readonly families: ChartFamily[] = [
    'line',
    'bar',
    'pie',
    'scatter',
  ];

  protected readonly family = signal<ChartFamily>('line');

  protected readonly rows = signal<DemoChartRow[]>(INITIAL_ROWS);

  protected readonly smooth = signal(true);

  protected readonly area = signal(false);

  protected readonly stack = signal(false);

  protected readonly legend = signal(true);

  protected readonly tooltip = signal(true);

  protected readonly points = signal<CurvePoint[]>(INITIAL_POINTS);

  protected readonly formula = signal('');

  protected readonly interpolation = signal<CurveInterpolation>('monotonic');

  private readonly translate = inject(TranslateService);

  protected readonly chartTitle = computed(() =>
    this.translate.instant('charts.chart_title')
  );

  protected readonly chartData = computed<ChartRow[]>(
    () => this.rows() as unknown as ChartRow[]
  );

  protected readonly chartConfig = computed<ChartConfig>(() => {
    const common = {
      title: this.chartTitle(),
      seriesField: 'series',
      legend: this.legend(),
      tooltip: this.tooltip(),
    };
    switch (this.family()) {
      case 'bar':
        return {
          ...common,
          xField: 'category',
          yField: 'value',
          stack: this.stack(),
          horizontal: false,
        };
      case 'pie':
        return {
          title: this.chartTitle(),
          nameField: 'category',
          valueField: 'value',
          radius: '62%',
          legend: this.legend(),
          tooltip: this.tooltip(),
        };
      case 'scatter':
        return {
          ...common,
          xField: 'value',
          yField: 'weight',
          symbolSize: 14,
        };
      case 'line':
      default:
        return {
          ...common,
          xField: 'category',
          yField: 'value',
          smooth: this.smooth(),
          area: this.area(),
        };
    }
  });

  protected familyLabelKey(family: ChartFamily): string {
    return `charts.type_${family}`;
  }

  protected onFamilyChange(event: Event): void {
    this.family.set((event.target as HTMLSelectElement).value as ChartFamily);
  }

  protected onCategoryInput(index: number, event: Event): void {
    this.patchRow(index, {
      category: (event.target as HTMLInputElement).value,
    });
  }

  protected onValueInput(index: number, event: Event): void {
    this.patchRow(index, {
      value: this.numberOf((event.target as HTMLInputElement).value),
    });
  }

  protected onWeightInput(index: number, event: Event): void {
    this.patchRow(index, {
      weight: this.numberOf((event.target as HTMLInputElement).value),
    });
  }

  protected onSeriesInput(index: number, event: Event): void {
    this.patchRow(index, {
      series: (event.target as HTMLInputElement).value,
    });
  }

  protected addRow(): void {
    const index = this.rows().length + 1;
    this.rows.update((rows) => [
      ...rows,
      { category: `Week ${index}`, value: 0, weight: 0, series: 'Revenue' },
    ]);
  }

  protected removeRow(index: number): void {
    this.rows.update((rows) => rows.filter((_, current) => current !== index));
  }

  protected onSmoothChange(event: Event): void {
    this.smooth.set((event.target as HTMLInputElement).checked);
  }

  protected onAreaChange(event: Event): void {
    this.area.set((event.target as HTMLInputElement).checked);
  }

  protected onStackChange(event: Event): void {
    this.stack.set((event.target as HTMLInputElement).checked);
  }

  protected onLegendChange(event: Event): void {
    this.legend.set((event.target as HTMLInputElement).checked);
  }

  protected onTooltipChange(event: Event): void {
    this.tooltip.set((event.target as HTMLInputElement).checked);
  }

  protected onInterpolationChange(event: Event): void {
    this.interpolation.set(
      (event.target as HTMLSelectElement).value as CurveInterpolation
    );
  }

  private patchRow(index: number, patch: Partial<DemoChartRow>): void {
    this.rows.update((rows) =>
      rows.map((row, current) =>
        current === index ? { ...row, ...patch } : row
      )
    );
  }

  private numberOf(value: string): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
}
