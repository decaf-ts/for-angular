import { Component, OnInit, EventEmitter, Output, Input, HostListener  } from '@angular/core';
import { InfiniteScrollCustomEvent, RefresherCustomEvent, SpinnerTypes } from '@ionic/angular';
import { IonInfiniteScroll, IonInfiniteScrollContent, IonItem, IonLabel, IonList, IonRefresher, IonSkeletonText, IonText, IonThumbnail } from '@ionic/angular/standalone';

import { ForAngularModule } from 'src/lib/for-angular.module';
import { IListComponentRefreshEvent,  IListItemProps, IListItemComponent, KeyValue, ListItemActionEvent, StringOrBoolean } from 'src/lib/engine/types';
import { getInjectablesRegistry, getLocaleFromClassName } from 'src/lib/helpers/utils';
import { stringToBoolean } from 'src/lib/helpers/string';
import { EventConstants} from 'src/lib/engine/constants';
import { arrayQueryByString, arraySortByDate, itemMapper } from 'src/lib/helpers/array';
import { consoleError, consoleWarn } from 'src/lib/helpers/logging';
import { CrudOperations, OperationKeys } from '@decaf-ts/db-decorators';
import { NgxBaseComponent, PaginatedQuery } from 'src/lib/engine/NgxBaseComponent';
import { SearchbarComponent } from '../searchbar/searchbar.component';
import { EmptyStateComponent } from '../empty-state/empty-state.component';
import { Dynamic } from 'src/lib/engine';
import { Repository } from '@decaf-ts/db-decorators';
import { Model } from '@decaf-ts/decorator-validation';
// import { RequestService } from 'src/lib/services/request.service';
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
      IonLabel,
      IonText,
      IonInfiniteScroll,
      IonInfiniteScrollContent,
      IonThumbnail,
      IonSkeletonText,
      SearchbarComponent,
      EmptyStateComponent]

})
export class ListInfiniteComponent extends NgxBaseComponent implements OnInit {


  @Input()
  showSearchbar: StringOrBoolean = false;

  /**
   * Model primary key
   */
  @Input()
  modelPk: string = 'id';

  /**
   * Application url for model
   */
  @Input()
  modelPage!: string;

  /**
   * Operations of list item
   */
  @Input()
  modelOperations: CrudOperations = OperationKeys.READ;

  /**
   * Config for list items rendering
   */
  @Input()
  item: IListItemProps = {render: false};

  /**
   * Array with items
   */
  @Input()
  data?: IListItemComponent[] | undefined = undefined;

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
  limit: number = 12;

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
  scrollThreshold: string = "25%";

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

  currentPage: number = 1;

  pages!: number;

  refreshing: boolean = false;

  skeletonData: string[] = new Array(2);

  items!: IListItemComponent[];

  currentRoute!: string;

  initialized: boolean = true;

  searchEmptyTitle!: string;

  searchEmptySubtitle!: string;

  searchValue?: string;

  hasScroll: boolean = true;

  @Output()
  refreshEvent = new EventEmitter<KeyValue[]>();

