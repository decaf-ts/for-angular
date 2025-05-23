import { Component, HostListener  } from '@angular/core';
import { InfiniteScrollCustomEvent, RefresherCustomEvent } from '@ionic/angular';
import {
  IonItem,
  IonLabel,
  IonList,
  IonLoading,
  IonRefresher,
  IonRefresherContent,
  IonSkeletonText,
  IonText,
  IonIcon,
  IonThumbnail
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { chevronBackOutline, chevronForwardOutline } from 'ionicons/icons';
import {
  Dynamic,
  StringOrBoolean,
  KeyValue,
} from 'src/lib/engine';
import { ForAngularModule } from 'src/lib/for-angular.module';
import { SearchbarComponent } from '../searchbar/searchbar.component';
import { EmptyStateComponent } from '../empty-state/empty-state.component';
import { ListItemComponent } from '../list-item/list-item.component';
import { UiElementComponent } from '../ui-element/ui-element.component';
import { ListInfiniteComponent } from '../list-infinite/list-infinite.component';
import { PaginationComponent } from '../pagination/pagination.component';

@Dynamic()
@Component({
  selector: 'ngx-decaf-list-paginated',
  templateUrl: './list-paginated.component.html',
  styleUrls: ['./list-paginated.component.scss'],
  standalone: true,
  imports: [
    ForAngularModule,
    IonRefresher,
    IonList,
    IonIcon,
    IonItem,
    IonLoading,
    IonThumbnail,
    IonSkeletonText,
    IonLabel,
    IonText,
    IonRefresherContent,
    IonThumbnail,
    IonSkeletonText,
    SearchbarComponent,
    EmptyStateComponent,
    ListItemComponent,
    UiElementComponent,
    PaginationComponent

  ],
})
export class ListPaginatedComponent extends ListInfiniteComponent {


  override type: 'infinite' | 'paginated' = 'paginated';

  /**
   * @constructor
   * @description Initializes a new instance of the ListPaginatedComponent.
   * Calls the parent constructor with the component name for generate base locale string.
   */
  constructor() {
    super();
    addIcons({chevronBackOutline, chevronForwardOutline});
  }

  /**
  * Lifecycle hook that is called after data-bound properties of a directive are initialized.
  * This method is part of Angular's component lifecycle and is used for any additional initialization tasks.
  *
  * @returns {void} This method does not return a value.
  */
  // ngOnInit(): void {}

  override async refresh(event?: InfiniteScrollCustomEvent | RefresherCustomEvent | boolean): Promise<void> {
    // if(typeof event !== 'boolean') {
    //   const {refresh} = (event as CustomEvent).detail;
    //   if(force.type !== BACK_BUTTON_NAVIGATION_EVENT)
    //     return false;
    // }
    this.refreshing = true;

    let start: number = this.page > 1 ? (this.page - 1) * this.limit : this.start;
    let limit: number = (this.page * (this.limit > 12 ? 12 : this.limit));

    if(!this.model) {
      await this.getFromRequest(!!event, start, limit);
      if(this.loadMoreData)
        await this.getPages(this.data?.length || 0);
    } else {
      // self.refreshManager();
      this.data = [... await this.getFromModel(!!event, start, limit) as KeyValue[]];
      await this.getPages(this.lastResult?.total || 0);
    }

    this.hasPagination = this.loadMoreData;
    this.refreshEventEmit();
    setTimeout(() => {
        this.refreshing = false;
    }, 1000);
  }

  // override async getFromRequest(force: boolean = false, start: number, limit: number) {
  //   const self = this;
  //   self.items = [] as KeyValue[];

  //   if(!self.data?.length && !!self.source || force || self.searchValue?.length) {

  //     let request: any;

  //     if(!self.searchValue?.length) {
  //       (self.data as KeyValue[]) = [];

  //       if(!self.source && !self.data?.length)
  //         return consoleWarn(this, 'No data and source passed to infinite list');

  //       // if(typeof self.source === 'string')
  //       //   request = await this.requestService.prepare(self.source as string);

  //       if(self.source instanceof Function)
  //         request = await self.source();

  //       if(!!request && !Array.isArray(request))
  //         request = request?.response?.data || request?.results || [];
  //       request = arraySortByDate(request);
  //       if(!!self.mapper)
  //         request = self.mapResults(request as KeyValue[]);
  //     } else {
  //       request = await self.parseSearchResults(self.data as [], self.searchValue as string);
  //     }

  //     self.data = [...request as KeyValue[]];
  //   }

  //   if(self.data?.length) {
  //     if(self.searchValue) {
  //       self.items = [...self.data];
  //       if(self.items?.length <= self.limit)
  //         self.loadMoreData = false;
  //     } else {
  //       self.items = [...self.data.slice(start, limit)];
  //     }
  //   }
  // }

  // getPreviousPage() {
  //   const page = this.page - 1;

  //   if(page === 0)
  //     return false;

  //   this.page = page;
  //   this.refresh();
  // }

  // getNextPage() {
  //   const page = this.page + 1;
  //   if(page > this.pages)
  //     return false;

  //   this.page = page;
  //   this.refresh(true);
  // }

  // getPage(page: number | null) {
  //   if(page === null)
  //       return null

  //   if(this.page === page)
  //     return false;

  //   this.page = page;
  //   this.refresh(true);
  // }

}
