import { Component, OnInit, EventEmitter, Output, Input, HostListener, Type, OnDestroy  } from '@angular/core';
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
  IonThumbnail,
  IonLoading
} from '@ionic/angular/standalone';
import { debounceTime, Subject } from 'rxjs';
import { InternalError, IRepository, OperationKeys } from '@decaf-ts/db-decorators';
import { Model, set } from '@decaf-ts/decorator-validation';
import { Condition, Observable, Observer, OrderDirection, Paginator, Repository } from '@decaf-ts/core';
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
  consoleError,
  consoleWarn,
  formatDate,
  isValidDate
} from 'src/lib/helpers';
import { SearchbarComponent } from '../searchbar/searchbar.component';
import { EmptyStateComponent } from '../empty-state/empty-state.component';
import { ListItemComponent } from '../list-item/list-item.component';
import { ComponentRendererComponent } from '../component-renderer/component-renderer.component';
import { PaginationComponent } from '../pagination/pagination.component';
import { PaginationCustomEvent } from '../pagination/constants';
import { IListEmptyResult, ListComponentsTypes, DecafRepository } from './constants';
import { consoleInfo } from 'src/lib/helpers';

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
 * @extends {NgxBaseComponent}
 * @implements {OnInit}
 */
@Dynamic()
@Component({
  selector: 'ngx-decaf-list',
  templateUrl: './list.component.html',
  styleUrls: ['./list.component.scss'],
  standalone: true,
  imports: [
    ForAngularModule,
    IonRefresher,
    IonLoading,
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
    ListItemComponent,
    ComponentRendererComponent
  ]
})
export class ListComponent extends NgxBaseComponent implements OnInit, OnDestroy {

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
  type: ListComponentsTypes = ListComponentsTypes.INFINITE;

  /**
   * @description Controls whether the component uses translation services.
   * @summary When set to true, the component will attempt to use translation services
   * for any text content. This allows for internationalization of the list component.
   *
   * @type {StringOrBoolean}
   * @default true
   * @memberOf ListComponent
   */
  @Input()
  override translatable: StringOrBoolean = true;

  /**
   * @description Controls the visibility of the search bar.
   * @summary When set to true, displays a search bar at the top of the list that allows
   * users to filter the list items. The search functionality works by filtering the
   * existing data or by triggering a new data fetch with search parameters.
   *
   * @type {StringOrBoolean}
   * @default true
   * @memberOf ListComponent
   */
  @Input()
  showSearchbar: StringOrBoolean = true;

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
   * @type {string | Function}
   * @required
   * @memberOf ListComponent
   */
  @Input()
  source!: string | Function;

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
   * @type {StringOrBoolean}
   * @default true
   * @memberOf ListComponent
   */
  @Input()
  loadMoreData: StringOrBoolean = true

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
  lines: "inset" | "full" | "none" = "full";

  /**
   * @description Controls whether the list has inset styling.
   * @summary When set to true, the list will have inset styling with rounded corners
   * and margin around the edges. This creates a card-like appearance for the list.
   *
   * @type {StringOrBoolean}
   * @default false
   * @memberOf ListComponent
   */
  @Input()
  inset: StringOrBoolean = false;

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
  scrollThreshold: string = "15%";

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
  scrollPosition: "bottom" | "top" = "bottom";

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
   * @type {StringOrBoolean}
   * @default true
   * @memberOf ListComponent
   */
  @Input()
  showRefresher: StringOrBoolean = true;

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
  loadingSpinner: SpinnerTypes = "circular";

  /**
   * @description Query parameters for data fetching.
   * @summary Specifies additional query parameters to use when fetching data from
   * the source. This can be provided as a string (JSON) or a direct object.
   *
   * @type {string | KeyValue | undefined}
   * @memberOf ListComponent
   */
  @Input()
  query?: string | KeyValue;

