import { AfterViewInit, ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA, HostListener, OnInit  } from '@angular/core';
import { IonInfiniteScroll, IonInfiniteScrollContent, IonItem, IonLabel, IonList, IonRefresher, IonSkeletonText, IonText, IonThumbnail } from '@ionic/angular/standalone';
import { ForAngularModule } from 'src/lib/for-angular.module';
import { ListInfiniteComponent } from '../list-infinite/list-infinite.component';
import { getInjectablesRegistry } from 'src/lib/helpers/utils';
import { KeyValue, StringOrBoolean } from 'src/lib/engine/types';
import { arraySortByDate } from 'src/lib/helpers/array';
import { InfiniteScrollCustomEvent, RefresherCustomEvent } from '@ionic/angular/standalone';
import { consoleError, consoleWarn } from 'src/lib/helpers/logging';
import { SearchbarComponent } from '../searchbar/searchbar.component';
import { addIcons } from 'ionicons';
import { chevronBackOutline } from 'ionicons/icons';
import { chevronForwardOutline } from 'ionicons/icons';
import { EmptyStateComponent } from '../empty-state/empty-state.component';
import { Repository } from '@decaf-ts/db-decorators';
import { Model } from '@decaf-ts/decorator-validation';

@Component({
  selector: 'ngx-decaf-list-paginated',
  templateUrl: './list-paginated.component.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  styleUrls: ['./list-paginated.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
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
    EmptyStateComponent
  ],
  standalone: true,
})
export class ListPaginatedComponent extends ListInfiniteComponent implements OnInit, AfterViewInit {

  paginationPages!: KeyValue[];

  paginationResume!: string;

  hasPagination: StringOrBoolean = this.loadMoreData;
  /**
   * @constructor
   * @description Initializes a new instance of the ListPaginatedComponent.
   * Calls the parent constructor with the component name for generate base locale string.
   */
  constructor() {
    super();
    addIcons({chevronBackOutline, chevronForwardOutline});
  }

  ngAfterViewInit(): void {
    this.hasPagination = this.loadMoreData
  }

  /**
  * Lifecycle hook that is called after data-bound properties of a directive are initialized.
  * This method is part of Angular's component lifecycle and is used for any additional initialization tasks.
  *
  * @returns {void} This method does not return a value.
  */
  // ngOnInit(): void {}

  override async refresh(event?: InfiniteScrollCustomEvent | RefresherCustomEvent | boolean): Promise<void> {
    const self = this;

    // if(typeof event !== 'boolean') {
    //   const {refresh} = (event as CustomEvent).detail;
    //   if(force.type !== BACK_BUTTON_NAVIGATION_EVENT)
    //     return false;
    // }

    self.refreshing = true;

    let start: number = this.currentPage > 1 ? (self.currentPage - 1) * self.limit : self.start;
    let limit: number = (self.currentPage * (self.limit > 12 ? 12 : self.limit));

    if(!this.manager) {
      await self.getFromRequest(!!event, start, limit);
    } else {
      // self.refreshManager();
      await self.getFromManager(!!event, start, limit);
    }

    if(self.loadMoreData)
      await self.getPagination(self.data?.length || 0);

    setTimeout(() => {
        self.refreshing = false;
    }, 1000);
  }

  override async getFromRequest(force: boolean = false, start: number, limit: number) {
    const self = this;
    self.items = [] as KeyValue[];

    if(!self.data?.length && !!self.source || force || self.searchValue?.length) {

      let request: any;

      if(!self.searchValue?.length) {
        (self.data as KeyValue[]) = [];

        if(!self.source && !self.data?.length)
          return consoleWarn(this, 'No data and source passed to infinite list');

        // if(typeof self.source === 'string')
        //   request = await this.requestService.prepare(self.source as string);

        if(self.source instanceof Function)
          request = await self.source();

        if(!!request && !Array.isArray(request))
          request = request?.response?.data || request?.results || [];
        request = arraySortByDate(request);
        if(!!self.item?.mapper)
          request = self.itemsMapper(request as KeyValue[]);
      } else {
        request = await self.parseSearchResults(self.data as [], self.searchValue as string);
      }

      self.data = [...request as KeyValue[]];
    }

    if(self.data?.length) {
      if(self.searchValue) {
        self.items = [...self.data];
        if(self.items?.length <= self.limit)
          self.loadMoreData = false;
      } else {
        self.items = [...self.data.slice(start, limit)];
      }
    }

    return self.refreshEventEmit(self.items as KeyValue[]);
  }

