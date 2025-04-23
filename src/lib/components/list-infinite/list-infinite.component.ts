import { Component, OnInit, EventEmitter, Output, Input, HostListener  } from '@angular/core';
import { InfiniteScrollCustomEvent, SpinnerTypes } from '@ionic/angular';
import { ForAngularModule } from 'src/lib/for-angular.module';
import { IListComponentRefreshEvent, IListInfiteItemProps, IListItemComponent, KeyValue, ListItemActionEvent, StringOrBoolean } from 'src/lib/engine/types';
import { getLocaleFromClassName, queryInArray } from 'src/lib/helpers/utils';
import { stringToBoolean } from 'src/lib/helpers/string';
import { EventConstants} from 'src/lib/engine/constants';
import { arraySortByDate } from 'src/lib/helpers/array';
import { consoleError, consoleWarn } from 'src/lib/helpers/logging';
// import { RequestService } from 'src/lib/services/request.service';

@Component({
  selector: 'ngx-decaf-list-infinite',
  templateUrl: './list-infinite.component.html',
  styleUrls: ['./list-infinite.component.scss'],
  imports: [ForAngularModule],
  standalone: true,

})
export class ListInfiniteComponent implements OnInit {

  /**
   * translation component
   */
  @Input()
  locale: string = getLocaleFromClassName('ListInfiniteComponent');

  /**
  * The name of the manager to be used
  */
  @Input({alias: "manager"})
  manager?: any;


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
  modelOperations!: string[];

  /**
   * Config for list items rendering
   */
  @Input()
  itemProps: IListInfiteItemProps = {render: false};

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
  enableScroll: boolean | 'true' | 'false' = true

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

  @Input({alias: "query"})
  query?: string | KeyValue = undefined;

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

  paginationPages!: KeyValue[];

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
  itemClickEvent = new EventEmitter<KeyValue>();

  constructor() {}


  /**
  * Lifecycle hook that is called after data-bound properties of a directive are initialized.
  * This method is part of Angular's component lifecycle and is used for any additional initialization tasks.
  *
  * @returns {void} This method does not return a value.
  */
  async ngOnInit() {
    this.limit = Number(this.limit);
    this.start = Number(this.start);
    this.inset = stringToBoolean(this.inset);
    this.itemProps.render = stringToBoolean(this.itemProps.render);
    this.showRefresher = stringToBoolean(this.showRefresher);
    this.emptyButtonShow = stringToBoolean(this.emptyButtonShow);
    this.enableScroll = stringToBoolean(this.enableScroll);
    this.showSearchbar = stringToBoolean(this.showSearchbar);

    this.hasScroll = this.showSearchbar;

    // this.searchEmptyTitle = await this.localeService.get(`${this.locale}.search.title`);
    // this.searchEmptySubtitle = await this.localeService.get(`${this.locale}.search.subtitle`);

    this.refresh();
  }

 ngOnDestroy(): void {
   // self.manager?.unregisterObservable(self);
   this.manager = undefined;
 }


 private async refreshEventEmit(data: KeyValue[]) {
   this.skeletonData = new Array(data?.length || 2);
   if(!this.itemProps.render)
     this.refreshEvent.emit(data);
 }

 async handleItemAction(event: ListItemActionEvent) {
   if(this.itemProps.render)
     this.itemClickEvent.emit(event);
 }

 async delete(id: string, pk: string) {
   this.data = this.data?.filter((item: KeyValue) => item[pk || this.modelPk] !== id) || [];
   this.refreshEventEmit(this.data);
 }

 @HostListener('window:BackButtonNavigationEndEvent', ['$event'])
 async refresh(force: CustomEvent | boolean = false): Promise<any> {
   const self = this;

   if(typeof force !== 'boolean' && force.type === EventConstants.BACK_BUTTON_NAVIGATION) {
     const {refresh} = (force as CustomEvent).detail;
     if(!refresh)
       return false;
   }

   self.refreshing = true;

   let start: number = this.currentPage > 1 ? (self.currentPage - 1) * self.limit : self.start;
   let limit: number = (self.currentPage * (self.limit > 12 ? 12 : self.limit));

   if(!this.manager) {
     await self.getFromRequest(!!force, start, limit);
   } else {
     // self.refreshManager();
     await self.getFromManager(!!force, start, limit);
   }
   if(self.currentPage === self.pages) {
     if((force as InfiniteScrollCustomEvent)?.target)
       (force as InfiniteScrollCustomEvent).target.complete();
     return self.enableScroll = false;
   }
   self.currentPage += 1;

   this.refreshing = false;
   return setTimeout(() => {
       if((force as InfiniteScrollCustomEvent)?.target && (force as CustomEvent)?.type !== EventConstants.BACK_BUTTON_NAVIGATION)
         (force as InfiniteScrollCustomEvent).target.complete();
   }, 100);

 }

