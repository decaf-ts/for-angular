/**
 * @module TableComponent
 * @description Provides a feature-rich, paginated data table component for Angular applications.
 * @summary The `TableComponent` extends the {@link ListComponent} and serves as a dynamic, configurable table
 * component. It supports server-side filtering, dynamic column resolution, row-level CRUD actions, and cell
 * truncation with tooltips via {@link DecafTooltipDirective}. The component integrates seamlessly with the
 * Decaf rendering engine and provides advanced customization options for filtering, sorting, and data mapping.
 * @class TableComponent
 * @extends {ListComponent}
 * @implements {OnInit}
 */
import { CommonModule } from '@angular/common';
import { Component, inject, Input, OnInit } from '@angular/core';
import { OrderDirection } from '@decaf-ts/core';
import { CrudOperations, OperationKeys } from '@decaf-ts/db-decorators';
import { Model, Primitives } from '@decaf-ts/decorator-validation';
import { ComponentEventNames, UIFunctionLike, UIKeys } from '@decaf-ts/ui-decorators';
import { IonSelect, IonSelectOption } from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';
import { debounceTime, shareReplay, takeUntil } from 'rxjs';
import { DecafTooltipDirective } from '../../directives';
import { Dynamic } from '../../engine';
import {
    ActionRoles,
    DefaultListEmptyOptions,
    ListComponentsTypes,
    SelectFieldInterfaces,
} from '../../engine/constants';
import { getModelAndRepository } from '../../engine/helpers';
import { IBaseCustomEvent, IFilterQuery } from '../../engine/interfaces';
import { FunctionLike, KeyValue, SelectOption } from '../../engine/types';
import { NgxRouterService } from '../../services/NgxRouterService';
import { EmptyStateComponent } from '../empty-state/empty-state.component';
import { IconComponent } from '../icon/icon.component';
import { ListComponent } from '../list/list.component';
import { getNgxSelectOptionsModal } from '../modal/modal.component';
import { PaginationComponent } from '../pagination/pagination.component';
import { SearchbarComponent } from '../searchbar/searchbar.component';

@Dynamic()
@Component({
  selector: 'ngx-decaf-table',
  templateUrl: './table.component.html',
  styleUrls: ['./table.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    TranslatePipe,
    IonSelect,
    IonSelectOption,
    SearchbarComponent,
    EmptyStateComponent,
    IconComponent,
    PaginationComponent,
    DecafTooltipDirective,
  ],
})
export class TableComponent extends ListComponent implements OnInit {
  /**
   * @description Maximum character count before cell content is truncated. `-1` disables truncation.
   * @type {number}
   * @default -1
   */
  @Input()
  maxContentLength: number = -1;

  /**
   * @description Column keys whose values are never truncated regardless of `maxContentLength`.
   * @type {string[]}
   * @default ['userId']
   */
  @Input()
  preserve: string[] = ['userId'];

  /**
   * @description Source used to populate filter select options: a model class, async function, or string key.
   * @type {Model | FunctionLike | string}
   */
  @Input()
  filterModel!: Model | FunctionLike | string;

  /**
   * @description Array of {@link SelectOption} objects displayed in the filter select control.
   * @type {SelectOption[]}
   */
  @Input()
  filterOptions!: SelectOption[];

  /**
   * @description Translatable label rendered on the filter select input.
   * @type {string}
   */
  @Input()
  filterLabel!: string;

  /**
   * @description Custom function that maps a repository item to a {@link SelectOption} shape.
   * @type {FunctionLike}
   */
  @Input()
  filterOptionsMapper!: FunctionLike;

  /**
   * @description Currently selected filter value; `undefined` when no filter is active.
   * @type {string | undefined}
   */
  filterValue?: string;

  /**
   * @description Ordered array of column keys rendered as table columns. Includes `'actions'` when operations are permitted.
   * @type {string[]}
   */
  cols!: string[];

  /**
   * @description Column header label array, mirrors `cols` after `getOperations()` resolves.
   * @type {string[]}
   */
  headers: string[] = [];

