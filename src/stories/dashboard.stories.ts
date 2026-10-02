import { Component, Input, inject } from '@angular/core';
import { CrudOperations, OperationKeys } from '@decaf-ts/db-decorators';
import { dashcomponent } from '@decaf-ts/ui-decorators';
import { IonButton } from '@ionic/angular/standalone';
import type { Meta, StoryObj } from '@storybook/angular';
import { userEvent, waitFor } from 'storybook/test';
import { CardComponent } from 'src/lib/components/card/card.component';
import {
  DashComponentCatalogService,
  DashboardComponent,
  type DashDocument,
  type DashPlacement,
} from 'src/lib/components/dashboard';
import { IconComponent } from 'src/lib/components/icon/icon.component';
import { LayoutComponent } from 'src/lib/components/layout/layout.component';
import { ModelRendererComponent } from 'src/lib/components/model-renderer/model-renderer.component';
import { Dynamic } from 'src/lib/engine';
import './setup';
import { getComponentMeta } from './utils';

/**
 * Storybook-local simulated palette for the editable dashboard.
 *
 * `DashboardComponent` resolves its palette from the `@dashcomponent()` registry
 * through `DashComponentCatalogService`. These mock, `@Dynamic()`-registered display
 * components are the "registered dash components" the dashboard renders; the harness
 * registers them explicitly so the injected catalog singleton always sees them
 * regardless of how the story bundle is split.
 */

/**
 * Stat card palette component (1x1 default footprint).
 */
@dashcomponent('ngx-decaf-story-metric', {
  label: 'sb.dashboard.metric',
  defaultSize: { cols: 1, rows: 1 },
})
@Dynamic()
@Component({
  standalone: true,
  selector: 'ngx-decaf-story-metric',
  template: `
    <div class="sb-dash-metric">
      <span class="sb-dash-metric__title">{{ title || 'Metric' }}</span>
      <span class="sb-dash-metric__value">{{ value }}</span>
    </div>
  `,
  styles: [
    `
      .sb-dash-metric {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        padding: 0.75rem;
        height: 100%;
      }
      .sb-dash-metric__title {
        font-size: 0.75rem;
        opacity: 0.7;
      }
      .sb-dash-metric__value {
        font-size: 1.5rem;
        font-weight: 700;
      }
    `,
  ],
})
class StoryMetricComponent {
  @Input() title = '';
  @Input() value = '0';
}

/**
 * Chart palette component (2x2 default footprint).
 */
@dashcomponent('ngx-decaf-story-chart', {
  label: 'sb.dashboard.chart',
  defaultSize: { cols: 2, rows: 2 },
})
@Dynamic()
@Component({
  standalone: true,
  selector: 'ngx-decaf-story-chart',
  template: `
    <div class="sb-dash-chart">
      <span class="sb-dash-chart__title">{{ title || 'Chart' }}</span>
      <div class="sb-dash-chart__bars">
        @for (bar of bars; track $index) {
          <span class="sb-dash-chart__bar" [style.height.%]="bar"></span>
        }
      </div>
    </div>
  `,
  styles: [
    `
      .sb-dash-chart {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        padding: 0.75rem;
        height: 100%;
      }
      .sb-dash-chart__title {
        font-size: 0.75rem;
        opacity: 0.7;
      }
      .sb-dash-chart__bars {
        display: flex;
        align-items: flex-end;
        gap: 4px;
        height: 100%;
        min-height: 40px;
      }
      .sb-dash-chart__bar {
        flex: 1;
        background: var(--dcf-primary, #5b8def);
        border-radius: 2px 2px 0 0;
      }
    `,
  ],
})
class StoryChartComponent {
  @Input() title = '';
  @Input() bars: number[] = [40, 70, 55, 90];
}

/**
 * Titled list palette component (2x1 default footprint).
 */
@dashcomponent('ngx-decaf-story-list', {
  label: 'sb.dashboard.list',
  defaultSize: { cols: 2, rows: 1 },
})
@Dynamic()
@Component({
  standalone: true,
  selector: 'ngx-decaf-story-list',
  template: `
    <div class="sb-dash-list">
      <h4 class="sb-dash-list__title">{{ title || 'List' }}</h4>
      <ul class="sb-dash-list__items">
        @for (item of items; track item) {
          <li>{{ item }}</li>
        }
      </ul>
    </div>
  `,
  styles: [
    `
      .sb-dash-list {
        padding: 0.75rem;
        height: 100%;
      }
      .sb-dash-list__title {
        margin: 0 0 0.35rem;
        font-size: 0.9rem;
      }
      .sb-dash-list__items {
        margin: 0;
        padding-left: 1.1rem;
        font-size: 0.8rem;
      }
    `,
  ],
})
class StoryListComponent {
  @Input() title = '';
  @Input() items: string[] = [];
}

