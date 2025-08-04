import { Component, ElementRef, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild  } from '@angular/core';
import { ForAngularModule } from 'src/lib/for-angular.module';
import { NgxBaseComponent } from 'src/lib/engine/NgxBaseComponent';
import { IonChip, IonIcon, IonItem, IonLabel, IonPopover, IonSearchbar } from '@ionic/angular/standalone';
import { Dynamic, KeyValue } from 'src/lib/engine';
import { getWindowWidth } from 'src/lib/helpers/utils';
import { debounceTime, fromEvent, Subscription } from 'rxjs';

/**
 * @description Advanced filter component for creating dynamic search filters with step-by-step construction.
 * @summary This component provides a comprehensive filtering interface that allows users to build
 * complex search criteria using a three-step approach: select index → select condition → enter value.
 * It supports filtering by multiple field indexes, comparison conditions, and values, displaying
 * selected filters as removable chips. The component is responsive and includes auto-suggestions
 * with keyboard navigation support.
 *
 * @example
 * ```html
 * <ngx-decaf-filter
 *   [indexes]="['name', 'email', 'department', 'status']"
 *   [conditions]="['Equal', 'Contains', 'Greater Than', 'Less Than']"
 *   [sort]="['createdAt', 'updatedAt']"
 *   [disableSort]="false"
 *   (filterEvent)="onFiltersChanged($event)">
 * </ngx-decaf-filter>
 * ```
 *
 * @mermaid
 * sequenceDiagram
 *   participant U as User
 *   participant F as FilterComponent
 *   participant P as Parent Component
 *
 *   U->>F: Focus input field
 *   F->>F: handleFocus() - Show available indexes
 *   U->>F: Select index (e.g., "name")
 *   F->>F: addFilter() - Step 1 completed
 *   F->>F: Show available conditions
 *   U->>F: Select condition (e.g., "Contains")
 *   F->>F: addFilter() - Step 2 completed
 *   F->>F: Show value input prompt
 *   U->>F: Enter value and press Enter
 *   F->>F: addFilter() - Step 3 completed
 *   F->>F: Create complete filter object
 *   F->>P: Emit filterEvent with new filter array
 *   F->>F: Reset to step 1 for next filter
 *
 * @memberOf ForAngularModule
 */
@Dynamic()
@Component({
  selector: 'ngx-decaf-filter',
  templateUrl: './filter.component.html',
  styleUrls: ['./filter.component.scss'],
  imports: [ForAngularModule, IonPopover, IonLabel, IonItem, IonChip, IonIcon, IonSearchbar],
  standalone: true,

})
export class FilterComponent extends NgxBaseComponent implements OnInit, OnDestroy {

  /**
   * @description Reference to the dropdown options container element.
   * @summary ViewChild reference used to access and manipulate the dropdown options element
   * for highlighting filtered items and managing visual feedback during option selection.
   * This element contains the filterable suggestions that users can interact with.
   *
   * @type {ElementRef}
   * @memberOf FilterComponent
   */
  @ViewChild('optionsFilterElement', { read: ElementRef, static: false })
  optionsFilterElement!: ElementRef;

  /**
   * @description Available field indexes for filtering operations.
   * @summary Defines the list of field names that users can filter by. These represent
   * the data properties available for filtering operations. Each index corresponds to
   * a field in the data model that supports comparison operations.
   *
   * @type {string[]}
   * @default []
   * @memberOf FilterComponent
   */
  @Input()
  indexes: string[] = [];

  /**
   * @description Available comparison conditions for filters.
   * @summary Defines the list of comparison operators that can be used when creating filters.
   * These conditions determine how the filter value is compared against the field value.
   * Common conditions include equality, containment, and numerical comparison operations.
   *
   * @type {string[]}
   * @default []
   * @memberOf FilterComponent
   */
  @Input()
  conditions: string[] = [];

  /**
   * @description Available sorting options for the filtered data.
   * @summary Defines the list of field names that can be used for sorting the filtered results.
   * When disableSort is false, this array is automatically merged with the indexes array
   * to provide comprehensive sorting capabilities.
   *
   * @type {string[]}
   * @default []
   * @memberOf FilterComponent
   */
  @Input()
  sort: string[] = [];

