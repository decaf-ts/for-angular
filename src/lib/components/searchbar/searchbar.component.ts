import { Component,  EventEmitter, HostListener, Input, OnInit, Output } from '@angular/core';
import { AutocompleteTypes, PredefinedColors} from '@ionic/core';
import { StringOrBoolean } from 'src/lib/engine/types';
import {windowEventEmitter} from 'src/lib/helpers/utils';
import { ForAngularModule } from 'src/lib/for-angular.module';
import { stringToBoolean } from 'src/lib/helpers/utils';
import { NgxBaseComponent } from 'src/lib/engine/NgxBaseComponent';
import { IonSearchbar } from '@ionic/angular/standalone';
import * as allIcons from 'ionicons/icons';
import { addIcons } from 'ionicons';

/**
 * @description Searchbar component for Angular applications.
 * @summary The SearchbarComponent provides a highly customizable search input field with comprehensive
 * options for appearance, behavior, and interaction patterns. It extends NgxBaseComponent to inherit
 * common functionality and implements OnInit for proper lifecycle management. This component features
 * debounced input handling, window event integration, visibility controls, and extensive styling options.
 * It's designed to be flexible and adaptable to different search requirements within modern web applications.
 *
 * @class SearchbarComponent
 * @extends {NgxBaseComponent}
 * @implements {OnInit}
 * @memberOf SearchbarComponent
 */
@Component({
  selector: 'ngx-decaf-searchbar',
  templateUrl: './searchbar.component.html',
  styleUrls: ['./searchbar.component.scss'],
  standalone: true,
  imports: [ForAngularModule, IonSearchbar],
})
export class SearchbarComponent extends NgxBaseComponent implements OnInit {

  /**
   * @description The mode of the searchbar.
   * @summary Determines the visual style of the searchbar, either iOS or Material Design.
   * @type {"ios" | "md" | undefined}
   * @default "ios"
   */
  // @Input()
  // override mode: "ios" | "md" | undefined = "md";

  /**
   * @description The autocomplete attribute for the searchbar input.
   * @summary Specifies whether the browser should enable autocomplete for the input field.
   * This controls the browser's built-in autocomplete functionality, helping users by
   * suggesting previously entered values or common inputs. Setting to 'off' disables
   * this feature for privacy or security reasons.
   *
   * @type {AutocompleteTypes | undefined}
   * @default "off"
   * @memberOf SearchbarComponent
   */
  @Input()
  autocomplete: AutocompleteTypes | undefined = "off";

  /**
   * @description The autocorrect attribute for the searchbar input.
   * @summary Controls whether the browser should enable autocorrect functionality for the input field.
   * When enabled, the browser will automatically correct spelling mistakes as the user types.
   * This is typically disabled for search fields to preserve the user's exact search terms.
   *
   * @type {"on" | "off"}
   * @default "off"
   * @memberOf SearchbarComponent
   */
  @Input()
  autocorrect: "on" | "off" = "off";

  /**
   * @description Whether the searchbar should animate.
   * @summary Controls the animation behavior of the searchbar during appearance and disappearance transitions.
   * When enabled, the searchbar will use smooth animations for state changes, providing a more
   * polished user experience. This affects transitions like showing/hiding the component.
   *
   * @type {StringOrBoolean}
   * @default true
   * @memberOf SearchbarComponent
   */
  @Input()
  animated: StringOrBoolean = true;

  /**
   * @description The text for the cancel button.
   * @summary Specifies the localized text to be displayed on the cancel button of the searchbar.
   * This text appears when the cancel button is visible and provides users with a clear
   * indication of how to dismiss the search interface. The text can be customized for
   * different languages and cultural contexts.
   *
   * @type {string}
   * @default "Cancel"
   * @memberOf SearchbarComponent
   */
  @Input()
  buttonCancelText: string = "Cancel";

  /**
   * @description The icon to use for the clear button.
   * @summary Specifies the icon to be displayed for the clear button of the searchbar.
   * @type {string | undefined}
   * @default undefined
   * @memberOf SearchbarComponent
   */
  @Input()
  clearIcon: string | undefined = undefined;

  /**
   * @description The color of the searchbar.
   * @summary Specifies the color theme to be applied to the searchbar.
   * @type {string | undefined}
   * @default undefined
   * @memberOf SearchbarComponent
   */
  @Input()
  color: string | undefined = undefined;