  /**
   * @description When `true`, row-level action buttons are rendered if the user has the required permissions.
   * @type {boolean}
   * @default true
   */
  @Input()
  allowOperations: boolean = true;

  /**
   * @description Injected {@link NgxRouterService} used to read URL query parameters for pre-populating the search state.
   * @type {NgxRouterService}
   */
  routerService: NgxRouterService = inject(NgxRouterService);

  /**
   * @description Resolves and sorts the visible column keys from the current mapper metadata.
   * @summary Reads `this._mapper` to obtain all columns that carry a `sequence` property,
   * then sorts them so that columns anchored to `UIKeys.FIRST` appear first, numerically
   * sequenced columns are ordered by their value, and `UIKeys.LAST` anchored columns appear
   * last. Returns the final sorted array of column key strings.
   * @return {string[]} Sorted array of column keys derived from the mapper.
   * @mermaid
   * sequenceDiagram
   *   participant TC as TableComponent
   *   participant M as _mapper
   *   TC->>M: Object.entries(_mapper)
   *   M-->>TC: [key, value][] entries
   *   TC->>TC: sort by sequence weight (FIRST=0, number=1, LAST=100)
   *   TC-->>TC: return sorted keys[]
   */
  private get _cols(): string[] {
    this.mapper = this._mapper;
    return Object.entries(this.mapper)
      .sort(([, a], [, b]) => {
        const aSequence = a?.sequence ?? 0;
        const bSequence = b?.sequence ?? 0;
        const weight = (v: string | number) =>
          v === UIKeys.FIRST ? 0 : typeof v === Primitives.NUMBER ? 1 : v === UIKeys.LAST ? 100 : 1;
        const aWeight = weight(aSequence);
        const bWeight = weight(bSequence);
        if (aWeight !== bWeight) {
          return aWeight - bWeight;
        }
        if (aWeight === 1 && typeof aSequence === Primitives.NUMBER && typeof bSequence === Primitives.NUMBER) {
          return aSequence - bSequence;
        }
        return 0;
      })
      .map(([key]) => key);
  }

  /**
   * @description Returns the column header labels derived directly from the resolved `cols` array.
   * @return {string[]} Shallow copy of `cols` used as table header labels.
   */
  private get _headers(): string[] {
    return this.cols.map((col) => col);
  }

  /**
   * @description Filters the raw mapper to only the entries that declare a `sequence` property.
   * @summary Iterates over `this.mapper`, retains only keys whose value is a plain object
   * containing a `sequence` field, and returns the resulting subset as a {@link KeyValue} map
   * used by `_cols` for ordered column resolution.
   * @return {KeyValue} Filtered mapper containing only sequenced column definitions.
   */
  get _mapper(): KeyValue {
    return Object.keys(this.mapper).reduce((accum: KeyValue, curr: string) => {
      const mapper = (this.mapper as KeyValue)[curr];
      if (typeof mapper === 'object' && 'sequence' in mapper) accum[curr] = mapper;
      return accum;
    }, {} as KeyValue);
  }

  /**
   * @description Angular lifecycle hook that initializes the table and loads its first page of data.
   * @summary Sets up the table by resolving columns, headers, and filter options. It also reads URL query parameters
   * to pre-populate the search state and triggers the initial data refresh.
   * @return {Promise<void>}
   */
  override async ngOnInit(): Promise<void> {
    await super.initialize();
    this.type = ListComponentsTypes.PAGINATED;
    this.empty = Object.assign({}, DefaultListEmptyOptions, this.empty);
    this.repositoryObserverSubject
      .pipe(debounceTime(100), shareReplay({ bufferSize: 1, refCount: true }), takeUntil(this.destroySubscriptions$))
      .subscribe(([model, action, uid, data]) => this.handleObserveEvent(model, action, uid, data));
    this.cols = this._cols as string[];
    this.getOperations();
    const filter = this.routerService.getQueryParamValue('filter') as string;
    if (filter) {
      const value = this.routerService.getQueryParamValue('value') as string;
      this.searchValue = {
        query: [
          {
            index: filter,
            condition: 'Contains',
            value,
          },
        ],
        sort: {
          value: filter,
          direction: OrderDirection.ASC,
        },
      };
    }
    if (this.filterModel) {
      await this.getFilterOptions();
    }
    await this.refresh();
  }