  /**
   * @description Controls whether sorting functionality is disabled.
   * @summary When set to true, prevents the automatic merging of sort and indexes arrays,
   * effectively disabling sorting capabilities. This is useful when you want to provide
   * filtering without sorting options.
   *
   * @type {boolean}
   * @default false
   * @memberOf FilterComponent
   */
  @Input()
  disableSort: boolean = false;

  /**
   * @description Current window width for responsive behavior.
   * @summary Stores the current browser window width in pixels. This value is updated
   * on window resize events to enable responsive filtering behavior and layout adjustments
   * based on available screen space.
   *
   * @type {number}
   * @memberOf FilterComponent
   */
  windowWidth!: number;

  /**
   * @description Available options for the current filter step.
   * @summary Contains the list of options available for selection in the current step.
   * This array changes dynamically based on the current step: indexes → conditions → empty for value input.
   *
   * @type {string[]}
   * @default []
   * @memberOf FilterComponent
   */
  options: string[] = [];

  /**
   * @description Filtered options based on user input.
   * @summary Contains the subset of options that match the current user input for real-time
   * filtering. This array is updated as the user types to show only relevant suggestions
   * in the dropdown menu.
   *
   * @type {string[]}
   * @default []
   * @memberOf FilterComponent
   */
  filteredOptions: string[] = [];

  /**
   * @description Complete filter objects created by the user.
   * @summary Array of complete filter objects, each containing index, condition, and value properties.
   * These represent the active filters that can be applied to data operations.
   *
   * @type {KeyValue[]}
   * @default []
   * @memberOf FilterComponent
   */
  filterValue: KeyValue[] = [];

  /**
   * @description Current filter being constructed.
   * @summary Temporary object that accumulates filter properties (index, condition, value)
   * during the three-step filter creation process. Gets added to filterValue when complete.
   *
   * @type {KeyValue}
   * @default {}
   * @memberOf FilterComponent
   */
  lastFilter: KeyValue = {};

  /**
   * @description Current step in the filter creation process.
   * @summary Tracks the current step of filter creation: 1 = index selection, 2 = condition selection,
   * 3 = value input. Automatically resets to 1 after completing a filter.
   *
   * @type {number}
   * @default 1
   * @memberOf FilterComponent
   */
  step: number = 1;

  /**
   * @description Controls dropdown visibility state.
   * @summary Boolean flag that determines whether the options dropdown is currently visible.
   * Used to manage the dropdown's open/close state and coordinate with focus/blur events.
   *
   * @type {boolean}
   * @default false
   * @memberOf FilterComponent
   */
  dropdownOpen: boolean = false;

  /**
   * @description Current input field value.
   * @summary Stores the current text input value that the user is typing. This value is
   * bound to the input field and is cleared after each successful filter step completion.
   *
   * @type {string}
   * @default ''
   * @memberOf FilterComponent
   */
  value: string = '';

  /**
   * @description Event emitter for filter changes.
   * @summary Emits filter events when the user creates, modifies, or clears filters.
   * The emitted value contains an array of complete filter objects or undefined when
   * filters are cleared. Parent components listen to this event to update their data display.
   *
   * @type {EventEmitter<KeyValue[] | undefined>}
   * @memberOf FilterComponent
   */
  @Output()
  filterEvent: EventEmitter<KeyValue[] | undefined> = new EventEmitter<KeyValue[] | undefined>();

  /**
   * @description Subscription for window resize events.
   * @summary RxJS subscription that listens for window resize events with debouncing
   * to update the windowWidth property. This enables responsive behavior and prevents
   * excessive updates during resize operations.
   *
   * @type {Subscription}
   * @memberOf FilterComponent
   */
  windowResizeSubscription!: Subscription;


  /**
   * @description Constructor for FilterComponent.
   * @summary Initializes a new instance of the FilterComponent.
   * Calls the parent constructor with the component name to establish base locale string generation
   * and internationalization support.
   *
   * @memberOf FilterComponent
   */
  constructor() {
    super("FilterComponent");
  }