  /**
   * @description The amount of time, in milliseconds, to wait to trigger the `ionChange` event after each keystroke.
   * @summary Controls the debounce time for the search input to reduce the frequency of event emissions.
   * @type {number}
   * @default 500
   * @memberOf SearchbarComponent
   */
  @Input()
  debounce: number = 500;

  /**
   * @description Whether the searchbar is disabled.
   * @summary Controls whether the searchbar is interactive or not.
   * @type {StringOrBoolean}
   * @default false
   * @memberOf SearchbarComponent
   */
  @Input()
  disabled: StringOrBoolean = false;

  /**
   * @description A hint to the browser for which enter key to display.
   * @summary Specifies the type of action that will be performed when the enter key is pressed.
   * @type {"search" | "enter" | "done" | "go" | "next" | "previous" | "send" | undefined}
   * @default "enter"
   * @memberOf SearchbarComponent
   */
  @Input()
  enterkeyhint: "search" | "enter" | "done" | "go" | "next" | "previous" | "send" | undefined = "enter";

  /**
   * @description The input mode for the searchbar.
   * @summary Specifies the type of data that might be entered by the user while editing the element or its contents.
   * @type {"text" | "search" | "none" | "email" | "tel" | "url" | "numeric" | "decimal" | undefined}
   * @default 'search'
   * @memberOf SearchbarComponent
   */
  @Input()
  inputmode: "text" | "search" | "none" | "email" | "tel" | "url" | "numeric" | "decimal" | undefined = 'search';

  /**
   * @description The placeholder for the searchbar input.
   * @summary Specifies the placeholder text to be displayed in the searchbar when it's empty.
   * @type {string}
   * @default "Search"
   * @memberOf SearchbarComponent
   */
  @Input()
  placeholder = "Search";

  /**
   * @description The icon to use for the search button.
   * @summary Specifies the icon to be displayed for the search button of the searchbar.
   * @type {string | undefined}
   * @default "search-outline"
   * @memberOf SearchbarComponent
   */
  @Input()
  searchIcon: string | undefined = "search-outline";

  /**
   * @description When to show the cancel button.
   * @summary Controls the visibility of the cancel button in different states of the searchbar.
   * @type {"always" | "focus" | "never"}
   * @default "never"
   * @memberOf SearchbarComponent
   */
  @Input()
  showCancelButton: "always" | "focus" | "never" = "never";

  /**
   * @description When to show the clear button.
   * @summary Controls the visibility of the clear button in different states of the searchbar.
   * @type {"always" | "focus" | "never"}
   * @default "focus"
   * @memberOf SearchbarComponent
   */
  @Input()
  showClearButton: "always" | "focus" | "never" = "focus";

  /**
   * @description Whether to enable spellcheck on the searchbar input.
   * @summary Controls whether the browser's spellcheck feature is enabled for the searchbar input.
   * @type {boolean}
   * @default false
   * @memberOf SearchbarComponent
   */
  @Input()
  spellcheck: boolean = false;

  /**
   * @description The type of input to use for the searchbar.
   * @summary Specifies the type of control to display for the searchbar input.
   * @type {"number" | "text" | "search" | "email" | "password" | "tel" | "url" | undefined}
   * @default "search"
   * @memberOf SearchbarComponent
   */
  @Input()
  type: "number" | "text" | "search" | "email" | "password" | "tel" | "url" | undefined = "search";

  /**
   * @description The value of the searchbar input.
   * @summary Specifies the current value of the searchbar input.
   * @type {null | string | undefined}
   * @default ""
   * @memberOf SearchbarComponent
   */
  @Input()
  value: null | string | undefined = "";

  /**
   * @description The keys to use for querying.
   * @summary Specifies the keys to be used when performing a search query.
   * @type {string | string[]}
   * @default "name"
   * @memberOf SearchbarComponent
   */
  @Input()
  queryKeys: string | string[] = "name";

  /**
   * @description Whether the searchbar is visible.
   * @summary Controls the visibility of the searchbar component.
   * @type {StringOrBoolean}
   * @default false
   * @memberOf SearchbarComponent
   */
  @Input()
  isVisible: StringOrBoolean = false;

  /**
   * @description Whether to wrap the searchbar in a container.
   * @summary Controls whether the searchbar is wrapped in an additional container element.
   * @type {StringOrBoolean}
   * @default false
   * @memberOf SearchbarComponent
   */
  @Input()
  wrapper: StringOrBoolean = false;