 async forceRefresh(event?: InfiniteScrollCustomEvent): Promise<void> {
   this.refresh(event);
 }

 async clearSearch() {
   return await this.handleSearch(undefined);
 }

 @HostListener('window:searchbarEvent', ['$event'])
 async handleSearch(value: string | undefined) {
   const self = this;
   self.searchValue = value;
   await self.refresh(true);
 }

 async parseSearchResults(results: IListItemComponent[], search: string) {
   if(!results?.length) {
    //  this.searchEmptyTitle = await this.localeService.get(`${this.locale}.search.title`);
    //  this.searchEmptySubtitle = await this.localeService.get(`${this.locale}.search.subtitle`, {value: search});
   }
   return [... queryInArray(results || [], search)];

 }
 async getFromRequest(force: boolean = false, start: number, limit: number) {
   const self = this;
   let request: any = [];
   if(!self.data?.length && !!self.source || force) {
     // (self.data as ListItem[]) = [];

     if(!self.source && !self.data?.length)
       return consoleWarn(this, 'No data and source passed to infinite list');

    //  if(typeof self.source === 'string')
    //    request = await this.requestService.prepare(self.source as string);
     if(self.source instanceof Function)
       request = await self.source();

     if(!!request && !Array.isArray(request))
       request = request?.response?.data || request?.results || [];

     request = arraySortByDate(request);

     self.getPages(request?.length || 0);
     if(!!self.itemProps?.mapper)
       request = self.itemsMapper(request as KeyValue[]);
   }

   self.data = (self.data || []).concat(...request);

   if(self.data?.length)
     self.items = (self.items || []).concat([...self.data.slice(start, limit)]);
   self.refreshEventEmit(self.items);
 }


 async getFromManager(force: boolean = false, start: number, limit: number): Promise<any>{
   const self = this;
   let result = [];
   if(!self.data?.length || force) {
     (self.data as KeyValue[]) = [];
     try {
      //  if(typeof self.manager === 'string')
      //    self.manager = injectableRegistry.get(self.manager);

       const pk = self.manager?.pk || self.modelPk;
       const table = self.manager?.table || self.manager?.clazz()?.__modelDefinition?.class  || self.manager?.clazz()?.constructor?.name;
       const query = !!self.query ?
       typeof self.query === 'string' ? JSON.parse(self.query) : self.query : {};

       const raw = {
         selector: Object.assign({}, {
           [pk]: {"$gt": null},
           "?table": table
         }, query)
       };

       // if(limit!== 0) {
       //     rawQuery['skip']  = start;
       //     rawQuery['limit'] = limit;
       // }

       result = await self.manager.raw(raw as any);
       result = arraySortByDate(result || []);

       self.getPages(result?.length || 0);
       if(!!self.itemProps?.mapper)
         result = self.itemsMapper(result as KeyValue[]);

     } catch(e) {
       consoleError(this, `Unable to find ${self.manager} on registry. Return empty array from component`);
     }
   }

   self.data = (self.data || []).concat(...result);
   if(self.data?.length)
     self.items = (self.items || []).concat([...self.data.slice(start, limit)]);

   self.refreshEventEmit(self.items);
 }


 getPages(resultsLength: number) {
   if(resultsLength <= this.limit)
     return this.enableScroll = false;

   this.pages = Math.floor(resultsLength / this.limit);
   if((this.pages * this.limit) < resultsLength)
     this.pages += 1;

   if(this.pages === 1)
     this.enableScroll = false;
 }


 itemsMapper<T>(data: any[]) {
   const self = this;
   if(!data || !data.length)
       return [];

   self.itemProps.mapper = Object.assign({}, {modelId: self.itemProps.modelId || this.modelPk}, self.itemProps.mapper);

   const props = Object.assign({}, {
     modelPk: self.modelPk,
     modelOperations: self.modelOperations || [],
     modelPage: self.modelPage || '',
     translateProps: self.itemProps?.['translateProps'] || []
   })

   function mapItem(item: KeyValue) {
     let option: KeyValue = {};
     Object.entries(self.itemProps.mapper as KeyValue).forEach(([key, value]) => option[key] = !!item[value] ? item[value] : value);
     return option as any;
   }

   return data.reduce((accum: T[], curr) => {
     let item = mapItem(curr) as T;
     if(props)
       item = Object.assign({}, props, item);
     accum.push(item);
     return accum;
   }, []);
 }

}

