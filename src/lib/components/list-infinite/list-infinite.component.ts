import { Component, OnInit, EventEmitter, Output, Input, HostListener  } from '@angular/core';
import { InfiniteScrollCustomEvent, RefresherCustomEvent, SpinnerTypes } from '@ionic/angular';
import {
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonItem,
  IonLabel,
  IonList,
  IonRefresher,
  IonRefresherContent,
  IonSkeletonText,
  IonText,
  IonThumbnail
} from '@ionic/angular/standalone';
import { debounceTime, Subject } from 'rxjs';
import { Repository } from '@decaf-ts/db-decorators';
import { Model } from '@decaf-ts/decorator-validation';
import {
  BaseCustomEvent,
  Dynamic,
  EventConstants,
  ComponentsTagNames,
  ModelRenderCustomEvent,
  StringOrBoolean,
  KeyValue,
  ListItemCustomEvent
} from 'src/lib/engine';
import { ForAngularModule } from 'src/lib/for-angular.module';
import { NgxBaseComponent, PaginatedQuery } from 'src/lib/engine/NgxBaseComponent';
import {
  stringToBoolean,
  arrayQueryByString,
  consoleError,
  consoleWarn,
  formatDate,
  isValidDate
} from 'src/lib/helpers';
import { SearchbarComponent } from '../searchbar/searchbar.component';
import { EmptyStateComponent } from '../empty-state/empty-state.component';
import { ListItemComponent } from '../list-item/list-item.component';
import { UiElementComponent } from '../ui-element/ui-element.component';
import { PaginationCustomEvent } from '../pagination/pagination.component';

@Dynamic()
@Component({
  selector: 'ngx-decaf-list-infinite',
  templateUrl: './list-infinite.component.html',
  styleUrls: ['./list-infinite.component.scss'],
  standalone: true,
  imports: [
    ForAngularModule,
    IonRefresher,
    IonList,
    IonItem,
    IonThumbnail,
    IonSkeletonText,
    IonLabel,
    IonText,
    IonRefresherContent,
    IonInfiniteScroll,
    IonInfiniteScrollContent,
    IonThumbnail,
    IonSkeletonText,
    SearchbarComponent,
    EmptyStateComponent,
    ListItemComponent,
    UiElementComponent
  ]

})
export class ListInfiniteComponent extends NgxBaseComponent implements OnInit {

  @Input()
  showSearchbar: StringOrBoolean = true;

  /**
   * Array with items
   */
  @Input()
  data?: KeyValue[] | undefined = undefined;

  /**
   * URL to request data or function to request for data
   */
  @Input()
  source!: string | Function;

  /**
   * Result start index
   */
  @Input()
  start: number = 0;

  /**
   * Limit of items by page
   */
  @Input()
  limit: number = 10;

  /**
   * Enable / Disable scrool to load more items
   */
  @Input()
  loadMoreData: StringOrBoolean = true

  /**
   * Style of list items
   */
  @Input()
  lines: "inset" | "full" | "none" = "full";

  /**
   * If true, the list will have margin around it and rounded corners.
   */
  @Input()
  inset: StringOrBoolean = false;

  /**
   * The threshold distance from the bottom of the content to call the infinite output event when scrolled.
   * The threshold value can be either a percent, or in pixels.
   * For example, use the value of 10% for the infinite output event to get called when the user has scrolled 10% from the bottom of the page.
   * Use the value 100px when the scroll is within 100 pixels from the bottom of the page.
   */
  @Input()
  scrollThreshold: string = "15%";

  /**
   * The position of the infinite scroll element. The value can be either top or bottom. Defaults to bottom
   */
  @Input()
  scrollPosition: "bottom" | "top" = "bottom";

  /**
   * The text that appears when we are fetching new elements
   */
  @Input()
  loadingText?: string;

  /**
   * Enable / Disable refresherer
   */
  @Input()
  showRefresher: StringOrBoolean = true;