  /**
   * @description The color of the wrapper.
   * @summary Specifies the color theme to be applied to the wrapper container, if present.
   * @type {PredefinedColors}
   * @default "primary"
   * @memberOf SearchbarComponent
   */
  @Input()
  wrapperColor: PredefinedColors = "primary";

  /**
   * @description Whether to emit events to the window.
   * @summary Controls whether search events should be emitted as window events.
   * @type {StringOrBoolean}
   * @default true
   * @memberOf SearchbarComponent
   */
  @Input()
  emitEventToWindow: StringOrBoolean = true;

  /**
   * @description The current value of the searchbar.
   * @summary Stores the current value of the searchbar input for internal state management and processing.
   * This property is used to track the search term throughout the component's lifecycle and
   * coordinate between different event handlers and methods.
   *
   * @type {string | undefined}
   * @memberOf SearchbarComponent
   */
  currentValue: string | undefined;

  /**
   * @description Event emitter for search events.
   * @summary Emits search events when the user interacts with the searchbar, providing a reactive
   * interface for parent components to respond to search actions. This event is triggered by
   * various user interactions including typing, clearing, and explicit search actions.
   *
   * @type {EventEmitter<string>}
   * @memberOf SearchbarComponent
   */
  @Output()
  searchEvent: EventEmitter<string> = new EventEmitter<string>();

  /**
   * @description Creates an instance of SearchbarComponent.
   * @summary Initializes the SearchbarComponent with all necessary dependencies and configurations.
   * During initialization, it adds all available Ionicons to the application's icon registry,
   * ensuring that search and clear icons are available for use throughout the component's lifecycle.
   *
   * @memberOf SearchbarComponent
   */
  constructor() {
    super('SearchbarComponent');
    addIcons(allIcons)
  }

  /**
   * @description Initializes the component after Angular first displays the data-bound properties.
   * @summary Performs essential component initialization by converting string-based boolean inputs
   * to proper boolean values using the stringToBoolean utility. This ensures that all boolean
   * properties work correctly regardless of how they were passed from parent components or templates.
   *
   * @return {void}
   *
   * @mermaid
   * sequenceDiagram
   *   participant A as Angular Lifecycle
   *   participant S as SearchbarComponent
   *   participant U as Utility Functions
   *
   *   A->>S: ngOnInit()
   *   S->>U: stringToBoolean(emitEventToWindow)
   *   U-->>S: boolean value
   *   S->>U: stringToBoolean(wrapper)
   *   U-->>S: boolean value
   *   S->>U: stringToBoolean(isVisible)
   *   U-->>S: boolean value
   *   S->>U: stringToBoolean(disabled)
   *   U-->>S: boolean value
   *   S->>U: stringToBoolean(animated)
   *   U-->>S: boolean value
   *   Note over S: Component ready for interaction
   *
   * @memberOf SearchbarComponent
   */
  ngOnInit(): void {
    this.emitEventToWindow = stringToBoolean(this.emitEventToWindow);
    this.wrapper = stringToBoolean(this.wrapper);
    this.isVisible = stringToBoolean(this.isVisible);
    this.disabled = stringToBoolean(this.disabled);
    this.animated = stringToBoolean(this.animated);
  }

  /**
   * @description Handles the visibility toggle of the searchbar component.
   * @summary Listens for global window events to toggle the visibility state of the searchbar.
   * When the searchbar becomes visible, it automatically focuses on the input field after a brief
   * delay to ensure smooth animation completion. This provides a seamless user experience for
   * search activation through keyboard shortcuts or programmatic triggers.
   *
   * @param {CustomEvent} event - The custom event triggering the visibility toggle (unused but required by HostListener)
   * @return {void}
   *
   * @mermaid
   * sequenceDiagram
   *   participant W as Window
   *   participant S as SearchbarComponent
   *   participant E as DOM Element
   *
   *   W->>S: toggleSearchbarVisibility event
   *   S->>S: handleToggleVisibility()
   *   S->>S: Toggle isVisible state
   *   alt isVisible is true AND component exists
   *     S->>S: setTimeout(125ms)
   *     S->>E: setFocus() on ion-searchbar
   *   end
   *
   * @memberOf SearchbarComponent
   */
  @HostListener("window:toggleSearchbarVisibility", ['$event'])
  handleToggleVisibility(): void {
    this.isVisible = !this.isVisible;
    if(this.isVisible && !!this.component.nativeElement) {
      setTimeout(() => {
        (this.component.nativeElement as HTMLIonSearchbarElement).setFocus();
      }, 125);
    }
  }

