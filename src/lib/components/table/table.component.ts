import { Component, EnvironmentInjector, inject, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { IonSelect, IonSelectOption } from '@ionic/angular/standalone';
import { CrudOperations, OperationKeys } from '@decaf-ts/db-decorators';
import { Model } from '@decaf-ts/decorator-validation';
import { OrderDirection } from '@decaf-ts/core';
import { SearchbarComponent } from '../searchbar/searchbar.component';
import { IconComponent } from '../icon/icon.component';
import { PaginationComponent } from '../pagination/pagination.component';
import { ListComponent } from '../list/list.component';
import { getNgxSelectOptionsModal } from '../modal/modal.component';
import { EmptyStateComponent } from '../empty-state/empty-state.component';
import { NgxRouterService } from '../../services/NgxRouterService';
import { FunctionLike, KeyValue, SelectOption } from '../../engine/types';
import { ActionRoles, ComponentEventNames, DefaultListEmptyOptions, ListComponentsTypes, SelectFieldInterfaces } from '../../engine/constants';
import { Dynamic } from '../../engine/decorators';
import { IBaseCustomEvent, IFilterQuery } from '../../engine/interfaces';
import { UIKeys } from '@decaf-ts/ui-decorators';
import { getModelAndRepository } from 'src/lib/engine/helpers';



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
    PaginationComponent
  ]
})
export class TableComponent extends ListComponent  implements OnInit {

  @Input()
  filterModel!: Model | string;

  @Input()
  filterOptions!: SelectOption[];

  @Input()
  filterBy!: keyof Model;

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

  injector: EnvironmentInjector = inject(EnvironmentInjector);

  private get _cols(): string[] {
    this.mapper = this._mapper;
    return Object.entries(this.mapper)
      .sort(([, a], [, b]) => Number(a?.['sequence'] ?? 0) - Number(b?.['sequence'] ?? 0))
      .map(([key]) => key);
  }

  private get _headers(): string[] {
    return this.cols.map(col => col);
  }

  get _mapper(): KeyValue {
    return Object.keys(this.mapper).reduce((accum: KeyValue, curr: string) => {
      const mapper = (this.mapper as KeyValue)[curr];
      if(typeof mapper === 'object' && 'sequence' in mapper)
        accum[curr] = mapper;
      return accum;
    }, {} as KeyValue);
  }

  override async ngOnInit(): Promise<void> {

    this.initialized = false;
    this.type = ListComponentsTypes.PAGINATED;
    this.empty = Object.assign({}, DefaultListEmptyOptions, this.empty);
    if (!this.initialized)
      this.parseProps(this);

    this.cols = this._cols as string[];
    if(this.allowOperations)
      this.allowOperations = this.isAllowed(OperationKeys.UPDATE) || this.isAllowed(OperationKeys.DELETE);
    this.searchValue = undefined;
    if(this.operations)
      this.cols.push('actions');
    this.headers = this._headers;
    const filter = this.routerService.getQueryParamValue('filter') as string;
    if(filter) {
     const value = this.routerService.getQueryParamValue('value') as string;
     this.searchValue = {
        query: [
          {
            index: filter,
            condition: 'Contains',
            value
          }
        ],
        sort: {
          value: filter,
          direction: OrderDirection.ASC
        }
      };
    }
    if(this.filterModel)
      await this.getFilterOptions();

    this.initialized = true;
    await this.refresh();
  }

  protected async getFilterOptions(): Promise<void> {
    const repo = getModelAndRepository(this.filterModel);
    if(repo) {
      const {repository, pk} = repo;
      if(!this.filterBy)
        this.filterBy = pk as keyof Model;
      if(!this.filterOptionsMapper) {
        this.filterOptionsMapper = this.filterOptionsMapper || ((item) => ({
          text: `${item[pk]}`,
          value: `${item[pk]}`,
        }));
      }
      const query = await repository.select().execute();
      if(query?.length)
        this.filterOptions = query.map((item) => this.filterOptionsMapper(item));
    }
  }


  protected override itemMapper(item: KeyValue, mapper: KeyValue, props: KeyValue = {}): KeyValue {
    this.model = item as Model;
    const mapped = super.itemMapper(item, this.cols.filter(c => c !== 'actions'), props);
    const {children} = this.props || [];
    return Object.keys(mapped).reduce((accum: KeyValue, curr: string, index: number) => {
      const child = (children as KeyValue[])?.[index];
      if(child) {
        const {events} = child?.['props'] || {};
        if(events) {
          const {render} = events || undefined;
          if(render) {
            const clazz = new(events.render())();
            const renderFn = clazz.render.bind(this);
            if(renderFn instanceof Promise)  {
              ( async () => await renderFn)();
            }
            else {
              renderFn();
            }
          }
        }
      }
      const parserFn = mapper[this.cols[index]]?.valueParserFn || undefined;
      return {...accum, [curr]: parserFn ? parserFn(mapped[curr], this) : mapped[curr]};
    }, {... props});
  }

  override async mapResults(data: KeyValue[]): Promise<KeyValue[]> {
    if (!data || !data.length)
      return [];
    return data.reduce((accum: KeyValue[], curr) => [
      ...accum,
      this.itemMapper(curr, this.mapper, { uid: curr[this.pk] })
    ], []);
  }

  async handleAction(event: Event, action: CrudOperations, uid: string): Promise<void> {
    event.stopImmediatePropagation();
    if(this.isAllowed(action))
      await this.router.navigate([`/${this.route}/${action}/${uid}`]);
    const data = this.items.find(item => item['uid'] === uid);
    if(data)
      this.listenEvent.emit({name: ComponentEventNames.CLICK, data});
  }

  async openFilterSelectOptions(event: Event): Promise<void> {
    const type = (this.filterOptions.length > 10 ? SelectFieldInterfaces.MODAL : SelectFieldInterfaces.POPOVER);
    if(type === SelectFieldInterfaces.MODAL) {
      event.preventDefault();
      event.stopImmediatePropagation();
      const title = await this.translate(`${this.locale}.filter_by`);
      const modal = await getNgxSelectOptionsModal(title, this.filterOptions as SelectOption[], this.injector);
      this.changeDetectorRef.detectChanges();
      const {data, role} = await modal.onWillDismiss();
      if(role === ActionRoles.confirm && data !== this.filterValue) {
        this.filterValue = data;
        await this.handleSearch({query: [
          {index: this.filterBy, value: this.filterValue, condition: 'Contains'}
        ]} as IFilterQuery);
      }
    }
  }

  async handleFilterSelectClear(event: CustomEvent) {
    event.preventDefault();
    event.stopImmediatePropagation();
    if(this.filterValue !== undefined) {
      this.filterValue = undefined;
      await this.clearSearch();
    }
  }
}
