/**
 * @module module:lib/components/curve-editor/curve-editor.component
 * @description Curve editor component.
 * @summary Standalone Angular component that renders an Apache ECharts line series
 * with draggable control points, supporting linear and monotone cubic
 * (Fritsch-Carlson) interpolation and a bidirectional formula/points flow. The
 * component talks to ECharts directly (no `ngx-echarts`), running chart work
 * outside the Angular zone, resizing with a `ResizeObserver` and disposing the
 * chart on destroy. No MathLive or ECharts types are exposed through the public
 * component API.
 *
 * @link {@link CurveEditorComponent}
 */

import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  ViewChild,
  effect,
  inject,
  input,
  model,
  output,
  untracked,
} from '@angular/core';
import { ComputeEngine } from '@cortex-js/compute-engine';
import * as echarts from 'echarts';
import type { ECharts, EChartsOption } from 'echarts';
import {
  CurveInterpolation,
  CurvePixelPoint,
  CurvePlotRect,
  CurvePoint,
  curveToLatex,
  dataToPixel,
  pixelToData,
  sampleCurve,
  sortCurvePoints,
} from './curve-interpolation';

/**
 * @description Payload emitted when a control point is moved.
 * @summary Carries the sorted-array index together with the new and previous
 * data-space coordinates of the dragged point.
 * @interface CurveEditorPointEvent
 * @memberOf module:lib/components/curve-editor/curve-editor.component
 */
export interface CurveEditorPointEvent {
  /** Index of the moved point in the x-sorted control points array. */
  index: number;
  /** New coordinates of the point, clamped to the configured ranges. */
  point: CurvePoint;
  /** Coordinates the point had before the move. */
  previous: CurvePoint;
}

/** Number of samples taken across the x range when a formula drives the points. */
const DEFAULT_FORMULA_SAMPLE_COUNT = 21;
/** Number of samples rendered for the curve series. */
const CURVE_SAMPLE_COUNT = 121;
/** Fallback plot rectangle used when the chart cannot convert pixel/data coordinates. */
const DEFAULT_PLOT_RECT: CurvePlotRect = { x: 44, y: 20, width: 420, height: 260 };

/**
 * @description Interactive curve editor backed by Apache ECharts.
 * @summary Renders an ECharts line series over the configured x/y ranges with
 * draggable graphic control points. Points are the source of truth for the
 * curve; editing the two-way `formula` model samples the formula over `xRange`
 * and replaces the points. All ECharts work runs outside the Angular zone, a
 * `ResizeObserver` keeps the canvas fitted to its host, and the chart is
 * disposed on destroy. The public API only exposes plain `CurvePoint` data —
 * no ECharts, MathLive or compute-engine types leak through it.
 *
 * @mermaid
 * classDiagram
 *   class CurveEditorComponent {
 *     +CurvePoint[] points
 *     +string formula
 *     +CurveInterpolation interpolation
 *     +[number, number] xRange
 *     +[number, number] yRange
 *     +boolean lockEndpoints
 *     +number height
 *     +pointAdded(point)
 *     +pointRemoved(point)
 *     +pointMoved(event)
 *     +curveChanged(sampled)
 *     +formulaChanged(latex)
 *     +resize()
 *     +setPoints(points, options)
 *     +addPoint(x, y)
 *     +removePoint(index)
 *     +movePoint(index, x, y)
 *     +applyFormula(latex, options)
 *     +formulaToPoints(latex)
 *     +generateFormula()
 *     +onPointDragEnd(index, pixelX, pixelY)
 *   }
 *   CurveEditorComponent --|> AfterViewInit
 *   CurveEditorComponent --|> OnDestroy
 *
 * @implements {AfterViewInit}
 * @implements {OnDestroy}
 */