  @Output()
  clickEvent = new EventEmitter<KeyValue>();

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
    this.limit = Number(this.limit);
    this.start = Number(this.start);
    this.inset = stringToBoolean(this.inset);
    this.item.render = stringToBoolean(this.item.render);
    this.showRefresher = stringToBoolean(this.showRefresher);
    this.emptyButtonShow = stringToBoolean(this.emptyButtonShow);
    this.loadMoreData = stringToBoolean(this.loadMoreData);
    this.showSearchbar = stringToBoolean(this.showSearchbar);
    this.hasScroll = this.showSearchbar;
    this.locale = this.getLocale(this.translatable);
    // this.searchEmptyTitle = await this.localeService.get(`${this.locale}.search.title`);
    // this.searchEmptySubtitle = await this.localeService.get(`${this.locale}.search.subtitle`);
    await this.refresh();
  }

 ngOnDestroy(): void {
   // self.manager?.unregisterObservable(self);
   this.manager = undefined;
 }


 protected refreshEventEmit(data?: KeyValue[]) {
  if(!data)
    data = this.items;
  this.skeletonData = new Array(data?.length || 2);
  // if(!this.item.render)
  // console.log(data);
  this.refreshEvent.emit(data);
 }

 async handleItemAction(event: ListItemActionEvent) {
   if(this.item.render)
     this.clickEvent.emit(event);
 }

 async delete(id: string, pk: string) {
   this.data = this.data?.filter((item: KeyValue) => item[pk || this.modelPk] !== id) || [];
   this.refreshEventEmit(this.data);
 }

 @HostListener('window:BackButtonNavigationEndEvent', ['$event'])
 async refresh(event: InfiniteScrollCustomEvent | RefresherCustomEvent | boolean = false): Promise<void> {
   const self = this;

  //  if(typeof force !== 'boolean' && force.type === EventConstants.BACK_BUTTON_NAVIGATION) {
  //    const {refresh} = (force as CustomEvent).detail;
  //    if(!refresh)
  //      return false;
  //  }

   self.refreshing = true;

   let start: number = this.currentPage > 1 ? (self.currentPage - 1) * self.limit : self.start;
   let limit: number = (self.currentPage * (self.limit > 12 ? 12 : self.limit));

   if(!this.manager) {
     await self.getFromRequest(!!event, start, limit);
   } else {
     // self.refreshManager();
     await self.getFromManager(!!event, start, limit);
   }
   this.refreshEventEmit();

   if(this.currentPage === this.pages) {
    if((event as InfiniteScrollCustomEvent)?.target)
      (event as InfiniteScrollCustomEvent).target.complete();
    this.loadMoreData = false;
  } else {
    this.currentPage += 1;
    this.refreshing = false;
    setTimeout(() => {
        if((event as InfiniteScrollCustomEvent)?.target && (event as CustomEvent)?.type !== EventConstants.BACK_BUTTON_NAVIGATION)
          (event as InfiniteScrollCustomEvent).target.complete();
    }, 100);
  }
 }

 async forceRefresh(event?: InfiniteScrollCustomEvent): Promise<void> {
   this.refresh(event);
 }

 async clearSearch() {
   return await this.handleSearch(undefined);
 }

 @HostListener('window:searchbarEvent', ['$event'])
 async handleSearch(value: string | undefined) {
  if(value === undefined) {
    this.data = [];
    this.loadMoreData = true;
    this.currentPage = 1;
  }
   this.searchValue = value;
   await this.refresh(true);
 }

  async parseSearchResults(results: IListItemComponent[], search: string) {
   results = [... arrayQueryByString(results || [], search)];
   if(!results?.length) {
    this.searchEmptyTitle = "No results found";
    this.searchEmptySubtitle = `You searched for <strong>"${search}"</strong>`;
    //  this.searchEmptyTitle = await this.localeService.get(`${this.locale}.search.title`);
    //  this.searchEmptySubtitle = await this.localeService.get(`${this.locale}.search.subtitle`, {value: search});
   }
   return results;

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

      const rawQuery = this.parseQuery(self.manager as Repository<Model>, start, limit);
      request = this.parseResult(request || []);
      self.data = (self.data || []).concat(...request);

      if(self.data?.length)
        self.items = (self.items || []).concat([...self.data.slice(start, limit)]);
    } else {
      self.data = await self.parseSearchResults(self.data as [], self.searchValue as string);
      self.items = self.data;
    }
   }
 }


 async getFromManager(force: boolean = false, start: number, limit: number): Promise<any>{
  const self = this;
    self.items = [];
    let data = [ ... self.data || []];
    if(!self.data?.length || force || self.searchValue?.length) {
      try {
        let request: any;

        if(!self.searchValue?.length) {
          (self.data as KeyValue[]) = [];
          if(typeof self.manager === 'string')
            self.manager = getInjectablesRegistry().get(self.manager) as Repository<Model>;
          const rawQuery = this.parseQuery(self.manager as Repository<Model>, start, limit);
          request = this.parseResult(await (self.manager as any)?.query(start, limit));
        } else {
          request = await self.parseSearchResults(self.data || [], self.searchValue as string);
          data = [];
        }

        self.data = [... (data).concat(...request)];

      } catch(e) {
        consoleError(this, `Unable to find ${self.manager} on registry. Return empty array from component`);
      }
    }

    if(self.data?.length) {
      if(self.searchValue) {
        self.items = [...self.data];
        if(self.items?.length <= self.limit)
          self.loadMoreData = false;
      } else {
        self.items = [...self.data];
      }
    }
 }


 protected parseQuery(manager: Repository<Model>, start: number, limit: number): KeyValue {
  const pk = this.manager?.pk || this.modelPk;
  const table = this.manager?.class || this.manager?.constructor?.name;
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
  if(!Array.isArray(result) && ('page' in result && 'data' in result)) {
    const {total, data } = result;
    this.getPages(total);
    result = data;
  } else {
    this.getPages((result as KeyValue[])?.length || 0);
  }
  if(!!this.item?.mapper)
    result = this.itemsMapper(result as KeyValue[]);
  return result as  KeyValue[];
 }

 getPages(resultsLength: number) {
   if(resultsLength <= this.limit)
     return this.loadMoreData = false;
   this.pages = Math.floor(resultsLength / this.limit);
   if((this.pages * this.limit) < resultsLength)
     this.pages += 1;
   if(this.pages === 1)
     this.loadMoreData = false;
 }


  itemsMapper(data: KeyValue[]): KeyValue[] {
    if(!data || !data.length)
      return [];

    this.item.mapper = Object.assign({}, {modelId: this.item.modelId || 'id'}, this.item.mapper);
    const props = Object.assign({}, {
      modelPk: this.modelPk,
      modelOperations: this.modelOperations || [],
      modelPage: this.modelPage || '',
      translateProps: this.item?.['translateProps'] || []
    });
    return data.reduce((accum: KeyValue[], curr) => {
        accum.push(itemMapper(curr, this.item.mapper as KeyValue, props));
        return accum;
    }, []);
  }

}

