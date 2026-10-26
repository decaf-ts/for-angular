import { reflectComponentType } from '@angular/core';
import { TestBed, waitForAsync } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { OperationKeys } from '@decaf-ts/db-decorators';
import { NavController } from '@ionic/angular/standalone';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { Observable, of } from 'rxjs';
import { BarChartComponent } from './bar-chart.component';
import { BaseChartComponent } from './base-chart.component';
import type { ChartType } from './chart.types';
import { LineChartComponent } from './line-chart.component';
import { PieChartComponent } from './pie-chart.component';
import { ScatterChartComponent } from './scatter-chart.component';

jest.mock('echarts', () => {
  const chart = {
    setOption: jest.fn(),
    resize: jest.fn(),
    dispose: jest.fn(),
  };
  return { init: jest.fn(() => chart) };
});

class FakeLoader implements TranslateLoader {
  getTranslation(): Observable<never> {
    return of({}) as Observable<never>;
  }
}

const navControllerMock = {
  navigateRoot: jest.fn(),
  navigateForward: jest.fn(),
  navigateBack: jest.fn(),
};

const cases: { selector: string; type: ChartType; ctor: unknown }[] = [
  { selector: 'ngx-decaf-chart', type: 'line', ctor: BaseChartComponent },
  { selector: 'ngx-decaf-line-chart', type: 'line', ctor: LineChartComponent },
  { selector: 'ngx-decaf-bar-chart', type: 'bar', ctor: BarChartComponent },
  { selector: 'ngx-decaf-pie-chart', type: 'pie', ctor: PieChartComponent },
  { selector: 'ngx-decaf-scatter-chart', type: 'scatter', ctor: ScatterChartComponent },
];

describe('chart wrappers', () => {
  it.each(cases)('registers the $selector selector', ({ selector, ctor }) => {
    expect(reflectComponentType(ctor as never)?.selector).toBe(selector);
  });

  it.each(cases)('$selector renders its $type family', ({ ctor, type }) => {
    TestBed.configureTestingModule({
      imports: [
        ctor as never,
        TranslateModule.forRoot({
          loader: { provide: TranslateLoader, useClass: FakeLoader },
        }),
      ],
      providers: [provideRouter([]), { provide: NavController, useValue: navControllerMock }],
    });

    const fixture = TestBed.createComponent(ctor as never);
    const component = fixture.componentInstance as unknown as {
      operation: string;
      chartType: ChartType;
    };
    component.operation = OperationKeys.READ;
    fixture.detectChanges();

    expect(component.chartType).toBe(type);
    fixture.destroy();
    TestBed.resetTestingModule();
  });
});