  override async getFromManager(force: boolean = false, start: number, limit: number): Promise<any>{
    const self = this;
    self.items = [];

    if(!self.data?.length || force || self.searchValue?.length) {
      try {
        let request: any;

        if(!self.searchValue?.length) {
          (self.data as KeyValue[]) = [];

          // if(typeof self.manager === 'string')
          //   self.manager = getInjectablesRegistry().get(self.manager);

          if(typeof self.manager === 'string')
                   self.manager = getInjectablesRegistry().get(self.manager) as Repository<Model>;
        const pk = self.manager?.pk || self.modelPk;
        const table = self.manager?.class || self.manager?.constructor?.name;
        const query = !!self.query ?
          typeof self.query === 'string' ? JSON.parse(self.query) : self.query : {};
          const raw = {
            selector: Object.assign({}, {
              [pk]: {"$gt": null},
              "?table": table
            }, query)
          };

          // if(limit!== 0) {
          //     raw['skip']  = start;
          //     raw['limit'] = limit;
          // }

          // request = arraySortByDate(await self.manager.raw(raw as unknown) || []);
          request = await self.manager?.readAll(['']) || [];
          if(!!self.item?.mapper)
            request = self.itemsMapper(request as KeyValue[]);

        } else {
          request = await self.parseSearchResults(self.data as [], self.searchValue as string);
        }

        self.data = [...request];

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
        self.items = [...self.data.slice(start, limit)];
      }
    }
    self.refreshEventEmit(self.items);
  }

   @HostListener('window:searchbarEvent', ['$event'])
   override async handleSearch(value: string | undefined) {
    if(this.hasPagination)
      this.loadMoreData = true;
     this.searchValue = value;
     await this.refresh(true);
   }

  async getPagination(length: number) {
    if(length <= this.limit) {
      this.loadMoreData = false;
    } else {
      this.pages = Math.floor(length / this.limit);
      if((this.pages * this.limit) < length)
        this.pages += 1;

      if(this.pages  === 1) {
        this.loadMoreData = false;
      } else {
        this.paginationPages = this.getPaginationPages(this.currentPage, this.pages);
        const resumeLocale = `${this.locale}.pagination`;
        this.paginationResume = `Showing page ${this.currentPage} of ${this.pages}` as string;
        // this.paginationResume = await this.localeService.get(`${resumeLocale}`, {page: this.currentPage, total: this.pages}) as string;
        // pegar a paginação do componente, caso não encontre no locale informado
        // if(!this.paginationResume)
        //   this.paginationResume = await this.localeService.get(`${getLocaleFromClassName('ListComponent')}.pagination`, {page: this.currentPage, total: self.pages}) as string;
      }
    }


  }

  getPaginationPages(currentPage: number, totalPages: number): KeyValue[] {

    let pages: KeyValue[] = [];

    function getPage(index: number | null, text: string = '') {
      let check = pages.find(item => item['index'] === index);
      if(check)
          return false;
      if(index != null)
        text = index > 10 ? index.toString() : `0${index}${text}`;
      pages.push({
        index: index,
        text: text
      });
    };

    for(let i = 1; i <= totalPages; i++) {
      if(totalPages <= 5) {
          getPage(i);
          continue;
      } else {
        if (i === 1 && currentPage !== 1) {
          getPage(i, currentPage !== totalPages ? ' ...' : '');
          continue;
        }
        if (i <= currentPage + 1 && i > currentPage - 1) {
          getPage(i);
          continue;
        }
        if (i + 1 >= totalPages) {
          if (i + 1 === totalPages && i !== currentPage)
            getPage(null, "...");

          getPage(i);
        }
      }
    }
    return [... new Set(pages)];
  }


  getPreviousPage() {
    const page = this.currentPage - 1;

    if(page === 0)
      return false;

    this.currentPage = page;
    this.refresh();
  }

  getNextPage() {
    const page = this.currentPage + 1;
    if(page > this.pages)
      return false;

    this.currentPage = page;
    this.refresh();
  }

  getPage(page: number | null) {
    if(page === null)
        return null

    if(this.currentPage === page)
      return false;

    this.currentPage = page;
    this.refresh();
  }


}
