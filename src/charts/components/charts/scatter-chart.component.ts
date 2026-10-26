import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Dynamic, ModelRendererComponent } from '@decaf-ts/for-angular';
import { BaseChartComponent } from './base-chart.component';
import type { ChartType } from './chart.types';

/**
 * @description Scatter chart layout component.
 * @summary Renders a scatter chart from its dataset and, in create/update mode,
 * the scatter configuration model through the standard decaf rendering engine.
 * @class ScatterChartComponent
 * @extends {BaseChartComponent}
 * @memberOf module:charts/lib/charts/scatter-chart.component
 */
@Dynamic()
@Component({
  selector: 'ngx-decaf-scatter-chart',
  templateUrl: './base-chart.component.html',
  styleUrls: ['./base-chart.component.scss'],
  imports: [ModelRendererComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
})
export class ScatterChartComponent extends BaseChartComponent {
  /** {@inheritDoc BaseChartComponent.chartType} */
  protected override get chartType(): ChartType {
    return 'scatter';
  }
}
