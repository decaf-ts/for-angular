/**
 * @module module:lib/components/curve-editor/curve-interpolation
 * @description Pure TypeScript interpolation helpers for the curve editor.
 * @summary Provides dependency-free curve math (linear and monotone cubic
 * Fritsch-Carlson interpolation), LaTeX regeneration and pixel/data mapping
 * used by `CurveEditorComponent`. The helpers are exported separately so they can
 * be unit tested without an ECharts instance.
 *
 * @link {@link CurveEditorComponent}
 */

/**
 * @description A single control point of a curve.
 * @summary Plain data pair in data-space coordinates; the editor's public API
 * is built entirely on this shape.
 * @interface CurvePoint
 * @memberOf module:lib/components/curve-editor/curve-interpolation
 */
export interface CurvePoint {
  /** Abscissa in data space. */
  x: number;
  /** Ordinate in data space. */
  y: number;
}

/**
 * @description Supported interpolation strategies.
 * @summary - `monotonic`: Fritsch-Carlson monotone cubic Hermite (no overshoot).
 * - `linear`: piecewise linear interpolation.
 * @typedef {'monotonic' | 'linear'} CurveInterpolation
 * @memberOf module:lib/components/curve-editor/curve-interpolation
 */
export type CurveInterpolation = 'monotonic' | 'linear';

/**
 * @description Rectangular plot area, in pixels.
 * @summary Used by the pure pixel/data mapping when the live chart cannot
 * convert coordinates.
 * @interface CurvePlotRect
 * @memberOf module:lib/components/curve-editor/curve-interpolation
 */
export interface CurvePlotRect {
  /** Left edge of the plot area, in pixels. */
  x: number;
  /** Top edge of the plot area, in pixels. */
  y: number;
  /** Width of the plot area, in pixels. */
  width: number;
  /** Height of the plot area, in pixels. */
  height: number;
}

/**
 * @description A point expressed in pixel coordinates.
 * @summary Counterpart of {@link CurvePoint} on the canvas plane.
 * @interface CurvePixelPoint
 * @memberOf module:lib/components/curve-editor/curve-interpolation
 */
export interface CurvePixelPoint {
  /** Pixel abscissa, measured from the canvas left edge. */
  x: number;
  /** Pixel ordinate, measured from the canvas top edge. */
  y: number;
}

/** Tolerance below which intervals are treated as degenerate. */
const EPSILON = 1e-9;

/**
 * @description Returns a defensive, x-sorted copy of the given points.
 * @param {Array.<CurvePoint>} points - Control points to sort.
 * @return {CurvePoint[]} A new array sorted by ascending `x`.
 */
export function sortCurvePoints(points: readonly CurvePoint[]): CurvePoint[] {
  return points.map((point) => ({ x: point.x, y: point.y })).sort((left, right) => left.x - right.x);
}

/**
 * @description Computes the Fritsch-Carlson monotone cubic tangents for the
 * supplied control points.
 * @param {Array.<CurvePoint>} points - Control points.
 * @return {number[]} One tangent per control point.
 */
export function computeMonotoneTangents(points: readonly CurvePoint[]): number[] {
  const sorted = sortCurvePoints(points);
  const count = sorted.length;
  const tangents = new Array<number>(count).fill(0);
  if (count < 2) {
    return tangents;
  }

  const intervals: number[] = [];
  const slopes: number[] = [];
  for (let index = 0; index < count - 1; index += 1) {
    const h = sorted[index + 1].x - sorted[index].x;
    intervals.push(h);
    slopes.push(h <= EPSILON ? 0 : (sorted[index + 1].y - sorted[index].y) / h);
  }

  tangents[0] = slopes[0];
  tangents[count - 1] = slopes[count - 2];
  for (let index = 1; index < count - 1; index += 1) {
    const left = slopes[index - 1];
    const right = slopes[index];
    if (left * right <= 0) {
      tangents[index] = 0;
      continue;
    }
    const previous = intervals[index - 1];
    const current = intervals[index];
    const weightLeft = 2 * current + previous;
    const weightRight = current + 2 * previous;
    tangents[index] = (weightLeft + weightRight) / (weightLeft / left + weightRight / right);
  }

  return tangents;
}

/**
 * @description Evaluates the curve at a given `x`.
 * @param {Array.<CurvePoint>} points - Control points.
 * @param {number} x - Query abscissa.
 * @param {CurveInterpolation} interpolation - Interpolation strategy.
 * @return {number} The interpolated ordinate, or `NaN` when there are no points.
 */
