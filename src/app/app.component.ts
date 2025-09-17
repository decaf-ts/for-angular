import { Component, CUSTOM_ELEMENTS_SCHEMA, inject, OnInit } from '@angular/core';
import { NavigationEnd, NavigationStart, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { IonApp,
  IonSplitPane,
  IonMenu,
  IonContent,
  IonList,
  IonListHeader,
  IonMenuToggle,
  IonItem,
  IonIcon,
  IonLabel,
  IonRouterOutlet,
  IonRouterLink
} from '@ionic/angular/standalone';
import { Title } from '@angular/platform-browser';
import { Platform } from '@ionic/angular';
import { NgxRenderingEngine } from '../lib/engine';
import { Model, ModelBuilderFunction } from '@decaf-ts/decorator-validation';
import { addIcons } from 'ionicons';
import * as IonicIcons from 'ionicons/icons';
import { MenuItem } from 'src/app/utils/types';
import { isDevelopmentMode, removeFocusTrap } from 'src/lib/helpers';
import { ForAngularRepository } from './utils/ForAngularRepository';
import { CategoryModel } from './models/CategoryModel';
import { EmployeeModel } from './models/EmployeeModel';
import { DecafRepositoryAdapter } from 'src/lib/components/list/constants';
import { DbAdapterProvider } from './app.config';
import { TranslatePipe } from '@ngx-translate/core';
import { LogoComponent } from './components/logo/logo.component';

try {
  new NgxRenderingEngine();
  Model.setBuilder(Model.fromModel as ModelBuilderFunction);

} catch (e: unknown) {
  throw new Error(`Failed to load rendering engine: ${e}`);
}

/**
 * @description Application title constant
 * @summary This constant holds the main title of the application
 */
const title = "Decaf-ts for Angular";

/**
 * @description Menu items for the application's navigation
 * @summary This constant defines the structure of the application's navigation menu.
 * It includes items for the dashboard, CRUD operations, data lists, and logout.
 * @type {MenuItem[]}
 * @example
 * const menuItem = Menu[0];
 * console.log(menuItem.label); // 'Dashboard'
 * console.log(menuItem.url); // '/dashboard'
 */
const Menu: MenuItem[] = [
  {
    label: 'Dashboard',
    icon: 'apps-outline',
    url: '/dashboard',
  },
  {
    label: 'Crud',
    icon: 'save-outline',
  },
  {
    label: 'Fieldset',
    url: '/fieldset',
  },
  {
    label: 'Read',
    url: '/crud/read',
  },
  {
    label: 'Create / Update',
    url: '/crud/create',
  },
  {
    label: 'Delete',
    url: '/crud/delete',
  },
  {
    label: 'Model Lists',
    icon: 'list-outline',
  },
  {
    label: 'Employees (Infinite)',
    url: '/list-model/infinite',
  },
  {
    label: 'Categories (Paginated)',
    url: '/list-model/paginated',
  },
  {
    label: 'Logout',
    title: 'Login',
    icon: 'log-out-outline',
    url: '/login',
    color: 'danger'
  },
];


/**
 * @description Root component of the Decaf-ts for Angular application
 * @summary This component serves as the main entry point for the application.
 * It sets up the navigation menu, handles routing events, and initializes
 * the application state. It also manages the application title and menu visibility.
 * @class
 * @param {Platform} platform - Ionic Platform service
 * @param {Router} router - Angular Router service
 * @param {MenuController} menuController - Ionic MenuController service
 * @param {Title} titleService - Angular Title service
 * @example
 * <app-root></app-root>
 * @mermaid
 * sequenceDiagram
 *   participant App as AppComponent
 *   participant Router
 *   participant MenuController
 *   participant TitleService
 *   participant Repository
 *   App->>App: constructor()
 *   App->>App: ngOnInit()
 *   App->>Router: Subscribe to events
 *   Router-->>App: Navigation events
 *   App->>MenuController: Enable/Disable menu
 *   App->>TitleService: Set page title
 *   App->>App: initializeApp()
 *   alt isDevelopmentMode
 *     App->>Repository: Initialize repositories
 *   end
 */
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
    IonListHeader,
    IonMenuToggle,
    IonItem,
    IonIcon,
    IonLabel,
    IonRouterLink,
    IonRouterOutlet,
    TranslatePipe,
    LogoComponent
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit {
  /**
   * @description The title of the application
   */
  title = 'Decaf-ts for-angular demo';

  /**
   * @description The menu items for the application's navigation
   */
  menu: MenuItem[] = Menu;


  /**
   * @description Ionic Platform service
   */
  platform: Platform = inject(Platform);

  /**
   * @description Angular Router service
   */
  router: Router = inject(Router);

  /**
   * @description The currently active menu item
   */
  activeItem = '';

  /**
   * @description The database adapter provider
   */
  adapter = inject(DbAdapterProvider);

  /**
   * @description Flag indicating if the application has been initialized
   */
  initialized = false;

  /**
   * @description Angular Title service
   */
  private titleService: Title = inject(Title);

  /**
   * @description disable or enable menu on page
   */
  disableMenu = true;

  /**
   * @description Initializes the component
   * @summary Sets up Ionic icons and disables the menu controller
   */
  constructor() {
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
        const {url} = event;
        this.disableMenu = url.includes('login');
        this.setTitle(url.replace('/', '') || "login");
      }
      if (event instanceof NavigationStart)
        removeFocusTrap();
    });
    await this.initializeApp();
  }

  /**
   * @description Initializes the application
   * @summary Sets the initialized flag and sets up repositories if in development mode
   * @return {Promise<void>}
   */
  async initializeApp(): Promise<void> {
    this.initialized = true;
    const isDevelopment = isDevelopmentMode();
    if(isDevelopment) {
      for(const model of [new CategoryModel(), new EmployeeModel()] ) {
        const repository = new ForAngularRepository<typeof model>(this.adapter as unknown as DecafRepositoryAdapter, model);
        await repository.init();
      }
    }
  }

  /**
   * @description Sets the application title based on the current page
   * @summary Updates the document title with the application name and current page
   * @param {string} page - The current page URL
   */
  setTitle(page: string): void {
    const activeMenu = this.menu.find(item => item?.url?.includes(page));
    if(activeMenu)
      this.titleService.setTitle(`${title} - ${activeMenu?.title || activeMenu?.label}`);
  }
}
