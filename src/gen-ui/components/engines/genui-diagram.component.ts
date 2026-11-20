import { Component, computed, inject, input } from "@angular/core";
import { GenuiI18nService } from "../../i18n/genui-i18n";
import { GENUI_LIMITS } from "../../limits";
import type { GenuiDiagramEdge, GenuiDiagramNode, GenuiDiagramZone, GenuiNode } from "../../types";

interface DiagramBox {
  id: string;
  label: string;
  sub?: string;
  type: string;
  x: number;
  y: number;
  w: number;
  h: number;
  tag?: string;
}

const TYPE_STYLE: Record<string, { fill: string; stroke: string }> = {
  focal: { fill: "var(--decaf-accent-color, #3b5bdb)", stroke: "var(--decaf-accent-color, #3b5bdb)" },
  backend: { fill: "#e8f0fe", stroke: "#4c6ef5" },
  store: { fill: "#e6fcf5", stroke: "#0ca678" },
  external: { fill: "#fff4e6", stroke: "#e8590c" },
  input: { fill: "#f3f0ff", stroke: "#7048e8" },
  optional: { fill: "#f8f9fa", stroke: "#868e96" },
  security: { fill: "#fff5f5", stroke: "#e03131" },
};

/**
 * @description Renders an SVG architecture diagram from nodes, edges, and zones
 * @summary Lays out declared nodes (or auto-places them within the diagram
 * limits), styles categories via a small palette, and draws labeled edges and
 * background zones. Renders a localized empty state when there are no nodes.
 * @class GenuiDiagramComponent
 */
@Component({
  selector: "ngx-decaf-genui-diagram",
  template: `
    <figure class="genui-diagram" [attr.data-variant]="variant()">
      @if (title()) { <figcaption class="genui-diagram__title">{{ title() }}</figcaption> }
      @if (boxes().length === 0) {
        <p class="genui-empty">{{ emptyText }}</p>
      } @else {
        <svg [attr.viewBox]="viewBox()" role="img" [attr.aria-label]="title() ?? 'diagram'">
          @for (zone of zones(); track $index) {
            <g class="genui-diagram__zone">
              <rect [attr.x]="zone.x" [attr.y]="zone.y" [attr.width]="zone.w" [attr.height]="zone.h" rx="6"></rect>
              <text [attr.x]="zone.x + 6" [attr.y]="zone.y + 12">{{ zone.label }}</text>
            </g>
          }
          @for (edge of edges(); track $index) {
            <line
              [attr.x1]="edge.x1" [attr.y1]="edge.y1" [attr.x2]="edge.x2" [attr.y2]="edge.y2"
              [attr.data-kind]="edge.kind" class="genui-diagram__edge"
            ></line>
            @if (edge.label) {
              <text class="genui-diagram__edge-label" [attr.x]="(edge.x1 + edge.x2) / 2" [attr.y]="(edge.y1 + edge.y2) / 2 - 3">{{ edge.label }}</text>
            }
          }
          @for (box of boxes(); track box.id) {
            <g class="genui-diagram__node" [attr.data-type]="box.type">
              <rect
                [attr.x]="box.x" [attr.y]="box.y" [attr.width]="box.w" [attr.height]="box.h" rx="5"
                [attr.fill]="styleFor(box.type).fill" [attr.stroke]="styleFor(box.type).stroke"
              ></rect>
              <text class="genui-diagram__label" [attr.x]="box.x + box.w / 2" [attr.y]="box.y + box.h / 2"
                text-anchor="middle" dominant-baseline="middle">{{ box.label }}</text>
              @if (box.sub) {
                <text class="genui-diagram__sub" [attr.x]="box.x + box.w / 2" [attr.y]="box.y + box.h / 2 + 11"
                  text-anchor="middle">{{ box.sub }}</text>
              }
              @if (box.tag) {
                <text class="genui-diagram__tag" [attr.x]="box.x + 6" [attr.y]="box.y + 12">{{ box.tag }}</text>
              }
            </g>
          }
        </svg>
      }
    </figure>
  `,
  styles: [
    `
      .genui-diagram svg { width: 100%; height: auto; background: var(--decaf-surface-alt, #f7f8fb); border-radius: 8px; }
      .genui-diagram__zone rect { fill: none; stroke: var(--decaf-border-color, #d9dee8); stroke-dasharray: 4 3; }
      .genui-diagram__zone text { font-size: 9px; fill: var(--decaf-muted-color, #6b7280); text-transform: uppercase; letter-spacing: 0.08em; }
      .genui-diagram__edge { stroke: #6b7280; stroke-width: 1.2; }
      .genui-diagram__edge[data-kind="dashed"] { stroke-dasharray: 4 3; }
      .genui-diagram__edge[data-kind="accent"] { stroke: #e8590c; }
      .genui-diagram__edge[data-kind="link"] { stroke: #1f9ed4; }
      .genui-diagram__edge-label { font-size: 8px; fill: #4b5563; text-anchor: middle; }
      .genui-diagram__label { font-size: 11px; font-weight: 600; fill: #1f2430; }
      .genui-diagram__sub { font-size: 8px; fill: #4b5563; }
      .genui-diagram__tag { font-size: 7px; fill: #4b5563; }
      .genui-diagram__node[data-type="focal"] .genui-diagram__label { fill: #fff; }
    `,
  ],
  standalone: true,
})
export class GenuiDiagramComponent {
  private readonly i18n = inject(GenuiI18nService);

