import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { CurvePoint } from './curve-interpolation';
import { CurveEditorComponent, CurveEditorPointEvent } from './curve-editor.component';

jest.mock('echarts', () => {
  const chart = {
    setOption: jest.fn(),
    resize: jest.fn(),
    dispose: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
    getZr: jest.fn(() => ({ on: jest.fn(), off: jest.fn() })),
    convertToPixel: jest.fn((_finder: unknown, point: [number, number]) => point),
    convertFromPixel: jest.fn((_finder: unknown, pixel: [number, number]) => pixel),
    isDisposed: jest.fn(() => false),
  };
  return { init: jest.fn(() => chart), __chart: chart };
});

import * as echarts from 'echarts';

interface MockChart {
  setOption: jest.Mock;
  resize: jest.Mock;
  dispose: jest.Mock;
  on: jest.Mock;
  off: jest.Mock;
  getZr: jest.Mock;
  convertToPixel: jest.Mock;
  convertFromPixel: jest.Mock;
  isDisposed: jest.Mock;
}

const chart = (echarts as unknown as { __chart: MockChart }).__chart;

describe('CurveEditorComponent', () => {
  let component: CurveEditorComponent;
  let fixture: ComponentFixture<CurveEditorComponent>;

  beforeEach(waitForAsync(() => {
    jest.clearAllMocks();
    TestBed.configureTestingModule({
      imports: [CurveEditorComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CurveEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create and initialize the ECharts instance', () => {
    expect(component).toBeTruthy();
    expect(echarts.init).toHaveBeenCalled();
  });

  it('should render the line series and control points', () => {
    component.setPoints([
      { x: 0, y: 0 },
      { x: 0.5, y: 0.5 },
      { x: 1, y: 1 },
    ]);
    fixture.detectChanges();

    expect(chart.setOption).toHaveBeenCalled();
    const option = chart.setOption.mock.calls[chart.setOption.mock.calls.length - 1][0] as {
      series: { data: number[][] }[];
      graphic: unknown[];
    };
    expect(option.series[0].data.length).toBeGreaterThan(2);
    expect(option.graphic).toHaveLength(3);
  });

  it('emits curveChanged with the 121-point sampled curve on setPoints, addPoint and movePoint', () => {
    const curves: CurvePoint[][] = [];
    component.curveChanged.subscribe((curve) => curves.push(curve));

    component.setPoints([
      { x: 0, y: 0 },
      { x: 0.5, y: 0.5 },
      { x: 1, y: 1 },
    ]);

    expect(curves).toHaveLength(1);
    expect(curves[0]).toHaveLength(121);
    expect(curves[0][0]).toEqual({ x: 0, y: 0 });
    expect(curves[0][120]).toEqual({ x: 1, y: 1 });
    expect(curves[0][60]).toEqual({ x: 0.5, y: 0.5 });

    component.addPoint(0.75, 0.9);
    expect(curves).toHaveLength(2);
    expect(curves[1]).toHaveLength(121);
    expect(curves[1][120]).toEqual({ x: 1, y: 1 });

    component.movePoint(1, 0.5, 0.75);
    expect(curves).toHaveLength(3);
    expect(curves[2]).toHaveLength(121);
    expect(curves[2][60]).toEqual({ x: 0.5, y: 0.75 });
  });

  it('adds a point and emits pointAdded', () => {
    const added: CurvePoint[] = [];
    component.pointAdded.subscribe((point) => added.push(point));

    component.setPoints([
      { x: 0, y: 0 },
      { x: 1, y: 1 },
    ]);
    component.addPoint(0.5, 0.25);

    expect(added).toEqual([{ x: 0.5, y: 0.25 }]);
    expect(component.points()).toEqual([
      { x: 0, y: 0 },
      { x: 0.5, y: 0.25 },
      { x: 1, y: 1 },
    ]);
  });

  it('removes a point and emits pointRemoved', () => {
    const removed: CurvePoint[] = [];
    component.pointRemoved.subscribe((point) => removed.push(point));

    component.setPoints([
      { x: 0, y: 0 },
      { x: 0.5, y: 0.5 },
      { x: 1, y: 1 },
    ]);
    component.removePoint(1);

    expect(removed).toEqual([{ x: 0.5, y: 0.5 }]);
    expect(component.points()).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 1 },
    ]);
  });

  it('moves a point, clamps it to the ranges and emits pointMoved', () => {
    const moved: CurveEditorPointEvent[] = [];
    component.pointMoved.subscribe((event) => moved.push(event));

    component.setPoints([
      { x: 0, y: 0 },
      { x: 0.5, y: 0.5 },
      { x: 1, y: 1 },
    ]);
    component.movePoint(1, 0.75, 2);

    expect(component.points()[1]).toEqual({ x: 0.75, y: 1 });
    expect(moved).toHaveLength(1);
    expect(moved[0].index).toBe(1);
    expect(moved[0].previous).toEqual({ x: 0.5, y: 0.5 });
  });

  it('keeps control points ordered when moving across a neighbour', () => {
    component.setPoints([
      { x: 0, y: 0 },
      { x: 0.5, y: 0.5 },
      { x: 1, y: 1 },
    ]);
    component.movePoint(1, -1, 0.5);

    expect(component.points()[1].x).toBe(0);
  });

  it('samples a formula over the x range into points', () => {
    component.formula.set('x^2');
    fixture.detectChanges();

    const points = component.points();
    expect(points).toHaveLength(21);
    expect(points[0]).toEqual({ x: 0, y: 0 });
    expect(points[points.length - 1]).toEqual({ x: 1, y: 1 });
  });

  it('regenerates a piecewise formula when points change', () => {
    component.points.set([
      { x: 0, y: 0 },
      { x: 0.5, y: 0.6 },
      { x: 1, y: 1 },
    ]);
    fixture.detectChanges();

    expect(component.formula()).toContain('\\begin{cases}');
  });

  it('emits formulaChanged with the regenerated piecewise formula when points change', () => {
    const formulas: string[] = [];
    component.formulaChanged.subscribe((formula) => formulas.push(formula));

    component.points.set([
      { x: 0, y: 0 },
      { x: 0.5, y: 0.6 },
      { x: 1, y: 1 },
    ]);
    fixture.detectChanges();

    expect(formulas).toHaveLength(1);
    expect(formulas[0]).toContain('\\begin{cases}');
    expect(formulas[0]).toBe(component.formula());
  });

  it('emits formulaChanged after applyFormula', () => {
    const formulas: string[] = [];
    component.formulaChanged.subscribe((formula) => formulas.push(formula));

    component.applyFormula('x^2');

    expect(formulas).toEqual(['x^2']);
    expect(component.formula()).toBe('x^2');
    expect(component.points()).toHaveLength(21);
  });

  it('returns an empty array and leaves points unchanged for an invalid formula', () => {
    component.setPoints([
      { x: 0, y: 0 },
      { x: 1, y: 1 },
    ]);
    const before = component.points();

    expect(component.formulaToPoints('\\frac{')).toEqual([]);

    component.applyFormula('\\frac{');
    expect(component.points()).toEqual(before);
  });

  it('handles empty and single-point lists', () => {
    const curves: CurvePoint[][] = [];
    component.curveChanged.subscribe((curve) => curves.push(curve));

    component.setPoints([]);
    expect(component.points()).toEqual([]);
    expect(curves[curves.length - 1]).toEqual([]);

    component.setPoints([{ x: 0.3, y: 0.4 }]);
    expect(component.points()).toEqual([{ x: 0.3, y: 0.4 }]);
    expect(curves[curves.length - 1]).toHaveLength(1);
    expect(curves[curves.length - 1][0]).toEqual({ x: 0.3, y: 0.4 });
  });

  it('removes the last point down to an empty list', () => {
    const curves: CurvePoint[][] = [];
    const formulas: string[] = [];
    component.curveChanged.subscribe((curve) => curves.push(curve));
    component.formulaChanged.subscribe((formula) => formulas.push(formula));

    component.setPoints([{ x: 0.5, y: 0.5 }]);
    component.removePoint(0);

    expect(component.points()).toEqual([]);
    expect(curves[curves.length - 1]).toEqual([]);
    expect(formulas[formulas.length - 1]).toBe('0');
  });

  it('ignores a move with an out-of-range index', () => {
    const moved: CurveEditorPointEvent[] = [];
    component.pointMoved.subscribe((event) => moved.push(event));

    component.setPoints([
      { x: 0, y: 0 },
      { x: 1, y: 1 },
    ]);
    component.movePoint(5, 0.5, 0.5);

    expect(moved).toEqual([]);
    expect(component.points()).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 1 },
    ]);
  });

  it('pins endpoint x positions and blocks endpoint removal when locked', () => {
    fixture.componentRef.setInput('lockEndpoints', true);
    component.setPoints([
      { x: 0.2, y: 0 },
      { x: 0.5, y: 0.5 },
      { x: 0.8, y: 1 },
    ]);
    fixture.detectChanges();

    expect(component.points()[0].x).toBe(0);
    expect(component.points()[2].x).toBe(1);

    component.removePoint(0);
    expect(component.points()).toHaveLength(3);

    component.movePoint(0, 0.7, 0.25);
    expect(component.points()[0]).toEqual({ x: 0, y: 0.25 });
  });

  it('commits a drag through the chart coordinate conversion', () => {
    const moved: CurveEditorPointEvent[] = [];
    component.pointMoved.subscribe((event) => moved.push(event));

    component.setPoints([
      { x: 0, y: 0 },
      { x: 1, y: 1 },
    ]);
    component.onPointDragEnd(1, 0.5, 0.75);

    expect(chart.convertFromPixel).toHaveBeenCalled();
    expect(component.points()[1]).toEqual({ x: 0.5, y: 0.75 });
    expect(moved).toHaveLength(1);
  });

  it('resizes the chart and disposes it on destroy', () => {
    component.resize();
    expect(chart.resize).toHaveBeenCalled();

    component.ngOnDestroy();
    expect(chart.dispose).toHaveBeenCalled();
  });
});
