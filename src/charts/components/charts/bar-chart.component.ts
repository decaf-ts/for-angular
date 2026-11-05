import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Dynamic, ModelRendererComponent } from '@decaf-ts/for-angular';
import { BaseChartComponent } from './base-chart.component';
import type { ChartType } from './chart.types';

/**
 * @description Bar chart layout component.
 * @summary Renders a bar chart from its dataset and, in create/update mode,
 * the bar configuration model through the standard decaf rendering engine.
 * @class BarChartComponent
 * @extends {BaseChartComponent}
 * @memberOf module:charts/lib/charts/bar-chart.component
 */
@Dynamic()
@Component({
  selector: 'ngx-decaf-bar-chart',
  templateUrl: './base-chart.component.html',
  styleUrls: ['./base-chart.component.scss'],
  imports: [ModelRendererComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
})
export class BarChartComponent extends BaseChartComponent {
  /** {@inheritDoc BaseChartComponent.chartType} */
  protected override get chartType(): ChartType {
    return 'bar';
  }
}
