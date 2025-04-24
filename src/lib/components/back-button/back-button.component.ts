import { OnInit, Input, Component, inject, HostListener } from "@angular/core";
import { PredefinedColors } from "@ionic/core";
import { ForAngularModule } from 'src/lib/for-angular.module';
import { EventConstants, RouteDirections } from "src/lib/engine/constants";
import { StringOrBoolean } from "src/lib/engine/types";
import { stringToBoolean } from "src/lib/helpers/string";
import { RouterService } from "src/lib/services/router.service";
import { windowEventEmitter } from "src/lib/helpers/utils";


@Component({
  selector: 'ngx-decaf-back-button',
  templateUrl: './back-button.component.html',
  styleUrls: ['./back-button.component.scss'],
  imports: [ForAngularModule],
  standalone: true,

})
export class BackButtonComponent implements OnInit {

  @Input()
  preventDefault: StringOrBoolean = false;

  @Input()
  emitEvent: StringOrBoolean = true;

  @Input()
  link?: string | Function;

  @Input()
  direction: RouteDirections = RouteDirections.BACK;

  @Input()
  icon: string = "chevron-back-outline";

  @Input()
  showText: StringOrBoolean = false;

  @Input()
  text?: string = 'back';

  @Input()
  color: PredefinedColors = "primary";

  @Input()
  toolbarColor?: string;

  isIonIcon: boolean = true;

  private previousUrl?: string;
  private routerService: RouterService = inject(RouterService);

  constructor() {}

 /**
  * Lifecycle hook that is called after data-bound properties of a directive are initialized.
  * This method is part of Angular's component lifecycle and is used for any additional initialization tasks.
  *
  * @returns {void} This method does not return a value.
  */
  ngOnInit(): void {
    this.preventDefault = stringToBoolean(this.preventDefault);
    this.emitEvent = stringToBoolean(this.emitEvent);
    this.color = !!this.toolbarColor ? 'light' : 'primary';
    this.previousUrl = this.routerService.getPreviousUrl();

    this.showText = stringToBoolean(this.showText);

    // if(this.showText)
    //   this.text = await this.localeService.get((!this.locale ? this.text : `${this.locale}.${this.text}`) as string);

    if(this.icon.includes('ti-') || this.icon.includes('.svg'))
      this.isIonIcon = false;
  }

  async backToPage(forceRefresh: boolean = false): Promise<boolean|void> {
    const self = this;
    if(this.preventDefault)
      return self.handleEndNavigation(forceRefresh);

    self.handleEndNavigation(forceRefresh);
    if(!this.link)
      return this.routerService.backToLastPage();
    if(this.link instanceof Function)
      return await this.link();
    await this.routerService.navigateTo(this.link || this.previousUrl || '/', this.direction);
  }

  handleEndNavigation(forceRefresh: boolean): void {
    if(this.emitEvent)
      windowEventEmitter(EventConstants.BACK_BUTTON_NAVIGATION, {refresh: forceRefresh});
  }

  @HostListener('window:BackButtonForceNavigationEvent', ['$event'])
  handleModelPageEvent(event: Event): Promise<boolean|void> {
    return this.backToPage();
  }

}
