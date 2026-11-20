import { Component, ElementRef, OnDestroy, effect, inject, input, signal, viewChild } from "@angular/core";
import { GenuiAssetLoaderService } from "../../genui-asset-loader.service";
import { GenuiI18nService } from "../../i18n/genui-i18n";
import type { GenuiBlockState } from "../../render-context";
import { sanitizeEChartOption } from "../../sanitize";
import type { GenuiChartDatum, GenuiNode } from "../../types";

interface EChartsInstance {
  setOption(option: Record<string, unknown>, notMerge?: boolean): void;
  resize(): void;
  dispose(): void;
}

interface EChartsApi {
  init(element: HTMLElement): EChartsInstance;
}

/**
 * @description Renders charts through the lazily loaded ECharts engine
 * @summary Expands a named preset (or accepts a raw `option`) into an ECharts
 * option, sanitizes it with {@link sanitizeEChartOption}, and re-renders when
 * the node changes. The instance is disposed on destroy. Failures render a
 * localized message.
 * @class GenuiEchartComponent
 */
@Component({
  selector: "ngx-decaf-genui-echart",
  template: `
    @if (failed()) {
      <p class="genui-empty">{{ failureText }}</p>
    } @else {
      @if (title()) { <figcaption class="genui-echart__title">{{ title() }}</figcaption> }
      <div #host class="genui-echart" [style.height.px]="height()" role="img" [attr.aria-label]="title() ?? 'chart'"></div>
    }
  `,
  styles: [
    `
      .genui-echart { width: 100%; min-height: 180px; }
      .genui-echart__title { font-size: 0.85rem; font-weight: 600; margin-bottom: 0.35rem; }
    `,
  ],
  standalone: true,
})
export class GenuiEchartComponent implements OnDestroy {
  private readonly assets = inject(GenuiAssetLoaderService);
  private readonly i18n = inject(GenuiI18nService);

  /** @description Chart node with a preset or raw option. */
  readonly node = input.required<GenuiNode>();
  /** @description Block state used to resolve computed data values. */
  readonly state = input<GenuiBlockState | null>(null);
  /** @description Host element that receives the chart canvas. */
  readonly host = viewChild<ElementRef<HTMLDivElement>>("host");
  /** @description Whether the last render attempt failed. */
  readonly failed = signal(false);
  /** @description Localized failure message. */
  readonly failureText = this.i18n.t("chart.failed");

  private instance: EChartsInstance | null = null;

  constructor() {
    effect(() => {
      const element = this.host()?.nativeElement;
      const node = this.node();
      if (element === undefined) return;
      void this.render(element, node);
    });
  }

  private data(node: GenuiNode): GenuiChartDatum[] {
    return ((node as unknown as { data?: GenuiChartDatum[] }).data ?? []).filter(
      (datum) => datum !== null && typeof datum === "object",
    );
  }

  private buildOption(node: GenuiNode): Record<string, unknown> {
    const raw = node as unknown as {
      option?: Record<string, unknown>;
      preset?: string;
      series?: { label: string; data: GenuiChartDatum[] }[];
      links?: { from: string; to: string; value?: number }[];
    };
    if (raw.option !== undefined) return sanitizeEChartOption(raw.option);
    const preset = raw.preset ?? "bar";
    const data = this.data(node);
    const labels = data.map((datum) => datum.label);
    const values = data.map((datum) => (typeof datum.value === "number" ? datum.value : 0));
    const tooltip = { renderMode: "richText" };
    switch (preset) {
      case "pie":
        return {
          tooltip,
          series: [{ type: "pie", radius: "62%", data: data.map((datum) => ({ name: datum.label, value: datum.value })) }],
        };
      case "funnel":
        return {
          tooltip,
          series: [{ type: "funnel", data: data.map((datum) => ({ name: datum.label, value: datum.value })) }],
        };
      case "gauge":
        return { tooltip, series: [{ type: "gauge", max: Math.max(100, ...values), data: [{ value: values[0] ?? 0, name: labels[0] ?? "" }] }] };
      case "radar": {
        const series = raw.series ?? [];
        return {
          tooltip,
          radar: { indicator: labels.map((name) => ({ name, max: Math.max(1, ...values) })) },
          series: [{ type: "radar", data: (series.length > 0 ? series : [{ label: "Series", data }]).map((entry) => ({ name: entry.label, value: entry.data.map((datum) => datum.value) })) }],
        };
      }
      case "scatter":
        return {
          tooltip,
          xAxis: { type: "category", data: labels },
          yAxis: { type: "value" },
          series: [{ type: "scatter", data: values }],
        };
      case "sankey":
        return {
          tooltip,
          series: [{ type: "sankey", data: labels.map((name) => ({ name })), links: raw.links ?? [] }],
        };
      case "graph":
        return {
          tooltip,
          series: [{ type: "graph", layout: "force", data: labels.map((name) => ({ name })), links: raw.links ?? [] }],
        };
      case "heatmap":
      case "treemap":
      case "wordCloud":
        return {
          tooltip,
          series: [{ type: preset === "treemap" ? "treemap" : "bar", data: data.map((datum) => ({ name: datum.label, value: datum.value })) }],
        };
      case "bigline":
      case "area":
      case "line":
        return {
          tooltip,
          xAxis: { type: "category", data: labels },
          yAxis: { type: "value" },
          series: [{ type: "line", smooth: true, ...(preset === "area" ? { areaStyle: {} } : {}), data: values }],
        };
      case "bar":
      default:
        return {
          tooltip,
          xAxis: { type: "category", data: labels },
          yAxis: { type: "value" },
          series: [{ type: "bar", data: values }],
        };
    }
  }

  private async render(element: HTMLElement, node: GenuiNode): Promise<void> {
    try {
      const echarts = (await this.assets.load("echarts")) as EChartsApi;
      if (this.instance === null) this.instance = echarts.init(element);
      this.instance.setOption(this.buildOption(node), true);
      this.instance.resize();
      this.failed.set(false);
    } catch {
      this.failed.set(true);
    }
  }

  ngOnDestroy(): void {
    this.instance?.dispose();
    this.instance = null;
  }
}