/**
 * Free-form note palette component (1x1 default footprint).
 */
@dashcomponent('ngx-decaf-story-note', {
  label: 'sb.dashboard.note',
  defaultSize: { cols: 1, rows: 1 },
})
@Dynamic()
@Component({
  standalone: true,
  selector: 'ngx-decaf-story-note',
  template: `
    <div class="sb-dash-note">
      <p class="sb-dash-note__text">{{ note || 'Note' }}</p>
    </div>
  `,
  styles: [
    `
      .sb-dash-note {
        padding: 0.75rem;
        height: 100%;
      }
      .sb-dash-note__text {
        margin: 0;
        font-size: 0.8rem;
      }
    `,
  ],
})
class StoryNoteComponent {
  @Input() note = '';
}

/**
 * Dashboard story host.
 *
 * Wraps `DashboardComponent` in a simulated palette/registry harness: it injects
 * the singleton `DashComponentCatalogService` and registers the mock palette
 * components before the dashboard initialises, then binds every dashboard input and
 * surfaces the `save`/`deleted` outputs so they are inspectable.
 */
@Component({
  selector: 'ngx-decaf-story-dashboard',
  standalone: true,
  imports: [DashboardComponent],
  template: `
    <section class="sb-dashboard">
      <header class="sb-dashboard__bar">
        <span class="sb-dashboard__mode">{{ operation }}</span>
        <span class="sb-dashboard__event" data-testid="dashboard-event">
          {{ lastEvent || 'no event yet' }}
        </span>
      </header>
      <ngx-decaf-dashboard
        [cols]="cols"
        [rows]="rows"
        [document]="document"
        [operation]="operation"
        (save)="onSave($event)"
        (deleted)="onDeleted()"
      ></ngx-decaf-dashboard>
    </section>
  `,
  styles: [
    `
      .sb-dashboard {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }
      .sb-dashboard__bar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.35rem 0.5rem;
        border-radius: 6px;
        background: #eef3f8;
        font-family: monospace;
        font-size: 0.75rem;
      }
      .sb-dashboard__mode {
        text-transform: uppercase;
        font-weight: 700;
        letter-spacing: 0.04em;
      }
    `,
  ],
})
class DashboardStoryHostComponent {
  @Input() cols = 4;
  @Input() rows = 4;
  @Input() document?: DashDocument;
  @Input() operation: CrudOperations = OperationKeys.CREATE;

  lastEvent = '';

  private readonly catalog = inject(DashComponentCatalogService);

  constructor() {
    this.catalog.register(StoryMetricComponent);
    this.catalog.register(StoryChartComponent);
    this.catalog.register(StoryListComponent);
    this.catalog.register(StoryNoteComponent);
  }

  onSave(doc: DashDocument): void {
    this.lastEvent = `save: ${doc.name} (${doc.placements.length} placement(s), ${doc.cols}x${doc.rows})`;
  }

  onDeleted(): void {
    this.lastEvent = 'deleted';
  }
}

function placement(partial: Partial<DashPlacement> & Pick<DashPlacement, 'id' | 'tag'>): DashPlacement {
  return {
    col: 1,
    row: 1,
    cols: 1,
    rows: 1,
    config: {},
    ...partial,
  };
}

/**
 * Realistic sample composition used by the document stories: several placements
 * with varied col/row spans, matching the mock palette footprints.
 */
