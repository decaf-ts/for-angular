import { CommonModule } from '@angular/common';
import { Component, inject, Input, OnInit } from '@angular/core';
import { OrderDirection } from '@decaf-ts/core';
import { CrudOperations, OperationKeys } from '@decaf-ts/db-decorators';
import { Model, Primitives } from '@decaf-ts/decorator-validation';
import { ComponentEventNames, UIFunctionLike, UIKeys } from '@decaf-ts/ui-decorators';
import { IonSelect, IonSelectOption } from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';
import { debounceTime, shareReplay, takeUntil } from 'rxjs';
import {
  ActionRoles,
  DefaultListEmptyOptions,
  ListComponentsTypes,
  SelectFieldInterfaces,
} from '../../engine/constants';
import { Dynamic } from '../../engine/decorators';
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
  ],
})
export class TableComponent extends ListComponent implements OnInit {
  @Input()
  filterModel!: Model | string;

  @Input()
  filterOptions!: SelectOption[];

  @Input()
  filterLabel!: string;

  @Input()
  filterOptionsMapper!: FunctionLike;

  filterValue?: string;

  cols!: string[];

  headers: string[] = [];

  @Input()
  allowOperations: boolean = true;

  override routerService: NgxRouterService = inject(NgxRouterService);

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

  private get _headers(): string[] {
    return this.cols.map((col) => col);
  }

  get _mapper(): KeyValue {
    return Object.keys(this.mapper).reduce((accum: KeyValue, curr: string) => {
      const mapper = (this.mapper as KeyValue)[curr];
      if (typeof mapper === 'object' && 'sequence' in mapper) accum[curr] = mapper;
      return accum;
    }, {} as KeyValue);
  }

  override async ngOnInit(): Promise<void> {
    // this.parseProps(this);

    await super.initialize();

    this.type = ListComponentsTypes.PAGINATED;
    this.empty = Object.assign({}, DefaultListEmptyOptions, this.empty);
    this.repositoryObserverSubject
      .pipe(debounceTime(100), shareReplay(1), takeUntil(this.destroySubscriptions$))
      .subscribe(([model, action, uid, data]) => this.handleObserveEvent(model, action, uid, data));
    this.cols = this._cols as string[];

    this.getOperations();
    this.searchValue = undefined;

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

  protected async getFilterOptions(): Promise<void> {
    const repo = getModelAndRepository(this.filterModel);
    if (repo) {
      const { repository, pk } = repo;
      if (!this.filterBy) this.filterBy = pk as keyof Model;
      if (!this.filterOptionsMapper) {
        this.filterOptionsMapper =
          this.filterOptionsMapper ||
          ((item) => ({
            text: `${item[pk]}`,
            value: `${item[pk]}`,
          }));
      }
      const query = await repository.select().execute();
      if (query?.length) this.filterOptions = query.map((item) => this.filterOptionsMapper(item));
    }
  }

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

  override async mapResults(data: KeyValue[]): Promise<KeyValue[]> {
    this._data = [...data];
    if (!data || !data.length) return [];

    return await Promise.all(
      data.map(async (curr) => await this.itemMapper(curr, this.mapper, { uid: curr[this.pk] }))
    );
  }

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
  async handleRedirect(event: Event | IBaseCustomEvent, uid: string, action: CrudOperations): Promise<void> {
    if (event instanceof Event) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
    if (this.operations.includes(action)) {
      await this.router.navigate([`/${this.route}/${action}/${uid}`]);
    }
  }

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

  async handleFilterSelectClear(event: CustomEvent) {
    event.preventDefault();
    event.stopImmediatePropagation();
    if (this.filterValue !== undefined) {
      this.filterValue = undefined;
      await this.clearSearch();
    }
  }
}