  /**
   * The spinner animation that appears when we are fetching new elements
   */
  @Input()
  loadingSpinner: SpinnerTypes = "circular";

  @Input()
  query?: string | KeyValue;

  @Input()
  sort?: string | KeyValue;

  @Input()
  emptyTitle: string = "empty.title";

  @Input()
  emptySubtitle!: string;

  @Input()
  emptyIcon?: string = 'ti-database-exclamation';

  @Input()
  emptyButtonShow: boolean = false;

  @Input()
  emptyButtonLink!: string;

  @Input()
  emptyButtonText: string = "empty.button";

  page: number = 1;

  pages!: number;

  refreshing: boolean = false;

  skeletonData: string[] = new Array(2);

  items!: KeyValue[];

  currentRoute!: string;

  searchEmptyTitle!: string;

  searchEmptySubtitle!: string;

  searchValue?: string;

  hasScroll: boolean = true;

  lastResult: PaginatedQuery | undefined = undefined;

  type: 'infinite' | 'paginated' = 'infinite';

  hasPagination!: StringOrBoolean;

  @Output()
  refreshEvent = new EventEmitter<BaseCustomEvent>();

  @Output()
  clickEvent = new EventEmitter<KeyValue>();

  private clickItemSubject = new Subject<CustomEvent | ListItemCustomEvent | ModelRenderCustomEvent>();

  constructor() {
    super("ListComponent");
  }


  /**
   * Lifecycle hook that is called after data-bound properties of a directive are initialized.
   * This method is part of Angular's component lifecycle and is used for any additional initialization tasks.
   *
   * @returns {void} This method does not return a value.
   */
  async ngOnInit(): Promise<void> {
    this.clickItemSubject.pipe(debounceTime(100)).subscribe(event => this.clickEventEmit(event));

    this.limit = Number(this.limit);
    this.start = Number(this.start);
    this.inset = stringToBoolean(this.inset);
    this.showRefresher = stringToBoolean(this.showRefresher);
    this.emptyButtonShow = stringToBoolean(this.emptyButtonShow);
    this.loadMoreData = stringToBoolean(this.loadMoreData);
    this.showSearchbar = stringToBoolean(this.showSearchbar);
    this.hasScroll = this.showSearchbar;
    if(typeof this.item?.['tag'] === 'boolean' && this.item?.['tag'] === true)
      this.item['tag'] = ComponentsTagNames.LIST_ITEM as string;
    // this.searchEmptyTitle = await this.localeService.get(`${this.locale}.search.title`);
    // this.searchEmptySubtitle = await this.localeService.get(`${this.locale}.search.subtitle`);
    await this.refresh();
  }

  ngOnDestroy(): void {
    this.model = undefined;
  }

  @HostListener('window:ListItemClickEvent', ['$event'])
  handleClick(event: CustomEvent | ListItemCustomEvent | ModelRenderCustomEvent) {
    this.clickItemSubject.next(event);
  }

  @HostListener('window:searchbarEvent', ['$event'])
  async handleSearch(value: string | undefined) {
    if(this.type === 'infinite') {
      this.loadMoreData = false;
      if(value === undefined) {
        this.data = [];
        this.loadMoreData = true;
        this.page = 1;
      }
      this.searchValue = value;
      await this.refresh(true);
    } else {
      this.loadMoreData = true;
      this.searchValue = value;
      // await this.refresh(true);
    }
  }

  refreshEventEmit(data?: KeyValue[]) {
    if(!data)
      data = this.items;
    this.skeletonData = new Array(data?.length || 2);
    this.refreshEvent.emit({
      name: EventConstants.REFRESH_EVENT,
      data: data || [],
      component: this.componentName
    });
}

  private clickEventEmit(event: CustomEvent | ListItemCustomEvent | ModelRenderCustomEvent) {
   this.clickEvent.emit((event as ModelRenderCustomEvent)?.detail ? (event as ModelRenderCustomEvent)?.detail : event);
  }

