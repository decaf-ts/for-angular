import { Component, EventEmitter, HostListener, inject, Input, OnInit, Output  } from '@angular/core';
import { CrudOperations, OperationKeys } from '@decaf-ts/db-decorators';
import { KeyValue, ListItemActionEvent, StringOrBoolean } from 'dist/lib';
import { ForAngularModule } from 'src/lib/for-angular.module';
import { consoleInfo } from 'src/lib/helpers/logging';
import { stringToBoolean, stringToCapitalCase } from 'src/lib/helpers/string';
import { getWindowWidth } from 'src/lib/helpers/utils';
import { RouterService } from 'src/lib/services/router.service';

@Component({
  selector: 'ngx-decaf-list-item',
  templateUrl: './list-item.component.html',
  styleUrls: ['./list-item.component.scss'],
  imports: [ForAngularModule],
  standalone: true,

})
export class ListItemComponent implements OnInit {

  @Input()
  locale!: string;

  @Input()
  className: string = "";

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
  icon?: string;

  @Input()
  iconSlot?: 'start' | 'end' = 'start';

  @Input()
  iconSize?: 'large' | 'small' | 'default' = 'default';

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
  constructor() { }

  /**
  * Lifecycle hook that is called after data-bound properties of a directive are initialized.
  * This method is part of Angular's component lifecycle and is used for any additional initialization tasks.
  *
  * @returns {void} This method does not return a value.
  */
  async ngOnInit(): Promise<void> {
    this.enableSlideItems();
    this.button = stringToBoolean(this.button);

    if(this.translateProps && typeof this.translateProps === 'string')
      this.translateProps = [this.translateProps];

    this.className = `${this.className}  dcf-flex dcf-flex-middle grid-item`;

    // this.title = await this.getPropValue('title', this.title as string);
    // this.subtitle = await this.getPropValue('subtitle', this.subtitle as string);
    // this.info = await this.getPropValue('info', this.info as string);
    // this.subinfo = await this.getPropValue('subinfo', this.subinfo as string);
  }

  handleAction(type: string, target?: HTMLElement) {
    if(!this.modelPage) {
      consoleInfo(this, `Model page not setted. Emitting click for ${type} event from list item component width modelId ${this.modelId}`);
      return this.clickEvent.emit({target: target, action: type, pk: this.modelPk, id: this.modelId} as ListItemActionEvent);
    }
    return this.redirect(type, this.modelId);
  }

  @HostListener('window:resize', ['$event'])
  enableSlideItems(event?: Event) {
    this.windowWidth = getWindowWidth();
    if(!this.modelOperations?.length || this.windowWidth > 768)
      return this.showSlideItems = false;
    this.showSlideItems = this.modelOperations.includes(OperationKeys.UPDATE) || this.modelOperations.includes(OperationKeys.DELETE);
  }

  removeElement(element: HTMLElement) {
    element.classList.add('uk-animation-fade', 'uk-animation-medium', 'uk-animation-reverse');
    setTimeout(() => {element.remove()}, 600)
  }

  /**
   * Redirects the user to a specific page based on the provided action and ID.
   *
   * @param action - The action to be performed, which forms part of the URL path.
   * @param id - Optional. The ID of the model to be acted upon. If not provided, falls back to this.modelId.
   * @returns A Promise that resolves to a boolean indicating whether the navigation was successful.
   */
  async redirect(action: string, id?: string): Promise<boolean> {
    const page = `/${this.modelPage}/${action}/${id || this.modelId}`;
    consoleInfo(this, `Redirecting to page ${page} from list component`);
    return await this.routerService.navigateTo(page);
  }

  /**
   * try translate mapper key and concat with value
   *
   * @param {string} prop
   * @param {string} value
   * @returns {Promise<string>}
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
