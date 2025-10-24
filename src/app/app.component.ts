import { Component, CUSTOM_ELEMENTS_SCHEMA, inject, OnInit } from '@angular/core';
import { NavigationEnd, NavigationStart, Router, RouterLink, RouterLinkActive } from '@angular/router';
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
import { TranslatePipe } from '@ngx-translate/core';

import { ModelConstructor } from '@decaf-ts/decorator-validation';

import * as IonicIcons from 'ionicons/icons';
import { addIcons } from 'ionicons';

import { IMenuItem, NgxPageDirective } from '../lib/engine';
import { isDevelopmentMode, removeFocusTrap } from '../lib/helpers';
import { ForAngularRepository } from './utils/ForAngularRepository';
import { LogoComponent } from './components/logo/logo.component';
import { AppModels, DbAdapterFlavour } from './app.config';
import { Repository, uses } from '@decaf-ts/core';
import { AppMenu, DashboardMenuItem, LogoutMenuItem } from './utils/contants';


@Component({
  standalone: true,
  selector: 'app-root',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [
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
    LogoComponent
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
  async ngOnInit(): Promise<void> {
    this.router.events.subscribe(async event => {
      if(event instanceof NavigationEnd) {
        const url = (event?.url || "").replace('/', '');
        this.hasMenu = url !== "login" && url !== "";
        this.setPageTitle(url);
      }
      if (event instanceof NavigationStart)
        removeFocusTrap();
    });
    await this.initialize();
  }

  /**
   * @description Initializes the application
   * @summary Sets the initialized flag and sets up repositories if in development mode
   * @return {Promise<void>}
   */
  override async initialize(): Promise<void> {
    const isDevelopment = isDevelopmentMode();
    const populate = ['AIModel', 'AIVendorModel'];
    const menu = [];
    const models = AppModels;
    for(let model of models) {
      uses(DbAdapterFlavour)(model);
      if(model instanceof Function)
        model = new (model as unknown as ModelConstructor<any>)();
      const name = model.constructor.name.replace(/[0-9]/g, '');
      if (isDevelopment) {
        if(populate.includes(name)) {
          this.logger.info(`Populating repository for model: ${name}`);
          const repository = new ForAngularRepository(model, 3);
          await repository.init();
        }
      }

      menu.push({label: name,  name, url: `/model/${Repository.table(model)}`, icon: 'cube-outline'})
    }
    this.initialized = true;
    console.log(this.hasMenu);
    this.menu = [
      DashboardMenuItem,
      ...menu as IMenuItem[],
      ...AppMenu,
      LogoutMenuItem
    ];

  }

}
