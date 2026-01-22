import { Component, EnvironmentInjector, inject, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { IonSelect, IonSelectOption } from '@ionic/angular/standalone';
import { OrderDirection } from '@decaf-ts/core';
import { Model } from '@decaf-ts/decorator-validation';
import { CrudOperations, OperationKeys } from '@decaf-ts/db-decorators';
import { ComponentEventNames } from '@decaf-ts/ui-decorators';
import { SearchbarComponent } from '../searchbar/searchbar.component';
import { IconComponent } from '../icon/icon.component';
import { PaginationComponent } from '../pagination/pagination.component';
import { ListComponent } from '../list/list.component';
import { getNgxSelectOptionsModal } from '../modal/modal.component';
import { EmptyStateComponent } from '../empty-state/empty-state.component';
import { NgxRouterService } from '../../services/NgxRouterService';
import { FunctionLike, KeyValue, SelectOption } from '../../engine/types';
import {
  ActionRoles,
  DefaultListEmptyOptions,
  ListComponentsTypes,
  SelectFieldInterfaces,
} from '../../engine/constants';
import { Dynamic } from '../../engine/decorators';
import { IFilterQuery } from '../../engine/interfaces';
import { getModelAndRepository } from '../../engine/helpers';
import { debounceTime, shareReplay, takeUntil } from 'rxjs';

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

  routerService: NgxRouterService = inject(NgxRouterService);

  private get _cols(): string[] {
    this.mapper = this._mapper;
    return Object.entries(this.mapper)
      .sort(([, a], [, b]) => Number(a?.['sequence'] ?? 0) - Number(b?.['sequence'] ?? 0))
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
    await super.initialize();

    this.type = ListComponentsTypes.PAGINATED;
    this.empty = Object.assign({}, DefaultListEmptyOptions, this.empty);
    if (!this.initialized) {
      this.parseProps(this);
    }
    this.repositoryObserverSubject
      .pipe(debounceTime(100), shareReplay(1), takeUntil(this.destroySubscriptions$))
      .subscribe(([modelInstance, event, uid]) =>
        this.handleObserveEvent(modelInstance, event, uid),
      );
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
    console.log(this.items);
  }

  getOperations() {
    if (this.allowOperations) {
      this.allowOperations =
        this.isAllowed(OperationKeys.UPDATE) || this.isAllowed(OperationKeys.DELETE);
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

  protected override itemMapper(item: KeyValue, mapper: KeyValue, props: KeyValue = {}): KeyValue {
    this.model = item as Model;
    const mapped = super.itemMapper(
      item,
      this.cols.filter((c) => c !== 'actions'),
      props,
    );
    const { children } = (this.props as KeyValue) || [];

    return Object.keys(mapped).reduce(
      (accum: KeyValue, curr: string, index: number) => {
        try {
          const child = children[index];
          if (child) {
            const { events, name } = child?.['props'] || {};
            if (events) {
              const sequence =
                (mapper[name]?.sequence || index) + (!this.cols.includes('actions') ? 1 : 0);
              const eventsObject = this.parseEvents(events);
              Object.entries(eventsObject).forEach(([key, evt]) => {
                const handler = evt.bind(this);
                if (key === ComponentEventNames.Render) {
                  if (handler instanceof Promise) {
                    (async () => await handler)();
                  } else {
                    handler();
                  }
                }
                if (key === 'handleClick' || key === 'handleAction') {
                  accum = {
                    ...accum,
                    handler: {
                      col: String(sequence),
                      handle: (this.handleAction = (...args: unknown[]) => {
                        const handlerFn = handler(this, ...args);
                        return typeof handlerFn === 'function' ? handlerFn() : handlerFn;
                      }),
                    },
                  };
                }
              });
            }
          }
        } catch (error) {
          this.log
            .for(this.itemMapper)
            .error(`Error mapping child events. ${(error as Error)?.message || error}`);
        }
        const parserFn = mapper[this.cols[index]]?.valueParserFn || undefined;
        return {
          ...accum,
          [curr]: parserFn ? parserFn(mapped[curr], this) : mapped[curr],
        };
      },
      { ...props },
    );
  }

  override async mapResults(data: KeyValue[]): Promise<KeyValue[]> {
    this._data = [...data];
    if (!data || !data.length) return [];
    return data.reduce(
      (accum: KeyValue[], curr) => [
        ...accum,
        this.itemMapper(curr, this.mapper, { uid: curr[this.pk] }),
      ],
      [],
    );
  }

  async handleAction(
    event: Event,
    uid: string,
    action: CrudOperations,
    redirect?: boolean,
  ): Promise<void> {
    // if (action === OperationKeys.READ && !this.isAllowed(OperationKeys.UPDATE)) {
    //   redirect = false;
    // }
    if (redirect) {
      await this.router.navigate([`/${this.route}/${action}/${uid}`]);
    }
    event.stopImmediatePropagation();
    const data = this._data as [];
    if (data) {
      const item = data.find((item) => item[this.pk] === uid) || {};
      this.listenEvent.emit({ name: ComponentEventNames.Click, data: item });
    }
  }

  async openFilterSelectOptions(event: Event): Promise<void> {
    const type =
      this.filterOptions.length > 10 ? SelectFieldInterfaces.MODAL : SelectFieldInterfaces.POPOVER;
    if (type === SelectFieldInterfaces.MODAL) {
      event.preventDefault();
      event.stopImmediatePropagation();
      const title = await this.translate(`${this.locale}.filter_by`);
      const modal = await getNgxSelectOptionsModal(
        title,
        this.filterOptions as SelectOption[],
        this.injector,
      );
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