  /**
   * @description Triggers a manual search event with the current searchbar value.
   * @summary Retrieves the current value from the searchbar's native element and emits it as a search event.
   * This method provides a programmatic way to trigger search functionality, useful for external
   * components or keyboard shortcuts that need to execute search without user interaction with the searchbar itself.
   *
   * @return {void}
   * @memberOf SearchbarComponent
   */
  search(): void {
    const element = this.component.nativeElement as HTMLIonSearchbarElement;
    this.searchEvent.emit(element.value || undefined);
  }

  /**
   * @description Handles value changes in the searchbar input field.
   * @summary Processes change events from the Ionic searchbar component and extracts the new value
   * to emit as a search event. This method is triggered when the user finishes editing the searchbar
   * value, providing a way to react to completed input changes rather than real-time typing.
   *
   * @param {CustomEvent} event - The change event from the Ionic searchbar containing the new value
   * @return {void}
   * @memberOf SearchbarComponent
   */
  handleChange(event: CustomEvent): void {
    this.emitEvent(event?.detail?.value ?? undefined);
  }

  /**
   * @description Handles clearing of the searchbar input field.
   * @summary Emits an undefined value as a search event when the searchbar is cleared by the user.
   * This method is typically triggered when the user clicks the clear button or uses other
   * clear mechanisms, signaling that the search should be reset or cleared.
   *
   * @return {void}
   * @memberOf SearchbarComponent
   */
  handleClear(): void {
    this.emitEvent(undefined);
  }

  /**
   * @description Handles real-time input events on the searchbar.
   * @summary Processes input events as the user types, providing immediate feedback for search functionality.
   * This method implements smart clearing behavior - if the input becomes empty, it automatically
   * triggers the clear handler. Otherwise, it emits the current value for real-time search suggestions
   * or filtering. This enables responsive search experiences with debounced event handling.
   *
   * @param {CustomEvent} event - The input event from the Ionic searchbar containing the current value
   * @return {void}
   *
   * @mermaid
   * sequenceDiagram
   *   participant U as User
   *   participant S as SearchbarComponent
   *   participant E as Event System
   *
   *   U->>S: Type in searchbar
   *   S->>S: handleInput(event)
   *   S->>S: Extract value from event
   *   alt value is empty or null
   *     S->>S: handleClear()
   *     S->>E: Emit undefined
   *   else value has content
   *     S->>S: emitEvent(value)
   *     S->>E: Emit search value
   *   end
   *
   * @memberOf SearchbarComponent
   */
  handleInput(event: CustomEvent): void {
    const value = event?.detail?.value;
    if(!value || !value?.length)
      return this.handleClear();
    this.emitEvent(value);
  }

  /**
   * @description Handles blur events on the searchbar.
   * @summary Currently an empty method, can be implemented for specific blur behavior.
   * @param {CustomEvent} event - The blur event from the searchbar
   * @return {void}
   */
  // handleBlur(event: CustomEvent): void {}

  /**
   * @description Emits search events through multiple channels.
   * @summary Orchestrates the emission of search events both as component output events and optionally
   * as global window events. This dual-channel approach enables both direct parent-child communication
   * and application-wide event broadcasting, supporting flexible integration patterns and loose coupling
   * between components that need to respond to search actions.
   *
   * @param {string | undefined} value - The search value to emit across all configured channels
   * @return {void}
   *
   * @mermaid
   * sequenceDiagram
   *   participant S as SearchbarComponent
   *   participant P as Parent Component
   *   participant W as Window Event System
   *
   *   S->>S: emitEvent(value)
   *   S->>P: searchEvent.emit(value)
   *   alt emitEventToWindow is true
   *     S->>W: windowEventEmitter('searchbarEvent', {value})
   *   end
   *
   * @memberOf SearchbarComponent
   */
  emitEvent(value: string | undefined): void {
    this.searchEvent.emit(value);
    if(this.emitEventToWindow)
      windowEventEmitter('searchbarEvent', {value: value})
  }

  /**
   * @description Prevents default behavior of DOM events.
   * @summary Utility method to prevent unwanted default actions on DOM events, such as form submissions
   * or navigation triggers. This is commonly used in event handlers where the default browser behavior
   * would interfere with the component's custom logic or user experience design.
   *
   * @param {Event} event - The DOM event whose default behavior should be prevented
   * @return {void}
   * @memberOf SearchbarComponent
   */
  preventChange(event: Event): void {
     event.preventDefault();
  }
}