export function evaluateCurve(
  points: readonly CurvePoint[],
  x: number,
  interpolation: CurveInterpolation = 'monotonic'
): number {
  const sorted = sortCurvePoints(points);
  const count = sorted.length;
  if (count === 0) {
    return NaN;
  }
  if (count === 1) {
    return sorted[0].y;
  }
  if (x <= sorted[0].x) {
    return sorted[0].y;
  }
  if (x >= sorted[count - 1].x) {
    return sorted[count - 1].y;
  }

  let index = 0;
  while (index < count - 2 && x > sorted[index + 1].x) {
    index += 1;
  }

  const start = sorted[index];
  const end = sorted[index + 1];
  const h = end.x - start.x;
  if (h <= EPSILON) {
    return start.y;
  }

  const t = (x - start.x) / h;
  if (interpolation === 'linear') {
    return start.y + (end.y - start.y) * t;
  }

  const tangents = computeMonotoneTangents(sorted);
  const startTangent = tangents[index];
  const endTangent = tangents[index + 1];
  const t2 = t * t;
  const t3 = t2 * t;
  const h00 = 2 * t3 - 3 * t2 + 1;
  const h10 = t3 - 2 * t2 + t;
  const h01 = -2 * t3 + 3 * t2;
  const h11 = t3 - t2;
  return h00 * start.y + h10 * h * startTangent + h01 * end.y + h11 * h * endTangent;
}

/**
 * @description Samples the interpolated curve over the given x range.
 * @param {Array.<CurvePoint>} points - Control points.
 * @param {Array.<number>} xRange - Inclusive `[min, max]` abscissa domain.
 * @param {CurveInterpolation} interpolation - Interpolation strategy.
 * @param {number} sampleCount - Number of samples to produce.
 * @return {CurvePoint[]} The sampled curve.
 */
export function sampleCurve(
  points: readonly CurvePoint[],
  xRange: readonly [number, number],
  interpolation: CurveInterpolation = 'monotonic',
  sampleCount = 121
): CurvePoint[] {
  const sorted = sortCurvePoints(points);
  if (sorted.length === 0) {
    return [];
  }
  if (sorted.length === 1) {
    return [{ x: sorted[0].x, y: sorted[0].y }];
  }

  const [min, max] = xRange;
  const count = Math.max(2, Math.floor(sampleCount));
  const tangents = interpolation === 'monotonic' ? computeMonotoneTangents(sorted) : null;
  const result: CurvePoint[] = [];
  for (let index = 0; index < count; index += 1) {
    const x = min + ((max - min) * index) / (count - 1);
    result.push({ x, y: evaluateCurveWithTangents(sorted, x, interpolation, tangents) });
  }
  return result;
}

/**
 * @description Evaluates the curve at a given `x` with precomputed tangents.
 * @summary Same Hermite basis as {@link evaluateCurve} but accepts the tangent
 * vector so {@link sampleCurve} can compute tangents once per render.
 * @param {Array.<CurvePoint>} sorted - Control points sorted by ascending `x`.
 * @param {number} x - Query abscissa.
 * @param {CurveInterpolation} interpolation - Interpolation strategy.
 * @param {number[] | null} tangents - Monotone tangents, or `null` for linear.
 * @return {number} The interpolated ordinate.
 */
function evaluateCurveWithTangents(
  sorted: readonly CurvePoint[],
  x: number,
  interpolation: CurveInterpolation,
  tangents: number[] | null
): number {
  const count = sorted.length;
  if (x <= sorted[0].x) {
    return sorted[0].y;
  }
  if (x >= sorted[count - 1].x) {
    return sorted[count - 1].y;
  }

  let index = 0;
  while (index < count - 2 && x > sorted[index + 1].x) {
    index += 1;
  }

  const start = sorted[index];
  const end = sorted[index + 1];
  const h = end.x - start.x;
  if (h <= EPSILON) {
    return start.y;
  }

  const t = (x - start.x) / h;
  if (interpolation === 'linear' || !tangents) {
    return start.y + (end.y - start.y) * t;
  }

  const startTangent = tangents[index];
  const endTangent = tangents[index + 1];
  const t2 = t * t;
  const t3 = t2 * t;
  const h00 = 2 * t3 - 3 * t2 + 1;
  const h10 = t3 - 2 * t2 + t;
  const h01 = -2 * t3 + 3 * t2;
  const h11 = t3 - t2;
  return h00 * start.y + h10 * h * startTangent + h01 * end.y + h11 * h * endTangent;
}

/**
 * @description Formats a number as a compact LaTeX numeric literal.
 * @param {number} value - Value to format.
 * @param {number} precision - Maximum number of decimal places.
 * @return {string} The LaTeX literal.
 */
export function formatLatexNumber(value: number, precision = 6): string {
  if (!Number.isFinite(value)) {
    return '0';
  }
  const rounded = Number(value.toFixed(precision));
  if (Object.is(rounded, -0) || rounded === 0) {
    return '0';
  }
  const text = String(rounded);
  if (text.includes('e') || text.includes('E')) {
    const [mantissa, exponent] = text.toLowerCase().split('e');
    return `${mantissa} \\times 10^{${Number(exponent)}}`;
  }
  return text;
}

/**
 * @description Builds the LaTeX term for one polynomial coefficient.
 * @summary Emits `(x - origin)^power` factors with explicit signs; zero
 * coefficients are skipped upstream and the leading term omits the `+`.
 * @param {number} coefficient - Signed coefficient magnitude basis.
 * @param {number} power - Power of `(x - origin)` for the term.
 * @param {number} origin - The expansion origin.
 * @param {boolean} leading - Whether this is the first (sign-less) term.
 * @return {string} The LaTeX term.
 */
