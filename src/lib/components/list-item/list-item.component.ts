/**
 * @module module:lib/components/list-item/list-item.component
 * @description List item component module.
 * @summary Exposes `ListItemComponent` which renders a single list item with
 * configurable icon, title, description, actions and navigation. The component
 * supports slide actions, popover menus and emits click events for parent
 * components to handle.
 *
 * @link {@link ListItemComponent}
 */

import { Component, EventEmitter, HostListener, inject, Input, OnInit, Output, ViewChild  } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { CrudOperations, OperationKeys } from '@decaf-ts/db-decorators';
import {
  IonButton,
  IonItem,
  IonLabel,
  IonList,
  IonContent,
  IonIcon,
  IonListHeader,
  IonPopover,
  IonItemSliding,
  IonItemOptions,
  IonItemOption
} from '@ionic/angular/standalone';
import { StringOrBoolean } from '../../engine/types';
import { removeFocusTrap, stringToBoolean } from '../../helpers/utils';
import { getWindowWidth, windowEventEmitter } from '../../helpers/utils';
import { Dynamic, EventConstants, ListItemCustomEvent, NgxDecafComponentDirective } from '../../engine';
import { NavController } from '@ionic/angular';

import * as AllIcons from 'ionicons/icons';
import { addIcons } from 'ionicons';


/**
 * @description A component for displaying a list item with various customization options.
 * @summary The ListItemComponent is an Angular component that extends NgxBaseComponentDirective. It provides a flexible and customizable list item interface with support for icons, buttons, and various text elements. The component also handles actions and navigation based on user interactions.
 *
 * @class
 * @extends NgxBaseComponentDirective
 *
 * @param {string} [lines='none'] - Determines the line style of the item. Can be 'inset', 'inseet', or 'none'.
 * @param {Record<string, any>} item - The data item to be displayed in the list item.
 * @param {string} icon - The name of the icon to be displayed.
 * @param {'start' | 'end'} [iconSlot='start'] - The position of the icon within the item.
 * @param {StringOrBoolean} [button=true] - Determines if the item should behave as a button.
 * @param {string} [title] - The main title of the list item.
 * @param {string} [description] - A description for the list item.
 * @param {string} [info] - Additional information for the list item.
 * @param {string} [subinfo] - Sub-information for the list item.
 *
 * @example
 * <ngx-decaf-list-item
 *   [item]="dataItem"
 *   icon="star"
 *   title="Item Title"
 *   description="Item Description"
 *   (clickEvent)="handleItemClick($event)">
 * </ngx-decaf-list-item>
 *
 * @mermaid
 * sequenceDiagram
 *   participant C as Component
 *   participant V as View
 *   participant U as User
 *   C->>V: Initialize component
 *   V->>U: Display list item
 *   U->>V: Click on item or action
 *   V->>C: Trigger handleAction()
 *   C->>C: Process action
 *   C->>V: Update view or navigate
 */
@Dynamic()
@Component({
  selector: 'ngx-decaf-list-item',
  templateUrl: './list-item.component.html',
  styleUrls: ['./list-item.component.scss'],
  standalone: true,
  imports: [
    TranslatePipe,
    IonList,
    IonListHeader,
    IonItem,
    IonItemSliding,
    IonItemOptions,
    IonItemOption,
    IonIcon,
    IonLabel,
    IonButton,
    IonContent,
    IonPopover
  ]

})
export class ListItemComponent extends NgxDecafComponentDirective implements OnInit {

  /**
   * @description Reference to the action menu popover component.
   * @summary ViewChild reference that provides access to the HTMLIonPopoverElement
   * used for displaying action menus. This reference is used to programmatically
   * control the popover, such as dismissing it when necessary.
   *
   * @type {HTMLIonPopoverElement}
   * @memberOf ListItemComponent
   */
  @ViewChild('actionMenuComponent')
  actionMenuComponent!: HTMLIonPopoverElement;

  /**
   * @description Controls the display of lines around the list item.
   * @summary Determines how lines are displayed around the list item borders.
   * 'inset' shows lines with padding, 'full' shows full-width lines, and 'none'
   * removes all lines. This affects the visual separation between list items.
   *
   * @type {'inset' | 'full' | 'none'}
   * @default 'inset'
   * @memberOf ListItemComponent
   */
  @Input()
  lines: 'inset' | 'full' | 'none' = 'full';