  /**
   * @description Determines which row-level CRUD operations are permitted and finalizes the column list.
   * @summary Checks user permissions for `UPDATE` and `DELETE` operations. Updates the `cols` and `headers` arrays accordingly.
   * @return {void}
   */
  getOperations() {
    if (this.allowOperations) {
      this.allowOperations = this.isAllowed(OperationKeys.UPDATE) || this.isAllowed(OperationKeys.DELETE);
    } else {
      this.operations = [];
    }
    if (this.operations?.length) {
      this.cols.push('actions');
    }
    this.headers = this._headers;
  }

  /**
   * @description Populates `filterOptions` from a function call or a decorator-bound repository.
   * @summary Resolves filter options dynamically based on the provided `filterModel`. Supports both
   * async functions and repository-based data sources.
   * @return {Promise<void>}
   */
  protected async getFilterOptions(): Promise<void> {
    const getFilterOptionsMapper = (pk: string) => {
      if (!this.filterBy) {
        this.filterBy = pk as keyof Model;
      }
      if (!this.filterOptionsMapper) {
        this.filterOptionsMapper = (item) => ({
          text: `${item[pk]}`,
          value: `${item[pk]}`,
        });
      }
    };
    if (typeof this.filterModel === 'function') {
      this.filterOptions = await this.filterModel();
    } else {
      const repo = getModelAndRepository(this.filterModel);
      if (repo) {
        const { repository, pk } = repo;
        getFilterOptionsMapper(pk);
        const query = await repository.select().execute();
        this.filterOptions = query.map((item) => this.filterOptionsMapper(item));
      }
    }
  }

  /**
   * @description Maps a single raw data row to the cell-structured format expected by the table template.
   * @summary Applies transformations and event bindings to each row of data, preparing it for rendering.
   * @param {KeyValue} item - Raw data object representing a single table row.
   * @param {KeyValue} mapper - Column mapper definitions.
   * @param {KeyValue} [props={}] - Additional rendering props.
   * @return {Promise<KeyValue>} Mapped row object.
   */
  protected override async itemMapper(item: KeyValue, mapper: KeyValue, props: KeyValue = {}): Promise<KeyValue> {
    this.model = item as Model;
    const mapped = super.itemMapper(
      item,
      this.cols.filter((c) => c !== 'actions'),
      props
    );
    const { children } = (this.props as KeyValue) || [];
    const entries = Object.entries(mapped);
    for (const [curr, value] of entries) {
      const getEvents = async (index: number, name: string) => {
        try {
          const child = children.find((c: KeyValue) => c?.['props']?.name === name);
          if (child) {
            const { events, name } = child?.['props'] || {};
            if (events) {
              const sequence = String(index);
              const evts = this.parseEvents(events, this);
              for (const [key, evt] of Object.entries(evts)) {
                const handler = evt;
                if (key === ComponentEventNames.Render) {
                  if (handler?.name === ComponentEventNames.Render) {
                    mapped[sequence] = {
                      ...mapped[sequence],
                      value: await handler.bind(this)(this, name, value),
                    };
                  } else {
                    const handlerFn = await handler(this, name, value);
                    mapped[sequence] = {
                      ...mapped[sequence],
                      value:
                        name + ' ' + typeof handlerFn === 'function' || handlerFn instanceof Promise
                          ? await handlerFn.bind(this)(this, name, value)
                          : handlerFn,
                    };
                  }
                }
                if (key === 'handleClick' || key === 'handleAction') {
                  mapped[sequence] = {
                    ...mapped[sequence],
                    handler: {
                      index: Number(sequence),
                      handle: handler.bind(this),
                    },
                  };
                }
              }
            }
          }
          return value;
        } catch (error) {
          this.log.for(this.itemMapper).error(`Error mapping child events. ${(error as Error)?.message || error}`);
        }
      };
      const name = this.cols[Number(curr)];
      const index = Number(curr);
      const parserFn = mapper[name]?.valueParserFn || undefined;
      const resolvedValue = parserFn ? await parserFn(this, name, value) : value;
      mapped[curr] = {
        prop: name ?? this.pk,
        value: resolvedValue,
        index: index || 0,
      };
      await getEvents(index, name);
    }
    return mapped;
  }

