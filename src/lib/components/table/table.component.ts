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
import { ActionRoles, ListComponentsTypes, SelectFieldInterfaces } from '../../engine/constants';
import { Dynamic } from '../../engine/decorators';
import { IFilterQuery } from '../../engine/interfaces';
import { getModelAndRepository } from '../../for-angular-common.module';



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

  allowOperations: boolean = true;

  routerService: NgxRouterService = inject(NgxRouterService);

  injector: EnvironmentInjector = inject(EnvironmentInjector);

  private get _cols(): string[] {
    return Object.entries(this.mapper)
      .sort(([, a], [, b]) => Number(a?.['sequence'] ?? 0) - Number(b?.['sequence'] ?? 0))
      .map(([key]) => key);
  }

  override async ngOnInit(): Promise<void> {
    this.type = ListComponentsTypes.PAGINATED;
    this.cols = this._cols as string[];
    this.allowOperations = this.isAllowed(OperationKeys.UPDATE) || this.isAllowed(OperationKeys.DELETE);
    this.searchValue = undefined;
    if(this.allowOperations)
      this.cols.push('actions');
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
    await this.refresh();
  }

  protected async getFilterOptions(): Promise<void> {
    const repo = getModelAndRepository(this.filterModel);
    if(repo) {
      const {repository, pk} = repo;
      if(!this.filterBy)
        this.filterBy = pk as keyof Model;
      const optionsMapperFn = this.filterOptionsMapper || ((item: KeyValue) => ({
        text: `${item[pk]}`,
        value: `${item[pk]}`,
      }));
      const query = await repository.select().execute();
      if(query?.length)
        this.filterOptions = query.map((item: KeyValue) => optionsMapperFn(item));
    }
  }

  protected override itemMapper(item: KeyValue, mapper: KeyValue, props: KeyValue = {}): KeyValue {
    item = super.itemMapper(item, this.cols.filter(c => c !== 'actions'), props);
    return Object.keys(item).reduce((accum: KeyValue, curr: string, index: number) => {
      const parserFn = mapper[this.cols[index]]?.valueParserFn || undefined;
      let value = item[curr];
      if(parserFn)
        value = parserFn(value, this);
      return {...accum, [curr]: value};
    }, {});
  }

  override mapResults(data: KeyValue[]): KeyValue[] {
    if (!data || !data.length)
      return [];
    return data.reduce((accum: KeyValue[], curr) => [
      ...accum,
      this.itemMapper(curr, this.mapper, { uid: curr[this.pk] })
    ], []);
  }

  async handleAction(event: Event, action: CrudOperations, uid: string): Promise<void> {
    event.stopImmediatePropagation();
    await this.router.navigate([`/${this.route}/${action}/${uid}`]);
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
          {index: 'productCode', value: this.filterValue, condition: 'Contains'}
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
