/**
 * @module charts/lib/charts/base-chart.component
 * @description ECharts-backed CRD chart components for the charts entry point.
 * @summary `BaseChartComponent` is the layout-component base class every chart
 * family extends; the per-family wrappers only pin the chart type. Rendering is
 * delegated to the pure option builders in `charts/lib/charts/chart-options` so
 * the mapping stays testable without a DOM.
 */

import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  NgZone,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges,
  ViewChild,
  inject,
} from '@angular/core';
import { OperationKeys } from '@decaf-ts/db-decorators';
import { Model } from '@decaf-ts/decorator-validation';
import { ComponentEventNames } from '@decaf-ts/ui-decorators';
import {
  Dynamic,
  IBaseCustomEvent,
  ICrudFormEvent,
  ModelRendererComponent,
  NgxFormDirective,
} from '@decaf-ts/for-angular';
import * as echarts from 'echarts';
import type { ECharts } from 'echarts';
import { buildChartConfigModel, toPlainChartConfig } from './chart-config.models';
import { buildChartOption, normalizeChartConfig } from './chart-options';
import type { ChartConfig, ChartConfigInput, ChartRow, ChartType } from './chart.types';
import {
  ChartDatasetBinding,
  VirtualDatasetQuery,
  isChartDatasetSource,
  toChartRows,
} from './virtual-dataset';

/** Chart family rendered when `ngx-decaf-chart` is used directly. */
const DEFAULT_CHART_TYPE: ChartType = 'line';

/**
 * @description Base class for the chart layout components.
 * @summary A CRD-aware, ECharts-backed chart component. In `READ` mode it renders
 * the chart from its dataset; in `CREATE`/`UPDATE` mode it additionally renders the
 * family's decorated configuration model through `ngx-decaf-model-renderer` and
 * applies the submitted configuration. Chart work runs outside the Angular zone
 * and the ECharts instance is disposed on destroy.
 * @class BaseChartComponent
 * @memberOf module:charts/lib/charts/base-chart.component
 */