function polynomialTermLatex(
  coefficient: number,
  power: number,
  origin: number,
  leading: boolean
): string {
  const magnitude = formatLatexNumber(Math.abs(coefficient));
  const variable =
    power === 0
      ? ''
      : power === 1
        ? ` (x - ${formatLatexNumber(origin)})`
        : ` (x - ${formatLatexNumber(origin)})^{${power}}`;
  const sign = coefficient < 0 ? '-' : leading ? '' : '+ ';
  return `${sign}${magnitude}${variable}`;
}

/**
 * @description Renders a cubic polynomial in `(x - origin)` as LaTeX.
 * @param {Array.<number>} coefficients - Cubic, quadratic,
 * linear and constant coefficients.
 * @param {number} origin - The expansion origin.
 * @return {string} The LaTeX polynomial.
 */
export function polynomialLatex(
  coefficients: readonly [number, number, number, number],
  origin: number
): string {
  const [cubic, quadratic, linear, constant] = coefficients;
  const parts: string[] = [];
  const push = (coefficient: number, power: number): void => {
    if (Math.abs(coefficient) < EPSILON) {
      return;
    }
    parts.push(polynomialTermLatex(coefficient, power, origin, parts.length === 0));
  };
  push(cubic, 3);
  push(quadratic, 2);
  push(linear, 1);
  push(constant, 0);
  return parts.length ? parts.join(' ') : '0';
}

/**
 * @description Regenerates a piecewise LaTeX formula that matches the
 * interpolated curve. The result is evaluable by the compute engine.
 * @param {Array.<CurvePoint>} points - Control points.
 * @param {CurveInterpolation} interpolation - Interpolation strategy.
 * @return {string} A LaTeX `cases` expression.
 */
export function curveToLatex(
  points: readonly CurvePoint[],
  interpolation: CurveInterpolation = 'monotonic'
): string {
  const sorted = sortCurvePoints(points);
  if (sorted.length === 0) {
    return '0';
  }
  if (sorted.length === 1) {
    return formatLatexNumber(sorted[0].y);
  }

  const tangents = interpolation === 'monotonic' ? computeMonotoneTangents(sorted) : null;
  const rows: string[] = [];
  for (let index = 0; index < sorted.length - 1; index += 1) {
    const start = sorted[index];
    const end = sorted[index + 1];
    const h = end.x - start.x;
    const condition =
      index < sorted.length - 2
        ? `x < ${formatLatexNumber(end.x)}`
        : `x \\ge ${formatLatexNumber(sorted[sorted.length - 2].x)}`;

    let expression: string;
    if (interpolation === 'linear' || !tangents || h <= EPSILON) {
      const slope = h <= EPSILON ? 0 : (end.y - start.y) / h;
      expression = polynomialLatex([0, 0, slope, start.y], start.x);
    } else {
      const startTangent = tangents[index];
      const endTangent = tangents[index + 1];
      const cubic = (2 * start.y + h * startTangent - 2 * end.y + h * endTangent) / (h * h * h);
      const quadratic = (-3 * start.y - 2 * h * startTangent + 3 * end.y - h * endTangent) / (h * h);
      expression = polynomialLatex([cubic, quadratic, startTangent, start.y], start.x);
    }
    rows.push(`${expression} & ${condition}`);
  }
  return `\\begin{cases} ${rows.join(' \\\\ ')} \\end{cases}`;
}

/**
 * @description Converts a data-space point to pixel coordinates.
 * @param {CurvePoint} point - Data-space point.
 * @param {Array.<number>} xRange - Abscissa domain.
 * @param {Array.<number>} yRange - Ordinate domain.
 * @param {CurvePlotRect} rect - Plot area in pixels.
 * @return {CurvePixelPoint} Pixel coordinates.
 */
export function dataToPixel(
  point: CurvePoint,
  xRange: readonly [number, number],
  yRange: readonly [number, number],
  rect: CurvePlotRect
): CurvePixelPoint {
  const xSpan = xRange[1] - xRange[0] || 1;
  const ySpan = yRange[1] - yRange[0] || 1;
  return {
    x: rect.x + ((point.x - xRange[0]) / xSpan) * rect.width,
    y: rect.y + rect.height - ((point.y - yRange[0]) / ySpan) * rect.height,
  };
}

/**
 * @description Converts pixel coordinates back to a data-space point.
 * @param {number} pixelX - Pixel abscissa.
 * @param {number} pixelY - Pixel ordinate.
 * @param {Array.<number>} xRange - Abscissa domain.
 * @param {Array.<number>} yRange - Ordinate domain.
 * @param {CurvePlotRect} rect - Plot area in pixels.
 * @return {CurvePoint} The data-space point.
 */
export function pixelToData(
  pixelX: number,
  pixelY: number,
  xRange: readonly [number, number],
  yRange: readonly [number, number],
  rect: CurvePlotRect
): CurvePoint {
  const width = rect.width || 1;
  const height = rect.height || 1;
  return {
    x: xRange[0] + ((pixelX - rect.x) / width) * (xRange[1] - xRange[0]),
    y: yRange[0] + ((rect.y + rect.height - pixelY) / height) * (yRange[1] - yRange[0]),
  };
}