  /**
   * @description Sorting parameters for data fetching.
   * @summary Specifies how the fetched data should be sorted. This can be provided
   * as a string (field name with optional direction) or a direct object.
   *
   * @type {string | KeyValue | undefined}
   * @memberOf ListComponent
   */
  @Input()
  sort: OrderDirection = OrderDirection.DSC;

  /**
   * @description Icon to display when the list is empty.
   * @summary Specifies the icon shown in the empty state when no data is available.
   * This can be any icon name supported by the application's icon system.
   *
   * @type {string | undefined}
   * @default 'ti-database-exclamation'
   * @memberOf ListComponent
   */
  @Input()
  emptyIcon?: string = 'ti-database-exclamation';

  /**
   * @description Configuration for the empty state display.
   * @summary Customizes how the empty state is displayed when no data is available.
   * This includes the title, subtitle, button text, icon, and navigation link.
   *
   * @type {Partial<IListEmptyResult>}
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
  empty: Partial<IListEmptyResult> = {
    title: 'empty.title',
    subtitle: 'empty.subtitle',
    showButton: false,
    icon: 'alert-circle-outline',
    buttonText: 'locale.empty.button',
    link: ''
  }

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
   * @description Indicates whether a refresh operation is in progress.
   * @summary When true, the component is currently fetching new data. This is used
   * to control loading indicators and prevent duplicate refresh operations from
   * being triggered simultaneously.
   *
   * @type {boolean}
   * @default false
   * @memberOf ListComponent
   */
  refreshing: boolean = false;

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
  searchValue?: string;

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
  lastPage: number = 1

  /**
   * @description Event emitter for refresh operations.
   * @summary Emits an event when the list data is refreshed, either through pull-to-refresh
   * or programmatic refresh. The event includes the refreshed data and component information.
   *
   * @type {EventEmitter<BaseCustomEvent>}
   * @memberOf ListComponent
   */
  @Output()
  refreshEvent: EventEmitter<BaseCustomEvent> = new EventEmitter<BaseCustomEvent>();

  /**
   * @description Event emitter for item click interactions.
   * @summary Emits an event when a list item is clicked. The event includes the data
   * of the clicked item, allowing parent components to respond to the interaction.
   *
   * @type {EventEmitter<KeyValue>}
   * @memberOf ListComponent
   */
  @Output()
  clickEvent:  EventEmitter<KeyValue> = new EventEmitter<KeyValue>();

  /**
   * @description Subject for debouncing click events.
   * @summary Uses RxJS Subject to collect click events and emit them after a debounce
   * period. This prevents multiple rapid clicks from triggering multiple events.
   *
   * @private
   * @type {Subject<CustomEvent | ListItemCustomEvent | ModelRenderCustomEvent>}
   * @memberOf ListComponent
   */
  private clickItemSubject: Subject<CustomEvent | ListItemCustomEvent | ModelRenderCustomEvent> = new Subject<CustomEvent | ListItemCustomEvent | ModelRenderCustomEvent>();


  private observerSubjet: Subject<any> = new Subject<any>();