  /** @description Diagram node with nodes, edges, and zones. */
  readonly node = input.required<GenuiNode>();
  readonly emptyText = this.i18n.t("diagram.empty");
  readonly title = computed(() => (this.node() as unknown as { title?: string }).title);
  readonly variant = computed(() => (this.node() as unknown as { variant?: string }).variant ?? "light");

  private raw(): { nodes: GenuiDiagramNode[]; edges: GenuiDiagramEdge[]; zones: GenuiDiagramZone[] } {
    const node = this.node() as unknown as {
      nodes?: GenuiDiagramNode[];
      edges?: GenuiDiagramEdge[];
      zones?: GenuiDiagramZone[];
    };
    return {
      nodes: (node.nodes ?? []).slice(0, GENUI_LIMITS.maxDiagramNodes),
      edges: (node.edges ?? []).slice(0, GENUI_LIMITS.maxDiagramEdges),
      zones: (node.zones ?? []).slice(0, GENUI_LIMITS.maxDiagramZones),
    };
  }

  readonly layout = computed<{ boxes: DiagramBox[]; width: number; height: number }>(() => {
    const { nodes } = this.raw();
    const hasCoordinates = nodes.some((entry) => typeof entry.x === "number" && typeof entry.y === "number");
    const columns = hasCoordinates ? 1 : Math.max(1, Math.ceil(Math.sqrt(nodes.length)));
    const boxes = nodes.map((entry, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      return {
        id: entry.id,
        label: entry.label,
        ...(entry.sub === undefined ? {} : { sub: entry.sub }),
        type: entry.type ?? "backend",
        x: entry.x ?? 12 + column * 150,
        y: entry.y ?? 12 + row * 74,
        w: entry.w ?? 130,
        h: entry.h ?? 54,
        ...(entry.tag === undefined ? {} : { tag: entry.tag }),
      };
    });
    const width = Math.max(320, ...boxes.map((box) => box.x + box.w + 12));
    const height = Math.max(160, ...boxes.map((box) => box.y + box.h + 12));
    return { boxes, width, height };
  });

  readonly boxes = computed(() => this.layout().boxes);
  readonly viewBox = computed(() => `0 0 ${this.layout().width} ${this.layout().height}`);

  readonly zones = computed(() => this.raw().zones.filter((zone) => typeof zone.x === "number" && typeof zone.y === "number").map((zone) => ({
    label: zone.label,
    x: zone.x ?? 0,
    y: zone.y ?? 0,
    w: zone.w ?? 100,
    h: zone.h ?? 60,
  })));

  readonly edges = computed(() => {
    const boxes = new Map(this.boxes().map((box) => [box.id, box]));
    return this.raw().edges.flatMap((edge) => {
      const from = boxes.get(edge.from);
      const to = boxes.get(edge.to);
      if (from === undefined || to === undefined) return [];
      return [{
        x1: from.x + from.w / 2,
        y1: from.y + from.h / 2,
        x2: to.x + to.w / 2,
        y2: to.y + to.h / 2,
        kind: edge.kind ?? "solid",
        label: edge.label ?? "",
      }];
    });
  });

  styleFor(type: string): { fill: string; stroke: string } {
    return TYPE_STYLE[type] ?? TYPE_STYLE["backend"]!;
  }
}