const SAMPLE_DOCUMENT: DashDocument = {
  name: 'OpsOverview',
  cols: 4,
  rows: 4,
  placements: [
    placement({ id: 'kpi-revenue', tag: 'ngx-decaf-story-metric', labelKey: 'sb.dashboard.metric', col: 1, row: 1, cols: 1, rows: 1, config: { title: 'Revenue', value: '128k' } }),
    placement({ id: 'kpi-churn', tag: 'ngx-decaf-story-metric', labelKey: 'sb.dashboard.metric', col: 2, row: 1, cols: 1, rows: 1, config: { title: 'Churn', value: '2.4%' } }),
    placement({ id: 'trend-chart', tag: 'ngx-decaf-story-chart', labelKey: 'sb.dashboard.chart', col: 3, row: 1, cols: 2, rows: 2, config: { title: 'Weekly trend', bars: [30, 55, 80, 45, 90, 65] } }),
    placement({ id: 'activity-list', tag: 'ngx-decaf-story-list', labelKey: 'sb.dashboard.list', col: 1, row: 2, cols: 2, rows: 2, config: { title: 'Recent activity', items: ['Deploy 42', 'New signup', 'Invoice paid'] } }),
    placement({ id: 'team-note', tag: 'ngx-decaf-story-note', labelKey: 'sb.dashboard.note', col: 3, row: 3, cols: 1, rows: 2, config: { note: 'Remember to review the weekly report.' } }),
  ],
};

const DENSE_DOCUMENT: DashDocument = {
  name: 'DenseOperations',
  cols: 6,
  rows: 3,
  placements: [
    placement({ id: 'd-metric-a', tag: 'ngx-decaf-story-metric', col: 1, row: 1, cols: 1, rows: 1, config: { title: 'Uptime', value: '99.9%' } }),
    placement({ id: 'd-metric-b', tag: 'ngx-decaf-story-metric', col: 2, row: 1, cols: 1, rows: 1, config: { title: 'Latency', value: '84ms' } }),
    placement({ id: 'd-metric-c', tag: 'ngx-decaf-story-metric', col: 3, row: 1, cols: 1, rows: 1, config: { title: 'Errors', value: '12' } }),
    placement({ id: 'd-chart', tag: 'ngx-decaf-story-chart', col: 4, row: 1, cols: 3, rows: 3, config: { title: 'Throughput', bars: [20, 40, 60, 80] } }),
    placement({ id: 'd-list', tag: 'ngx-decaf-story-list', col: 1, row: 2, cols: 3, rows: 2, config: { title: 'Queues', items: ['ingest', 'transform', 'publish'] } }),
  ],
};

/**
 * Document with one unknown tag to exercise the palette whitelist (AC-12):
 * `ngx-decaf-story-unknown` is not registered and must be dropped on restore.
 */
const UNKNOWN_TAG_DOCUMENT: DashDocument = {
  name: 'UntrustedComposition',
  cols: 4,
  rows: 2,
  placements: [
    placement({ id: 'known-note', tag: 'ngx-decaf-story-note', col: 1, row: 1, cols: 2, rows: 1, config: { note: 'Trusted widget' } }),
    placement({ id: 'unknown-widget', tag: 'ngx-decaf-story-unknown', col: 3, row: 1, cols: 2, rows: 1, config: { note: 'Untrusted widget' } }),
  ],
};

const MATRIX = `
### Configuration matrix

| Story | cols | rows | document | operation | outputs exercised |
| --- | --- | --- | --- | --- | --- |
| CreateEmpty | 4 | 4 | – | create | – |
| CreateCompactGrid | 2 | 2 | – | create | – |
| CreateWideGrid | 6 | 3 | – | create | – |
| CreateTallGrid | 2 | 6 | – | create | – |
| UpdateWithDocument | 4 | 4 | sample (5 placements) | update | – |
| CreateWithDocument | 4 | 4 | sample (5 placements) | create | – |
| DenseDocument | 6 | 3 | dense (5 placements) | create | – |
| SinglePlacement | 4 | 4 | 1 placement | create | – |
| FullGridDocument | 4 | 4 | fills grid | create | – |
| UntrustedDocumentFiltered | 4 | 2 | unknown tag | create | – |
| ReadWithDocument | 4 | 4 | sample | read | – |
| DeleteConfirmation | 4 | 4 | sample | delete | deleted |
| SaveEvent | 4 | 4 | sample | create | save |
| DeletedEvent | 4 | 4 | sample | delete | deleted |
`;

const component = getComponentMeta<DashboardStoryHostComponent>([
  DashboardComponent,
  LayoutComponent,
  ModelRendererComponent,
  IconComponent,
  CardComponent,
  IonButton,
]);