  /**
   * @description The data object associated with this list item.
   * @summary Contains the raw data that this list item represents. This object
   * is used to extract display information and for passing to event handlers
   * when the item is interacted with. It overrides the base item property.
   *
   * @type {Record<string, unknown>}
   * @memberOf ListItemComponent
   */
  @Input()
  override item!: Record<string, unknown>;

  /**
   * @description The name of the icon to display in the list item.
   * @summary Specifies which icon to display using Ionic's icon system.
   * The icon name should correspond to an available Ionic icon or a custom
   * icon that has been registered with the icon registry.
   *
   * @type {string}
   * @memberOf ListItemComponent
   */
  @Input()
  icon!: string;

  /**
   * @description Position of the icon within the list item.
   * @summary Determines whether the icon appears at the start (left in LTR languages)
   * or end (right in LTR languages) of the list item. This affects the overall
   * layout and visual hierarchy of the item content.
   *
   * @type {'start' | 'end'}
   * @default 'start'
   * @memberOf ListItemComponent
   */
  @Input()
  iconSlot: 'start' | 'end' ='start';

  /**
   * @description Controls whether the list item behaves as a clickable button.
   * @summary When set to true, the list item will have button-like behavior including
   * hover effects, click handling, and appropriate accessibility attributes.
   * When false, the item is displayed as static content without interactive behavior.
   *
   * @type {StringOrBoolean}
   * @default true
   * @memberOf ListItemComponent
   */
  @Input()
  button: StringOrBoolean = true;

  /**
   * @description The main title text displayed in the list item.
   * @summary Sets the primary text content that appears prominently in the list item.
   * This is typically the most important information about the item and is displayed
   * with emphasis in the component's visual hierarchy.
   *
   * @type {string}
   * @memberOf ListItemComponent
   */
  @Input()
  title?: string;

  /**
   * @description Secondary descriptive text for the list item.
   * @summary Provides additional context or details about the item. This text
   * is typically displayed below the title with less visual emphasis.
   * Useful for providing context without cluttering the main title.
   *
   * @type {string}
   * @memberOf ListItemComponent
   */
  @Input()
  description?: string;

  /**
   * @description Additional information text for the list item.
   * @summary Displays supplementary information that provides extra context
   * about the item. This could include metadata, status information, or
   * other relevant details that don't fit in the title or description.
   *
   * @type {string}
   * @memberOf ListItemComponent
   */
  @Input()
  info?: string;

  /**
   * @description Sub-information text displayed in the list item.
   * @summary Provides tertiary level information that complements the info field.
   * This is typically used for additional metadata or contextual details
   * that are useful but not critical for understanding the item.
   *
   * @type {string}
   * @memberOf ListItemComponent
   */
  @Input()
  subinfo?: string;

  /**
   * @description Event emitter for list item click interactions.
   * @summary Emits custom events when the list item is clicked or when actions
   * are performed on it. The emitted event contains information about the action,
   * the item data, and other relevant context for parent components to handle.
   *
   * @type {EventEmitter<ListItemCustomEvent>}
   * @memberOf ListItemComponent
   */
  @Output()
  clickEvent:  EventEmitter<ListItemCustomEvent> = new EventEmitter<ListItemCustomEvent>();

  /**
   * @description Flag indicating whether slide items are currently enabled.
   * @summary Controls the visibility of slide actions based on screen size and
   * available operations. When true, users can swipe on the item to reveal
   * action buttons for operations like edit and delete.
   *
   * @type {boolean}
   * @default false
   * @memberOf ListItemComponent
   */
  showSlideItems: boolean = false;

  /**
   * @description Current window width in pixels.
   * @summary Stores the current browser window width which is used to determine
   * responsive behavior, such as when to show or hide slide items based on
   * screen size. Updated automatically on window resize events.
   *
   * @type {number}
   * @memberOf ListItemComponent
   */
  windowWidth!: number;

  /**
   * @description Flag indicating whether the action menu popover is currently open.
   * @summary Tracks the state of the action menu to prevent multiple instances
   * from being opened simultaneously and to ensure proper cleanup when actions
   * are performed. Used for managing the popover lifecycle.
   *
   * @type {boolean}
   * @default false
   * @memberOf ListItemComponent
   */
  actionMenuOpen: boolean = false;

  /**
   * @description Angular NavController service for handling navigation.
   * @summary Injected service that provides methods for programmatic navigation
   * within the Ionic application. Used for navigating to different routes when
   * list item actions are performed or when the item itself is clicked.
   *
   * @private
   * @type {NavController}
   * @memberOf ListItemComponent
   */
  private navController: NavController = inject(NavController);

