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
 * @summary The SearchbarComponent provides a customizable search input field with various options
 * for appearance and behavior. It extends NgxBaseComponent to inherit common functionality and
 * implements OnInit for initialization logic. This component is designed to be flexible and
 * adaptable to different search requirements within an application.
 *
 * @class SearchbarComponent
 * @extends {NgxBaseComponent}
 * @implements {OnInit}
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
   * @summary Specifies whether the browser should enable autocomplete for the input.
   * @type {AutocompleteTypes | undefined}
   * @default "off"
   */
  @Input()
  autocomplete: AutocompleteTypes | undefined = "off";

  /**
   * @description The autocorrect attribute for the searchbar input.
   * @summary Specifies whether the browser should enable autocorrect for the input.
   * @type {"on" | "off"}
   * @default "off"
   */
  @Input()
  autocorrect: "on" | "off" = "off";

  /**
   * @description Whether the searchbar should animate.
   * @summary Controls the animation of the searchbar when it appears or disappears.
   * @type {StringOrBoolean}
   * @default true
   */
  @Input()
  animated: StringOrBoolean = true;

  /**
   * @description The text for the cancel button.
   * @summary Specifies the text to be displayed on the cancel button of the searchbar.
   * @type {string}
   * @default "Cancel"
   */
  @Input()
  buttonCancelText = "Cancel";

  /**
   * @description The icon to use for the clear button.
   * @summary Specifies the icon to be displayed for the clear button of the searchbar.
   * @type {string | undefined}
   * @default undefined
   */
  @Input()
  clearIcon: string | undefined = undefined;

  /**
   * @description The color of the searchbar.
   * @summary Specifies the color theme to be applied to the searchbar.
   * @type {string | undefined}
   * @default undefined
   */
  @Input()
  color: string | undefined = undefined;

  /**
   * @description The amount of time, in milliseconds, to wait to trigger the `ionChange` event after each keystroke.
   * @summary Controls the debounce time for the search input to reduce the frequency of event emissions.
   * @type {number}
   * @default 500
   */
  @Input()
  debounce: number = 500;

  /**
   * @description Whether the searchbar is disabled.
   * @summary Controls whether the searchbar is interactive or not.
   * @type {StringOrBoolean}
   * @default false
   */
  @Input()
  disabled: StringOrBoolean = false;

  /**
   * @description A hint to the browser for which enter key to display.
   * @summary Specifies the type of action that will be performed when the enter key is pressed.
   * @type {"search" | "enter" | "done" | "go" | "next" | "previous" | "send" | undefined}
   * @default "enter"
   */
  @Input()
  enterkeyhint: "search" | "enter" | "done" | "go" | "next" | "previous" | "send" | undefined = "enter";

  /**
   * @description The input mode for the searchbar.
   * @summary Specifies the type of data that might be entered by the user while editing the element or its contents.
   * @type {"text" | "search" | "none" | "email" | "tel" | "url" | "numeric" | "decimal" | undefined}
   * @default 'search'
   */
  @Input()
  inputmode: "text" | "search" | "none" | "email" | "tel" | "url" | "numeric" | "decimal" | undefined = 'search';

  /**
   * @description The placeholder for the searchbar input.
   * @summary Specifies the placeholder text to be displayed in the searchbar when it's empty.
   * @type {string}
   * @default "Search"
   */
  @Input()
  placeholder = "Search";

  /**
   * @description The icon to use for the search button.
   * @summary Specifies the icon to be displayed for the search button of the searchbar.
   * @type {string | undefined}
   * @default "search-outline"
   */
  @Input()
  searchIcon: string | undefined = "search-outline";

  /**
   * @description When to show the cancel button.
   * @summary Controls the visibility of the cancel button in different states of the searchbar.
   * @type {"always" | "focus" | "never"}
   * @default "never"
   */
  @Input()
  showCancelButton: "always" | "focus" | "never" = "never";

  /**
   * @description When to show the clear button.
   * @summary Controls the visibility of the clear button in different states of the searchbar.
   * @type {"always" | "focus" | "never"}
   * @default "focus"
   */
  @Input()
  showClearButton: "always" | "focus" | "never" = "focus";

  /**
   * @description Whether to enable spellcheck on the searchbar input.
   * @summary Controls whether the browser's spellcheck feature is enabled for the searchbar input.
   * @type {boolean}
   * @default false
   */
  @Input()
  spellcheck: boolean = false;

  /**
   * @description The type of input to use for the searchbar.
   * @summary Specifies the type of control to display for the searchbar input.
   * @type {"number" | "text" | "search" | "email" | "password" | "tel" | "url" | undefined}
   * @default "search"
   */
  @Input()
  type: "number" | "text" | "search" | "email" | "password" | "tel" | "url" | undefined = "search";

  /**
   * @description The value of the searchbar input.
   * @summary Specifies the current value of the searchbar input.
   * @type {null | string | undefined}
   * @default ""
   */
  @Input()
  value: null | string | undefined = "";

  /**
   * @description The keys to use for querying.
   * @summary Specifies the keys to be used when performing a search query.
   * @type {string | string[]}
   * @default "name"
   */
  @Input()
  queryKeys: string | string[] = "name";

  /**
   * @description Whether the searchbar is visible.
   * @summary Controls the visibility of the searchbar component.
   * @type {StringOrBoolean}
   * @default false
   */
  @Input()
  isVisible: StringOrBoolean = false;

  /**
   * @description Whether to wrap the searchbar in a container.
   * @summary Controls whether the searchbar is wrapped in an additional container element.
   * @type {StringOrBoolean}
   * @default false
   */
  @Input()
  wrapper: StringOrBoolean = false;

  /**
   * @description The color of the wrapper.
   * @summary Specifies the color theme to be applied to the wrapper container, if present.
   * @type {PredefinedColors}
   * @default "primary"
   */
  @Input()
  wrapperColor: PredefinedColors = "primary";

  /**
   * @description Whether to emit events to the window.
   * @summary Controls whether search events should be emitted as window events.
   * @type {StringOrBoolean}
   * @default true
   */
  @Input()
  emitEventToWindow: StringOrBoolean = true;

  /**
   * @description The current value of the searchbar.
   * @summary Stores the current value of the searchbar input for internal use.
   * @type {string | undefined}
   */
  currentValue: string | undefined;

  /**
   * @description Event emitter for search events.
   * @summary Emits search events when the user interacts with the searchbar.
   * @type {EventEmitter<string>}
   */
  @Output()
  searchEvent: EventEmitter<string> = new EventEmitter<string>();

  /**
   * @description Creates an instance of SearchbarComponent.
   * @summary Initializes the SearchbarComponent and adds all Ionicons to the application.
   */
  constructor() {
    super('SearchbarComponent');
    addIcons(allIcons)
  }

  /**
   * @description Initializes the component.
   * @summary Converts string inputs to boolean values and sets up initial component state.
   * @return {void}
   */
  ngOnInit(): void {
    this.emitEventToWindow = stringToBoolean(this.emitEventToWindow);
    this.wrapper = stringToBoolean(this.wrapper);
    this.isVisible = stringToBoolean(this.isVisible);
    this.disabled = stringToBoolean(this.disabled);
    this.animated = stringToBoolean(this.animated);
  }

  /**
   * @description Handles the visibility toggle of the searchbar.
   * @summary Listens for a window event to toggle the visibility of the searchbar.
   * When made visible, it focuses on the searchbar input after a short delay.
   * @param {CustomEvent} event - The custom event triggering the visibility toggle
   * @return {void}
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
   * @description Triggers a search event.
   * @summary Emits the current value of the searchbar as a search event.
   * @return {void}
   */
  search(): void {
    const element = this.component.nativeElement as HTMLIonSearchbarElement;
    this.searchEvent.emit(element.value || undefined);
  }

  /**
   * @description Handles changes to the searchbar value.
   * @summary Emits a search event when the value of the searchbar changes.
   * @param {CustomEvent} event - The change event from the searchbar
   * @return {void}
   */
  handleChange(event: CustomEvent): void {
    const value = event?.detail?.value;
    this.emitEvent(value ?? undefined);
  }

  /**
   * @description Handles clearing of the searchbar.
   * @summary Emits an undefined value as a search event when the searchbar is cleared.
   * @return {void}
   */
  handleClear(): void {
    this.emitEvent(undefined);
  }

  /**
   * @description Handles input events on the searchbar.
   * @summary Emits a search event with the current input value, or clears if the input is empty.
   * @param {CustomEvent} event - The input event from the searchbar
   * @return {void}
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
   * @description Emits a search event.
   * @summary Emits the search value both as a component event and optionally as a window event.
   * @param {string | undefined} value - The search value to emit
   * @return {void}
   */
  emitEvent(value: string | undefined): void {
    this.searchEvent.emit(value);
    if(this.emitEventToWindow)
      windowEventEmitter('searchbarEvent', {value: value})
  }

  /**
   * @description Prevents default behavior of an event.
   * @summary Used to prevent unwanted default actions on certain events.
   * @param {Event} event - The event to prevent
   * @return {void}
   */
  preventChange(event: Event): void {
     event.preventDefault();
  }
}