const meta: Meta<DashboardStoryHostComponent> = {
  title: 'Components/Dashboard',
  component: DashboardStoryHostComponent,
  ...component,
  parameters: {
    docs: {
      description: {
        component: MATRIX,
      },
    },
  },
  argTypes: {
    ...component.argTypes,
    operation: {
      control: 'select',
      options: [OperationKeys.CREATE, OperationKeys.UPDATE, OperationKeys.READ, OperationKeys.DELETE],
    },
    document: { control: 'object' },
  },
  args: {
    cols: 4,
    rows: 4,
    operation: OperationKeys.CREATE,
    document: undefined,
  },
};
export default meta;
type Story = StoryObj<DashboardStoryHostComponent>;

export const CreateEmpty: Story = {};

export const CreateCompactGrid: Story = {
  args: { cols: 2, rows: 2 },
};

export const CreateWideGrid: Story = {
  args: { cols: 6, rows: 3 },
};

export const CreateTallGrid: Story = {
  args: { cols: 2, rows: 6 },
};

export const CreateWithDocument: Story = {
  args: { document: SAMPLE_DOCUMENT },
};

export const UpdateWithDocument: Story = {
  args: { operation: OperationKeys.UPDATE, document: SAMPLE_DOCUMENT },
};

export const DenseDocument: Story = {
  args: { cols: 6, rows: 3, document: DENSE_DOCUMENT },
};

export const SinglePlacement: Story = {
  args: {
    document: {
      name: 'Single',
      cols: 4,
      rows: 4,
      placements: [
        placement({ id: 'only-note', tag: 'ngx-decaf-story-note', col: 2, row: 2, cols: 2, rows: 2, config: { note: 'Only placement' } }),
      ],
    },
  },
};

export const FullGridDocument: Story = {
  args: {
    document: {
      name: 'FullGrid',
      cols: 2,
      rows: 2,
      placements: [
        placement({ id: 'fill-a', tag: 'ngx-decaf-story-metric', col: 1, row: 1, cols: 1, rows: 1, config: { title: 'A', value: '1' } }),
        placement({ id: 'fill-b', tag: 'ngx-decaf-story-metric', col: 2, row: 1, cols: 1, rows: 1, config: { title: 'B', value: '2' } }),
        placement({ id: 'fill-c', tag: 'ngx-decaf-story-metric', col: 1, row: 2, cols: 1, rows: 1, config: { title: 'C', value: '3' } }),
        placement({ id: 'fill-d', tag: 'ngx-decaf-story-metric', col: 2, row: 2, cols: 1, rows: 1, config: { title: 'D', value: '4' } }),
      ],
    },
  },
};

export const UntrustedDocumentFiltered: Story = {
  args: { document: UNKNOWN_TAG_DOCUMENT },
};

export const ReadWithDocument: Story = {
  args: { operation: OperationKeys.READ, document: SAMPLE_DOCUMENT },
};

export const DeleteConfirmation: Story = {
  args: { operation: OperationKeys.DELETE, document: SAMPLE_DOCUMENT },
};

export const SaveEvent: Story = {
  args: { document: SAMPLE_DOCUMENT },
  play: async ({ canvasElement }) => {
    const saveButton = canvasElement.querySelector<HTMLElement>('.ngx-dashboard__actions ion-button');
    if (!saveButton) throw new Error('Expected a save button, found none');
    await userEvent.click(saveButton);
    await waitFor(() => {
      const event = canvasElement.querySelector<HTMLElement>('[data-testid="dashboard-event"]');
      if (!event || !event.textContent?.includes('save:')) {
        throw new Error(`Expected a save event, received "${event?.textContent ?? 'nothing'}"`);
      }
    });
  },
};

export const DeletedEvent: Story = {
  args: { operation: OperationKeys.DELETE, document: SAMPLE_DOCUMENT },
  play: async ({ canvasElement }) => {
    const deleteButton = canvasElement.querySelector<HTMLElement>('.ngx-dashboard--delete ion-button[color="danger"]');
    if (!deleteButton) throw new Error('Expected a delete button, found none');
    await userEvent.click(deleteButton);
    await waitFor(() => {
      const event = canvasElement.querySelector<HTMLElement>('[data-testid="dashboard-event"]');
      if (!event || !event.textContent?.includes('deleted')) {
        throw new Error(`Expected a deleted event, received "${event?.textContent ?? 'nothing'}"`);
      }
    });
  },
};