  /**
   * @description Initializes the component after Angular first displays the data-bound properties.
   * @summary Sets up the component by initializing window width tracking, setting up resize event
   * subscriptions with debouncing, configuring sorting options, and calling the base initialization.
   * This method prepares the component for user interaction and responsive behavior.
   *
   * @mermaid
   * sequenceDiagram
   *   participant A as Angular Lifecycle
   *   participant F as FilterComponent
   *   participant W as Window
   *   participant R as RxJS
   *
   *   A->>F: ngOnInit()
   *   F->>W: getWindowWidth()
   *   W-->>F: Return current width
   *   F->>R: Setup resize subscription with debounce
   *   R-->>F: Subscription created
   *   alt disableSort is false
   *     F->>F: Merge sort and indexes arrays
   *   end
   *   F->>F: Call initialize()
   *
   * @returns {void}
   * @memberOf FilterComponent
   */
  ngOnInit(): void {
    this.windowWidth = getWindowWidth() as number;
    this.windowResizeSubscription = fromEvent(window, 'resize')
    .pipe(debounceTime(300))
    .subscribe(() => {
     this.windowWidth = getWindowWidth() as number;
    });

    if(!this.disableSort)
      this.sort = [... this.sort, ...this.indexes];
    this.initialize();
  }

  /**
   * @description Cleanup method called when the component is destroyed.
   * @summary Unsubscribes from window resize events to prevent memory leaks.
   * This is essential for proper cleanup of RxJS subscriptions when the component
   * is removed from the DOM.
   *
   * @returns {void}
   * @memberOf FilterComponent
   */
  ngOnDestroy(): void {
    this.windowResizeSubscription.unsubscribe();
  }

  /**
   * @description Handles input events from the text field.
   * @summary Processes user input and filters the available options based on the typed value.
   * This method provides real-time filtering of suggestions as the user types in the input field.
   *
   * @param {InputEvent} event - The input event containing the new value
   * @returns {void}
   * @memberOf FilterComponent
   */
  handleInput(event: InputEvent): void {
    const {value} = event.target as HTMLInputElement;
      this.filteredOptions = this.filterOptions(value);
  }

  /**
   * @description Handles focus events on the input field.
   * @summary Sets up the available options when the input field receives focus and opens the dropdown.
   * If no options are provided, automatically determines the appropriate options based on current step.
   * This method initializes the dropdown with contextually relevant suggestions.
   *
   * @param {string[]} options - Optional array of options to display
   * @returns {void}
   * @memberOf FilterComponent
   */
  handleFocus(options: string[]  = []): void {
    if(!options.length)
     options = this.getOptions();
    // if(this.step === 3)
    //   options = [];
    this.filteredOptions = this.options = options;
    this.dropdownOpen = true;
  }

  /**
   * @description Handles blur events on the input field with delayed closing.
   * @summary Manages the dropdown closing behavior with a delay to allow for option selection.
   * Uses a two-phase approach to prevent premature closing when users click on dropdown options.
   *
   * @param {boolean} close - Internal flag to control the closing phase
   * @returns {void}
   * @memberOf FilterComponent
   */
  handleBlur(close: boolean = false): void {
    if(!close) {
      this.dropdownOpen = false;
      setTimeout(() => {
        this.handleBlur(true);
      }, 400);
    } else {
      if(!this.dropdownOpen && this.options.length) {
        setTimeout(() => {
          this.options = [];
          this.dropdownOpen = false;
        }, 50);
      }
    }
  }

  /**
   * @description Determines the appropriate options based on the current filter step.
   * @summary Returns the contextually relevant options for the current step in the filter creation process.
   * Step 1 shows indexes, Step 2 shows conditions, Step 3 shows no options (value input).
   *
   * @returns {string[]} Array of options appropriate for the current step
   * @memberOf FilterComponent
   */
  getOptions(): string[] {
   switch (this.step) {
      case 1:
        this.options = this.indexes;
        break;
      case 2:
        this.options = this.conditions;
        break;
      case 3:
        this.options = [];
        break;
    }
    return this.options
  }