@Component({
  selector: 'decaf-curve-editor',
  standalone: true,
  imports: [],
  templateUrl: './curve-editor.component.html',
  styleUrls: ['./curve-editor.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CurveEditorComponent implements AfterViewInit, OnDestroy {
  /**
   * @description Two-way bound control points.
   * @summary Source of truth for the rendered curve unless the user edits the
   * `formula` model. Written back sorted by ascending `x`.
   *
   * @type {CurvePoint[]}
   * @default []
   * @memberOf CurveEditorComponent
   */
  readonly points = model<CurvePoint[]>([]);

  /**
   * @description Two-way bound LaTeX formula that describes the curve.
   * @summary Evaluated with the compute engine and sampled over `xRange` when
   * changed externally; regenerated from the points after every point edit.
   *
   * @type {string}
   * @default ''
   * @memberOf CurveEditorComponent
   */
  readonly formula = model<string>('');

  /**
   * @description Interpolation strategy applied to the control points.
   * @summary `monotonic` uses Fritsch-Carlson monotone cubic Hermite
   * interpolation (no overshoot); `linear` connects points with straight
   * segments.
   *
   * @type {CurveInterpolation}
   * @default 'monotonic'
   * @memberOf CurveEditorComponent
   */
  readonly interpolation = input<CurveInterpolation>('monotonic');

  /**
   * @description Inclusive `[min, max]` abscissa domain.
   * @summary Also bounds dragging and formula sampling.
   *
   * @type {Array.<number>}
   * @default [0, 1]
   * @memberOf CurveEditorComponent
   */
  readonly xRange = input<[number, number]>([0, 1]);

  /**
   * @description Inclusive `[min, max]` ordinate domain.
   * @summary Also clamps added and dragged points.
   *
   * @type {Array.<number>}
   * @default [0, 1]
   * @memberOf CurveEditorComponent
   */
  readonly yRange = input<[number, number]>([0, 1]);

  /**
   * @description When `true`, the first and last points are pinned to the x range
   * bounds and cannot be removed.
   * @summary Locked endpoints keep their `y` free but their `x` fixed.
   *
   * @type {boolean}
   * @default false
   * @memberOf CurveEditorComponent
   */
  readonly lockEndpoints = input<boolean>(false);

  /**
   * @description Rendered chart height in pixels.
   * @summary Consumed by the component template as the host height.
   *
   * @type {number}
   * @default 320
   * @memberOf CurveEditorComponent
   */
  readonly height = input<number>(320);

  /**
   * @description Emitted when a control point is added.
   * @summary Carries the clamped point in data-space coordinates.
   *
   * @type {OutputEmitterRef<CurvePoint>}
   * @memberOf CurveEditorComponent
   */
  readonly pointAdded = output<CurvePoint>();

  /**
   * @description Emitted when a control point is removed.
   * @summary Carries the removed point; never emitted for locked endpoints.
   *
   * @type {OutputEmitterRef<CurvePoint>}
   * @memberOf CurveEditorComponent
   */
  readonly pointRemoved = output<CurvePoint>();

  /**
   * @description Emitted when a control point is moved.
   * @summary Carries the sorted index plus the previous and new coordinates.
   *
   * @type {OutputEmitterRef<CurveEditorPointEvent>}
   * @memberOf CurveEditorComponent
   */
  readonly pointMoved = output<CurveEditorPointEvent>();

  /**
   * @description Emitted with the sampled curve whenever it is re-rendered.
   * @summary The payload contains `sampleCount` interpolated points across the
   * full x range, not just the control points.
   *
   * @type {OutputEmitterRef<CurvePoint[]>}
   * @memberOf CurveEditorComponent
   */
  readonly curveChanged = output<CurvePoint[]>();

  /**
   * @description Emitted whenever the formula changes.
   * @summary Fired both on external formula application and on regeneration
   * from the points.
   *
   * @type {OutputEmitterRef<string>}
   * @memberOf CurveEditorComponent
   */
  readonly formulaChanged = output<string>();

  /** Canvas host element the ECharts instance is initialized on. */
  @ViewChild('chartHost', { static: false })
  private chartHost?: ElementRef<HTMLElement>;

  /** Outer host element observed for size changes. */
  @ViewChild('host', { static: false })
  private host?: ElementRef<HTMLElement>;

  /** Angular zone used to keep chart work outside change detection. */
  private readonly zone = inject(NgZone);

  /** The live ECharts instance, or `null` before init / after dispose. */
  private chart: ECharts | null = null;
  /** Observer that resizes the chart when its host changes size. */
  private resizeObserver: ResizeObserver | null = null;
  /** Lazily created compute engine used to evaluate LaTeX formulas. */
  private engine: ComputeEngine | null = null;
  /** Last points value written by the component itself, to break effect loops. */
  private pointsSource: CurvePoint[];
  /** Last formula value written by the component itself, to break effect loops. */
  private formulaSource: string;

  constructor() {
    this.pointsSource = this.points();
    this.formulaSource = this.formula();

    effect(() => {
      const points = this.points();
      if (points === this.pointsSource) {
        return;
      }
      untracked(() => this.setPoints(points, { regenerateFormula: true }));
    });

    effect(() => {
      const latex = this.formula();
      if (latex === this.formulaSource) {
        return;
      }
      untracked(() => this.applyFormula(latex, { emit: false }));
    });

    effect(() => {
      this.xRange();
      this.yRange();
      this.interpolation();
      untracked(() => this.renderCurve(this.points()));
    });
  }

  /**
   * @description Initializes the ECharts canvas, resize observation and first render.
   * @summary Chart creation and the `ResizeObserver` setup run outside the
   * Angular zone; a failed chart init leaves the component inert.
   * @return {void} Nothing.
   */
  ngAfterViewInit(): void {
    const host = this.chartHost?.nativeElement;
    if (host) {
      this.zone.runOutsideAngular(() => {
        try {
          this.chart = echarts.init(host, undefined, { renderer: 'canvas' });
        } catch {
          this.chart = null;
        }
      });
    }

    if (typeof ResizeObserver !== 'undefined' && this.host?.nativeElement) {
      this.resizeObserver = new ResizeObserver(() => this.resize());
      this.resizeObserver.observe(this.host.nativeElement);
    }

    this.renderCurve(this.points());
  }

  /**
   * @description Disposes the chart and stops resize observation.
   * @summary Idempotent: both handles are nulled after teardown.
   * @return {void} Nothing.
   */
  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.chart?.dispose();
    this.chart = null;
  }

  /**
   * @description Resizes the underlying chart to fit its container.
   * @summary Invoked by the `ResizeObserver`; runs outside the Angular zone.
   * @return {void} Nothing.
   */
  resize(): void {
    this.zone.runOutsideAngular(() => {
      this.chart?.resize();
    });
  }

  /**
   * @description Replaces the control points.
   * @param {Array.<CurvePoint>} points - The new control points.
   * @param {Object} [options] - Set
   * `regenerateFormula` to also regenerate the LaTeX formula.
   */
  setPoints(points: readonly CurvePoint[], options: { regenerateFormula?: boolean } = {}): void {
    const sorted = this.normalizePoints(points);
    this.pointsSource = sorted;
    this.points.set(sorted);
    this.renderCurve(sorted);
    if (options.regenerateFormula) {
      this.regenerateFormula(sorted);
    }
  }

  /**
   * @description Adds a control point, clamped to the configured ranges.
   * @param {number} x - Abscissa.
   * @param {number} y - Ordinate.
   */
  addPoint(x: number, y: number): void {
    const current = sortCurvePoints(this.points());
    const point = this.clampPoint({ x, y }, -1, current);
    const updated = sortCurvePoints([...current, point]);
    this.pointsSource = updated;
    this.points.set(updated);
    this.pointAdded.emit(point);
    this.renderCurve(updated);
    this.regenerateFormula(updated);
  }

  /**
   * @description Removes a control point by index. Endpoints are preserved when
   * `lockEndpoints` is enabled.
   * @param {number} index - Index of the point to remove.
   */
  removePoint(index: number): void {
    const current = sortCurvePoints(this.points());
    if (index < 0 || index >= current.length) {
      return;
    }
    if (this.lockEndpoints() && (index === 0 || index === current.length - 1)) {
      return;
    }
    const [removed] = current.splice(index, 1);
    this.pointsSource = current;
    this.points.set(current);
    this.pointRemoved.emit(removed);
    this.renderCurve(current);
    this.regenerateFormula(current);
  }

  /**
   * @description Moves a control point, clamped to the configured ranges.
   * @param {number} index - Index of the point to move.
   * @param {number} x - New abscissa.
   * @param {number} y - New ordinate.
   */
  movePoint(index: number, x: number, y: number): void {
    const current = sortCurvePoints(this.points());
    if (index < 0 || index >= current.length) {
      return;
    }
    const previous = current[index];
    const point = this.clampPoint({ x, y }, index, current);
    const updated = current.map((item, itemIndex) => (itemIndex === index ? point : { ...item }));
    this.pointsSource = updated;
    this.points.set(updated);
    this.pointMoved.emit({ index, point, previous });
    this.renderCurve(updated);
    this.regenerateFormula(updated);
  }

  /**
   * @description Applies a LaTeX formula, sampling it over the x range into
   * control points.
   * @param {string} latex - The LaTeX formula.
   * @param {Object} [options] - Set `emit` to `false` to avoid
   * writing back to the `formula` model.
   */
  applyFormula(latex: string, options: { emit?: boolean } = {}): void {
    const emit = options.emit !== false;
    const sampled = this.formulaToPoints(latex);
    this.formulaSource = latex;
    if (emit) {
      this.formula.set(latex);
    }
    if (!sampled.length) {
      return;
    }
    const normalized = this.normalizePoints(sampled);
    this.pointsSource = normalized;
    this.points.set(normalized);
    this.renderCurve(normalized);
    if (emit) {
      this.formulaChanged.emit(latex);
    }
  }

  /**
   * @description Samples a LaTeX formula over the configured x range.
   * @param {string} latex - The LaTeX formula.
   * @return {CurvePoint[]} The sampled control points, or an empty array when
   * the formula cannot be evaluated.
   */
  formulaToPoints(latex: string): CurvePoint[] {
    const trimmed = latex?.trim() ?? '';
    if (!trimmed) {
      return [];
    }

    const [min, max] = this.xRange();
    const points: CurvePoint[] = [];
    try {
      const expression = this.getEngine().parse(trimmed);
      for (let index = 0; index < DEFAULT_FORMULA_SAMPLE_COUNT; index += 1) {
        const x = min + ((max - min) * index) / (DEFAULT_FORMULA_SAMPLE_COUNT - 1);
        const value = expression.subs({ x }).N().valueOf();
        if (typeof value === 'number' && Number.isFinite(value)) {
          points.push({ x, y: this.clampY(value) });
        }
      }
    } catch {
      return [];
    }
    return points;
  }

  /**
   * @description Regenerates the LaTeX formula that matches the current curve.
   * @return {string} The generated LaTeX formula.
   */
  generateFormula(): string {
    return curveToLatex(this.points(), this.interpolation());
  }

  /**
   * @description Handles the end of a control point drag in pixel space.
   * @param {number} index - Index of the dragged point.
   * @param {number} pixelX - Pixel abscissa.
   * @param {number} pixelY - Pixel ordinate.
   */
  onPointDragEnd(index: number, pixelX: number, pixelY: number): void {
    const current = sortCurvePoints(this.points());
    if (index < 0 || index >= current.length) {
      return;
    }
    const point = this.pixelToDataPoint(pixelX, pixelY);
    this.movePoint(index, point.x, point.y);
  }

  /**
   * @description Regenerates the LaTeX formula from the given points and writes
   * it to the `formula` model.
   * @param {Array.<CurvePoint>} points - Current control points.
   * @return {void} Nothing.
   */
  private regenerateFormula(points: readonly CurvePoint[]): void {
    const latex = curveToLatex(points, this.interpolation());
    this.formulaSource = latex;
    this.formula.set(latex);
    this.formulaChanged.emit(latex);
  }

  /**
   * @description Sorts the given points and pins locked endpoints to the x range.
   * @summary With `lockEndpoints` enabled the first and last points keep their
   * `y` but are forced onto the `xRange` bounds.
   * @param {Array.<CurvePoint>} points - Points to normalize.
   * @return {CurvePoint[]} A new sorted (and endpoint-pinned) array.
   */
  private normalizePoints(points: readonly CurvePoint[]): CurvePoint[] {
    const sorted = sortCurvePoints(points);
    if (!this.lockEndpoints() || sorted.length < 2) {
      return sorted;
    }
    const [min, max] = this.xRange();
    return sorted.map((point, index) => {
      if (index === 0) {
        return { x: min, y: point.y };
      }
      if (index === sorted.length - 1) {
        return { x: max, y: point.y };
      }
      return point;
    });
  }

  /**
   * @description Clamps a point to the configured ranges and neighbour order.
   * @summary Locked endpoints are forced onto the range bounds; interior points
   * are additionally clamped between their neighbours' `x` values.
   * @param {CurvePoint} point - Desired point.
   * @param {number} index - Target index in the current (sorted) array.
   * @param {Array.<CurvePoint>} current - Current sorted control points.
   * @return {CurvePoint} The clamped point.
   */
  private clampPoint(
    point: CurvePoint,
    index: number,
    current: readonly CurvePoint[]
  ): CurvePoint {
    const [min, max] = this.xRange();
    let x = Math.min(Math.max(point.x, min), max);
    const y = this.clampY(point.y);

    if (this.lockEndpoints() && index === 0) {
      return { x: min, y };
    }
    if (this.lockEndpoints() && index === current.length - 1 && index > 0) {
      return { x: max, y };
    }

    if (index > 0) {
      x = Math.max(x, current[index - 1].x);
    }
    if (index >= 0 && index < current.length - 1) {
      x = Math.min(x, current[index + 1].x);
    }
    return { x, y };
  }

  /**
   * @description Clamps a value to the configured y range.
   * @param {number} value - Value to clamp.
   * @return {number} The value bounded by `yRange`.
   */
  private clampY(value: number): number {
    const [min, max] = this.yRange();
    return Math.min(Math.max(value, min), max);
  }

  /**
   * @description Converts pixel coordinates to data-space using the live chart.
   * @summary Falls back to the pure `pixelToData` mapping over the default plot
   * rectangle when the chart cannot convert (e.g. before init or on failure).
   * @param {number} pixelX - Pixel abscissa.
   * @param {number} pixelY - Pixel ordinate.
   * @return {CurvePoint} The corresponding data-space point.
   */
  private pixelToDataPoint(pixelX: number, pixelY: number): CurvePoint {
    if (this.chart) {
      try {
        const data = this.chart.convertFromPixel({ xAxisIndex: 0, yAxisIndex: 0 }, [pixelX, pixelY]);
        if (Array.isArray(data) && data.length === 2) {
          const [x, y] = data;
          if (typeof x === 'number' && typeof y === 'number') {
            return { x, y };
          }
        }
      } catch {
        // Fall back to the pure mapping when the chart cannot convert.
      }
    }
    return pixelToData(pixelX, pixelY, this.xRange(), this.yRange(), DEFAULT_PLOT_RECT);
  }

  /**
   * @description Converts a data-space point to pixel coordinates using the live chart.
   * @summary Falls back to the pure `dataToPixel` mapping over the default plot
   * rectangle when the chart cannot convert (e.g. before init or on failure).
   * @param {CurvePoint} point - Data-space point.
   * @return {CurvePixelPoint} The corresponding pixel coordinates.
   */
  private dataToPixelPoint(point: CurvePoint): CurvePixelPoint {
    if (this.chart) {
      try {
        const pixel = this.chart.convertToPixel({ xAxisIndex: 0, yAxisIndex: 0 }, [point.x, point.y]);
        if (Array.isArray(pixel) && pixel.length === 2) {
          const [x, y] = pixel;
          if (typeof x === 'number' && typeof y === 'number') {
            return { x, y };
          }
        }
      } catch {
        // Fall back to the pure mapping when the chart cannot convert.
      }
    }
    return dataToPixel(point, this.xRange(), this.yRange(), DEFAULT_PLOT_RECT);
  }

  /**
   * @description Returns the lazily created LaTeX compute engine.
   * @summary Created on first formula evaluation and reused afterwards.
   * @return {ComputeEngine} The shared engine instance.
   */
  private getEngine(): ComputeEngine {
    if (!this.engine) {
      this.engine = new ComputeEngine();
    }
    return this.engine;
  }

  /**
   * @description Renders the curve and draggable handles into the chart.
   * @summary Samples the interpolated curve (`CURVE_SAMPLE_COUNT` points),
   * applies a full (non-merged) ECharts option with a value/value axis pair and
   * one draggable circle graphic per control point, then emits `curveChanged`
   * with the sampled series. No-op before chart initialization.
   * @param {Array.<CurvePoint>} points - Control points to render.
   * @return {void} Nothing.
   */
  private renderCurve(points: readonly CurvePoint[]): void {
    if (!this.chart) {
      return;
    }
    const sorted = sortCurvePoints(points);
    const [xMin, xMax] = this.xRange();
    const [yMin, yMax] = this.yRange();
    const sampled = sampleCurve(sorted, this.xRange(), this.interpolation(), CURVE_SAMPLE_COUNT);

    const option = {
      animation: false,
      grid: { left: 44, right: 20, top: 20, bottom: 32 },
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'value', min: xMin, max: xMax, name: 'x' },
      yAxis: { type: 'value', min: yMin, max: yMax, name: 'y' },
      series: [
        {
          type: 'line',
          name: 'curve',
          showSymbol: false,
          smooth: false,
          data: sampled.map((point) => [point.x, point.y]),
          lineStyle: { width: 2, color: '#3880ff' },
          itemStyle: { color: '#3880ff' },
        },
      ],
      graphic: sorted.map((point, index) => this.buildHandle(index, point)),
    } as unknown as EChartsOption;

    this.chart.setOption(option, { notMerge: true });
    this.curveChanged.emit(sampled);
  }

  /**
   * @description Builds the draggable ECharts graphic handle for one point.
   * @summary The handle is a positioned circle whose `ondragend` reports the
   * dragged element position back to `onPointDragEnd`.
   * @param {number} index - Index of the control point.
   * @param {CurvePoint} point - Control point in data space.
   * @return {Record<string, unknown>} The ECharts graphic option object.
   */
  private buildHandle(index: number, point: CurvePoint): Record<string, unknown> {
    const pixel = this.dataToPixelPoint(point);
    return {
      id: `curve-point-${index}`,
      type: 'circle',
      draggable: true,
      z: 100,
      position: [pixel.x, pixel.y],
      shape: { cx: 0, cy: 0, r: 7 },
      style: { fill: '#ffffff', stroke: '#3880ff', lineWidth: 2 },
      ondragend: (event: { target?: { x?: number; y?: number } }): void => {
        const target = event.target;
        if (target && typeof target.x === 'number' && typeof target.y === 'number') {
          this.onPointDragEnd(index, target.x, target.y);
        }
      },
    };
  }
}
