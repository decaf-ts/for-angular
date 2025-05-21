import { Component, EventEmitter, HostListener, inject, Input, OnInit, Output  } from '@angular/core';
import { CrudOperations, OperationKeys } from '@decaf-ts/db-decorators';
import { StringOrBoolean, ListItemActionEvent, KeyValue } from 'src/lib/engine/types';
import { NgxBaseComponent } from 'src/lib/engine/NgxBaseComponent';
import { ForAngularModule } from 'src/lib/for-angular.module';
import { stringToBoolean, stringToCapitalCase } from 'src/lib/helpers/string';
import { getWindowWidth } from 'src/lib/helpers/utils';
import { RouterService } from 'src/app/services/router.service';
import { Dynamic } from 'src/lib/engine';
@Dynamic()
@Component({
  selector: 'ngx-decaf-list-item',
  templateUrl: './list-item.component.html',
  styleUrls: ['./list-item.component.scss'],
  standalone: true,

})
export class ListItemComponent extends NgxBaseComponent implements OnInit {

  @Input()
  mapper!: KeyValue;

  @Input()
  modelOperations: CrudOperations = OperationKeys.READ;

  @Input()
  modelId!: string;

  @Input()
  modelPage!: string;

  @Input()
  modelPk: string = 'id';

  @Input()
  lines: 'inset' | 'inseet' | 'none' = 'none';

  @Input()
  button: StringOrBoolean = true;

  @Input()
  title?: string;

  @Input()
  titleClassName: string = "";

  @Input()
  subtitle?: string;

  @Input()
  subtitleClassName: string = "";

  @Input()
  info?: string;

  @Input()
  subinfo?: string;

  @Input()
  translateProps: string | string[] = [];

  @Output()
  clickEvent = new EventEmitter<ListItemActionEvent>();

  showSlideItems: boolean = false;

  windowWidth!: number;

  private routerService: RouterService = inject(RouterService);
  constructor() {
    super("ListItemComponent");
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

    // this.title = await this.getPropValue('title', this.title as string);
    // this.subtitle = await this.getPropValue('subtitle', this.subtitle as string);
    // this.info = await this.getPropValue('info', this.info as string);
    // this.subinfo = await this.getPropValue('subinfo', this.subinfo as string);
  }

  /**
   * Handles actions triggered on the list item.
   * If modelPage is not set, it emits a clickEvent with action details.
   * Otherwise, it redirects to the appropriate page based on the action type.
   *
   * @param {string} type - The type of action to handle
   * @param {HTMLElement} [target] - Optional target element that triggered the action
   * @returns {Promise<boolean|void>} A promise that resolves to a boolean or void
   */
  async handleAction(type: string, target?: HTMLElement): Promise<boolean|void> {
    if(!this.modelPage)
      return this.clickEvent.emit({target: target, action: type, pk: this.modelPk, id: this.modelId} as ListItemActionEvent);

    return await this.redirect(type, this.modelId);
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
    if(!this.modelOperations?.length || this.windowWidth > 768)
      return this.showSlideItems = false;
    this.showSlideItems = this.modelOperations.includes(OperationKeys.UPDATE) || this.modelOperations.includes(OperationKeys.DELETE);
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
   * @param {string} [id] - Optional. The ID of the model to be acted upon. If not provided, falls back to this.modelId.
   * @returns {Promise&lt;boolean&gt;} A Promise that resolves to a boolean indicating whether the navigation was successful.
   */
  async redirect(action: string, id?: string): Promise<boolean> {
    return await this.routerService.navigateTo(`/${this.modelPage}/${action}/${id || this.modelId}`);
  }

  /**
   * Tries to translate mapper key and concat with value.
   * If the property is in translateProps and exists in the mapper, attempts to translate it.
   * Returns the formatted string with the translated property and value.
   *
   * @param {string} prop - The property to get value for (&#39;title&#39;, &#39;subtitle&#39;, &#39;info&#39;, or &#39;subinfo&#39;)
   * @param {string} value - The value to format with the property
   * @returns {Promise<string>} A promise that resolves to the formatted string
   */
  async getPropValue(prop: 'title' | 'subtitle' | 'info' | 'subinfo', value: string): Promise<string> {
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
}
