/**
 * @module module:lib/components/list/list.component
 * @description List component module.
 * @summary Provides the `ListComponent` which renders collections of data with
 * support for infinite scroll, pagination, searching, filtering, custom item
 * rendering and refresh events. Use this module's `ListComponent` to display
 * lists sourced from models, functions or direct data arrays.
 *
 * @link {@link ListComponent}
 */

import {
  Component,
  OnInit,
  EventEmitter,
  Output,
  Input,
  HostListener,
  OnDestroy,
} from '@angular/core';
import {
  InfiniteScrollCustomEvent,
  RefresherCustomEvent,
  SpinnerTypes,
} from '@ionic/angular';
import { TranslatePipe } from '@ngx-translate/core';
import {
  IonButton,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonItem,
  IonLabel,
  IonList,
  IonRefresher,
  IonRefresherContent,
  IonSkeletonText,
  IonText,
  IonThumbnail,
} from '@ionic/angular/standalone';
import { OperationKeys } from '@decaf-ts/db-decorators';
import { Model, Primitives } from '@decaf-ts/decorator-validation';
import { Condition, OrderDirection, Paginator } from '@decaf-ts/core';
import { debounceTime, shareReplay, Subject, takeUntil, timer } from 'rxjs';
import { NgxComponentDirective } from '../../engine/NgxComponentDirective';
import { Dynamic } from '../../engine/decorators';
import { KeyValue, FunctionLike, DecafRepository } from '../../engine/types';
import {
  ComponentEventNames,
  ComponentsTagNames,
  DefaultListEmptyOptions,
  ListComponentsTypes,
} from '../../engine/constants';
import {
  IBaseCustomEvent,
  ListItemCustomEvent,
  IPaginationCustomEvent,
  IFilterQuery,
  IFilterQueryItem,
  IListEmptyOptions,
} from '../../engine/interfaces';
import { stringToBoolean, formatDate, isValidDate } from '../../utils/helpers';
import { SearchbarComponent } from '../searchbar/searchbar.component';
import { EmptyStateComponent } from '../empty-state/empty-state.component';
import { ComponentRendererComponent } from '../component-renderer/component-renderer.component';
import { PaginationComponent } from '../pagination/pagination.component';
import { FilterComponent } from '../filter/filter.component';
import { Constructor, Metadata } from '@decaf-ts/decoration';

/**
 * @description A versatile list component that supports various data display modes.
 * @summary This component provides a flexible way to display lists of data with support
 * for infinite scrolling, pagination, searching, and custom item rendering. It can fetch
 * data from various sources including models, functions, or direct data input.
 *
 * The component supports two main display types:
 * 1. Infinite scrolling - Loads more data as the user scrolls
 * 2. Pagination - Displays data in pages with navigation controls
 *
 * Additional features include:
 * - Pull-to-refresh functionality
 * - Search filtering
 * - Empty state customization
 * - Custom item rendering
 * - Event emission for interactions
 *
 * @mermaid
 * sequenceDiagram
 *   participant U as User
 *   participant L as ListComponent
 *   participant D as Data Source
 *   participant E as External Components
 *
 *   U->>L: Initialize component
 *   L->>L: ngOnInit()
 *   L->>D: Request initial data
 *   D-->>L: Return data
 *   L->>L: Process and display data
 *
 *   alt User scrolls (Infinite mode)
 *     U->>L: Scroll to bottom
 *     L->>D: Request more data
 *     D-->>L: Return additional data
 *     L->>L: Append to existing data
 *   else User changes page (Paginated mode)
 *     U->>L: Click page number
 *     L->>L: handlePaginate()
 *     L->>D: Request data for page
 *     D-->>L: Return page data
 *     L->>L: Replace displayed data
 *   end
 *
 *   alt User searches
 *     U->>L: Enter search term
 *     L->>L: handleSearch()
 *     L->>D: Filter data by search term
 *     D-->>L: Return filtered data
 *     L->>L: Update displayed data
 *   end
 *
 *   alt User clicks item
 *     U->>L: Click list item
 *     L->>L: handleClick()
 *     L->>E: Emit clickEvent
 *   end
 *
 * @example
 * <ngx-decaf-list
 *   [source]="dataSource"
 *   [limit]="10"
 *   [type]="'infinite'"
 *   [showSearchbar]="true"
 *   (clickEvent)="handleItemClick($event)"
 *   (refreshEvent)="handleRefresh($event)">
 * </ngx-decaf-list>
 *
 * @extends {NgxBaseComponentDirective}
 * @implements {OnInit}
 */
