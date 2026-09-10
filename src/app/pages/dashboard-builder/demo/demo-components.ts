/**
 * @module module:pages/dashboard-builder/demo/demo-components
 * @description Demo palette components for the dashboard-builder route.
 * @summary A small palette of `@dashcomponent()`-decorated, `@Dynamic()`-registered
 * Angular components used to exercise the editable dashboard demo end to end.
 * Each component is itself a Crud-style consumer component that renders from its
 * configuration props (AC-10: statically imported and registered at build time).
 */

import { Component, Input } from '@angular/core';
import { dashcomponent } from '@decaf-ts/ui-decorators';
import { Dynamic } from 'src/lib/engine';

/**
 * @description Simple stat card demo component.
 * @summary Renders a title and a numeric value. Registered as a dashboard
 * palette entry with a 2x1 default footprint.
 * @class DemoStatsComponent
 * @memberOf module:pages/dashboard-builder/demo/demo-components
 */
@dashcomponent('demo-stats', {
  label: 'dashboard.demo.stats',
  defaultSize: { cols: 2, rows: 1 },
})
@Dynamic()
@Component({
  standalone: true,
  selector: 'demo-stats',
  template: `
    <div class="demo-stat">
      <span class="demo-stat__title">{{ title || '—' }}</span>
      <span class="demo-stat__value">{{ value }}</span>
    </div>
  `,
  styles: [
    `
      .demo-stat {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        padding: 1rem;
        height: 100%;
      }
      .demo-stat__title {
        font-size: 0.85rem;
        opacity: 0.75;
      }
      .demo-stat__value {
        font-size: 1.75rem;
        font-weight: 700;
      }
    `,
  ],
})
export class DemoStatsComponent {
  @Input() title = '';
  @Input() value = '0';
}

/**
 * @description Simple list demo component.
 * @summary Renders a titled list of items. Dashboard palette entry with a 2x2
 * default footprint.
 * @class DemoListComponent
 * @memberOf module:pages/dashboard-builder/demo/demo-components
 */
@dashcomponent('demo-list', {
  label: 'dashboard.demo.list',
  defaultSize: { cols: 2, rows: 2 },
})
@Dynamic()
@Component({
  standalone: true,
  selector: 'demo-list',
  template: `
    <div class="demo-list">
      <h4 class="demo-list__title">{{ title || '—' }}</h4>
      <ul class="demo-list__items">
        @for (item of items; track item) {
          <li>{{ item }}</li>
        }
      </ul>
    </div>
  `,
  styles: [
    `
      .demo-list {
        padding: 1rem;
        height: 100%;
      }
      .demo-list__title {
        margin: 0 0 0.5rem;
        font-size: 1rem;
      }
      .demo-list__items {
        margin: 0;
        padding-left: 1.1rem;
        font-size: 0.9rem;
      }
    `,
  ],
})
export class DemoListComponent {
  @Input() title = '';
  @Input() items: string[] = [];
}

/**
 * @description Free-form note demo component.
 * @summary Renders a single note string. Dashboard palette entry with a 1x1
 * default footprint.
 * @class DemoNoteComponent
 * @memberOf module:pages/dashboard-builder/demo/demo-components
 */
@dashcomponent('demo-note', {
  label: 'dashboard.demo.note',
  defaultSize: { cols: 1, rows: 1 },
})
@Dynamic()
@Component({
  standalone: true,
  selector: 'demo-note',
  template: `
    <div class="demo-note">
      <p class="demo-note__text">{{ note || '—' }}</p>
    </div>
  `,
  styles: [
    `
      .demo-note {
        padding: 1rem;
        height: 100%;
      }
      .demo-note__text {
        margin: 0;
        font-size: 0.9rem;
      }
    `,
  ],
})
export class DemoNoteComponent {
  @Input() note = '';
}