@Dynamic()
@Component({
  selector: 'ngx-decaf-chart',
  templateUrl: './base-chart.component.html',
  styleUrls: ['./base-chart.component.scss'],
  imports: [ModelRendererComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
})
export class BaseChartComponent
  extends NgxFormDirective
  implements OnInit, AfterViewInit, OnDestroy
{
  /** Current chart configuration (plain object or decorated model instance). */
  @Input()
  config?: ChartConfigInput;

  /**
   * Dataset binding: either a `VirtualDataset` to sub-query or an already
   * narrowed view to execute.
   */
  @Input()
  dataset?: ChartDatasetBinding;

  /** Sub-query applied when `dataset` is a {@link VirtualDataset}. */
  @Input()
  datasetQuery: VirtualDatasetQuery = {};

  /** Direct rows; when supplied they take precedence over `dataset`. */
  @Input()
  data?: readonly unknown[];

  /** Canvas height; numbers are treated as pixels. */
  @Input()
  height: number | string = 320;

  /** Emits the effective configuration after a create/update submission. */
  @Output()
  configChanged: EventEmitter<ChartConfig> = new EventEmitter<ChartConfig>();

  /** Emits dataset loading or rendering failures. */
  @Output()
  chartError: EventEmitter<unknown> = new EventEmitter<unknown>();

  /**
   * The chart family implemented by the concrete wrapper. The base component
   * defaults to `line` so it can be used directly through `ngx-decaf-chart`.
   */
  protected get chartType(): ChartType {
    return DEFAULT_CHART_TYPE;
  }

  /** Canvas element the ECharts instance renders into. */
  @ViewChild('canvas', { static: true })
  protected canvas?: ElementRef<HTMLElement>;

  /** Decorated configuration model rendered in create/update mode. */
  protected configModel?: Model;

  /** Normalised rows currently rendered. */
  protected chartRows: ChartRow[] = [];

  /** Stable globals object passed to the nested model renderer. */
  protected rendererGlobals: Record<string, unknown> = {};

  /** The lazily created ECharts instance, created outside the Angular zone. */
  protected chart?: ECharts;

  private readonly ngZone: NgZone = inject(NgZone);

  private resizeObserver?: ResizeObserver;

  private loadToken = 0;

  /**
   * @description Whether the component is in a form-editing operation.
   * @returns true for `CREATE` and `UPDATE`.
   */
  get isEditing(): boolean {
    return this.operation === OperationKeys.CREATE || this.operation === OperationKeys.UPDATE;
  }

  /**
   * @description Accessible label for the rendered chart.
   * @returns the configured title or a generated `"<type> chart"` label.
   */
  get ariaLabel(): string {
    const title = (this.resolvedConfig as ChartConfig & { title?: string }).title;
    return title || `${this.chartType} chart`;
  }

  /**
   * @description The effective configuration, defaults merged in.
   * @returns the normalised plain configuration.
   */
  get resolvedConfig(): ChartConfig {
    return normalizeChartConfig(this.chartType, this.config);
  }

  /**
   * @description Initializes the component and loads the initial dataset.
   * @returns a promise resolved once initialization and the first load settle.
   */
  async ngOnInit(): Promise<void> {
    this.syncRendererGlobals();
    this.configModel = buildChartConfigModel(this.chartType, this.config);
    await super.initialize();
    await this.loadData();
  }

  /**
   * @description Starts observing canvas size and renders the first chart.
   * @returns nothing.
   */
  override async ngAfterViewInit(): Promise<void> {
    if (this.canvas && typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.chart?.resize());
      this.resizeObserver.observe(this.canvas.nativeElement);
    }
    this.renderChart();
    await super.ngAfterViewInit();
  }

  /**
   * @description Reacts to input changes after the first initialization.
   * @param changes the Angular change set.
   * @returns a promise resolved once the reload settles.
   */
  override async ngOnChanges(changes: SimpleChanges): Promise<void> {
    await super.ngOnChanges(changes);
    if (!this.initialized) return;

    if (changes['operation']) this.syncRendererGlobals();
    if (changes['config']) {
      this.configModel = buildChartConfigModel(this.chartType, this.config);
      this.renderChart();
    }
    if (changes['data'] || changes['dataset'] || changes['datasetQuery']) {
      await this.loadData();
    }
  }

  /**
   * @description Disposes the ECharts instance and the resize observer.
   * @returns a promise resolved once the parent cleanup settles.
   */
  override async ngOnDestroy(): Promise<void> {
    this.resizeObserver?.disconnect();
    this.resizeObserver = undefined;
    this.chart?.dispose();
    this.chart = undefined;
    await super.ngOnDestroy();
  }

  /**
   * @description Routes events emitted by the nested configuration form.
   * @summary `submit` events apply the new configuration; every other event is
   * forwarded through `listenEvent` for the rendering engine.
   * @param event the child event.
   * @returns a promise resolved once the event is handled.
   */
  override async handleEvent(event: IBaseCustomEvent | ICrudFormEvent): Promise<void> {
    if (event.name === ComponentEventNames.Submit) {
      this.applyConfig(event.data as unknown);
      return;
    }
    this.listenEvent.emit(event);
  }

  /**
   * @description Resolves and renders the current dataset.
   * @returns a promise resolved once rows are rendered.
   */
  protected async loadData(): Promise<void> {
    const token = ++this.loadToken;
    try {
      const rows = await this.resolveRows();
      if (token !== this.loadToken) return;
      this.chartRows = toChartRows(rows);
      this.renderChart();
    } catch (error: unknown) {
      if (token !== this.loadToken) return;
      this.chartError.emit(error);
    }
  }

  /**
   * @description Resolves the rows for the current inputs.
   * @returns the direct rows, the executed view rows, or the executed sub-query.
   */
  protected async resolveRows(): Promise<readonly unknown[]> {
    if (this.data !== undefined) return this.data;
    if (!this.dataset) return [];
    if (isChartDatasetSource(this.dataset)) {
      return await this.dataset.subQuery(this.datasetQuery).execute();
    }
    return await this.dataset.execute();
  }

  /**
   * @description Applies a configuration submitted by the nested form.
   * @param data the submitted form data.
   * @returns nothing.
   */
  protected applyConfig(data: unknown): void {
    const next = {
      ...this.resolvedConfig,
      ...toPlainChartConfig(data as ChartConfigInput),
    };
    this.config = next;
    this.configModel = buildChartConfigModel(this.chartType, next);
    this.configChanged.emit(next);
    this.submitEventEmit(next, this.componentName);
    this.changeDetectorRef.markForCheck();
    this.renderChart();
  }

  /**
   * @description Renders the current configuration and rows into the canvas.
   * @summary Lazily creates the ECharts instance outside the Angular zone.
   * @returns nothing.
   */
  protected renderChart(): void {
    if (!this.canvas) return;
    const element = this.canvas.nativeElement;
    this.ngZone.runOutsideAngular(() => {
      if (!this.chart) this.chart = echarts.init(element);
      this.chart.setOption(buildChartOption(this.chartType, this.config, this.chartRows), true);
      this.chart.resize();
    });
  }

  /**
   * @description Keeps the stable renderer globals in sync with `operation`.
   * @returns nothing.
   */
  private syncRendererGlobals(): void {
    this.rendererGlobals = { operation: this.operation };
  }
}