  async delete(id: string, pk: string) {
    this.data = this.data?.filter((item: KeyValue) => item[pk || this.pk] !== id) || [];
    this.refreshEventEmit(this.data);
  }

  @HostListener('window:BackButtonNavigationEndEvent', ['$event'])
  async refresh(event: InfiniteScrollCustomEvent | RefresherCustomEvent | boolean = false): Promise<void> {
    //  if(typeof force !== 'boolean' && force.type === EventConstants.BACK_BUTTON_NAVIGATION) {
    //    const {refresh} = (force as CustomEvent).detail;
    //    if(!refresh)
    //      return false;
    //  }

    this.refreshing = true;

    let start: number = this.page > 1 ? (this.page - 1) * this.limit : this.start;
    let limit: number = (this.page * (this.limit > 12 ? 12 : this.limit));
    console.log(start, limit);
    if(!this.model) {
      await this.getFromRequest(!!event, start, limit);
    } else {
      // this.refreshManager();
      this.data = await this.getFromModel(!!event, start, limit) as KeyValue[];
    }
    this.refreshEventEmit();

    if(this.page === this.pages) {
      if((event as InfiniteScrollCustomEvent)?.target)
        (event as InfiniteScrollCustomEvent).target.complete();
      this.loadMoreData = false;
    } else {
      this.page += 1;
      this.refreshing = false;
      setTimeout(() => {
          if((event as InfiniteScrollCustomEvent)?.target && (event as CustomEvent)?.type !== EventConstants.BACK_BUTTON_NAVIGATION)
            (event as InfiniteScrollCustomEvent).target.complete();
      }, 200);
    }
  }

  handlePaginate(event: PaginationCustomEvent) {
    const {direction, page} = event.data;
    this.page = page;
    this.refresh(true);
  }

  async forceRefresh(event?: InfiniteScrollCustomEvent): Promise<void> {
    this.refresh(event || true);
  }

  async clearSearch() {
    return await this.handleSearch(undefined);
  }

  async parseSearchResults(results: KeyValue[], search: string) {
    return [ ... arrayQueryByString(results || [], search)];
  }
  async getFromRequest(force: boolean = false, start: number, limit: number) {
    const self = this;
    let request: any = [];
    if(self?.data?.length && !force) {
      self.items = (self.items || []).concat([...self.data.slice(start, limit)]);
    }
    else if(!self.data?.length && !!self.source || force || self.searchValue?.length) {
      // (self.data as ListItem[]) = [];
      if(!self.searchValue?.length) {
        if(!self.source && !self.data?.length)
          return consoleWarn(this, 'No data and source passed to infinite list');
        //  if(typeof self.source === 'string')
        //    request = await this.requestService.prepare(self.source as string);
        if(self.source instanceof Function)
          request = await self.source();

        if(!!request && !Array.isArray(request))
          request = request?.response?.data || request?.results || [];
        const rawQuery = this.parseQuery(self.model as Repository<Model>, start, limit);
        self.data = [...this.parseResult(request)];
        if(self.data?.length)
          self.items = this.type === 'infinite' ?
            (self.items || []).concat([...self.data.slice(start, limit)]) : [...request.slice(start, limit) as KeyValue[]];
      } else {
        self.data = await self.parseSearchResults(self.data as [], self.searchValue as string);
        self.items = self.data;
      }
    }
  }

 async getFromModel(force: boolean = false, start: number, limit: number): Promise<KeyValue>{
    let data = [ ... this.data || []];
    let request: KeyValue[] = [];
    if(!this.data?.length || force || this.searchValue?.length) {
      try {
        if(!this.searchValue?.length) {
          (this.data as KeyValue[]) = [];
          // const rawQuery = this.parseQuery(self.model as Repository<Model>, start, limit);
          request = this.parseResult(await (this.model as any)?.paginate(start, limit));
        } else {
          request = this.parseResult(await (this.model as any)?.find(this.searchValue));
          data = [];
        }
        data = this.type === 'infinite' ?
          [... (data).concat(...request)] : [...request];
      } catch(error: any) {
        consoleError(this, error?.message || `Unable to find ${this.model} on registry. Return empty array from component`);
      }
    }
    if(data?.length) {
      if(this.searchValue) {
        this.items = [...data];
        if(this.items?.length <= this.limit)
          this.loadMoreData = false;
      } else {
        this.items = [...data];
      }
    }
    return data || [] as KeyValue[];
 }