@Dynamic()
@Component({
  selector: 'ngx-decaf-list',
  templateUrl: './list.component.html',
  styleUrls: ['./list.component.scss'],
  standalone: true,
  imports: [
    TranslatePipe,
    IonRefresher,
    IonButton,
    PaginationComponent,
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
    FilterComponent,
    ComponentRendererComponent,
  ],
  host: { '[attr.id]': 'uid' },
})
export class ListComponent
  extends NgxComponentDirective
  implements OnInit, OnDestroy
{
  /**
   * @description The display mode for the list component.
   * @summary Determines how the list data is loaded and displayed. Options include:
   * - INFINITE: Loads more data as the user scrolls (infinite scrolling)
   * - PAGINATED: Displays data in pages with navigation controls
   *
   * @type {ListComponentsTypes}
   * @default ListComponentsTypes.INFINITE
   * @memberOf ListComponent
   */
  @Input()
  type: ListComponentsTypes = ListComponentsTypes.PAGINATED;

  /**
   * @description Controls the visibility of the search bar.
   * @summary When set to true, displays a search bar at the top of the list that allows
   * users to filter the list items. The search functionality works by filtering the
   * existing data or by triggering a new data fetch with search parameters.
   *
   * @type {boolean}
   * @default true
   * @memberOf ListComponent
   */
  @Input()
  showSearchbar: boolean = true;

  /**
   * @description Controls the visibility of the search bar.
   * @summary When set to true, displays a search bar at the top of the list that allows
   * users to filter the list items. The search functionality works by filtering the
   * existing data or by triggering a new data fetch with search parameters.
   *
   * @type {boolean}
   * @default true
   * @memberOf ListComponent
   */
  @Input()
  searchbarPlaceholder!: string;

  /**
   * @description Direct data input for the list component.
   * @summary Provides a way to directly pass data to the list component instead of
   * fetching it from a source. When both data and source are provided, the component
   * will use the source to fetch data only if the data array is empty.
   *
   * @type {KeyValue[] | undefined}
   * @default undefined
   * @memberOf ListComponent
   */
  @Input()
  data?: KeyValue[] | undefined = undefined;

  /**
   * @description The data source for the list component.
   * @summary Specifies where the list should fetch its data from. This can be either:
   * - A string URL or endpoint identifier
   * - A function that returns data when called
   * The component will call this source when it needs to load or refresh data.
   *
   * @type {string | FunctionLike}
   * @required
   * @memberOf ListComponent
   */
  @Input()
  source!: string | FunctionLike;

  /**
   * @description The starting index for data fetching.
   * @summary Specifies the index from which to start fetching data. This is used
   * for pagination and infinite scrolling to determine which subset of data to load.
   *
   * @type {number}
   * @default 0
   * @memberOf ListComponent
   */
  @Input()
  start: number = 0;

  /**
   * @description The number of items to fetch per page or load operation.
   * @summary Determines how many items are loaded at once during pagination or
   * infinite scrolling. This affects the size of data chunks requested from the source.
   *
   * @type {number}
   * @default 10
   * @memberOf ListComponent
   */
  @Input()
  limit: number = 10;

  /**
   * @description Controls whether more data can be loaded.
   * @summary When set to true, the component will allow loading additional data
   * through infinite scrolling or pagination. When false, the component will not
   * attempt to load more data beyond what is initially displayed.
   *
   * @type {boolean}
   * @default true
   * @memberOf ListComponent
   */
  @Input()
  loadMoreData: boolean = true;

  /**
   * @description The style of dividing lines between list items.
   * @summary Determines how dividing lines appear between list items. Options include:
   * - "inset": Lines are inset from the edges
   * - "full": Lines extend the full width
   * - "none": No dividing lines
   *
   * @type {"inset" | "full" | "none"}
   * @default "full"
   * @memberOf ListComponent
   */
  @Input()
  lines: 'inset' | 'full' | 'none' = 'full';

  /**
   * @description Controls whether the list has inset styling.
   * @summary When set to true, the list will have inset styling with rounded corners
   * and margin around the edges. This creates a card-like appearance for the list.
   *
   * @type {boolean}
   * @default false
   * @memberOf ListComponent
   */
  @Input()
  inset: boolean = false;

  /**
   * @description The threshold for triggering infinite scroll loading.
   * @summary Specifies how close to the bottom of the list the user must scroll
   * before the component triggers loading of additional data. This is expressed
   * as a percentage of the list height.
   *
   * @type {string}
   * @default "15%"
   * @memberOf ListComponent
   */
  @Input()
  scrollThreshold: string = '15%';

  /**
   * @description The position where new items are added during infinite scrolling.
   * @summary Determines whether new items are added to the top or bottom of the list
   * when loading more data through infinite scrolling.
   *
   * @type {"bottom" | "top"}
   * @default "bottom"
   * @memberOf ListComponent
   */
  @Input()
  scrollPosition: 'bottom' | 'top' = 'bottom';

  /**
   * @description Custom text to display during loading operations.
   * @summary Specifies the text shown in the loading indicator when the component
   * is fetching data. If not provided, a default loading message will be used.
   *
   * @type {string | undefined}
   * @memberOf ListComponent
   */
  @Input()
  loadingText?: string;

  /**
   * @description Controls the visibility of the pull-to-refresh feature.
   * @summary When set to true, enables the pull-to-refresh functionality that allows
   * users to refresh the list data by pulling down from the top of the list.
   *
   * @type {boolean}
   * @default true
   * @memberOf ListComponent
   */
  @Input()
  showRefresher: boolean = true;

  /**
   * @description Controls the visibility of the create button.
   * @summary When set to true, displays a button to create new items in the list.
   *
   * @type {boolean}
   * @default false
   * @memberOf ListComponent
   */
  @Input()
  createButton: boolean = false;

  /**
   * @description The type of spinner to display during loading operations.
   * @summary Specifies the visual style of the loading spinner shown during data
   * fetching operations. Uses Ionic's predefined spinner types.
   *
   * @type {SpinnerTypes}
   * @default "circular"
   * @memberOf ListComponent
   */
  @Input()
  loadingSpinner: SpinnerTypes = 'circular';

  // /**
  //  * @description Query parameters for data fetching.
  //  * @summary Specifies additional query parameters to use when fetching data from
  //  * the source. This can be provided as a string (JSON) or a direct object.
  //  *
  //  * @type {string | KeyValue | undefined}
  //  * @memberOf ListComponent
  //  */
  // @Input()
  // query?: string | KeyValue;

  /**
   * @description Controls whether the filtering functionality is enabled.
   * @summary When set to true, enables the filter component that allows users to create
   * complex search criteria with multiple field filters, conditions, and values.
   * When false, disables the filter interface entirely.
   *
   * @type {boolean}
   * @default true
   * @memberOf ListComponent
   */
  @Input()
  enableFilter: boolean = true;

  /**
   * @description Sorting parameters for data fetching.
   * @summary Specifies how the fetched data should be sorted. This can be provided
   * as a string (field name with optional direction) or a direct object.
   *
   * @type {string | KeyValue | undefined}
   * @memberOf ListComponent
   */
  @Input()
  sortBy!: string;

  /**
   * @description Sorting parameters for data fetching.
   * @summary Specifies how the fetched data should be sorted. This can be provided
   * as a string (field name with optional direction) or a direct object.
   *
   * @type {string | KeyValue | undefined}
   * @memberOf ListComponent
   */
  @Input()
  sortDirection: OrderDirection = OrderDirection.DSC;

  /**
   * @description Controls whether sorting functionality is disabled.
   * @summary When set to true, disables the sort controls and prevents users from
   * changing the sort order or field. The list will maintain its default or
   * programmatically set sort configuration without user interaction.
   *
   * @type {boolean}
   * @default false
   * @memberOf ListComponent
   */
  @Input()
  disableSort: boolean = false;

  /**
   * @description Configuration for the empty state display.
   * @summary Customizes how the empty state is displayed when no data is available.
   * This includes the title, subtitle, button text, icon, and navigation link.
   *
   * @type {Partial<IListEmptyOptions>}
   * @default {
   *   title: 'empty.title',
   *   subtitle: 'empty.subtitle',
   *   showButton: false,
   *   icon: 'alert-circle-outline',
   *   buttonText: 'locale.empty.button',
   *   link: ''
   * }
   * @memberOf ListComponent
   */
  @Input()
  empty: Partial<IListEmptyOptions> = {};

  /**
   * @description The current page number in paginated mode.
   * @summary Tracks which page is currently being displayed when the component
   * is in paginated mode. This is used for pagination controls and data fetching.
   *
   * @type {number}
   * @default 1
   * @memberOf ListComponent
   */
  page: number = 1;

  /**
   * @description The total number of pages available.
   * @summary Stores the calculated total number of pages based on the data size
   * and limit. This is used for pagination controls and boundary checking.
   *
   * @type {number}
   * @memberOf ListComponent
   */
  pages!: number;

  /**
   * @description Array used for rendering skeleton loading placeholders.
   * @summary Contains placeholder items that are displayed during data loading.
   * The length of this array determines how many skeleton items are shown.
   *
   * @type {string[]}
   * @default new Array(2)
   * @memberOf ListComponent
   */
  skeletonData: string[] = new Array(2);

  /**
   * @description The processed list items ready for display.
   * @summary Stores the current set of items being displayed in the list after
   * processing from the raw data source. This may be a subset of the full data
   * when using pagination or infinite scrolling.
   *
   * @type {KeyValue[]}
   * @memberOf ListComponent
   */
  items!: KeyValue[];

  /**
   * @description The current search query value.
   * @summary Stores the text entered in the search bar. This is used to filter
   * the list data or to send as a search parameter when fetching new data.
   *
   * @type {string | undefined}
   * @memberOf ListComponent
   */
  searchValue?: string | IFilterQuery | undefined;

  searching: boolean = false;

  /**
   * @description A paginator object for handling pagination operations.
   * @summary Provides a paginator object that can be used to retrieve and navigate
   * through data in chunks, reducing memory usage and improving performance.
   *
   * The paginator object is initialized in the `ngOnInit` lifecycle hook and is
   * used to fetch and display data in the pagination component. It is an instance
   * of the `Paginator` class from the `@decaf-ts/core` package, which provides
   * methods for querying and manipulating paginated data.
   *
   * @type {Paginator<Model>}
   * @memberOf PaginationComponent
   */
  paginator!: Paginator<Model> | undefined;

  /**
   * @description The last page number that was displayed.
   * @summary Keeps track of the previously displayed page number, which is useful
   * for handling navigation and search operations in paginated mode.
   *
   * @type {number}
   * @default 1
   * @memberOf ListComponent
   */
  lastPage: number = 1;

  /**
   * @description Event emitter for item click interactions.
   * @summary Emits an event when a list item is clicked. The event includes the data
   * of the clicked item, allowing parent components to respond to the interaction.
   *
   * @type {EventEmitter<KeyValue>}
   * @memberOf ListComponent
   */
  @Output()
  clickEvent: EventEmitter<ListItemCustomEvent | IBaseCustomEvent> =
    new EventEmitter<ListItemCustomEvent | IBaseCustomEvent>();

  /**
   * @description Subject for debouncing click events.
   * @summary Uses RxJS Subject to collect click events and emit them after a debounce
   * period. This prevents multiple rapid clicks from triggering multiple events.
   *
   * @private
   * @type {Subject<CustomEvent | ListItemCustomEvent | IBaseCustomEvent>}
   * @memberOf ListComponent
   */
  private clickItemSubject: Subject<
    CustomEvent | ListItemCustomEvent | IBaseCustomEvent
  > = new Subject<CustomEvent | ListItemCustomEvent | IBaseCustomEvent>();


  /**
   * @description List of available indexes for data querying and filtering.
   * @summary Provides a list of index names that can be used to optimize data querying and filtering
   * operations, especially in scenarios with large datasets.
   *
   * Indexes can significantly improve the performance of data retrieval by allowing the database
   * to quickly locate and retrieve relevant data based on indexed fields.
   *
   * @type {string[]}
   * @default []
   * @memberOf ListComponent
   */
  indexes!: string[];

  /**
   * @description Initializes a new instance of the ListComponent.
   * @summary Creates a new ListComponent and sets up the base component with the appropriate
   * component name. This constructor is called when Angular instantiates the component and
   * before any input properties are set. It passes the component name to the parent class
   * constructor to enable proper localization and component identification.
   *
   * The constructor is intentionally minimal, with most initialization logic deferred to
   * the ngOnInit lifecycle hook. This follows Angular best practices by keeping the constructor
   * focused on dependency injection and basic setup, while complex initialization that depends
   * on input properties is handled in ngOnInit.
   *
   * @memberOf ListComponent
   */
  constructor() {
    super('ListComponent');
  }

  /**
   * @description Initializes the component after Angular sets the input properties.
   * @summary Sets up the component by initializing event subscriptions, processing boolean
   * inputs, and loading the initial data. This method prepares the component for user
   * interaction by ensuring all properties are properly initialized and data is loaded.
   *
   * @returns {Promise<void>}
   *
   * @mermaid
   * sequenceDiagram
   *   participant A as Angular Lifecycle
   *   participant L as ListComponent
   *   participant D as Data Source
   *
   *   A->>L: ngOnInit()
   *   L->>L: Set up click event debouncing
   *   L->>L: Process boolean inputs
   *   L->>L: Configure component based on inputs
   *   L->>L: refresh()
   *   L->>D: Request initial data
   *   D-->>L: Return data
   *   L->>L: Process and display data
   *   L->>L: Configure empty state if needed
   *   L->>L: initialize()
   *
   * @memberOf ListComponent
   */
  async ngOnInit(): Promise<void> {
    this.repositoryObserver = {
      refresh: async (...args: unknown[]): Promise<void> =>
        this.handleRepositoryRefresh(...args),
    };

    // this.router.events.subscribe(async event => {
    //   if (event instanceof NavigationStart)
    //     await super.ngOnDestroy();
    // });

    if (!this.searchbarPlaceholder)
      this.searchbarPlaceholder = `${this.locale}.search.placeholder`;

    this.clickItemSubject
      .pipe(
        debounceTime(100),
        shareReplay(1),
        takeUntil(this.destroySubscriptions$)
      )
      .subscribe((event) =>
        this.clickEventEmit(event as ListItemCustomEvent | IBaseCustomEvent)
      );

    this.repositoryObserverSubject
      .pipe(
        debounceTime(100),
        shareReplay(1),
        takeUntil(this.destroySubscriptions$)
      )
      .subscribe(([table, event, uid]) =>
        this.handleObserveEvent(table, event, uid)
      );

    this.limit = Number(this.limit);
    this.start = Number(this.start);

    this.enableFilter = stringToBoolean(this.enableFilter);
    this.inset = stringToBoolean(this.inset);
    this.showRefresher = stringToBoolean(this.showRefresher);
    this.loadMoreData = stringToBoolean(this.loadMoreData);
    this.showSearchbar = stringToBoolean(this.showSearchbar);
    this.disableSort = stringToBoolean(this.disableSort);

    if (!this.operations || !this.operations.includes(OperationKeys.CREATE))
      this.createButton = false;

    if (typeof this.item?.['tag'] === 'boolean' && this.item?.['tag'] === true)
      this.item['tag'] = ComponentsTagNames.LIST_ITEM as string;
    this.empty = Object.assign({}, DefaultListEmptyOptions, this.empty);
    if (!this.initialized)
      this.parseProps(this);
    this.initialized = true;
    await this.refresh();
  }

  /**
   * @description Cleans up resources when the component is destroyed.
   * @summary Performs cleanup operations when the component is being removed from the DOM.
   * This includes clearing references to models and data to prevent memory leaks.
   *
   * @returns {Promise<void>}
   * @memberOf ListComponent
   */
  override async ngOnDestroy(): Promise<void> {
    await this.destroy();
  }

  async destroy(): Promise<void> {
    await super.ngOnDestroy();
    if (this._repository && this.repositoryObserver) {
      const repo = this._repository as DecafRepository<Model>;
      //TODO: fix check observerHandler
      const observeHandler = repo['observerHandler'];
      if (observeHandler) {
        try {
          repo.unObserve(this.repositoryObserver);
        } catch (error: unknown) {
          this.log.info((error as Error)?.message);
        }
      }
    }
    this.data = this.model = this._repository = this.paginator = undefined;
  }

  /**
   * @description Refreshes the list data from the configured source.
   * @summary This method handles both initial data loading and subsequent refresh operations,
   * including pull-to-refresh and infinite scrolling. It manages the data fetching process,
   * updates the component's state, and handles pagination or infinite scrolling logic based
   * on the component's configuration.
   *
   * The method performs the following steps:
   * 1. Sets the refreshing flag to indicate a data fetch is in progress
   * 2. Calculates the appropriate start and limit values based on pagination settings
   * 3. Fetches data from the appropriate source (model or request)
   * 4. Updates the component's data and emits a refresh event
   * 5. Handles pagination or infinite scrolling state updates
   * 6. Completes any provided event (like InfiniteScrollCustomEvent)
   *
   * @param {InfiniteScrollCustomEvent | RefresherCustomEvent | boolean} event - The event that triggered the refresh,
   * or a boolean flag indicating if this is a forced refresh
   * @returns {Promise<void>} A promise that resolves when the refresh operation is complete
   *
   * @mermaid
   * sequenceDiagram
   *   participant L as ListComponent
   *   participant D as Data Source
   *   participant E as Event System
   *
   *   L->>L: refresh(event)
   *   L->>L: Set refreshing flag
   *   L->>L: Calculate start and limit
   *   alt Using model
   *     L->>D: getFromModel(force, start, limit)
   *     D-->>L: Return data
   *   else Using request
   *     L->>D: getFromRequest(force, start, limit)
   *     D-->>L: Return data
   *   end
   *   L->>E: refreshEventEmit()
   *   alt Infinite scrolling mode
   *     L->>L: Check if reached last page
   *     alt Last page reached
   *       L->>L: Complete scroll event
   *       L->>L: Disable loadMoreData
   *     else More pages available
   *       L->>L: Increment page number
   *       L->>L: Complete scroll event after delay
   *     end
   *   else Paginated mode
   *     L->>L: Clear refreshing flag after delay
   *   end
   *
   * @memberOf ListComponent
   */
  override async refresh(
    event: InfiniteScrollCustomEvent | RefresherCustomEvent | boolean = false
  ): Promise<void> {
    //  if (typeof force !== 'boolean' && force.type === ComponentEventNames.BACK_BUTTON_NAVIGATION) {
    //    const {refresh} = (force as CustomEvent).detail;
    //    if (!refresh)
    //      return false;
    //  }
    this.refreshing = true;
    const start: number =
      this.page > 1 ? (this.page - 1) * this.limit : this.start;
    const limit: number = this.page * (this.limit > 12 ? 12 : this.limit);

    this.data = !this.model
      ? await this.getFromRequest(!!event, start, limit)
      : ((await this.getFromModel(!!event)) as KeyValue[]);
    if (!this.isModalChild)
      this.refreshEventEmit(this.data);
    if (this.type === ListComponentsTypes.INFINITE) {
      if (this.page === this.pages) {
        if ((event as InfiniteScrollCustomEvent)?.target)
          (event as InfiniteScrollCustomEvent).target.complete();
        this.loadMoreData = false;
      } else {
        this.page += 1;
        this.refreshing = false;
        setTimeout(() => {
          if (
            (event as InfiniteScrollCustomEvent)?.target &&
            (event as CustomEvent)?.type !==
              ComponentEventNames.BACK_BUTTON_NAVIGATION
          )
            (event as InfiniteScrollCustomEvent).target.complete();
        }, 200);
      }
    } else {
      setTimeout(() => {
        this.refreshing = false;
      }, 200);
    }
  }



  /**
   * @description Handles specific repository events and updates the list accordingly.
   * @summary Processes repository change events (CREATE, UPDATE, DELETE) and performs
   * the appropriate list operations. This includes adding new items, updating existing
   * ones, or removing deleted items from the list display.
   *
   * @param {string} table - The table/model name that changed
   * @param {OperationKeys} event - The type of operation (CREATE, UPDATE, DELETE)
   * @param {string | number} uid - The unique identifier of the affected item
   * @returns {Promise<void>}
   * @memberOf ListComponent
   */
  override async handleObserveEvent(
    table: string,
    event: OperationKeys,
    uid: string | number
  ): Promise<void> {
    if (event === OperationKeys.CREATE) {
      if (uid) {
        await this.handleCreate(uid);
      } else {
        await this.refresh(true);
      }
    } else {
      if (event === OperationKeys.UPDATE)
        await this.handleUpdate(uid);
      if (event === OperationKeys.DELETE)
        this.handleDelete(uid);
      this.refreshEventEmit();
    }
  }

  /**
   * @description Function for tracking items in the list.
   * @summary Provides a tracking function for the `*ngFor` directive in the component template.
   * This function is used to identify and control the rendering of items in the list,
   * preventing duplicate or unnecessary rendering.
   *
   * The `trackItemFn` function takes two parameters: `index` (the index of the item in the list)
   * and `item` (the actual item from the list). It returns the tracking key, which in this case
   * is the union of the `uid` of the item with the model name.
   *
   * @param {number} index - The index of the item in the list.

   * @param {KeyValue | string | number} item - The actual item from the list.
   * @returns {string | number} The tracking key for the item.
   * @memberOf ListComponent
   */
  override trackItemFn(
    index: number,
    item: KeyValue | string | number
  ): string | number {
    return `${(item as KeyValue)?.['uid'] || (item as KeyValue)?.[this.pk]}-${index}`;
  }

  /**
   * Handles the create event from the repository.
   *
   * @param {string | number} uid - The ID of the item to create.
   * @returns {Promise<void>} A promise that resolves when the item is created and added to the list.
   */
  async handleCreate(uid: string | number): Promise<void> {
    const result = await this._repository?.read(uid);
    const item = this.mapResults([result as KeyValue])[0];
    this.items = this.data = [item, ...(this.items || [])];
  }

  /**
   * @description Handles the update event from the repository.
   * @summary Updates the list item with the specified ID based on the new data.
   *
   * @param {string | number} uid - The ID of the item to update
   * @returns {Promise<void>}
   * @private
   * @memberOf ListComponent
   */
  async handleUpdate(uid: string | number): Promise<void> {
    const item: KeyValue = this.itemMapper(
      (await this._repository?.read(uid)) || {},
      this.mapper
    );
    this.data = [];
    this.changeDetectorRef.detectChanges();
    for (const key in this.items as KeyValue[]) {
      const child = this.items[key] as KeyValue;
      if (`${child['uid']}`.trim() === `${uid}`.trim()) {
        this.items[key] = Object.assign({}, child, item);
        break;
      }
    }
    const updateSubsriber$ = timer(0)
    .subscribe(() => {
      this.data = [...this.items];
      this.changeDetectorRef.detectChanges();
      updateSubsriber$.unsubscribe();
    });
  }

  /**
   * @description Removes an item from the list by ID.
   * @summary Filters out an item with the specified ID from the data array and
   * refreshes the list display. This is typically used after a delete operation.
   *
   * @param {string} uid - The ID of the item to delete
   * @param {string} pk - The primary key field name
   * @returns {Promise<void>}
   *
   * @memberOf ListComponent
   */
  handleDelete(uid: string | number, pk?: string): void {
    if (!pk)
      pk = this.pk;
    this.items = [...this.data?.filter((item: KeyValue) => item['uid'] !== uid) || []];
    this.data = [...this.items];
    this.changeDetectorRef.detectChanges();
  }

  /**
   * @description Handles click events from list items.
   * @summary Listens for global ListItemClickEvent events and passes them to the
   * debounced click subject. This allows the component to respond to clicks on
   * list items regardless of where they originate from.
   *
   * @param {ListItemCustomEvent | IBaseCustomEvent} event - The click event
   * @returns {void}
   *
   * @memberOf ListComponent
   */
  @HostListener('window:ListItemClickEvent', ['$event'])
  handleClick(event: ListItemCustomEvent | IBaseCustomEvent): void {
    this.clickItemSubject.next(event);
  }

  /**
   * @description Handles search events from the search bar.
   * @summary Processes search queries from the search bar component, updating the
   * displayed data based on the search term. The behavior differs between infinite
   * and paginated modes to provide the best user experience for each mode.
   *
   * @param {string | undefined} value - The search term or undefined to clear search
   * @returns {Promise<void>}
   *
   * @mermaid
   * flowchart TD
   *   A[Search Event] --> B{Type is Infinite?}
   *   B -->|Yes| C[Disable loadMoreData]
   *   B -->|No| D[Enable loadMoreData]
   *   C --> E{Search value undefined?}
   *   E -->|Yes| F[Enable loadMoreData]
   *   E -->|No| G[Store search value]
   *   D --> G
   *   F --> H[Reset page to 1]
   *   G --> I[Refresh data]
   *   H --> I
   *
   * @memberOf ListComponent
   */
  @HostListener('window:searchbarEvent', ['$event'])
  async handleSearch(value: string | IFilterQuery | undefined): Promise<void> {
    this.searching = value !== undefined;

    if (this.type === ListComponentsTypes.INFINITE) {
      this.loadMoreData = false;
      if (value === undefined) {
        this.loadMoreData = true;
        this.page = 1;
        this.items = [];
      }
      if (this.isModalChild) this.changeDetectorRef.detectChanges();
      this.searchValue = value;

      await this.refresh(true);
    } else {
      this.loadMoreData = true;
      this.searchValue = value;
      if (value === undefined) this.page = this.lastPage;
      await this.refresh(true);
    }
  }

  /**
   * @description Handles filter events from the filter component.
   * @summary Processes filter queries from the filter component and applies them
   * to the list data. This method acts as a bridge between the filter component
   * and the search functionality, converting filter queries into search operations.
   *
   * @param {IFilterQuery | undefined} value - The filter query object or undefined to clear filters
   * @returns {Promise<void>}
   * @memberOf ListComponent
   */
  async handleFilter(value: IFilterQuery | undefined): Promise<void> {
    await this.handleSearch(value);
  }

  /**
   * @description Clears the current search and resets the list.
   * @summary Convenience method that clears the search by calling handleSearch
   * with undefined. This resets the list to show all data without filtering.
   *
   * @returns {Promise<void>}
   * @memberOf ListComponent
   */
  async clearSearch(): Promise<void> {
    await this.handleSearch(undefined);
    if (this.isModalChild) this.changeDetectorRef.detectChanges();
  }

  /**
   * @description Emits a refresh event with the current data.
   * @summary Creates and emits a refresh event containing the current list data.
   * This notifies parent components that the list data has been refreshed.
   *
   * @param {KeyValue[]} [data] - Optional data to include in the event
   * @returns {void}
   *
   * @memberOf ListComponent
   */
  refreshEventEmit(data?: KeyValue[]): void {
    if (!data) data = this.items;
    this.skeletonData = new Array(1);
    this.refreshEvent.emit({
      name: ComponentEventNames.REFRESH,
      data: data || [],
      component: this.componentName,
    });
  }

  /**
   * @description Emits a click event for a list item.
   * @summary Processes and emits a click event when a list item is clicked.
   * This extracts the relevant data from the event and passes it to parent components.
   *
   * @private
   * @param {ListItemCustomEvent | IBaseCustomEvent} event - The click event
   * @returns {void}
   *
   * @memberOf ListComponent
   */
  private clickEventEmit(event: ListItemCustomEvent | IBaseCustomEvent): void {
    this.clickEvent.emit(event);
  }

  /**
   * @description Handles pagination events from the pagination component.
   * @summary Processes pagination events by updating the current page number and
   * refreshing the list data to display the selected page. This method is called
   * when a user interacts with the pagination controls to navigate between pages.
   *
   * @param {IPaginationCustomEvent} event - The pagination event containing page information
   * @returns {Promise<void>}
   *
   * @memberOf ListComponent
   */
  async handlePaginate(event: IPaginationCustomEvent | number): Promise<void> {
    this.page = typeof event === 'number' ? event : event.data?.page;
    await this.refresh(true);
  }

  /**
   * @description Handles pull-to-refresh events from the refresher component.
   * @summary Processes refresh events triggered by the user pulling down on the list
   * or by programmatic refresh requests. This method refreshes the list data and
   * completes the refresher animation when the data is loaded.
   *
   * @param {InfiniteScrollCustomEvent | CustomEvent} [event] - The refresh event
   * @returns {Promise<void>} A promise that resolves when the refresh operation is complete
   *
   * @memberOf ListComponent
   */
  async handleRefresh(
    event?: InfiniteScrollCustomEvent | CustomEvent
  ): Promise<void> {
    await this.refresh((event as InfiniteScrollCustomEvent) || true);
    if (event instanceof CustomEvent)
      setTimeout(() => {
        // Any calls to load data go here
        (event.target as HTMLIonRefresherElement).complete();
      }, 400);
  }

  /**
   * @description Filters data based on a search string.
   * @summary Processes the current data array to find items that match the provided
   * search string. This uses the arrayQueryByString utility to perform the filtering
   * across all properties of the items.
   *
   * @param {KeyValue[]} results - The array of items to search through
   * @param {string} search - The search string to filter by
   * @returns {KeyValue[]} A promise that resolves to the filtered array of items
   *
   * @memberOf ListComponent
   */
  parseSearchResults(results: KeyValue[], search: string): KeyValue[] {
    const filtered = results.filter((item: KeyValue) =>
      Object.values(item).some((v) => {
        if (
          v
            .toString()
            .toLowerCase()
            .includes((search as string)?.toLowerCase())
        )
          return v;
      })
    );
    return filtered;
  }

  /**
   * @description Fetches data from a request source.
   * @summary Retrieves data from the configured source function or URL, processes it,
   * and updates the component's data state. This method handles both initial data loading
   * and subsequent refresh operations when using an external data source rather than a model.
   *
   * @param {boolean} force - Whether to force a refresh even if data already exists
   * @param {number} start - The starting index for pagination
   * @param {number} limit - The maximum number of items to retrieve
   * @returns {Promise<KeyValue[]>} A promise that resolves to the fetched data
   *
   * @memberOf ListComponent
   */
  async getFromRequest(
    force: boolean = false,
    start: number,
    limit: number
  ): Promise<KeyValue[]> {
    let data: KeyValue[] = [...(this.data || [])];

    if (
      !this.data?.length ||
      force ||
      (this.searchValue as string)?.length ||
      !!(this.searchValue as IFilterQuery)
    ) {
      // (self.data as ListItem[]) = [];
      if (
        !(this.searchValue as string)?.length &&
        !(this.searchValue as IFilterQuery)
      ) {
        if (!this.source && !this.data?.length) {
          this.log.info('No data and source passed to infinite list');
          return [];
        }
        if (this.source instanceof Function) {
          data = (await this.source()) as KeyValue[];
          if (!Array.isArray(data))
            data = data?.['response']?.['data'] || data?.['results'] || [];
        }

        if (!data?.length && this.data?.length) data = this.data as KeyValue[];
        data = [...(await this.parseResult(data))];
        if (this.data?.length)
          data =
            this.type === ListComponentsTypes.INFINITE
              ? [...(this.items || []).concat([...data.slice(start, limit)])]
              : [...(data.slice(start, limit) as KeyValue[])];
      } else {
        data = await this.parseResult(
          this.parseSearchResults(this.data as [], this.searchValue as string)
        );
      }
      this.items = [...data];
      if (this.isModalChild) this.changeDetectorRef.detectChanges();
    } else {
      const data = [...(await this.parseResult(this.data as []))];
      this.items =
        this.type === ListComponentsTypes.INFINITE
          ? [...(this.items || []), ...(data || [])]
          : [...(data || [])];
      if (this.isModalChild) this.changeDetectorRef.detectChanges();
    }

    if (this.loadMoreData && this.type === ListComponentsTypes.PAGINATED)
      this.getMoreData(this.data?.length || 0);
    return this.data || ([] as KeyValue[]);
  }

  /**
   * @description Fetches data from a model source.
   * @summary Retrieves data from the configured model using its pagination or find methods,
   * processes it, and updates the component's data state. This method handles both initial
   * data loading and subsequent refresh operations when using a model as the data source.
   *
   * @param {boolean} force - Whether to force a refresh even if data already exists
   * @param {number} start - The starting index for pagination
   * @param {number} limit - The maximum number of items to retrieve
   * @returns {Promise<KeyValue[]>} A promise that resolves to the fetched data
   *
   * @memberOf ListComponent
   */
  async getFromModel(force: boolean = false): Promise<KeyValue[]> {
    let data = [...(this.data || [])];
    let request: KeyValue[] = [];

    // getting model repository
    if (!this._repository) {
      this._repository = this.repository;
      try {
        (this._repository as DecafRepository<Model>).observe(this.repositoryObserver);
      } catch (error: unknown) {
        this.log.info((error as Error)?.message);
      }
    }
    const repo = this._repository as DecafRepository<Model>;
    if (!this.indexes) {
      this.indexes = Object.keys(Model.indexes(this.model as Model) || {});
    }
    if (
      !this.data?.length ||
      force ||
      (this.searchValue as string)?.length ||
      !!(this.searchValue as IFilterQuery)
    ) {
      try {
        if (
          !(this.searchValue as string)?.length &&
          !(this.searchValue as IFilterQuery)
        ) {
          (this.data as KeyValue[]) = [];
          // const rawQuery = this.parseQuery(self.model as Repository<Model>, start, limit);
          // request = this.parseResult(await (this.model as any)?.paginate(start, limit));
          if (!this.paginator) {
            this.paginator = await repo
              .select()
              .where(
                this.condition
                  ? this.condition.eq(
                      !this.modelId
                        ? undefined
                        : [Primitives.NUMBER, Primitives.BIGINT].includes(
                              this.pkType as Primitives
                            )
                          ? Number(this.modelId)
                          : this.modelId
                    )
                  : Condition.attribute<Model>(this.pk as keyof Model).dif(null)
              )
              .orderBy([this.pk as keyof Model, this.sortDirection])
              .paginate(this.limit);
          }
          request = await this.parseResult(this.paginator as Paginator<Model>);
        } else {
          this.changeDetectorRef.detectChanges();
          request = await this.parseResult(
            await repo.query(
              this.parseConditions(
                this.searchValue as string | number | IFilterQuery
              ),
              (this.sortBy || this.pk) as keyof Model,
              this.sortDirection
            )
          );
          data = [];
          this.changeDetectorRef.detectChanges();
        }
        data =
          this.type === ListComponentsTypes.INFINITE
            ? [...data.concat(request)]
            : [...request];
      } catch (error: unknown) {
        this.log.error(
          (error as Error)?.message ||
            `Unable to find ${this.model} on registry. Return empty array from component`
        );
      }
    }

    if (data?.length) {
      if (this.searchValue) {
        this.items = [...data];
        if (this.items?.length <= this.limit) this.loadMoreData = false;
      } else {
        this.items = [...data];
      }
    }
    if (this.type === ListComponentsTypes.PAGINATED && this.paginator)
      this.getMoreData(this.paginator.total);
    return data || ([] as KeyValue[]);
  }

  /**
   * @description Converts search values or filter queries into database conditions.
   * @summary Transforms search input or complex filter queries into Condition objects
   * that can be used for database querying. Handles both simple string/number searches
   * across indexed fields and complex filter queries with multiple criteria.
   *
   * For simple searches (string/number):
   * - Creates conditions that search across all indexed fields
   * - Uses equality for numeric values and regex for string values
   * - Combines conditions with OR logic to search multiple fields
   *
   * For complex filter queries:
   * - Processes each filter item with its specific condition type
   * - Supports Equal, Not Equal, Contains, Not Contains, Greater Than, Less Than
   * - Updates sort configuration based on the filter query
   * - Combines multiple filter conditions with OR logic
   *
   * @param {string | number | IFilterQuery} value - The search value or filter query object
   * @returns {Condition<Model>} A Condition object for database querying
   * @memberOf ListComponent
   */
  parseConditions(value: string | number | IFilterQuery): Condition<Model> {
    let _condition: Condition<Model>;
    const model = this.model as Model;
    if (typeof value === Primitives.STRING || !isNaN(value as number)) {
      _condition = Condition.attribute<Model>(this.pk as keyof Model).eq(
        !isNaN(value as number) ? Number(value) : value
      );
      for (const index of this.indexes as (keyof Model)[]) {
        if (index === this.pk) continue;
        let orCondition;
        if (!isNaN(value as number)) {
          orCondition = Condition.attribute<Model>(index).eq(Number(value));
        } else {
          const type = Metadata.type(
            model.constructor as Constructor<Model>,
            index
          ).name;
          orCondition =
            type === Date
              ? Condition.attribute<Model>(index).eq(new Date(value as string))
              : Condition.attribute<Model>(index).regexp(value as string);
        }
        _condition = _condition.or(orCondition);
      }
    } else {
      const { query, sort } = value as IFilterQuery;
      const pk = this.pk as keyof Model;
      _condition = Condition.attribute<Model>(pk).dif('null');

      if (query?.length) _condition = undefined as unknown as Condition<Model>;

      (query || []).forEach((item: IFilterQueryItem) => {
        const { value, condition, index } = item;
        let val = value as string | number | Date;
        if (index === this.pk || !isNaN(val as number)) {
          val = Number(val);
        }
        const type = Metadata.type(
          model.constructor as Constructor<Model>,
          index as keyof Model
        ).name;
        if (type === Date.name) {
          val = new Date(val as string);
        }
        let orCondition;
        switch (condition) {
          case 'Equal':
            orCondition = Condition.attribute<Model>(index as keyof Model).eq(
              val
            );
            break;
          case 'Not Equal':
            orCondition = Condition.attribute<Model>(index as keyof Model).dif(
              val
            );
            break;
          case 'Not Contains':
            orCondition = !Condition.attribute<Model>(
              index as keyof Model
            ).regexp(new RegExp(`^(?!.*${val}).*$`));
            break;
          case 'Contains':
            orCondition = Condition.attribute<Model>(
              index as keyof Model
            ).regexp(val as string);
            break;
          case 'Greater Than':
            orCondition = Condition.attribute<Model>(index as keyof Model).gte(
              val
            );
            break;
          case 'Less Than':
            orCondition = Condition.attribute<Model>(index as keyof Model).lte(
              val
            );
            break;
        }
        _condition = (
          !_condition
            ? orCondition
            : _condition.and(orCondition as unknown as Condition<Model>)
        ) as Condition<Model>;
      });

      this.sortBy = (sort?.value as keyof Model) || this.pk;
      this.sortDirection = sort?.direction || this.sortDirection;
    }
    return _condition as Condition<Model>;
  }

  /**
   * @description Processes query results into a standardized format.
   * @summary Handles different result formats from various data sources, extracting
   * pagination information when available and applying any configured data mapping.
   * This ensures consistent data structure regardless of the source.
   *
   * @protected
   * @param {KeyValue[] | Paginator} result - The raw query result
   * @returns {KeyValue[]} The processed array of items
   *
   * @memberOf ListComponent
   */
  protected async parseResult(
    result: KeyValue[] | Paginator<Model>
  ): Promise<KeyValue[]> {
    if (!Array.isArray(result) && 'page' in result && 'total' in result) {
      const paginator = result as Paginator<Model>;
      try {
        result = await paginator.page(this.page);
        this.getMoreData(paginator.total);
      } catch (error: unknown) {
        this.log.info(
          (error as Error)?.message ||
            'Unable to get page from paginator. Return empty array from component'
        );
        result = [];
      }
    } else {
      this.getMoreData((result as KeyValue[])?.length || 0);
    }
    return Object.keys(this.mapper || {}).length
      ? this.mapResults(result)
      : result;
  }

  /**
   * @description Updates pagination state based on data length.
   * @summary Calculates whether more data is available and how many pages exist
   * based on the total number of items and the configured limit per page.
   * This information is used to control pagination UI and infinite scrolling behavior.
   *
   * @param {number} length - The total number of items available
   * @returns {void}
   *
   * @memberOf ListComponent
   */
  getMoreData(length: number): void {
    if (this.type === ListComponentsTypes.INFINITE) {
      if (this.paginator) length = length * this.limit;
      if (length <= this.limit) {
        this.loadMoreData = false;
      } else {
        this.pages = Math.floor(length / this.limit);
        if (this.pages * this.limit < length) this.pages += 1;
        if (this.pages === 1) this.loadMoreData = false;
      }
    } else {
      this.pages = length;
      if (this.pages === 1)
        this.loadMoreData = false;
    }
  }

  /**
   * @description Maps a single item using the configured mapper.
   * @summary Transforms a data item according to the mapping configuration,
   * extracting nested properties and formatting values as needed. This allows
   * the component to display data in a format different from how it's stored.
   *
   * @protected
   * @param {KeyValue} item - The item to map
   * @param {KeyValue} mapper - The mapping configuration
   * @param {KeyValue} [props] - Additional properties to include
   * @returns {KeyValue} The mapped item
   *
   * @memberOf ListComponent
   */
  protected itemMapper(
    item: KeyValue,
    mapper: KeyValue,
    props?: KeyValue
  ): KeyValue {
    return Object.entries(mapper).reduce((accum: KeyValue, [key, value]) => {
      const arrayValue = value.split('.');
      if (!value) {
        accum[key] = value;
      } else {
        if (arrayValue.length === 1) {
          value = item?.[value] ? item[value] : '';
          // value = item?.[value] ? item[value] : value !== key ? value : "";
          if (isValidDate(value)) value = `${formatDate(value)}`;
          accum[key] = value;
        } else {
          let val;

          for (const _value of arrayValue)
            val = !val
              ? item[_value]
              : (typeof val === 'string' ? JSON.parse(val) : val)[_value];

          if (isValidDate(new Date(val))) val = `${formatDate(val)}`;

          accum[key] = val === null || val === undefined ? value : val;
        }
      }
      return Object.assign({}, props || {}, accum);
    }, {});
  }

  /**
   * @description Maps all result items using the configured mapper.
   * @summary Applies the itemMapper to each item in the result set, adding
   * common properties like operations and route information. This transforms
   * the raw data into the format expected by the list item components.
   *
   * @param {KeyValue[]} data - The array of items to map
   * @returns {KeyValue[]} The array of mapped items
   *
   * @memberOf ListComponent
   */
  mapResults(data: KeyValue[]): KeyValue[] {
    if (!data || !data.length) return [];
    // passing uid as prop to mapper
    this.mapper = { ...this.mapper, ...{ uid: this.pk } };
    const props = Object.assign({
      operations: this.operations,
      route: this.route,
      ...Object.keys(this.item).reduce((acc: KeyValue, key: string) => {
        acc[key] = this.item[key];
        return acc;
      }, {}),
    });
    return data.reduce((accum: KeyValue[], curr) => {
      accum.push({
        ...this.itemMapper(curr, this.mapper as KeyValue, props),
        ...{ pk: this.pk },
        ...{ model: curr },
      });
      return accum;
    }, []);
  }

  parseSearchValue() {
    if (typeof this.searchValue === Primitives.STRING)
      return this.searchValue || '';
    const searchValue = this.searchValue as IFilterQuery;
    return (searchValue?.query as IFilterQueryItem[])
      .map((item) => `${item.index} ${item.condition} ${item.value}`)
      .join(', ');
  }
}
