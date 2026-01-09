import { Component, EnvironmentInjector, inject, Input, OnInit } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { CrudOperations, OperationKeys } from '@decaf-ts/db-decorators';
import { CommonModule } from '@angular/common';
import { OrderDirection } from '@decaf-ts/core';
import { IonSelect, IonSelectOption } from '@ionic/angular/standalone';
import { SearchbarComponent } from '../searchbar/searchbar.component';
import { IconComponent } from '../icon/icon.component';
import { PaginationComponent } from '../pagination/pagination.component';
import { ListComponent } from '../list/list.component';
import { getNgxSelectOptionsModal } from '../modal/modal.component';
import { EmptyStateComponent } from '../empty-state/empty-state.component';
import { NgxRouterService } from '../../services/NgxRouterService';
import { formatDate, isValidDate } from '../../utils/helpers';
import { KeyValue, SelectOption } from '../../engine/types';
import { ActionRoles, ListComponentsTypes, SelectFieldInterfaces } from '../../engine/constants';
import { Dynamic } from '../../engine/decorators';
import { IFilterQuery } from '../../engine/interfaces';


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
  filter!: SelectOption[];

  @Input()
  filterIndex!: string;

  @Input()
  filterLabel!: string;

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
    await this.refresh();
  }

  protected override itemMapper(item: KeyValue, mapper: KeyValue, props: KeyValue = {}): KeyValue {
    const mapped = Object.keys(item).reduce<KeyValue>((acc, curr: string) => {
      if(this.cols.includes(curr)) {
        let value = item[curr];
        const parserFn = mapper?.[curr]?.valueParserFn || undefined;
        if(typeof parserFn === Function.name.toLowerCase()) {
          value = parserFn(value, this);
        } else {
          if (isValidDate(new Date(value)))
            value = `${formatDate(value)}`;
        }
        acc[curr] = value;
      }
      return acc;
     }, { ...(props ?? {}) });
    return mapped;
  }

  override mapResults(data: KeyValue[]): KeyValue[] {
    if (!data || !data.length)
      return [];
    return data.reduce((accum: KeyValue[], curr) => {
      accum.push({
        ...this.itemMapper(curr, this.mapper, { uid: curr[this.pk] })
      });
      return accum;
    }, []);
  }

  async handleAction(event: Event, action: CrudOperations, uid: string): Promise<void> {
    event.stopImmediatePropagation();
    await this.router.navigate([`/${this.route}/${action}/${uid}`]);
  }

  async openFilterSelectOptions(event: Event): Promise<void> {
    const type = (this.filter.length > 10 ? SelectFieldInterfaces.MODAL : SelectFieldInterfaces.POPOVER);
    if(type === SelectFieldInterfaces.MODAL) {
      event.preventDefault();
      event.stopImmediatePropagation();
      const title = await this.translate(`${this.locale}.filter_by`);
      const modal = await getNgxSelectOptionsModal(title, this.filter as SelectOption[], this.injector);
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