 protected parseQuery(manager: Repository<Model>, start: number, limit: number): KeyValue {
  const model = this.model as Repository<Model>;
  const pk = model?.pk || this.pk;
  const table = model?.class || model?.constructor?.name;
  const query = !!this.query ?
    typeof this.query === 'string' ? JSON.parse(this.query) : this.query : {};
  const rawQuery: KeyValue = {
    selector: Object.assign({}, {
      [pk]: {"$gt": null},
      "?table": table
    }, query)
  };

  if(limit!== 0) {
    rawQuery['skip']  = start;
    rawQuery['limit'] = limit;
  }
  return rawQuery;
 }

 protected parseResult(result: KeyValue[] | PaginatedQuery): KeyValue[] {
  if(!Array.isArray(result) && ('page' in result && 'total' in result)) {
    this.lastResult = result;
    console.log(result);
    const { total, page } = result;
    result = page;
    this.getPages(total);
  } else {
    this.getPages((result as KeyValue[])?.length || 0);
  }
  return this.mapResults(result);
 }

 getPages(length: number) {
   if(length <= this.limit) {
    this.loadMoreData = false;
  } else {
    this.pages = Math.floor(length / this.limit);
    if((this.pages * this.limit) < length)
      this.pages += 1;
    if(this.pages  === 1)
      this.loadMoreData = false;
  }
  // if(this.type === 'infinite') {
  //   if(length <= this.limit)
  //     return this.loadMoreData = false;
  //   this.pages = Math.floor(length / this.limit);
  //   if((this.pages * this.limit) < length)
  //     this.pages += 1;
  //   if(this.pages === 1)
  //     this.loadMoreData = false;
  // }
 }

 protected itemMapper(item: KeyValue, mapper: KeyValue, props?: KeyValue): KeyValue {
  return Object.entries(mapper).reduce((accum: KeyValue, [key, value]) => {
    const arrayValue = value.split('.');
    if (!value) {
      accum[key] = value;
    } else {
      if (arrayValue.length === 1) {
        value = item?.[value] || value;
        if(isValidDate(value))
          value = `${formatDate(value)}`;
        accum[key] = value;
      } else {
        let val;

        for (let _value of arrayValue)
          val = !val
            ? item[_value]
            : (typeof val === 'string' ? JSON.parse(val) : val)[_value];


        if (isValidDate(new Date(val)))
          val = `${formatDate(val)}`;

        accum[key] = val === null || val === undefined ? value : val;
      }
    }
    return Object.assign({}, props || {}, accum);
  }, {});
 }


  mapResults(data: KeyValue[]): KeyValue[] {
    if(!data || !data.length || !Object.keys(this.mapper || {}).length)
      return [];
    // passing uid as prop to mapper
    this.mapper = {... this.mapper, ... {uid: this.pk}};
    const props = Object.assign({
      operations: this.operations,
      route: this.route,
      ...  Object.keys(this.item).reduce((acc: KeyValue, key: string) => {
        acc[key] = this.item[key];
        return acc;
      }, {}),
      // ... (!this.item.render ? {} :  Object.keys(this.item).reduce((acc: KeyValue, key: string) => {
      //   acc[key] = this.item[key as keyof IListItemProp];
      //   return acc;
      // }, {}))
    });
    return data.reduce((accum: KeyValue[], curr) => {
        accum.push({... this.itemMapper(curr, this.mapper as KeyValue, props), ... {pk: this.pk}});
        return accum;
    }, []);
  }

}

