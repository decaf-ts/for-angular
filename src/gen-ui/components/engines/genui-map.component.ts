import { Component, computed, inject, input } from "@angular/core";
import { GenuiI18nService } from "../../i18n/genui-i18n";
import { GENUI_LIMITS } from "../../limits";
import type { GenuiBlockState } from "../../render-context";
import type { GenuiMapLocation, GenuiMapRoute, GenuiNode } from "../../types";

interface MapPoint {
  id: string;
  label: string;
  x: number;
  y: number;
  description?: string;
}

/**
 * @description Renders an offline coordinate map with selectable locations
 * @summary Projects longitude/latitude into a fixed SVG view box and draws
 * locations, routes, and the current selection without any network request.
 * Selection is stored in the block field identified by the node `id`.
 * @class GenuiMapComponent
 */
@Component({
  selector: "ngx-decaf-genui-map",
  template: `
    <figure class="genui-map">
      @if (title()) { <figcaption class="genui-map__title">{{ title() }}</figcaption> }
      @if (points().length === 0) {
        <p class="genui-empty">{{ emptyText }}</p>
      } @else {
        <svg class="genui-map__canvas" viewBox="0 0 100 60" role="img" [attr.aria-label]="canvasLabel">
          <rect x="0" y="0" width="100" height="60" class="genui-map__surface"></rect>
          @for (route of routes(); track route.id) {
            <polyline [attr.points]="route.points" fill="none" class="genui-map__route"></polyline>
          }
          @for (point of points(); track point.id) {
            <g class="genui-map__marker" [class.genui-map__marker--selected]="selected() === point.id" (click)="select(point.id)">
              <circle [attr.cx]="point.x" [attr.cy]="point.y" r="2.2"></circle>
              <title>{{ point.label }}</title>
            </g>
          }
        </svg>
        <ul class="genui-map__list" [attr.aria-label]="selectLabel">
          @for (point of points(); track point.id) {
            <li>
              <button type="button" [class.genui-map__item--selected]="selected() === point.id" (click)="select(point.id)">
                <span>{{ point.label }}</span>
                @if (point.description) { <small>{{ point.description }}</small> }
              </button>
            </li>
          }
        </ul>
        <p class="genui-map__note">{{ offlineText }}</p>
      }
    </figure>
  `,
  styles: [
    `
      .genui-map__canvas { width: 100%; height: 220px; }
      .genui-map__surface { fill: var(--decaf-surface-alt, #eef2f8); }
      .genui-map__route { stroke: var(--decaf-accent-color, #3b5bdb); stroke-width: 0.6; opacity: 0.7; }
      .genui-map__marker circle { fill: #3b5bdb; cursor: pointer; }
      .genui-map__marker--selected circle { fill: #e8590c; r: 3; }
      .genui-map__list { list-style: none; padding: 0; display: flex; flex-wrap: wrap; gap: 0.35rem; }
      .genui-map__item--selected { outline: 2px solid var(--decaf-accent-color, #3b5bdb); }
      .genui-map__note { font-size: 0.72rem; color: var(--decaf-muted-color, #6b7280); }
    `,
  ],
  standalone: true,
})
export class GenuiMapComponent {
  private readonly i18n = inject(GenuiI18nService);

  /** @description Map node with locations and routes. */
  readonly node = input.required<GenuiNode>();
  /** @description Block state used to store the selection. */
  readonly state = input.required<GenuiBlockState>();

  /** @description Localized empty-state text. */
  readonly emptyText = this.i18n.t("map.empty");
  /** @description Localized offline note. */
  readonly offlineText = this.i18n.t("map.offline");
  /** @description Localized map canvas label. */
  readonly canvasLabel = this.i18n.t("map.canvas");
  /** @description Localized location-list label. */
  readonly selectLabel = this.i18n.t("map.select");

  readonly title = computed(() => (this.node() as unknown as { title?: string }).title);
  readonly id = computed(() => (this.node() as unknown as { id?: string }).id);

  readonly selected = computed(() => {
    const id = this.id();
    return id === undefined ? "" : (this.state().fields()[id] ?? "");
  });

  private bounds(): { minLon: number; maxLon: number; minLat: number; maxLat: number } {
    const raw = this.node() as unknown as { locations?: GenuiMapLocation[]; routes?: GenuiMapRoute[] };
    const coords: [number, number][] = [];
    for (const location of raw.locations ?? []) coords.push(location.coordinates);
    for (const route of raw.routes ?? []) coords.push(...route.coordinates);
    const lons = coords.map(([lon]) => lon);
    const lats = coords.map(([, lat]) => lat);
    return {
      minLon: Math.min(...lons),
      maxLon: Math.max(...lons),
      minLat: Math.min(...lats),
      maxLat: Math.max(...lats),
    };
  }

  readonly points = computed<MapPoint[]>(() => {
    const raw = this.node() as unknown as { locations?: GenuiMapLocation[] };
    const locations = (raw.locations ?? []).slice(0, GENUI_LIMITS.maxMapLocations);
    if (locations.length === 0) return [];
    const bounds = this.bounds();
    const lonSpan = bounds.maxLon - bounds.minLon || 1;
    const latSpan = bounds.maxLat - bounds.minLat || 1;
    return locations.map((location) => ({
      id: location.id,
      label: location.label,
      x: 4 + ((location.coordinates[0] - bounds.minLon) / lonSpan) * 92,
      y: 56 - ((location.coordinates[1] - bounds.minLat) / latSpan) * 52,
      ...(location.description === undefined ? {} : { description: location.description }),
    }));
  });

  readonly routes = computed<{ id: string; points: string }[]>(() => {
    const raw = this.node() as unknown as { routes?: GenuiMapRoute[] };
    const routes = (raw.routes ?? []).slice(0, GENUI_LIMITS.maxMapRoutes);
    if (routes.length === 0) return [];
    const bounds = this.bounds();
    const lonSpan = bounds.maxLon - bounds.minLon || 1;
    const latSpan = bounds.maxLat - bounds.minLat || 1;
    return routes.map((route) => ({
      id: route.id,
      points: route.coordinates
        .slice(0, GENUI_LIMITS.maxMapRoutePoints)
        .map(([lon, lat]) => `${4 + ((lon - bounds.minLon) / lonSpan) * 92},${56 - ((lat - bounds.minLat) / latSpan) * 52}`)
        .join(" "),
    }));
  });

  select(id: string): void {
    const field = this.id();
    if (field !== undefined) this.state().setField(field, id);
  }
}