  /**
   * @description Adds a filter step or completes filter creation through a three-step process.
   * @summary Core method for building filters step by step: Step 1 (Index) → Step 2 (Condition) → Step 3 (Value).
   * When all steps are complete, creates a complete filter object and adds it to the filter collection.
   * Handles both keyboard events (Enter to submit) and programmatic calls.
   *
   * @param {string} value - The value to add for the current step
   * @param {CustomEvent} event - Optional event (KeyboardEvent triggers submission when value is empty)
   * @returns {void}
   *
   * @mermaid
   * sequenceDiagram
   *   participant U as User
   *   participant F as FilterComponent
   *
   *   U->>F: addFilter(value, event)
   *   F->>F: Trim and validate value
   *   alt KeyboardEvent && empty value
   *     F->>F: submit() - Send current filters
   *   else Valid value or step 3
   *     alt Step 1 (Index)
   *       F->>F: lastFilter.index = value
   *       F->>F: options = conditions
   *     else Step 2 (Condition)
   *       F->>F: lastFilter.condition = value
   *       F->>F: options = []
   *     else Step 3 (Value)
   *       F->>F: lastFilter.value = value
   *       F->>F: Add complete filter to filterValue
   *       F->>F: Reset step to 1
   *     end
   *     F->>F: Increment step
   *     F->>F: Clear input & focus
   *     F->>F: Show next options
   *   end
   *
   * @memberOf FilterComponent
   */
  addFilter(value: string, event?: CustomEvent): void {
    value = value.trim();
    if(event instanceof KeyboardEvent && !value) {
      this.submit();
    } else {
       if((value && (!(event instanceof KeyboardEvent)) || this.step === 3)) {
        const filter = this.lastFilter;
        switch (this.step) {
          case 1:
            filter['index'] = value;
            this.options = this.conditions;
            break;
          case 2:
            filter['condition'] = value;
            this.options = [];
            break;
          case 3:
            filter['value'] = value;
            this.options = this.indexes;
            break;
        }
        if(!this.filterValue.length) {
          this.filterValue.push(filter);
        } else {
          if(this.step === 1)
            this.filterValue.push(filter);
        }
        if(this.step === 3) {
          this.step = 0;
          this.filterValue[this.filterValue.length - 1] = filter;
          this.lastFilter = {};
        }
        this.step++;
        this.value = '';
        this.component.nativeElement.focus();
        if(this.options.length)
          this.handleFocus(this.options);
      }
    }
  }

  /**
   * @description Selects an option from the dropdown suggestions.
   * @summary Handles option selection when a user clicks on a suggestion in the dropdown.
   * This method acts as a bridge between dropdown clicks and the main addFilter logic.
   *
   * @param {CustomEvent} event - The click event from the dropdown option
   * @param {string} value - The selected option value
   * @returns {void}
   * @memberOf FilterComponent
   */
  selectOption(event: CustomEvent, value: string) {
    this.addFilter(value);
  }

  /**
   * @description Determines if a filter tag can be individually removed.
   * @summary Checks whether a filter component should display a close icon for removal.
   * Only value tags can be removed individually; index and condition tags are part
   * of the complete filter structure and cannot be removed separately.
   *
   * @param {string} tag - The filter tag text to check
   * @returns {boolean} True if the tag can be cleared individually, false otherwise
   * @memberOf FilterComponent
   */
  allowClear(tag: string): boolean {
    return this.indexes.indexOf(tag) === -1 && this.conditions.indexOf(tag) === -1;
  }

  /**
   * @description Removes a complete filter from the collection based on filter value.
   * @summary Removes a complete filter by matching the provided value against filter values
   * in the collection. Uses string normalization to handle accents and case differences.
   * After removal, resets the interface to show available indexes for new filter creation.
   *
   * @param {string} filter - The filter value to remove (matches against filter.value property)
   * @returns {void}
   *
   * @mermaid
   * sequenceDiagram
   *   participant U as User
   *   participant F as FilterComponent
   *
   *   U->>F: removeFilter(filterValue)
   *   F->>F: cleanString(filterValue)
   *   F->>F: Filter out matching filter objects
   *   F->>F: Clear input value
   *   F->>F: handleFocus(indexes) - Reset to index selection
   *   Note over F: Filter removed and UI reset
   *
   * @memberOf FilterComponent
   */
  removeFilter(filter: string): void {
    function cleanString(filter: string): string {
      return filter
        .toLowerCase()                 // convert all characters to lowercase
        .normalize("NFD")              // separate accent marks from characters
        .replace(/[\u0300-\u036f]/g, "") // remove accent marks
        .replace(/\s+/g, "");          // remove all whitespace
    }
    this.value = "";
    // if(this.filterValue.length === 1) {
    //   this.initFilter = true;
    //   this.selectedFilters = this.filterValue = [];
    //   this.handleFocus(this.indexes);
    // }

    this.filterValue = this.filterValue.filter((item) => cleanString(item['value']) !== cleanString(filter));
    // const filtered: string[] = [];
    // this.filterValue.forEach(item => {
    //   Object.values(item).forEach(val => filtered.push(val))
    // })
    // this.selectedFilters = [...filtered];
    // this.step = 1;
    // this.filter = {};
    this.handleFocus(this.indexes);
    // const index = this.selectedFilters.indexOf(tag);
    // this.selectedFilters.splice(0, index + 1);
    // if(this.selectedFilters.length === 1) {
    //   this.handleFocus(this.conditions);
    // } else {
    //    this.handleFocus();
    // }
  }