  /**
   * @description Maps an array of raw data objects to the cell-structured rows used by the template.
   * @summary Resolves all rows concurrently via `Promise.all`, delegating each item to `itemMapper`.
   * @param {KeyValue[]} data - Raw row objects returned by the data source.
   * @return {Promise<KeyValue[]>} Array of structured row objects.
   */
  override async mapResults(data: KeyValue[]): Promise<KeyValue[]> {
    this._data = [...data];
    if (!data || !data.length) return [];
    return await Promise.all(
      data.map(async (curr) => await this.itemMapper(curr, this.mapper, { uid: curr[this.pk] }))
    );
  }

  /**
   * @description Handles a CRUD action triggered by a row action button.
   * @summary Invokes a custom handler or navigates to the appropriate route for the given action.
   * @param {IBaseCustomEvent} event - The originating event.
   * @param {UIFunctionLike | undefined} handler - Optional custom handler.
   * @param {string} uid - Primary key value of the target row.
   * @param {CrudOperations} action - The CRUD operation type.
   * @return {Promise<void>}
   */
  async handleAction(
    event: IBaseCustomEvent,
    handler: UIFunctionLike | undefined,
    uid: string,
    action: CrudOperations
  ): Promise<void> {
    if (handler) {
      const handlerFn = await handler(this, event, uid);
      return typeof handlerFn === 'function' ? handlerFn() : handlerFn;
    }
    await this.handleRedirect(event, uid, action);
  }

  /**
   * @description Navigates to the CRUD action route for the specified row.
   * @summary Verifies the requested `action` and navigates to the appropriate route.
   * @param {Event | IBaseCustomEvent} event - The originating event.
   * @param {string} uid - Primary key value of the target row.
   * @param {CrudOperations} action - The CRUD operation to navigate to.
   * @return {Promise<void>}
   */
  async handleRedirect(event: Event | IBaseCustomEvent, uid: string, action: CrudOperations): Promise<void> {
    if (event instanceof Event) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
    if (this.operations.includes(action)) {
      await this.router.navigate([`/${this.route}/${action}/${uid}`]);
    }
  }

  /**
   * @description Opens the filter select UI, allowing the user to narrow table results by a field value.
   * @summary Determines the presentation mode and handles user selection.
   * @param {Event} event - The click event that triggered the filter open action.
   * @return {Promise<void>}
   */
  async openFilterSelectOptions(event: Event): Promise<void> {
    const type = this.filterOptions.length > 10 ? SelectFieldInterfaces.MODAL : SelectFieldInterfaces.POPOVER;
    if (type === SelectFieldInterfaces.MODAL) {
      event.preventDefault();
      event.stopImmediatePropagation();
      const title = await this.translate(`${this.locale}.filter_by`);
      const modal = await getNgxSelectOptionsModal(title, this.filterOptions as SelectOption[], this.injector);
      this.changeDetectorRef.detectChanges();
      const { data, role } = await modal.onWillDismiss();
      if (role === ActionRoles.confirm && data !== this.filterValue) {
        this.filterValue = data;
        await this.handleSearch({
          query: [
            {
              index: this.filterBy,
              value: this.filterValue,
              condition: 'Contains',
            },
          ],
        } as IFilterQuery);
      }
    }
  }

  /**
   * @description Clears the active filter selection and resets the table to an unfiltered state.
   * @summary Resets `filterValue` and reloads the full data set.
   * @param {CustomEvent} event - The clear event emitted by the filter select control.
   * @return {Promise<void>}
   */
  async handleFilterSelectClear(event: CustomEvent) {
    event.preventDefault();
    event.stopImmediatePropagation();
    if (this.filterValue !== undefined) {
      this.filterValue = undefined;
      await this.clearSearch();
    }
  }
}
