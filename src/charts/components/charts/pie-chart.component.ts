import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Dynamic, ModelRendererComponent } from '@decaf-ts/for-angular';
import { BaseChartComponent } from './base-chart.component';
import type { ChartType } from './chart.types';

/**
 * @description Pie chart layout component.
 * @summary Renders a pie chart from its dataset and, in create/update mode,
 * the pie configuration model through the standard decaf rendering engine.
 * @class PieChartComponent
 * @extends {BaseChartComponent}
 * @memberOf module:charts/lib/charts/pie-chart.component
 */
@Dynamic()
@Component({
  selector: 'ngx-decaf-pie-chart',
  templateUrl: './base-chart.component.html',
  styleUrls: ['./base-chart.component.scss'],
  imports: [ModelRendererComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
})
export class PieChartComponent extends BaseChartComponent {
  /** {@inheritDoc BaseChartComponent.chartType} */
  protected override get chartType(): ChartType {
    return 'pie';
  }
}
