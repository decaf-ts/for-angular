import { Component, inject, Input, OnInit  } from '@angular/core';
import { MenuItem, StringOrBoolean } from 'src/lib/engine/types';
import { ForAngularModule } from 'src/lib/for-angular.module';
import { NavigationEnd, Router, Event as RouterNavigationEvent } from '@angular/router';
import { Subscription } from 'rxjs';
import { RouterService } from 'src/lib/services/router.service';
import { RouteDirections } from 'src/lib/engine/constants';
import { IconComponent } from '../icon/icon.component';
import { addIcons } from 'ionicons';
import { NgxBaseComponent } from 'src/lib/engine/NgxBaseComponent';
import { chevronForwardOutline } from 'ionicons/icons';

@Component({
  selector: 'ngx-decaf-menu-side',
  templateUrl: './menu-side.component.html',
  styleUrls: ['./menu-side.component.scss'],
  imports: [ForAngularModule, IconComponent],
  standalone: true,
})
export class MenuSideComponent extends NgxBaseComponent implements OnInit {

  @Input()
  data!: MenuItem[];

  @Input()
  headerText?: string;

  @Input()
  headerNote?: string;

  @Input()
  menuId: string = 'menu-side';

  @Input()
  type: "overlay" | "reveal" | "push" = 'overlay';

  @Input()
  maxEdgeStart: number = 50;

  @Input()
  side: 'end' | 'start' = 'start';

  @Input()
  maxWidth: string = '240px';

  @Input({alias: 'swipe-gesture'})
  swipeGesture: StringOrBoolean = true;

  currentUrl!: string;

  private routerEvents!: Subscription;
  private router: Router = inject(Router);
  private routerService: RouterService = inject(RouterService);

  constructor() {
    super("MenuSideComponent");
    addIcons({ chevronForwardOutline });
  }

 /**
  * Lifecycle hook that is called after data-bound properties of a directive are initialized.
  * This method is part of Angular's component lifecycle and is used for any additional initialization tasks.
  * Initializes router event handling to track current URL.
  *
  * @returns {void} This method does not return a value.
  */
  ngOnInit(): void {
    this.handleRouterEvents();
    this.locale = this.getLocale(this.translatable);
  }

  /**
   * Lifecycle hook that is called when a directive, pipe, or service is destroyed.
   * Cleans up the router events subscription to prevent memory leaks.
   *
   * @returns {void} This method does not return a value.
   */
  ngOnDestroy(): void {
    if(this.routerEvents)
      this.routerEvents.unsubscribe();
  }

  /**
   * Navigates to the specified page using the router service.
   * Updates the current URL and uses the FORWARD direction for navigation.
   *
   * @param {string} page - The URL path to navigate to
   * @returns {Promise<boolean>} Returns false if the page parameter is empty or falsy
   */
  async navigate(page: string): Promise<boolean> {
    if(!page)
      return false;
    this.currentUrl = page;
    return this.routerService.navigateTo(page, RouteDirections.FORWARD);
  }

  /**
   * Sets up a subscription to router events to track the current URL.
   * Updates the currentUrl property when navigation ends.
   * This helps in highlighting the active menu item.
   *
   * @returns {void} This method does not return a value.
   */
  handleRouterEvents(): void {
    this.routerEvents = this.router.events.subscribe((event: RouterNavigationEvent) => {
      if (event instanceof NavigationEnd)
        this.currentUrl = event?.url ? event.url.replace('/', '') : this.routerService.getCurrentUrl()
    });
  }
}
