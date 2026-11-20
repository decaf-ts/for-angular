import { Component, computed, inject, input } from "@angular/core";
import { GenuiI18nService } from "../../i18n/genui-i18n";
import { sampleExpr } from "../../safe-math";
import type { GenuiNode } from "../../types";

interface PlotSeries {
  expr: string;
  label?: string;
  color?: string;
  kind?: "line" | "area" | "scatter";
  params?: { name: string; value: number }[];
}

interface RenderedSeries {
  label: string;
  color: string;
  kind: string;
  path: string;
  points: [number, number][];
}

const PALETTE = ["#3b5bdb", "#22a06b", "#e8590c", "#9c36b5", "#1f9ed4", "#c2255c"];

/**
 * @description Renders sampled function plots with {@link sampleExpr}
 * @summary Computes each series' points in normalized SVG space, supports line,
 * area, and scatter kinds, and falls back to a localized message when no series
 * can be sampled. No external engine is required.
 * @class GenuiPlotComponent
 */
@Component({
  selector: "ngx-decaf-genui-plot",
  template: `
    @if (series().length === 0) {
      <p class="genui-empty">{{ fallback }}</p>
    } @else {
      <figure class="genui-plot">
        @if (title()) { <figcaption>{{ title() }}</figcaption> }
        <svg viewBox="0 0 100 60" preserveAspectRatio="none" role="img" [attr.aria-label]="title() ?? 'plot'">
          @for (entry of series(); track $index) {
            @if (entry.kind === "scatter") {
              @for (point of entry.points; track $index) {
                <circle [attr.cx]="point[0]" [attr.cy]="point[1]" r="0.7" [attr.fill]="entry.color"></circle>
              }
            } @else {
              <path [attr.d]="entry.path" fill="none" [attr.stroke]="entry.color" stroke-width="1.2" vector-effect="non-scaling-stroke"></path>
            }
          }
        </svg>
        <ul class="genui-legend">
          @for (entry of series(); track $index) {
            <li><span class="genui-legend__swatch" [style.background]="entry.color"></span>{{ entry.label }}</li>
          }
        </ul>
      </figure>
    }
  `,
  styles: [
    `
      .genui-plot svg { width: 100%; height: 220px; overflow: visible; }
    `,
  ],
  standalone: true,
})
export class GenuiPlotComponent {
  private readonly i18n = inject(GenuiI18nService);

  /** @description Plot node with expressions and bounds. */
  readonly node = input.required<GenuiNode>();
  /** @description Localized fallback when no series can be sampled. */
  readonly fallback = this.i18n.t("plot.failed");

  /** @description Plot title, if declared. */
  readonly title = computed(() => (this.node() as unknown as { title?: string }).title);

  /** @description Sampled series projected into SVG space. */
  readonly series = computed<RenderedSeries[]>(() => {
    const node = this.node() as unknown as {
      series?: PlotSeries[];
      xMin?: number;
      xMax?: number;
      yMin?: number;
      yMax?: number;
    };
    const rawSeries = node.series ?? [];
    const xMin = node.xMin ?? -2 * Math.PI;
    const xMax = node.xMax ?? 2 * Math.PI;
    const samples = rawSeries.map((entry) => {
      const params = Object.fromEntries((entry.params ?? []).map((param) => [param.name, param.value]));
      return sampleExpr(entry.expr, xMin, xMax, 160, params);
    });
    const all = samples.flat();
    if (all.length === 0) return [];
    const ys = all.map(([, y]) => y);
    const yMin = node.yMin ?? Math.min(...ys);
    const yMax = node.yMax ?? Math.max(...ys);
    const span = yMax - yMin || 1;
    return rawSeries.map((entry, index) => {
      const points: [number, number][] = samples[index]!.map(([x, y]) => [
        ((x - xMin) / (xMax - xMin || 1)) * 100,
        58 - ((y - yMin) / span) * 56,
      ]);
      const path = points
        .map(([x, y], pointIndex) => `${pointIndex === 0 ? "M" : "L"} ${x.toFixed(2)},${y.toFixed(2)}`)
        .join(" ");
      return {
        label: entry.label ?? entry.expr,
        color: entry.color ?? PALETTE[index % PALETTE.length]!,
        kind: entry.kind ?? "line",
        path,
        points,
      };
    });
  });
}
