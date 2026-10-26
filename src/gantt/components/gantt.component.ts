import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  PLATFORM_ID,
  ViewEncapsulation,
  afterEveryRender,
  afterNextRender,
  computed,
  contentChild,
  effect,
  inject,
  input,
  model,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { NgTemplateOutlet, isPlatformBrowser } from '@angular/common';
import {
  GANTT_GLOBAL_CONFIG,
  GanttConfigService,
  GanttI18nLocale,
  NgxGanttComponent,
  NgxGanttModule,
  deDeLocale,
  defaultConfig,
  enUsLocale,
  jaJpLocale,
  ruRuLocale,
  zhHansLocale,
  zhHantLocale,
} from '@worktile/gantt';
import type { GanttI18nLocaleConfig } from '@worktile/gantt';
import type {
  GanttBarClickEvent,
  GanttDragEvent,
  GanttSelectedEvent,
  GanttViewType,
} from '@worktile/gantt';

import {
  addGanttDays,
  ganttDateOnly,
  normalizeGanttDate,
  sameGanttInstant,
  startOfGanttDay,
  toGanttDateRange,
  validateGanttModel,
  GANTT_VIEW_SCALES,
  type GanttBarTemplateContext,
  type GanttConfig,
  type GanttDateChangeMode,
  type GanttDateChangeReason,
  type GanttDateChangeRejectionReason,
  type GanttDateInput,
  type GanttDependencyType,
  type GanttModelIssue,
  type GanttProgressChangeReason,
  type GanttProgressChangeRejectionReason,
  type GanttTaskDateChangeEvent,
  type GanttTaskDateChangeRejectedEvent,
  type GanttTaskDateRange,
  type GanttTaskDetailTemplateContext,
  type GanttTaskProgressChangeEvent,
  type GanttTaskProgressChangeRejectedEvent,
  type GanttTaskSelectionEvent,
  type GanttViewScale,
} from './gantt.types';
import {
  buildGanttMapping,
  ganttViewScale,
  ganttViewType,
  type GanttMappedTask,
  type GanttTaskOrigin,
} from './gantt-mapping';
import {
  GanttBarDirective,
  GanttEmptyDirective,
  GanttTaskDetailDirective,
} from './gantt-template.directives';

const VIEW_LABELS: Record<GanttViewScale, string> = {
  day: 'Day',
  week: 'Week',
  month: 'Month',
  quarter: 'Quarter',
  year: 'Year',
};

function ganttDayOrdinal(value: Date): number {
  return Math.floor(
    Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()) / 86_400_000,
  );
}

/**
 * Standalone Gantt timeline over `@worktile/gantt`, driven by a typed
 * {@link GanttConfig} projection of host tasks.
 *
 * The component is fully controlled: it never mutates host data. Date and
 * progress changes are emitted as accepted events
 * ({@link GanttTaskDateChangeEvent}, {@link GanttTaskProgressChangeEvent}) or
 * rejections ({@link GanttTaskDateChangeRejectedEvent},
 * {@link GanttTaskProgressChangeRejectedEvent}) with machine-readable reasons;
 * dependency violations detected during drags are reported the same way. Model
 * problems found while mapping are emitted through `modelIssuesChange`.
 *
 * Rendering can be customized through the `*decafGanttBar`,
 * `*decafGanttTaskDetail` and `*decafGanttEmpty` template directives; the
 * toolbar exposes the timeline scale ({@link GanttViewScale}) as a two-way
 * bound model.
 *
 * @example
 * ```html
 * <decaf-gantt
 *   [items]="tasks"
 *   [config]="ganttConfig"
 *   [(viewType)]="scale"
 *   (taskDateChanged)="reschedule($event)"
 *   (taskDateChangeRejected)="announce($event.reason)"
 *   (taskSelected)="select($event.task)">
 *   <ng-template decafGanttTaskDetail let-task>{{ task.title }}</ng-template>
 * </decaf-gantt>
 * ```
 *
 * @mermaid
 * sequenceDiagram
 *   participant Host as Host application
 *   participant Gantt as GanttComponent
 *   participant Ngx as @worktile/gantt
 *   Host->>Gantt: items / config inputs
 *   Gantt->>Gantt: validateGanttModel + buildGanttMapping
 *   Gantt->>Ngx: mapped tasks + view scale
 *   Gantt->>Host: modelIssuesChange (if any)
 *   Host->>Ngx: drags/resizes bar
 *   Ngx->>Gantt: drag event
 *   alt change accepted
 *     Gantt->>Host: taskDateChanged / taskProgressChanged
 *   else change refused
 *     Gantt->>Host: ...Rejected (reason)
 *   end
 *
 * @template T - Host task type rendered on the timeline.
 * @category Gantt
 */