  /**
   * @description The repository for interacting with the data model.
   * @summary Provides a connection to the data layer for retrieving and manipulating data.
   * This is an instance of the `DecafRepository` class from the `@decaf-ts/core` package,
   * which is initialized in the `repository` getter method.
   *
   * The repository is used to perform CRUD (Create, Read, Update, Delete) operations on the
   * data model, such as fetching data, creating new items, updating existing items, and deleting
   * items. It also provides methods for querying and filtering data based on specific criteria.
   *
   * @type {DecafRepository<Model>}
   * @private
   * @memberOf ListComponent
   */
  private _repository?: DecafRepository<Model>;

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
    super("ListComponent");
  }

  private observer: Observer = { refresh: async (... args: any[]): Promise<void> => this.observeRepository(...args)}

  /**
   * @description Getter for the repository instance.
   * @summary Provides a connection to the data layer for retrieving and manipulating data.
   * This method initializes the `_repository` property if it is not already set, ensuring
   * that a single instance of the repository is used throughout the component.
   *
   * The repository is used to perform CRUD operations on the data model, such as fetching data,
   * creating new items, updating existing items, and deleting items. It also provides methods
   * for querying and filtering data based on specific criteria.
   *
   * @returns {DecafRepository<Model>} The initialized repository instance.
   * @private
   * @memberOf ListComponent
   */
  private get repository(): DecafRepository<Model> {
    const self = this;
    if (!this._repository) {
      const modelName  = (this.model as any).constructor.name
      const constructor = Model.get(modelName);
      if (!constructor)
        throw new InternalError(
          'Cannot find model. was it registered with @model?',
        );
      this._repository = Repository.forModel(constructor, "ram");
      this.model = new constructor() as Model;
    }
    return this._repository;
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
    this.clickItemSubject.pipe(debounceTime(100)).subscribe(event => this.clickEventEmit(event));
    this.observerSubjet.pipe(debounceTime(100)).subscribe(args => this.handleObserveEvent(args[0], args[1], args[2]));

    this.limit = Number(this.limit);
    this.start = Number(this.start);
    this.inset = stringToBoolean(this.inset);
    this.showRefresher = stringToBoolean(this.showRefresher);
    this.loadMoreData = stringToBoolean(this.loadMoreData);
    this.showSearchbar = stringToBoolean(this.showSearchbar);
    if(typeof this.item?.['tag'] === 'boolean' && this.item?.['tag'] === true)
      this.item['tag'] = ComponentsTagNames.LIST_ITEM as string;

    await this.refresh();

    if(this.operations.includes(OperationKeys.CREATE) && this.route)
      this.empty.link = `${this.route}/${OperationKeys.CREATE}`;

    this.initialize();

    if(this.model instanceof Model && this._repository)
      this._repository.observe(this.observer);
  }

  /**
   * @description Cleans up resources when the component is destroyed.
   * @summary Performs cleanup operations when the component is being removed from the DOM.
   * This includes clearing references to models and data to prevent memory leaks.
   *
   * @returns {void}
   * @memberOf ListComponent
   */
  ngOnDestroy(): void {
    if(this._repository)
      this._repository.unObserve(this.observer);
    this.data =  this.model = this._repository = this.paginator = undefined;
    consoleInfo(this, "Chamou o ng on destroy da lista");
  }

  async observeRepository(...args: any[]): Promise<void> {
    return this.observerSubjet.next(args);
  }

  handleObserveEvent(table: string, event: OperationKeys, uid: string | number): void {
    if(event === OperationKeys.CREATE) {
      // TODO: Implement return id on create
      // this.handleCreate(uid)
      this.refresh(true);
    } else {
      if(event === OperationKeys.UPDATE)
        this.handleUpdate(uid)
      if(event === OperationKeys.DELETE)
        this.handleDelete(uid);
      this.refreshEventEmit();
    }
  }


   /**
    * Handles the create event from the repository.
    *
    * @param {string | number} uid - The ID of the item to create.
    * @returns {Promise<void>} A promise that resolves when the item is created and added to the list.
    */
   async handleCreate(uid: string | number): Promise<void> {
      const item: KeyValue = this.itemMapper(await this._repository?.read(uid) || {}, this.mapper);
      console.log(item);
      this.items = (this.data || []).concat([... this.items, item]);
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
    const self = this;
    const item: KeyValue = this.itemMapper(await this._repository?.read(uid) || {}, this.mapper);
    for(let key in self.items as KeyValue[]) {
        const child = self.items[key] as KeyValue;
        if(child['uid'] === item['uid']) {
          self.items[key] = Object.assign({}, child, item);
          break;
        }
    }
    self.data = [... self.items];
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
  handleDelete(uid: string | number, pk?: string): void  {
    if(!pk)
      pk = this.pk;
    this.items = this.data?.filter((item: KeyValue) => item['uid'] !== uid) || [];
  }


  /**
   * @description Handles click events from list items.
   * @summary Listens for global ListItemClickEvent events and passes them to the
   * debounced click subject. This allows the component to respond to clicks on
   * list items regardless of where they originate from.
   *
   * @param {CustomEvent | ListItemCustomEvent | ModelRenderCustomEvent} event - The click event
   * @returns {void}
   *
   * @memberOf ListComponent
   */
  @HostListener('window:ListItemClickEvent', ['$event'])
  handleClick(event: CustomEvent | ListItemCustomEvent | ModelRenderCustomEvent): void {
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
  async handleSearch(value: string | undefined): Promise<void> {
   const page = this.page;
    if(this.type === ListComponentsTypes.INFINITE) {
      this.loadMoreData = false;
      if(value === undefined) {
        this.loadMoreData = true;
        this.page = 1;
      }
      this.searchValue = value;
      await this.refresh(true);
    } else {
      this.loadMoreData = true;
      this.searchValue = value;
      if(value === undefined)
        this.page = this.lastPage;
      await this.refresh(true);
    }
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
    if(!data)
      data = this.items;
    this.skeletonData = new Array(data?.length || 2);
    this.refreshEvent.emit({
      name: EventConstants.REFRESH_EVENT,
      data: data || [],
      component: this.componentName
    });
  }

  /**
   * @description Emits a click event for a list item.
   * @summary Processes and emits a click event when a list item is clicked.
   * This extracts the relevant data from the event and passes it to parent components.
   *
   * @private
   * @param {CustomEvent | ListItemCustomEvent | ModelRenderCustomEvent} event - The click event
   * @returns {void}
   *
   * @memberOf ListComponent
   */
  private clickEventEmit(event: CustomEvent | ListItemCustomEvent | ModelRenderCustomEvent): void {
   this.clickEvent.emit((event as ModelRenderCustomEvent)?.detail ? (event as ModelRenderCustomEvent)?.detail : event);
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

    this.data = !this.model ?
      await this.getFromRequest(!!event, start, limit)
      : await this.getFromModel(!!event, start, limit) as KeyValue[];

    this.refreshEventEmit();

    if(this.type === ListComponentsTypes.INFINITE) {
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
    } else {
      setTimeout(() => {
        this.refreshing = false;
      }, 200)
    }
  }

  /**
 * @description Handles pagination events from the pagination component.
 * @summary Processes pagination events by updating the current page number and
 * refreshing the list data to display the selected page. This method is called
 * when a user interacts with the pagination controls to navigate between pages.
 *
 * @param {PaginationCustomEvent} event - The pagination event containing page information
 * @returns {void}
 *
 * @memberOf ListComponent
 */
handlePaginate(event: PaginationCustomEvent): void {
  const {direction, page} = event.data;
  this.page = page;
  this.refresh(true);
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
async handleRefresh(event?: InfiniteScrollCustomEvent | CustomEvent): Promise<void> {
  await this.refresh(event as InfiniteScrollCustomEvent || true);
  if(event instanceof CustomEvent)
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
    return results.filter((item: KeyValue) =>
        Object.values(item).some(value =>
            value.toString().toLowerCase().includes((search as string)?.toLowerCase())
          )
      );
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
async getFromRequest(force: boolean = false, start: number, limit: number): Promise<KeyValue[]> {
  let request: any = [];
  if(!this.data?.length || force || this.searchValue?.length) {
    // (self.data as ListItem[]) = [];
    if(!this.searchValue?.length) {
      if(!this.source && !this.data?.length) {
        consoleWarn(this, 'No data and source passed to infinite list');
        return [];
      }

      //  if(typeof this.source === 'string')
      //    request = await this.requestService.prepare(this.source as string);
      if(this.source instanceof Function)
        request = await this.source();

      if(!Array.isArray(request))
        request = request?.response?.data || request?.results || [];
      this.data = [... await this.parseResult(request)];
      if(this.data?.length) {}
        this.items = this.type === ListComponentsTypes.INFINITE ?
          (this.items || []).concat([...this.data.slice(start, limit)]) : [...request.slice(start, limit) as KeyValue[]];
    } else {
      this.data = this.parseSearchResults(this.data as [], this.searchValue as string);
      this.items = this.data;
    }
  }

  if(this.loadMoreData && this.type === ListComponentsTypes.PAGINATED)
    this.getMoreData(this.data?.length || 0);
  return this.data || [] as KeyValue[];
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
 * @returns {Promise<KeyValue>} A promise that resolves to the fetched data
 *
 * @memberOf ListComponent
 */
async getFromModel(force: boolean = false, start: number, limit: number): Promise<KeyValue> {
  let data = [ ... this.data || []];
  let request: KeyValue[] = [];

  // getting model repository
  if(!this._repository)
    this.repository;
  const repo = this._repository as DecafRepository<Model>;
  if(!this.data?.length || force || this.searchValue?.length) {
    try {
      if(!this.searchValue?.length) {
        (this.data as KeyValue[]) = [];
        // const rawQuery = this.parseQuery(self.model as Repository<Model>, start, limit);
        // request = this.parseResult(await (this.model as any)?.paginate(start, limit));
          if(!this.paginator) {
            this.paginator = await repo
              .select()
              .orderBy([this.pk as keyof Model, this.sort])
              .paginate(this.limit);
          }
          request = await this.parseResult(this.paginator);
      } else {

        if(!this.indexes)
          this.indexes = (Object.values(this.mapper) || [this.pk]);

        const searchValue = this.searchValue as string | number;
        let condition = Condition.attribute<Model>(this.pk as keyof Model).eq(!isNaN(searchValue as number) ? Number(searchValue) : searchValue);
        for (let index of this.indexes) {
            if(index === this.pk)
              continue;
            let orCondition;
            if(!isNaN(searchValue as number)) {
              orCondition = Condition.attribute<Model>(index as keyof Model).eq(Number(searchValue));
            } else {
              orCondition = Condition.attribute<Model>(index as keyof Model).regexp(searchValue as string);
            }
            condition = condition.or(orCondition);
        }
        request = await this.parseResult(await repo.select().where(condition).execute());
        data = [];
      }
      data = this.type === ListComponentsTypes.INFINITE ? [... (data).concat(request)] : [...request];
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
  // TODO: paginator.total
  if(this.type === ListComponentsTypes.PAGINATED)
      this.getMoreData(100);
    // this.getMoreData(this.paginator?.total || 0);
  return data || [] as KeyValue[];
}

/**
 * @description Builds a query object for database operations.
 * @summary Creates a structured query object that can be used with the repository's
 * query methods. This includes pagination parameters, filtering criteria, and
 * table information derived from the model.
 *
 * @protected
 * @param {number} start - The starting index for pagination
 * @param {number} limit - The maximum number of items to retrieve
 * @returns {KeyValue} The constructed query object
 *
 * @memberOf ListComponent
 */
protected parseQuery(start: number, limit: number): KeyValue {
  const model = this._repository as IRepository<Model>;
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

/**
 * @description Processes query results into a standardized format.
 * @summary Handles different result formats from various data sources, extracting
 * pagination information when available and applying any configured data mapping.
 * This ensures consistent data structure regardless of the source.
 *
 * @protected
 * @param {KeyValue[] | PaginatedQuery} result - The raw query result
 * @returns {KeyValue[]} The processed array of items
 *
 * @memberOf ListComponent
 */
protected async parseResult(result: KeyValue[] | Paginator<Model>): Promise<KeyValue[]> {
  if(!Array.isArray(result) && ('page' in result && 'total' in result)) {
    this.paginator = result;
    result = await result.page(this.page);
    // TODO: Chage for result.total;
    this.getMoreData(100);
  } else {
    this.getMoreData((result as KeyValue[])?.length || 0);
  }
  return (Object.keys(this.mapper || {}).length) ?
    this.mapResults(result) : result;
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
  if(length <= this.limit) {
    this.loadMoreData = false;
  } else {
    this.pages = Math.floor(length / this.limit);
    if((this.pages * this.limit) < length)
      this.pages += 1;
    if(this.pages === 1)
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
    if(!data || !data.length)
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

