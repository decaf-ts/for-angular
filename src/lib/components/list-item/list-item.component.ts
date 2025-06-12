import { Component, EventEmitter, HostListener, inject, Input, OnInit, Output, ViewChild  } from '@angular/core';
import { CrudOperations, OperationKeys } from '@decaf-ts/db-decorators';
import { StringOrBoolean, KeyValue } from 'src/lib/engine/types';
import { NgxBaseComponent } from 'src/lib/engine/NgxBaseComponent';
import { ForAngularModule } from 'src/lib/for-angular.module';
import { removeFocusTrap, stringToBoolean } from 'src/lib/helpers/utils';
import { getWindowWidth, windowEventEmitter } from 'src/lib/helpers/utils';
import { Dynamic, EventConstants, ListItemCustomEvent } from 'src/lib/engine';
import { NavController } from '@ionic/angular';
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
import * as AllIcons from 'ionicons/icons';
import { addIcons } from 'ionicons';


/**
 * @description A component for displaying a list item with various customization options.
 * @summary The ListItemComponent is an Angular component that extends NgxBaseComponent. It provides a flexible and customizable list item interface with support for icons, buttons, and various text elements. The component also handles actions and navigation based on user interactions.
 *
 * @class
 * @extends NgxBaseComponent
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
    ForAngularModule,
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
export class ListItemComponent extends NgxBaseComponent implements OnInit {
  @ViewChild('actionMenuComponent')
  actionMenuComponent!: HTMLIonPopoverElement;

  @Input()
  lines: 'inset' | 'inseet' | 'none' = 'none';

  @Input()
  override item!: Record<string, any>;

  @Input()
  icon!: string;

  @Input()
  iconSlot: 'start' | 'end' ='start';

  @Input()
  button: StringOrBoolean = true;

  @Input()
  title?: string;

  @Input()
  description?: string;

  @Input()
  info?: string;

  @Input()
  subinfo?: string;

  @Output()
  clickEvent:  EventEmitter<ListItemCustomEvent> = new EventEmitter<ListItemCustomEvent>();

  showSlideItems: boolean = false;

  windowWidth!: number;

  actionMenuOpen: boolean = false;


  private navController: NavController = inject(NavController);

  constructor() {
    super("ListItemComponent");
    addIcons(AllIcons)
  }

  /**
   * @description Initializes the component and sets up necessary properties.
   * @summary This method is called when the component is initialized. It sets up the slide items, button behavior, and class names based on the component's properties.
   * @return {Promise<void>}
   */
  async ngOnInit(): Promise<void> {
    this.showSlideItems = this.enableSlideItems();
    this.button = stringToBoolean(this.button);

    this.className = `${this.className}  dcf-flex dcf-flex-middle grid-item`;
    if(this.operations?.length)
      this.className += ` action`;
    this.windowWidth = getWindowWidth();
  }

  /**
   * @description Handles the action when a user interacts with the list item.
   * @summary This method is triggered when a user performs an action on the list item. It handles both click events and navigation based on the component's configuration.
   * @param {CrudOperations} action - The type of action performed.
   * @param {Event} event - The event object associated with the action.
   * @param {HTMLElement} [target] - The target element of the event.
   * @return {Promise<boolean|void>} A promise that resolves to a boolean or void, depending on the action taken.
   *
   * @mermaid
   * sequenceDiagram
   *   participant U as User
   *   participant C as Component
   *   participant E as EventEmitter
   *   participant N as NavController
   *   U->>C: Perform action
   *   C->>C: Stop event propagation
   *   alt Action menu is open
   *     C->>C: Dismiss action menu
   *   end
   *   C->>C: Remove focus trap
   *   alt No route defined
   *     C->>E: Emit click event
   *   else Route defined
   *     C->>N: Navigate to route
   *   end
   */
  async handleAction(action: CrudOperations, event: Event, target?: HTMLElement): Promise<boolean|void> {
    event.stopPropagation();
    if(this.actionMenuOpen)
      await this.actionMenuComponent.dismiss();
    // forcing trap focus
    removeFocusTrap();
    if(!this.route) {
      const event = {target: target, action, pk: this.pk, data: this.uid, name: EventConstants.CLICK_EVENT, component: this.componentName } as ListItemCustomEvent;
      windowEventEmitter(`ListItem${EventConstants.CLICK_EVENT}`, event);
      return this.clickEvent.emit(event);
    }
    return await this.redirect(action, (typeof this.uid === 'number' ? `${this.uid}`: this.uid));
  }

  /**
   * @description Enables or disables slide items based on window size and available operations.
   * @summary This method is called when the window is resized. It determines whether to show slide items based on the window width and available operations.
   * @param {Event} [event] - The resize event object.
   * @return {boolean} Whether slide items should be shown.
   */
  @HostListener('window:resize', ['$event'])
  enableSlideItems(event?: Event): boolean {
    this.windowWidth = getWindowWidth();
    if(!this.operations?.length || this.windowWidth > 768)
      return this.showSlideItems = false;
    this.showSlideItems = this.operations.includes(OperationKeys.UPDATE) || this.operations.includes(OperationKeys.DELETE);
    return this.showSlideItems;
  }

  /**
   * @description Removes an element from the DOM with an animation.
   * @summary This method adds CSS classes to create a fade-out animation and then removes the element from the DOM after the animation completes.
   * @param {HTMLElement} element - The element to be removed.
   */
  removeElement(element: HTMLElement) {
    element.classList.add('uk-animation-fade', 'uk-animation-medium', 'uk-animation-reverse');
    setTimeout(() => {element.remove()}, 600)
  }

  /**
   * @description Navigates to a new route based on the action and ID.
   * @summary This method uses the NavController to navigate to a new route constructed from the component's route, the given action, and an ID.
   * @param {string} action - The action to be performed (e.g., 'edit', 'view').
   * @param {string} [id] - The ID of the item to be acted upon.
   * @return {Promise<boolean>} A promise that resolves to a boolean indicating whether the navigation was successful.
   */
  async redirect(action: string, id?: string): Promise<boolean> {
    return await this.navController.navigateForward(`/${this.route}/${action}/${id || this.uid}`);
  }

  /**
   * @description Presents the actions menu for the list item.
   * @summary This method is called when the user wants to see the available actions for the list item. It stops event propagation, removes any existing focus trap, and opens the action menu.
   * @param {Event} event - The event that triggered the action menu.
   */
  presentActionsMenu(event: Event) {
    event.stopPropagation();
    // forcing trap focus
    removeFocusTrap();
    this.actionMenuComponent.event = event;
    this.actionMenuOpen = true;
  }
}
