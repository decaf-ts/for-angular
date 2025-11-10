import { Component, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { IonApp,
  IonSplitPane,
  IonMenu,
  IonContent,
  IonList,
  IonMenuToggle,
  IonItem,
  IonIcon,
  IonLabel,
  IonRouterOutlet,
  IonRouterLink
} from '@ionic/angular/standalone';

import { ModelConstructor } from '@decaf-ts/decorator-validation';

import * as IonicIcons from 'ionicons/icons';
import { addIcons } from 'ionicons';

import { IMenuItem, NgxPageDirective } from '../lib/engine';
import { isDevelopmentMode } from '../lib/utils';
import { FakerRepository } from 'src/app/utils/FakerRepository';
import { LogoComponent } from './components/logo/logo.component';
import { AppModels, AppName, DbAdapterFlavour } from './app.config';
import { Repository, uses } from '@decaf-ts/core';
import { AppMenu, DashboardMenuItem, LogoutMenuItem } from './utils/contants';
import { TranslatePipe } from '@ngx-translate/core';


@Component({
  standalone: true,
  selector: 'app-root',
  imports: [
    TranslatePipe,
    IonApp,
    IonSplitPane,
    IonMenu,
    RouterLink,
    RouterLinkActive,
    IonContent,
    IonList,
    IonMenuToggle,
    IonItem,
    IonIcon,
    IonLabel,
    IonRouterLink,
    IonRouterOutlet,
    LogoComponent,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent extends NgxPageDirective implements OnInit {

  constructor() {
    super("", true);
    this.title = "Decaf-ts for-angular demo";
    addIcons(IonicIcons);
  }

  /**
   * @description Lifecycle hook that is called after data-bound properties of a directive are initialized
   * @summary Sets up router event subscriptions and initializes the application
   * @return {Promise<void>}
   */
  override async ngOnInit(): Promise<void> {
    await this.initialize();
  }

  /**
   * @description Initializes the application
   * @summary Sets the initialized flag and sets up repositories if in development mode
   * @return {Promise<void>}
   */
  override async initialize(): Promise<void> {
    const isDevelopment = isDevelopmentMode();
    const populate = ['Product', 'CategoryModel', 'AIVendorModel'];
    const menu = [];
    const models = AppModels;
    for(let model of models) {
      uses(DbAdapterFlavour)(model);
      if(model instanceof Function)
        model = new (model as unknown as ModelConstructor<typeof model>)();
      const name = model.constructor.name.replace(/[0-9]/g, '');
      if (isDevelopment) {
        if(populate.includes(name)) {
          this.logger.info(`Populating repository for model: ${name}`);
          const repository = new FakerRepository(model, 36);
          await repository.initialize();
        }
      }

      menu.push({label: name,  name, url: `/model/${Repository.table(model)}`, icon: 'cube-outline'})
    }
    this.initialized = true;
    this.menu = [
      DashboardMenuItem,
      ...menu as IMenuItem[],
      ...AppMenu,
      LogoutMenuItem
    ];
    super.ngOnInit();
  }


  /**
   * @description Sets the browser page title based on the current route.
   * @summary Updates the browser's document title by finding the active menu item that matches
   * the provided route. If a matching menu item is found, it sets the title using the format
   * "Decaf For Angular - {menu title or label}". This improves SEO and provides clear context
   * to users about the current page. If a custom menu array is provided, it uses that instead
   * of the component's default menu.
   * @protected
   * @param {string} route - The current route path to match against menu items
   * @param {IMenuItem[]} [menu] - Optional custom menu array to search (uses this.menu if not provided)
   * @return {void}
   * @memberOf module:lib/engine/NgxPageDirective
   */
  protected override setPageTitle(route?: string, menu?: IMenuItem[]): void {
    if(!route)
      route = this.router.url.replace('/', '');
    if(menu)
      menu = this.menu;
    const activeMenu = this.menu.find(item => item?.url?.includes(route));
    if(activeMenu)
      this.titleService.setTitle(`${activeMenu?.title || activeMenu?.label} - ${AppName}`);
  }

}