@Component({
  selector: 'decaf-gantt',
  standalone: true,
  imports: [NgTemplateOutlet, NgxGanttModule],
  providers: [
    {
      provide: GANTT_GLOBAL_CONFIG,
      useFactory: () =>
        inject(GANTT_GLOBAL_CONFIG, { optional: true, skipSelf: true }) ??
        defaultConfig,
    },
  ],
  templateUrl: './gantt.component.html',
  styleUrl: './gantt.component.scss',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GanttComponent<T = unknown> {
  private static instanceCounter = 0;

  readonly items = input<readonly T[]>([]);
  readonly config = input.required<GanttConfig<T>>();
  readonly selectedId = input<string | null>(null);
  // eslint-disable-next-line @angular-eslint/no-input-rename -- `readonly` is the documented template binding
  readonly readOnly = input(false, { alias: 'readonly' });
  readonly disabled = input(false);
  readonly loading = input(false);
  readonly error = input<string | null>(null);
  readonly viewType = model<GanttViewScale>('week');
  readonly start = input<GanttDateInput | null>(null);
  readonly end = input<GanttDateInput | null>(null);
  readonly showToolbar = input(true);
  readonly draggable = input(true);
  readonly selectable = input(true);
  readonly showTodayLine = input(true);
  readonly sideWidth = input(280);
  readonly label = input('Gantt');
  readonly emptyLabel = input('No tasks to display');
  readonly loadingLabel = input('Loading timeline');
  readonly retryLabel = input('Retry');
  readonly taskColumnLabel = input('Task');
  readonly progressColumnLabel = input('Progress');
  readonly toolbarLabel = input('Timeline scale');
  readonly keyboardHelp = input(
    'Focus a task bar, then press Enter or Space to select, E to edit, Alt+Arrow to move, Alt+Shift+Arrow to resize, or [ and ] to change progress.',
  );
  readonly instanceId = input<string | null>(null);
  readonly viewTypeLabels = input<Partial<Record<GanttViewScale, string>>>({});

  readonly taskSelected = output<GanttTaskSelectionEvent<T>>();
  readonly taskEditRequested = output<GanttTaskSelectionEvent<T>>();
  readonly taskDateChanged = output<GanttTaskDateChangeEvent<T>>();
  readonly taskDateChangeRejected =
    output<GanttTaskDateChangeRejectedEvent<T>>();
  readonly taskProgressChanged = output<GanttTaskProgressChangeEvent<T>>();
  readonly taskProgressChangeRejected =
    output<GanttTaskProgressChangeRejectedEvent<T>>();
  readonly modelIssuesChange = output<readonly GanttModelIssue[]>();
  readonly retryRequested = output<void>();

  readonly barTemplate = contentChild(GanttBarDirective);
  readonly detailTemplate = contentChild(GanttTaskDetailDirective);
  readonly emptyTemplate = contentChild(GanttEmptyDirective);

  private readonly ganttView = viewChild(NgxGanttComponent);
  private readonly configService = inject(GanttConfigService);
  private readonly host = inject(ElementRef) as ElementRef<HTMLElement>;
  private readonly injector = inject(Injector);
  private readonly revision = signal(0);
  private readonly fallbackId = `dcf-gantt-${++GanttComponent.instanceCounter}`;
  private dragState: {
    taskId: string;
    previous: GanttTaskDateRange;
  } | null = null;

  readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  protected readonly viewScales = GANTT_VIEW_SCALES;
  protected readonly announcement = signal('');
  protected readonly editing = signal<GanttMappedTask<T> | null>(null);

  protected readonly mapping = computed(() =>
    buildGanttMapping(this.items(), this.config(), {
      draggable: this.draggable() && this.isEditable(),
      revision: this.revision(),
    }),
  );
  protected readonly issues = computed(() =>
    validateGanttModel(this.items(), this.config()),
  );
  protected readonly mappedItems = computed(() => this.mapping().items);
  protected readonly hasTasks = computed(() => this.mapping().taskCount > 0);
  protected readonly isEditable = computed(
    () => !this.readOnly() && !this.disabled() && !this.loading(),
  );
  protected readonly isBusy = computed(
    () => this.loading() || this.disabled(),
  );
  protected readonly vendorViewType = computed(() =>
    ganttViewType(this.viewType()),
  );
  protected readonly resolvedInstanceId = computed(
    () => this.instanceId()?.trim() || this.fallbackId,
  );
  protected readonly helpId = computed(
    () => `${this.resolvedInstanceId()}-help`,
  );
  protected readonly timelineStart = computed<Date>(() => {
    const requested = normalizeGanttDate(this.start());
    if (requested) return requested;
    const automatic = this.mapping().timelineStart;
    if (automatic) return automatic;
    return addGanttDays(startOfGanttDay(new Date()), -7);
  });
  protected readonly timelineEnd = computed<Date>(() => {
    const requested = normalizeGanttDate(this.end());
    if (requested) return requested;
    const automatic = this.mapping().timelineEnd;
    if (automatic) return automatic;
    return addGanttDays(startOfGanttDay(new Date()), 14);
  });
  protected readonly taskColumnWidth = computed(() =>
    Math.max(120, this.sideWidth() - 96),
  );
  protected readonly timelineStartMs = computed(
    () => this.timelineStart().getTime(),
  );
  protected readonly timelineEndMs = computed(
    () => this.timelineEnd().getTime(),
  );

  constructor() {
    const locales = this.configService as unknown as {
      i18nLocales: Record<string, GanttI18nLocaleConfig>;
    };
    locales.i18nLocales = {
      ...locales.i18nLocales,
      [GanttI18nLocale.enUs]: enUsLocale,
      [GanttI18nLocale.deDe]: deDeLocale,
      [GanttI18nLocale.jaJp]: jaJpLocale,
      [GanttI18nLocale.ruRu]: ruRuLocale,
      [GanttI18nLocale.zhHans]: zhHansLocale,
      [GanttI18nLocale.zhHant]: zhHantLocale,
    };
    this.configService.setLocale(GanttI18nLocale.enUs);

    afterEveryRender(() => {
      if (this.isBrowser) this.decorateBars();
    });

    effect(() => {
      const selectedId = this.selectedId();
      const gantt = this.ganttView();
      if (!this.isBrowser || !gantt) return;
      if (selectedId && this.mapping().byId.has(selectedId)) {
        if (!gantt.selectionModel.isSelected(selectedId)) {
          gantt.selectionModel.clear();
          gantt.selectionModel.select(selectedId);
        }
      } else if (gantt.selectionModel.hasValue()) {
        gantt.selectionModel.clear();
      }
    });

    effect(() => {
      this.modelIssuesChange.emit(this.issues());
    });

    effect(() => {
      const editing = this.editing();
      if (editing && !this.mapping().byId.has(editing.taskId)) {
        this.editing.set(null);
      }
    });
  }

  protected viewLabel(scale: GanttViewScale): string {
    return this.viewTypeLabels()[scale] ?? VIEW_LABELS[scale];
  }

  protected setViewType(scale: GanttViewScale): void {
    if (this.isBusy() || this.viewType() === scale) return;
    this.viewType.set(scale);
    this.announce(`${this.viewLabel(scale)} scale`);
  }

  protected onVendorViewTypeChange(type: GanttViewType): void {
    const scale = ganttViewScale(type);
    if (scale && this.viewType() !== scale) {
      this.viewType.set(scale);
      this.announce(`${this.viewLabel(scale)} scale`);
    }
  }

  protected onSelectionChange(
    event: GanttSelectedEvent<GanttTaskOrigin<T>>,
  ): void {
    const value = Array.isArray(event.selectedValue)
      ? event.selectedValue[0]
      : event.selectedValue;
    const origin = value?.origin as GanttTaskOrigin<T> | undefined;
    if (!origin) return;
    const mapped = this.mapping().byId.get(origin.taskId);
    if (mapped) this.emitSelection(mapped);
  }

  protected onBarClick(event: GanttBarClickEvent<GanttTaskOrigin<T>>): void {
    const mouse = event.event as MouseEvent | undefined;
    if (!mouse || mouse.detail < 2) return;
    const origin = event.item.origin as GanttTaskOrigin<T> | undefined;
    if (!origin) return;
    const mapped = this.mapping().byId.get(origin.taskId);
    if (mapped) this.requestEdit(mapped);
  }

  protected onDragStarted(event: GanttDragEvent<GanttTaskOrigin<T>>): void {
    const origin = event.item.origin as GanttTaskOrigin<T> | undefined;
    if (!origin) return;
    const mapped = this.mapping().byId.get(origin.taskId);
    if (!mapped) return;
    this.dragState = {
      taskId: mapped.taskId,
      previous: toGanttDateRange(mapped.start, mapped.end),
    };
    this.announce(`Moving ${mapped.title}`);
  }

  protected onDragEnded(event: GanttDragEvent<GanttTaskOrigin<T>>): void {
    const state = this.dragState;
    this.dragState = null;
    const origin = event.item.origin as GanttTaskOrigin<T> | undefined;
    if (!origin) return;
    const mapped = this.mapping().byId.get(origin.taskId);
    if (!mapped) {
      this.taskDateChangeRejected.emit({
        task: null,
        taskId: origin.taskId,
        previous: state?.previous ?? null,
        requested: null,
        reason: 'unknown-task',
        mode: 'move',
      });
      this.revision.update((value) => value + 1);
      return;
    }

    const nextStart = normalizeGanttDate(event.item.start);
    const nextEnd = normalizeGanttDate(event.item.end);
    const previous =
      state && state.taskId === mapped.taskId
        ? state.previous
        : toGanttDateRange(mapped.start, mapped.end);
    const mode: GanttDateChangeMode =
      previous.start &&
      previous.end &&
      nextStart &&
      nextEnd &&
      ganttDayOrdinal(nextStart) - ganttDayOrdinal(previous.start) ===
        ganttDayOrdinal(nextEnd) - ganttDayOrdinal(previous.end)
        ? 'move'
        : 'resize';

    this.applyDateChangeInternal(
      mapped,
      nextStart,
      nextEnd,
      'drag',
      mode,
      previous,
    );
    this.revision.update((value) => value + 1);
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.defaultPrevented) return;
    const target = event.target as HTMLElement | null;
    const bar = target?.closest<HTMLElement>('.gantt-bar-content');
    if (!bar) return;
    const taskId =
      bar.getAttribute('data-gantt-task-id') ??
      bar
        .querySelector<HTMLElement>('[data-gantt-task-id]')
        ?.getAttribute('data-gantt-task-id');
    if (!taskId) return;

    const mapped = this.mapping().byId.get(taskId);
    if (!mapped) {
      this.taskDateChangeRejected.emit({
        task: null,
        taskId,
        previous: null,
        requested: null,
        reason: 'unknown-task',
        mode: 'move',
      });
      return;
    }

    switch (event.key) {
      case 'Enter':
      case ' ':
      case 'Spacebar':
        event.preventDefault();
        this.selectFromKeyboard(mapped);
        break;
      case 'e':
      case 'E':
        event.preventDefault();
        this.requestEdit(mapped);
        break;
      case 'Escape':
        if (this.editing()) {
          event.preventDefault();
          this.closeDetail();
        }
        break;
      case '[':
      case ']':
        event.preventDefault();
        this.stepProgress(mapped, event.key === ']' ? 0.1 : -0.1);
        break;
      case 'ArrowLeft':
      case 'ArrowRight':
        if (event.altKey) {
          event.preventDefault();
          this.stepDate(
            mapped,
            event.key === 'ArrowRight' ? 1 : -1,
            event.shiftKey,
          );
        }
        break;
      default:
        break;
    }
  }

  protected closeDetail(): void {
    const editing = this.editing();
    this.editing.set(null);
    if (editing) {
      afterNextRender(() => this.focusBar(editing.taskId), {
        injector: this.injector,
      });
    }
  }

  protected retry(): void {
    this.retryRequested.emit();
    this.announce(this.loadingLabel());
  }

  protected barContext(
    item: { origin?: GanttTaskOrigin<T>; id: string; title: string; start?: Date | number; end?: Date | number; progress?: number },
  ): GanttBarTemplateContext<T> {
    const origin = item.origin as GanttTaskOrigin<T> | undefined;
    const mapped = origin
      ? this.mapping().byId.get(origin.taskId)
      : undefined;
    const task = (mapped?.task ?? origin?.task) as T;
    const progress = mapped?.progress ?? 0;
    return {
      $implicit: task,
      task,
      taskId: mapped?.taskId ?? origin?.taskId ?? item.id,
      title: mapped?.title ?? item.title,
      start: mapped?.start ?? normalizeGanttDate(item.start),
      end: mapped?.end ?? normalizeGanttDate(item.end),
      progress,
      progressPercent: Math.round(progress * 100),
      milestone: mapped?.milestone ?? origin?.milestone ?? false,
      selected: this.selectedId() === (mapped?.taskId ?? item.id),
      readOnly: !this.isEditable(),
      tooltip: mapped?.tooltip ?? null,
    };
  }

  protected detailContext(
    mapped: GanttMappedTask<T>,
  ): GanttTaskDetailTemplateContext<T> {
    return {
      $implicit: mapped.task,
      task: mapped.task,
      taskId: mapped.taskId,
      title: mapped.title,
    };
  }

  protected taskTitle(item: { origin?: GanttTaskOrigin<T>; title: string }): string {
    const origin = item.origin as GanttTaskOrigin<T> | undefined;
    return origin ? String(this.config().title(origin.task) ?? item.title) : item.title;
  }

  protected taskTooltip(item: { origin?: GanttTaskOrigin<T> }): string | null {
    const origin = item.origin as GanttTaskOrigin<T> | undefined;
    if (!origin) return null;
    const value = this.config().tooltip?.(origin.task);
    return value === null || value === undefined ? null : String(value);
  }

  protected isMilestone(item: { origin?: GanttTaskOrigin<T> }): boolean {
    const origin = item.origin as GanttTaskOrigin<T> | undefined;
    return origin ? Boolean(this.config().milestone?.(origin.task)) : false;
  }

  protected progressLabel(item: { origin?: GanttTaskOrigin<T> }): string {
    const origin = item.origin as GanttTaskOrigin<T> | undefined;
    if (!origin) return '';
    const value = this.config().progress?.(origin.task);
    return typeof value === 'number' && Number.isFinite(value)
      ? `${Math.round(value * 100)}%`
      : '—';
  }

  applyDateChange(
    taskId: string,
    start: GanttDateInput | null | undefined,
    end: GanttDateInput | null | undefined,
    mode: GanttDateChangeMode = 'move',
  ): boolean {
    const mapped = this.mapping().byId.get(taskId);
    if (!mapped) {
      this.taskDateChangeRejected.emit({
        task: null,
        taskId,
        previous: null,
        requested: toGanttDateRange(start, end),
        reason: 'unknown-task',
        mode,
      });
      return false;
    }
    return this.applyDateChangeInternal(
      mapped,
      normalizeGanttDate(start),
      normalizeGanttDate(end),
      'control',
      mode,
    );
  }

  setProgress(taskId: string, progress: number): boolean {
    const mapped = this.mapping().byId.get(taskId);
    if (!mapped) {
      this.taskProgressChangeRejected.emit({
        task: null,
        taskId,
        previous: null,
        requested: progress,
        reason: 'unknown-task',
      });
      return false;
    }
    return this.applyProgressInternal(mapped, progress, 'control');
  }

  requestTaskEdit(taskId: string): void {
    const mapped = this.mapping().byId.get(taskId);
    if (mapped) this.requestEdit(mapped);
  }

  private applyDateChangeInternal(
    mapped: GanttMappedTask<T>,
    nextStart: Date | null,
    nextEnd: Date | null,
    reason: GanttDateChangeReason,
    mode: GanttDateChangeMode,
    previousOverride?: GanttTaskDateRange,
  ): boolean {
    const previous =
      previousOverride ?? toGanttDateRange(mapped.start, mapped.end);
    const requested = toGanttDateRange(nextStart, nextEnd);

    if (!this.isEditable()) {
      this.rejectDate(
        mapped,
        previous,
        requested,
        this.readOnly() ? 'readonly' : 'disabled',
        mode,
      );
      return false;
    }
    if (!mapped.editable) {
      this.rejectDate(mapped, previous, requested, 'disabled', mode);
      return false;
    }
    if (mapped.milestone && mode === 'resize') {
      this.rejectDate(mapped, previous, requested, 'milestone', mode);
      return false;
    }
    if (!nextStart || !nextEnd || nextEnd.getTime() < nextStart.getTime()) {
      this.rejectDate(mapped, previous, requested, 'invalid-date', mode);
      return false;
    }

    const requestedEnd = mapped.milestone ? nextStart : nextEnd;
    const current = toGanttDateRange(nextStart, requestedEnd);

    if (
      sameGanttInstant(previous.start, current.start) &&
      sameGanttInstant(previous.end, current.end)
    ) {
      this.rejectDate(mapped, previous, current, 'unchanged', mode);
      return false;
    }

    const violation = this.findDependencyViolation(
      mapped.taskId,
      nextStart,
      requestedEnd,
    );
    if (violation) {
      this.rejectDate(
        mapped,
        previous,
        current,
        'dependency-violation',
        mode,
        violation,
      );
      return false;
    }

    this.taskDateChanged.emit({
      task: mapped.task,
      taskId: mapped.taskId,
      previous,
      current,
      reason,
      mode,
    });
    this.announce(
      `${mapped.title} ${mode === 'move' ? 'moved' : 'resized'} to ${ganttDateOnly(current.start) ?? 'an invalid date'} through ${ganttDateOnly(current.end) ?? 'an invalid date'}`,
    );
    return true;
  }

  private applyProgressInternal(
    mapped: GanttMappedTask<T>,
    requested: number,
    reason: GanttProgressChangeReason,
  ): boolean {
    if (!this.isEditable()) {
      this.rejectProgress(
        mapped,
        requested,
        this.readOnly() ? 'readonly' : 'disabled',
      );
      return false;
    }
    if (!mapped.editable) {
      this.rejectProgress(mapped, requested, 'disabled');
      return false;
    }
    if (!Number.isFinite(requested) || requested < 0 || requested > 1) {
      this.rejectProgress(mapped, requested, 'invalid-progress');
      return false;
    }

    const previous = mapped.progress ?? 0;
    if (Math.abs(previous - requested) < 0.0001) {
      this.rejectProgress(mapped, requested, 'unchanged');
      return false;
    }

    this.taskProgressChanged.emit({
      task: mapped.task,
      taskId: mapped.taskId,
      previous,
      current: requested,
      reason,
    });
    this.announce(
      `${mapped.title} progress ${Math.round(requested * 100)} percent`,
    );
    return true;
  }

  private rejectDate(
    mapped: GanttMappedTask<T>,
    previous: GanttTaskDateRange,
    requested: GanttTaskDateRange,
    reason: GanttDateChangeRejectionReason,
    mode: GanttDateChangeMode,
    dependencyId?: string,
  ): void {
    this.taskDateChangeRejected.emit({
      task: mapped.task,
      taskId: mapped.taskId,
      previous,
      requested,
      reason,
      mode,
      ...(dependencyId ? { dependencyId } : {}),
    });
    this.announce(
      `${mapped.title} date change rejected: ${reason.replace('-', ' ')}`,
    );
  }

  private rejectProgress(
    mapped: GanttMappedTask<T>,
    requested: number,
    reason: GanttProgressChangeRejectionReason,
  ): void {
    this.taskProgressChangeRejected.emit({
      task: mapped.task,
      taskId: mapped.taskId,
      previous: mapped.progress,
      requested,
      reason,
    });
    this.announce(
      `${mapped.title} progress change rejected: ${reason.replace('-', ' ')}`,
    );
  }

  private findDependencyViolation(
    taskId: string,
    start: Date,
    end: Date,
  ): string | null {
    const mapping = this.mapping();
    const position = mapping.byId.get(taskId);
    if (!position) return null;

    for (const dependency of mapping.dependencies.get(taskId) ?? []) {
      const predecessor = mapping.byId.get(dependency.id);
      if (!predecessor?.start || !predecessor.end) continue;
      if (
        this.violates(
          dependency.type,
          predecessor.start,
          predecessor.end,
          start,
          end,
        )
      ) {
        return dependency.id;
      }
    }

    for (const [successorId, successor] of mapping.byId) {
      if (successorId === taskId) continue;
      if (!successor.start || !successor.end) continue;
      for (const dependency of mapping.dependencies.get(successorId) ?? []) {
        if (dependency.id !== taskId) continue;
        if (
          this.violates(
            dependency.type,
            start,
            end,
            successor.start,
            successor.end,
          )
        ) {
          return successorId;
        }
      }
    }

    return null;
  }

  private violates(
    type: GanttDependencyType,
    predecessorStart: Date,
    predecessorEnd: Date,
    successorStart: Date,
    successorEnd: Date,
  ): boolean {
    switch (type) {
      case 'fs':
        return predecessorEnd.getTime() > successorStart.getTime();
      case 'ff':
        return predecessorEnd.getTime() > successorEnd.getTime();
      case 'ss':
        return predecessorStart.getTime() > successorStart.getTime();
      case 'sf':
        return predecessorStart.getTime() > successorEnd.getTime();
      default:
        return false;
    }
  }

  private stepDate(
    mapped: GanttMappedTask<T>,
    days: number,
    resize: boolean,
  ): void {
    if (!mapped.start || !mapped.end) {
      this.rejectDate(
        mapped,
        toGanttDateRange(mapped.start, mapped.end),
        toGanttDateRange(null, null),
        'invalid-date',
        resize ? 'resize' : 'move',
      );
      return;
    }
    if (mapped.milestone) {
      if (resize) {
        this.rejectDate(
          mapped,
          toGanttDateRange(mapped.start, mapped.end),
          toGanttDateRange(mapped.start, mapped.end),
          'milestone',
          'resize',
        );
        return;
      }
      const nextStart = addGanttDays(mapped.start, days);
      this.applyDateChangeInternal(
        mapped,
        nextStart,
        nextStart,
        'keyboard',
        'move',
      );
      return;
    }

    const nextStart = resize ? mapped.start : addGanttDays(mapped.start, days);
    const nextEnd = addGanttDays(mapped.end, days);
    this.applyDateChangeInternal(
      mapped,
      nextStart,
      nextEnd,
      'keyboard',
      resize ? 'resize' : 'move',
    );
  }

  private stepProgress(mapped: GanttMappedTask<T>, delta: number): void {
    const previous = mapped.progress ?? 0;
    const next = Math.min(
      1,
      Math.max(0, Math.round((previous + delta) * 10) / 10),
    );
    this.applyProgressInternal(mapped, next, 'keyboard');
  }

  private selectFromKeyboard(mapped: GanttMappedTask<T>): void {
    const gantt = this.ganttView();
    if (gantt) {
      gantt.selectionModel.clear();
      gantt.selectionModel.select(mapped.taskId);
    }
    this.emitSelection(mapped);
  }

  private emitSelection(mapped: GanttMappedTask<T>): void {
    this.taskSelected.emit({ task: mapped.task, taskId: mapped.taskId });
    this.announce(`${mapped.title} selected`);
  }

  private requestEdit(mapped: GanttMappedTask<T>): void {
    this.taskEditRequested.emit({
      task: mapped.task,
      taskId: mapped.taskId,
    });
    if (!this.detailTemplate()) {
      this.announce(`Edit requested for ${mapped.title}`);
      return;
    }
    this.editing.set(mapped);
    this.announce(`Editing ${mapped.title}`);
    afterNextRender(
      () => {
        const panel = this.host.nativeElement.querySelector<HTMLElement>(
          '.dcf-gantt__detail',
        );
        panel
          ?.querySelector<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
          )
          ?.focus();
      },
      { injector: this.injector },
    );
  }

  private announce(message: string): void {
    if (!this.isBrowser) return;
    this.announcement.set('');
    queueMicrotask(() => this.announcement.set(message));
  }

  private focusBar(taskId: string): void {
    const escaped = taskId.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    this.host.nativeElement
      .querySelector<HTMLElement>(
        `.gantt-bar-content[data-gantt-task-id="${escaped}"]`,
      )
      ?.focus();
  }

  private decorateBars(): void {
    const selectedId = this.selectedId();
    const busy = this.isBusy();
    const bars =
      this.host.nativeElement.querySelectorAll<HTMLElement>(
        '.gantt-bar-content',
      );

    bars.forEach((bar) => {
      const taskId =
        bar.getAttribute('data-gantt-task-id') ??
        bar
          .querySelector<HTMLElement>('[data-gantt-task-id]')
          ?.getAttribute('data-gantt-task-id');
      if (!taskId) return;
      const mapped = this.mapping().byId.get(taskId);
      if (!mapped) return;

      bar.setAttribute('tabindex', '0');
      bar.setAttribute('role', 'button');
      bar.setAttribute('aria-label', this.barAriaLabel(mapped));
      bar.setAttribute('aria-pressed', String(selectedId === taskId));
      bar.setAttribute('aria-disabled', String(busy));
      bar.setAttribute(
        'aria-keyshortcuts',
        'Enter Space E Alt+ArrowLeft Alt+ArrowRight Alt+Shift+ArrowLeft Alt+Shift+ArrowRight [ ]',
      );
      bar.setAttribute('data-gantt-task-id', taskId);
      bar.classList.toggle(
        'dcf-gantt__bar--selected',
        selectedId === taskId,
      );
      bar.classList.toggle('dcf-gantt__bar--milestone', mapped.milestone);
      bar.classList.toggle('dcf-gantt__bar--readonly', !mapped.editable);
      const container = bar.closest<HTMLElement>('.gantt-bar');
      container?.classList.toggle(
        'dcf-gantt__bar--selected',
        selectedId === taskId,
      );
      container?.classList.toggle(
        'dcf-gantt__bar--milestone',
        mapped.milestone,
      );
      container?.classList.toggle(
        'dcf-gantt__bar--readonly',
        !mapped.editable,
      );
    });
  }

  private barAriaLabel(mapped: GanttMappedTask<T>): string {
    const start = ganttDateOnly(mapped.start) ?? 'no start date';
    const end = ganttDateOnly(mapped.end) ?? 'no end date';
    const progress =
      mapped.progress === null
        ? 'no progress recorded'
        : `${Math.round(mapped.progress * 100)} percent complete`;
    const milestone = mapped.milestone ? ', milestone' : '';
    const tooltip = mapped.tooltip ? `, ${mapped.tooltip}` : '';
    return `${mapped.title}, ${start} to ${end}, ${progress}${milestone}${tooltip}`;
  }
}
