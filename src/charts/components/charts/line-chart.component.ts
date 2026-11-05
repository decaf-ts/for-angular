import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Dynamic, ModelRendererComponent } from '@decaf-ts/for-angular';
import { BaseChartComponent } from './base-chart.component';
import type { ChartType } from './chart.types';

/**
 * @description Line chart layout component.
 * @summary Renders a line chart from its dataset and, in create/update mode,
 * the line configuration model through the standard decaf rendering engine.
 * @class LineChartComponent
 * @extends {BaseChartComponent}
 * @memberOf module:charts/lib/charts/line-chart.component
 */
@Dynamic()
@Component({
  selector: 'ngx-decaf-line-chart',
  templateUrl: './base-chart.component.html',
  styleUrls: ['./base-chart.component.scss'],
  imports: [ModelRendererComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
})
export class LineChartComponent extends BaseChartComponent {
  /** {@inheritDoc BaseChartComponent.chartType} */
  protected override get chartType(): ChartType {
    return 'line';
  }
}