  /**
   * @description Creates an instance of ListItemComponent.
   * @summary Initializes a new ListItemComponent by calling the parent class constructor
   * with the component name for logging and identification purposes. Also registers
   * all available Ionic icons to ensure they can be displayed in the component.
   *
   * @memberOf ListItemComponent
   */
  constructor() {
    super("ListItemComponent");
    addIcons(AllIcons)
  }

  /**
   * @description Initializes the component after Angular first displays the data-bound properties.
   * @summary Sets up the component by determining slide item visibility, processing boolean inputs,
   * building CSS class names based on properties, and capturing the current window width.
   * This method prepares the component for user interaction by ensuring all properties are
   * properly initialized and responsive behavior is configured.
   *
   * @mermaid
   * sequenceDiagram
   *   participant A as Angular Lifecycle
   *   participant L as ListItemComponent
   *   participant W as Window
   *
   *   A->>L: ngOnInit()
   *   L->>L: enableSlideItems()
   *   L->>L: Process button boolean
   *   L->>L: Build className with flex classes
   *   alt operations exist
   *     L->>L: Add 'action' class
   *   end
   *   L->>W: getWindowWidth()
   *   W-->>L: Return current width
   *   L->>L: Store windowWidth
   *
   * @return {Promise<void>}
   * @memberOf ListItemComponent
   */
  async ngOnInit(): Promise<void> {
    this.showSlideItems = this.enableSlideItems();
    this.button = stringToBoolean(this.button);

    this.className = `${this.className}  dcf-flex dcf-flex-middle grid-item`;
    if(this.operations?.length)
      this.className += ` action`;
    this.windowWidth = getWindowWidth() as number;
  }

  /**
   * @description Handles user interactions and actions performed on the list item.
   * @summary This method is the central action handler for list item interactions. It manages
   * event propagation, dismisses open action menus, removes focus traps, and either emits
   * events for parent components to handle or performs navigation based on the component's
   * route configuration. This method supports both event-driven and navigation-driven architectures.
   *
   * @param {CrudOperations} action - The type of CRUD operation being performed
   * @param {Event} event - The browser event that triggered the action
   * @param {HTMLElement} [target] - Optional target element for the event
   * @return {Promise<boolean|void>} A promise that resolves to navigation success or void for events
   *
   * @mermaid
   * sequenceDiagram
   *   participant U as User
   *   participant L as ListItemComponent
   *   participant P as Parent Component
   *   participant N as NavController
   *   participant E as Event System
   *
   *   U->>L: Perform action (click/swipe)
   *   L->>L: stopImmediatePropagation()
   *   alt actionMenuOpen
   *     L->>L: Dismiss action menu
   *   end
   *   L->>L: removeFocusTrap()
   *   alt No route configured
   *     L->>E: windowEventEmitter()
   *     L->>P: clickEvent.emit()
   *   else Route configured
   *     L->>N: redirect(action, uid)
   *     N-->>L: Return navigation result
   *   end
   *
   * @memberOf ListItemComponent
   */
  async handleAction(action: CrudOperations, event: Event, target?: HTMLElement): Promise<boolean|void> {
    event.stopImmediatePropagation();
    if(this.actionMenuOpen)
      await this.actionMenuComponent.dismiss();
    // forcing trap focus
    removeFocusTrap();
    if(!this.route) {
      const event = {target: target, action, pk: this.pk, data: this.uid, name: EventConstants.CLICK, component: this.componentName } as ListItemCustomEvent;
      windowEventEmitter(`ListItem${EventConstants.CLICK}`, event);
      return this.clickEvent.emit(event);
    }
    return await this.redirect(action, (typeof this.uid === 'number' ? `${this.uid}`: this.uid));
  }