  /**
   * @description Resets the component to its initial state.
   * @summary Clears all filter data, options, and resets the step counter to 1.
   * This method provides a clean slate for new filter creation without emitting events.
   *
   * @returns {void}
   * @memberOf FilterComponent
   */
  reset() {
    this.options = this.filteredOptions = this.filterValue = [];
    this.step = 1;
    this.lastFilter = {};
    this.value = '';
  }

  /**
   * @description Clears all filters and notifies parent components.
   * @summary Resets the component state and emits undefined to notify parent components
   * that all filters have been cleared. This triggers any connected data refresh logic.
   *
   * @param {string} value - Optional parameter (currently unused)
   * @returns {void}
   * @memberOf FilterComponent
   */
  clear(value?: string) {
    if(!value) {
      this.reset();
      this.filterEvent.emit(undefined);
    }
  }

  /**
   * @description Submits the current filter collection to parent components.
   * @summary Emits the current filter array to parent components when filters are ready
   * to be applied. Only emits if there are active filters. Clears options after submission.
   *
   * @returns {void}
   * @memberOf FilterComponent
   */
  submit() {
    console.log('submiting', this.filterValue);
    if(this.filterValue.length) {
      this.filterEvent.emit(this.filterValue);
      this.options = [];
    }
  }

  /**
   * @description Converts a phrase to camelCase format.
   * @summary Utility method that transforms a space-separated phrase into camelCase notation.
   * Useful for converting display strings into property names or API parameters that follow
   * camelCase conventions.
   *
   * @param {string} phrase - The phrase to convert to camelCase
   * @returns {string} The camelCase version of the input phrase
   * @memberOf FilterComponent
   */
  toCamelCase(phrase: string): string {
    return phrase
      .toLowerCase()
      .split(/\s+/)
      .map((word: string, index: number) =>
        (index === 0) ?
            word : word.charAt(0).toUpperCase() + word.slice(1)
      )
      .join('');
  }

  /**
   * @description Filters available options based on user input with visual highlighting.
   * @summary Performs real-time filtering of available options based on user input.
   * Also handles visual highlighting of matching options in the dropdown. Returns all
   * options if input is less than 2 characters for performance optimization.
   *
   * @param {string | null | undefined} value - The search value to filter by
   * @returns {string[]} Array of filtered options that match the input
   *
   * @mermaid
   * sequenceDiagram
   *   participant U as User
   *   participant F as FilterComponent
   *   participant D as DOM
   *
   *   U->>F: filterOptions(inputValue)
   *   alt inputValue < 2 characters
   *     F->>D: Remove existing highlights
   *     F-->>U: Return all options
   *   else inputValue >= 2 characters
   *     F->>D: Query all option elements
   *     F->>D: Add highlight to first matching option
   *     F->>F: Filter options by substring match
   *     F-->>U: Return filtered options
   *   end
   *
   * @memberOf FilterComponent
   */
  filterOptions(value: string | null |  undefined): string[] {
    const optionsElement = this.optionsFilterElement.nativeElement;
    if(!value?.length || !value || value.length < 2) {
      const filteredOption = optionsElement.querySelector('.dcf-filtering-item');
      if(filteredOption)
        filteredOption.classList.remove('dcf-filtering-item');
      return this.options;
    }

    const options = optionsElement.querySelectorAll('.dcf-item');
    for (const option of options) {
      const isActive = option.textContent?.toLowerCase().includes(value.toLowerCase());
      if(isActive) {
        option.classList.add('dcf-filtering-item');
        break;
      }
    }
    return this.options.filter((option: string) => option.toLowerCase().includes(value.toLowerCase() as string));
  }


}
