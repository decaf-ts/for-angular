import { Component, EventEmitter, HostListener, inject, Input, OnInit, Output, ViewChild  } from '@angular/core';
import { CrudOperations, OperationKeys } from '@decaf-ts/db-decorators';
import { StringOrBoolean, KeyValue } from 'src/lib/engine/types';
import { NgxBaseComponent } from 'src/lib/engine/NgxBaseComponent';
import { ForAngularModule } from 'src/lib/for-angular.module';
import { stringToBoolean, stringToCapitalCase } from 'src/lib/helpers/string';
import { getWindowWidth, windowEventEmitter } from 'src/lib/helpers/utils';
import { RouterService } from 'src/app/services/router.service';
import { Dynamic, EventConstants, ListItemCustomEvent } from 'src/lib/engine';
import { NavController } from '@ionic/angular';
import { IonButton, IonItem, IonLabel, IonList, IonContent, IonIcon, IonListHeader, IonPopover, IonItemSliding, IonItemOptions, IonItemOption } from '@ionic/angular/standalone';
import * as AllIcons from 'ionicons/icons';
import { addIcons } from 'ionicons';
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

  @Input()
  translateProps: string | string[] = [];

  @Output()
  clickEvent = new EventEmitter<ListItemCustomEvent>();

  showSlideItems: boolean = false;

  windowWidth!: number;

  actionMenuOpen: boolean = false;


  private navController: NavController = inject(NavController);
  constructor() {
    super("ListItemComponent");
    addIcons(AllIcons)
  }

  /**
  * Lifecycle hook that is called after data-bound properties of a directive are initialized.
  * This method is part of Angular's component lifecycle and is used for any additional initialization tasks.
  * It initializes slide items, converts button input to boolean, processes translate properties,
  * and sets up the className for the component.
  *
  * @returns {Promise<void>} A promise that resolves when initialization is complete.
  */
  async ngOnInit(): Promise<void> {
    this.showSlideItems = this.enableSlideItems();
    this.button = stringToBoolean(this.button);

    if(this.translateProps && typeof this.translateProps === 'string')
      this.translateProps = [this.translateProps];

    this.className = `${this.className}  dcf-flex dcf-flex-middle grid-item`;
    if(this.operations?.length)
      this.className += ` action`;
    this.windowWidth = getWindowWidth();

    // this.title = await this.getPropValue('title', this.title as string);
    // this.description = await this.getPropValue('description', this.description as string);
    // this.info = await this.getPropValue('info', this.info as string);
    // this.subinfo = await this.getPropValue('subinfo', this.subinfo as string);
  }


  /**
   * Handles actions triggered on the list item.
   * If route is not set, it emits a clickEvent with action details.
   * Otherwise, it redirects to the appropriate page based on the action type.
   *
   * @param {string} type - The type of action to handle
   * @param {HTMLElement} [target] - Optional target element that triggered the action
   * @returns {Promise<boolean|void>} A promise that resolves to a boolean or void
   */
  async handleAction(action: CrudOperations, event: Event, target?: HTMLElement): Promise<boolean|void> {
    event.stopPropagation();
    await this.actionMenuComponent.dismiss();
    if(!this.route) {
      const event = {target: target, action, pk: this.pk, data: this.uid, name: EventConstants.CLICK_EVENT, component: this.componentName } as ListItemCustomEvent;
      windowEventEmitter(EventConstants.CLICK_EVENT, event);
      return this.clickEvent.emit(event);
    }
    return await this.redirect(action, (typeof this.uid === 'number' ? `${this.uid}`: this.uid));
  }

  /**
   * Host listener for window resize events that determines whether to show slide items.
   * Updates the windowWidth and sets showSlideItems based on screen size and available operations.
   *
   * @param {Event} [event] - Optional resize event
   * @returns {boolean} Whether slide items should be shown
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
   * Removes an element from the DOM with a fade animation.
   * Adds animation classes and removes the element after the animation completes.
   *
   * @param {HTMLElement} element - The element to remove
   */
  removeElement(element: HTMLElement) {
    element.classList.add('uk-animation-fade', 'uk-animation-medium', 'uk-animation-reverse');
    setTimeout(() => {element.remove()}, 600)
  }

  /**
   * Redirects the user to a specific page based on the provided action and ID.
   * Uses the routerService to navigate to the constructed URL path.
   *
   * @param {string} action - The action to be performed, which forms part of the URL path.
   * @param {string} [id] - Optional. The ID of the model to be acted upon. If not provided, falls back to this.uid.
   * @returns {Promise&lt;boolean&gt;} A Promise that resolves to a boolean indicating whether the navigation was successful.
   */
  async redirect(action: string, id?: string): Promise<boolean> {
    return await this.navController.navigateForward(`/${this.route}/${action}/${id || this.uid}`);
  }

  /**
   * Tries to translate mapper key and concat with value.
   * If the property is in translateProps and exists in the mapper, attempts to translate it.
   * Returns the formatted string with the translated property and value.
   *
   * @param {string} prop - The property to get value for (&#39;title&#39;, &#39;description&#39;, &#39;info&#39;, or &#39;subinfo&#39;)
   * @param {string} value - The value to format with the property
   * @returns {Promise<string>} A promise that resolves to the formatted string
   */
  async getPropValue(prop: 'title' | 'description' | 'info' | 'subinfo', value: string): Promise<string> {
    return "";
    // const self = this;
    // if(!self.translateProps.includes(prop) || !self.mapper)
    //   return `${value?.length ? value : ''}`;

    // const propValue = self.mapper?.[prop];
    // if(!propValue)
    //   return `${value?.length ? value : ''}`;
    // let result;

    // result = await this.localeService.get(propValue);

    // if(!result && self.locale)
    //   result = await self.localeService.get(`${this.locale}.${propValue}`);

    // result = stringToCapitalCase(result);

    // return (propValue === value) ? result : `${result}: ${value}`;
  }

  presentActionsMenu(event: Event) {
    event.stopPropagation();
    this.actionMenuComponent.event = event;
    this.actionMenuOpen = true;
  }
}