  /**
   * @description Responsive handler that enables or disables slide items based on screen size and operations.
   * @summary This method is automatically called when the window is resized and also during component
   * initialization. It determines whether slide actions should be available based on the current
   * window width and the presence of UPDATE or DELETE operations. Slide items are typically hidden
   * on larger screens where there's space for dedicated action buttons.
   *
   * @return {boolean} True if slide items should be shown, false otherwise
   *
   * @mermaid
   * sequenceDiagram
   *   participant W as Window
   *   participant L as ListItemComponent
   *   participant U as UI
   *
   *   W->>L: resize event
   *   L->>W: getWindowWidth()
   *   W-->>L: Return current width
   *   L->>L: Store windowWidth
   *   alt No operations OR width > 639px
   *     L->>U: showSlideItems = false
   *   else Operations include UPDATE/DELETE
   *     L->>U: showSlideItems = true
   *   end
   *   L-->>U: Return showSlideItems value
   *
   * @memberOf ListItemComponent
   */
  @HostListener('window:resize', ['$event'])
  enableSlideItems(): boolean {
    this.windowWidth = getWindowWidth() as number;
    if(!this.operations?.length || this.windowWidth > 639)
      return this.showSlideItems = false;
    this.showSlideItems = this.operations.includes(OperationKeys.UPDATE) || this.operations.includes(OperationKeys.DELETE);
    return this.showSlideItems;
  }

  /**
   * @description Animates and removes an element from the DOM.
   * @summary This method applies CSS animation classes to create a smooth fade-out effect
   * before removing the element from the DOM. The animation enhances user experience by
   * providing visual feedback when items are deleted or removed from lists. The timing
   * is coordinated with the CSS animation duration to ensure the element is removed
   * after the animation completes.
   *
   * @param {HTMLElement} element - The DOM element to animate and remove
   * @return {void}
   *
   * @mermaid
   * sequenceDiagram
   *   participant L as ListItemComponent
   *   participant E as HTMLElement
   *   participant D as DOM
   *
   *   L->>E: Add animation classes
   *   Note over E: uk-animation-fade, uk-animation-medium, uk-animation-reverse
   *   E->>E: Start fade animation
   *   L->>L: setTimeout(600ms)
   *   Note over L: Wait for animation to complete
   *   L->>D: element.remove()
   *   D->>D: Remove element from DOM
   *
   * @memberOf ListItemComponent
   */
  removeElement(element: HTMLElement): void {
    element.classList.add('uk-animation-fade', 'uk-animation-medium', 'uk-animation-reverse');
    setTimeout(() => {element.remove()}, 600)
  }

  /**
   * @description Navigates to a new route based on the specified action and item ID.
   * @summary This method constructs a navigation URL using the component's route configuration,
   * the specified action, and an item identifier. It uses Ionic's NavController to perform
   * forward navigation with appropriate animations. This method is typically used for
   * CRUD operations where each action (create, read, update, delete) has its own route.
   *
   * @param {string} action - The action to be performed (e.g., 'edit', 'view', 'delete')
   * @param {string} [id] - The unique identifier of the item to be acted upon
   * @return {Promise<boolean>} A promise that resolves to true if navigation was successful
   *
   * @mermaid
   * sequenceDiagram
   *   participant L as ListItemComponent
   *   participant N as NavController
   *   participant R as Router
   *
   *   L->>L: redirect(action, id)
   *   L->>L: Construct URL: /{route}/{action}/{id}
   *   L->>N: navigateForward(url)
   *   N->>R: Navigate to constructed URL
   *   R-->>N: Return navigation result
   *   N-->>L: Return boolean success
   *
   * @memberOf ListItemComponent
   */
  async redirect(action: string, id?: string): Promise<boolean> {
    return await this.navController.navigateForward(`/${this.route}/${action}/${id || this.uid}`);
  }

  /**
   * @description Presents the actions menu popover for the list item.
   * @summary This method handles the display of a contextual action menu when triggered by user
   * interaction (typically a long press or right-click). It stops event propagation to prevent
   * unwanted side effects, removes any existing focus traps for accessibility, configures the
   * popover with the triggering event, and opens the action menu. The menu typically contains
   * available CRUD operations for the item.
   *
   * @param {Event} event - The event that triggered the action menu request
   * @return {void}
   *
   * @mermaid
   * sequenceDiagram
   *   participant U as User
   *   participant L as ListItemComponent
   *   participant P as Popover
   *   participant A as Accessibility
   *
   *   U->>L: Trigger action menu (long press/right-click)
   *   L->>L: stopImmediatePropagation()
   *   L->>A: removeFocusTrap()
   *   L->>P: Set event reference
   *   L->>L: actionMenuOpen = true
   *   L->>P: Display popover with actions
   *
   * @memberOf ListItemComponent
   */
  presentActionsMenu(event: Event): void {
    event.stopImmediatePropagation();
    // forcing trap focus
    removeFocusTrap();
    this.actionMenuComponent.event = event;
    this.actionMenuOpen = true;
  }
}
