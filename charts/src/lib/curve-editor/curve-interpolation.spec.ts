import { ComputeEngine } from '@cortex-js/compute-engine';
import {
  CurvePoint,
  computeMonotoneTangents,
  curveToLatex,
  dataToPixel,
  evaluateCurve,
  pixelToData,
  polynomialLatex,
  sampleCurve,
  sortCurvePoints,
} from './curve-interpolation';

const engine = new ComputeEngine();

function evaluateLatex(latex: string, x: number): number {
  const value = engine.parse(latex).subs({ x }).N().valueOf();
  return typeof value === 'number' ? value : NaN;
}

function isNonDecreasing(values: number[]): boolean {
  for (let index = 1; index < values.length; index += 1) {
    if (values[index] < values[index - 1] - 1e-9) {
      return false;
    }
  }
  return true;
}

describe('curve-interpolation', () => {
  const increasing: CurvePoint[] = [
    { x: 0, y: 0 },
    { x: 0.25, y: 0.05 },
    { x: 0.5, y: 0.6 },
    { x: 0.75, y: 0.9 },
    { x: 1, y: 1 },
  ];

  it('sorts points by ascending x without mutating the input', () => {
    const input: CurvePoint[] = [
      { x: 1, y: 10 },
      { x: 0, y: 0 },
      { x: 2, y: 20 },
    ];
    const sorted = sortCurvePoints(input);

    expect(sorted.map((point) => point.x)).toEqual([0, 1, 2]);
    expect(input[0].x).toBe(1);
  });

  it('interpolates linearly between control points', () => {
    const points: CurvePoint[] = [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 0 },
    ];

    expect(evaluateCurve(points, 0.5, 'linear')).toBeCloseTo(0.5, 9);
    expect(evaluateCurve(points, 1.5, 'linear')).toBeCloseTo(0.5, 9);
    expect(evaluateCurve(points, 0.25, 'linear')).toBeCloseTo(0.25, 9);
  });

  it('passes through the control points for both interpolations', () => {
    for (const interpolation of ['linear', 'monotonic'] as const) {
      for (const point of increasing) {
        expect(evaluateCurve(increasing, point.x, interpolation)).toBeCloseTo(point.y, 9);
      }
    }
  });

  it('produces a monotone curve with no overshoot', () => {
    const sampled = sampleCurve(increasing, [0, 1], 'monotonic', 201);
    const values = sampled.map((point) => point.y);

    expect(isNonDecreasing(values)).toBe(true);
    expect(Math.min(...values)).toBeGreaterThanOrEqual(-1e-9);
    expect(Math.max(...values)).toBeLessThanOrEqual(1 + 1e-9);
  });

  it('keeps local extrema within the control-point y bounds (no overshoot)', () => {
    const cases: CurvePoint[][] = [
      [
        { x: 0, y: 0 },
        { x: 0.5, y: 1 },
        { x: 1, y: 0 },
      ],
      [
        { x: 0, y: 1 },
        { x: 0.5, y: 0 },
        { x: 1, y: 1 },
      ],
    ];

    for (const points of cases) {
      const extremum = points[1];
      const sampled = sampleCurve(points, [0, 1], 'monotonic', 21);
      const values = sampled.map((point) => point.y);

      expect(values.every((value) => Number.isFinite(value))).toBe(true);
      expect(Math.min(...values)).toBeGreaterThanOrEqual(0 - 1e-9);
      expect(Math.max(...values)).toBeLessThanOrEqual(1 + 1e-9);
      expect(computeMonotoneTangents(points)[1]).toBe(0);
      expect(evaluateCurve(points, extremum.x, 'monotonic')).toBeCloseTo(extremum.y, 9);
    }
  });

  it('keeps tangents non-negative for monotone increasing data', () => {
    const tangents = computeMonotoneTangents(increasing);

    expect(tangents.every((tangent) => tangent >= -1e-9)).toBe(true);
  });

  it('samples the requested number of points across the range', () => {
    const sampled = sampleCurve(increasing, [0, 1], 'monotonic', 11);

    expect(sampled).toHaveLength(11);
    expect(sampled[0].x).toBeCloseTo(0, 9);
    expect(sampled[sampled.length - 1].x).toBeCloseTo(1, 9);
  });

  it('renders a cubic polynomial in LaTeX', () => {
    const latex = polynomialLatex([1, -2, 3, 4], 0);

    expect(latex).toContain('(x - 0)^{3}');
    expect(evaluateLatex(latex, 2)).toBeCloseTo(8 - 8 + 6 + 4, 6);
  });

  it('regenerates a piecewise LaTeX formula from points', () => {
    const latex = curveToLatex(increasing, 'linear');

    expect(latex).toContain('\\begin{cases}');
    expect(latex.match(/&/g) ?? []).toHaveLength(increasing.length - 1);
  });

  it('round-trips points through a generated formula', () => {
    const points: CurvePoint[] = [
      { x: 0, y: 0 },
      { x: 1, y: 0.5 },
      { x: 2, y: 2 },
    ];

    for (const interpolation of ['linear', 'monotonic'] as const) {
      const latex = curveToLatex(points, interpolation);
      for (const sample of [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75]) {
        expect(evaluateLatex(latex, sample)).toBeCloseTo(
          evaluateCurve(points, sample, interpolation),
          4
        );
      }
    }
  });

  it('maps data coordinates to pixels and back', () => {
    const rect = { x: 0, y: 0, width: 200, height: 100 };
    const pixel = dataToPixel({ x: 0.5, y: 0.5 }, [0, 1], [0, 1], rect);

    expect(pixel).toEqual({ x: 100, y: 50 });
    expect(pixelToData(pixel.x, pixel.y, [0, 1], [0, 1], rect)).toEqual({
      x: 0.5,
      y: 0.5,
    });
  });

  it('maps the y axis with an inverted pixel orientation', () => {
    const rect = { x: 10, y: 20, width: 100, height: 200 };
    const pixel = dataToPixel({ x: 0, y: 1 }, [0, 1], [0, 1], rect);

    expect(pixel.x).toBeCloseTo(10, 9);
    expect(pixel.y).toBeCloseTo(20, 9);
    expect(pixelToData(10, 20, [0, 1], [0, 1], rect).y).toBeCloseTo(1, 9);
  });
});
