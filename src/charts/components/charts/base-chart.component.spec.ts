import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Condition } from '@decaf-ts/core';
import { OperationKeys } from '@decaf-ts/db-decorators';
import { Model } from '@decaf-ts/decorator-validation';
import { ComponentEventNames } from '@decaf-ts/ui-decorators';
import { NavController } from '@ionic/angular/standalone';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { Observable, of } from 'rxjs';
import { LineChartConfigModel } from './chart-config.models';
import { LineChartComponent } from './line-chart.component';
import { VirtualDataset } from './virtual-dataset';

jest.mock('echarts', () => {
  const chart = {
    setOption: jest.fn(),
    resize: jest.fn(),
    dispose: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
  };
  return { init: jest.fn(() => chart), __chart: chart };
});

import * as echarts from 'echarts';

interface MockChart {
  setOption: jest.Mock;
  resize: jest.Mock;
  dispose: jest.Mock;
}

const chart = (echarts as unknown as { __chart: MockChart }).__chart;

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

describe('BaseChartComponent', () => {
  let fixture: ComponentFixture<LineChartComponent>;
  let component: LineChartComponent;

  beforeEach(waitForAsync(() => {
    jest.clearAllMocks();
    TestBed.configureTestingModule({
      imports: [
        LineChartComponent,
        TranslateModule.forRoot({
          loader: { provide: TranslateLoader, useClass: FakeLoader },
        }),
      ],
      providers: [provideRouter([]), { provide: NavController, useValue: navControllerMock }],
    }).compileComponents();
  }));

  beforeEach(async () => {
    fixture = TestBed.createComponent(LineChartComponent);
    component = fixture.componentInstance;
    component.operation = OperationKeys.READ;
    component.config = { title: 'Sales', xField: 'month', yField: 'revenue' };
    component.data = [
      { month: 'jan', revenue: 10 },
      { month: 'feb', revenue: 20 },
    ];
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('creates the ECharts instance and renders the dataset', () => {
    expect(component).toBeTruthy();
    expect(echarts.init).toHaveBeenCalledTimes(1);
    expect(chart.setOption).toHaveBeenCalled();

    const option = chart.setOption.mock.calls[chart.setOption.mock.calls.length - 1][0] as {
      xAxis: { data: unknown[] };
      series: { type: string; data: unknown[] }[];
    };
    expect(option.xAxis.data).toEqual(['jan', 'feb']);
    expect(option.series[0]).toMatchObject({ type: 'line', data: [10, 20] });
  });

  it('sub-queries a VirtualDataset source with datasetQuery (F-2)', async () => {
    const combined = { and: 'combined' } as unknown as Condition<Model>;
    const baseWhere = { and: jest.fn(() => combined) } as unknown as Condition<Model>;
    const subWhere = { attribute: 'region' } as unknown as Condition<Model>;
    const load = jest.fn((..._args: unknown[]) => []);
    const dataset = new VirtualDataset({
      model: 'Sale',
      query: { where: baseWhere, limit: 100, offset: 2 },
      load,
    });

    component.data = undefined;
    component.dataset = dataset;
    component.datasetQuery = { where: subWhere, limit: 5, offset: 3 };

    await component['resolveRows']();

    expect(load).toHaveBeenCalledTimes(1);
    expect(baseWhere.and).toHaveBeenCalledWith(subWhere);
    expect(load.mock.calls[0][0]).toMatchObject({
      action: 'find',
      limit: 5,
      offset: 5,
      where: combined,
    });
  });

  it('executes an already narrowed view without applying datasetQuery', async () => {
    const load = jest.fn((..._args: unknown[]) => []);
    const dataset = new VirtualDataset({
      model: 'Sale',
      query: { limit: 100 },
      load,
    });
    const view = dataset.subQuery({ limit: 2 });

    component.data = undefined;
    component.dataset = view;
    component.datasetQuery = { limit: 9, offset: 4 };

    await component['resolveRows']();

    expect(load).toHaveBeenCalledTimes(1);
    expect(load.mock.calls[0][0]).toMatchObject({ action: 'find', limit: 2 });
    expect(load.mock.calls[0][0]).not.toMatchObject({ limit: 9, offset: 4 });
  });

  it('exposes the effective configuration and an accessible label', () => {
    expect(component.resolvedConfig).toMatchObject({ xField: 'month', yField: 'revenue' });
    expect(component.ariaLabel).toBe('Sales');
  });

  it('is read-only for READ and editing for CREATE/UPDATE', () => {
    expect(component.isEditing).toBe(false);
    component.operation = OperationKeys.CREATE;
    expect(component.isEditing).toBe(true);
    component.operation = OperationKeys.UPDATE;
    expect(component.isEditing).toBe(true);
  });

  it('renders the decorated configuration model', () => {
    expect(component['configModel']).toBeInstanceOf(LineChartConfigModel);
  });

  it('applies a submitted configuration and emits the change', async () => {
    const changes: unknown[] = [];
    const submits: unknown[] = [];
    component.configChanged.subscribe((config) => changes.push(config));
    component.submitEvent.subscribe((event) => submits.push(event));

    await component.handleEvent({
      name: ComponentEventNames.Submit,
      data: { title: 'Revenue', xField: 'month', yField: 'revenue', smooth: true },
    });

    expect(component.resolvedConfig).toMatchObject({ title: 'Revenue', smooth: true });
    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({ title: 'Revenue', smooth: true });
    expect(submits).toHaveLength(1);
  });

  it('forwards non-submit events through listenEvent', async () => {
    const events: unknown[] = [];
    component.listenEvent.subscribe((event) => events.push(event));

    await component.handleEvent({ name: 'custom', data: 1 });

    expect(events).toEqual([{ name: 'custom', data: 1 }]);
  });

  it('disposes the chart on destroy', () => {
    fixture.destroy();
    expect(chart.dispose).toHaveBeenCalled();
  });
});
