import { Component, CUSTOM_ELEMENTS_SCHEMA, inject, OnInit } from '@angular/core';
import { ActivatedRoute, NavigationEnd, NavigationStart, Router, RouterLink, RouterLinkActive } from '@angular/router';
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
  IonRouterLink,
  MenuController
} from '@ionic/angular/standalone';
import { Platform } from '@ionic/angular';
import { NgxRenderingEngine2 } from 'src/lib/engine';
import { ForAngularModule } from 'src/lib/for-angular.module';
import { Model, ModelBuilderFunction } from '@decaf-ts/decorator-validation';
import { RamAdapter } from '@decaf-ts/core/ram';
import { addIcons } from 'ionicons';
import * as IonicIcons from 'ionicons/icons';
import { MenuItem } from 'src/app/utils/types';
import { isDevelopmentMode, removeFocusTrap } from 'src/lib/helpers';
import { ForAngularRepository } from './utils/ForAngularRepository';
import { CategoryModel } from './models/CategoryModel';
import { EmployeeModel } from './models/EmployeeModel';
import { InjectablesRegistry } from '@decaf-ts/core';
import { DecafRepositoryAdapter } from 'src/lib/components/list/constants';
import { DbAdapterProvider } from './app.config';
// import { DbAdapter } from './app.config';

try {
  new NgxRenderingEngine2();
  Model.setBuilder(Model.fromModel as ModelBuilderFunction);

} catch (e: unknown) {
  throw new Error(`Failed to load rendering engine: ${e}`);
}

const Menu: MenuItem[] = [
  {
    text: 'Dashboard',
    icon: 'apps-outline',
    url: '/dashboard',
  },
  {
    text: 'Crud',
    icon: 'save-outline',
  },
  {
    text: 'Read',
    url: '/crud/read',
  },
  {
    text: 'Create / Update',
    url: '/crud/create',
  },
  {
    text: 'Delete',
    url: '/crud/delete',
  },
  {
    text: 'Data Lists',
    icon: 'list-outline',
  },
  {
    text: 'Employees (Infinite)',
    url: '/list/infinite',
  },
  {
    text: 'Categories (Paginated)',
    url: '/list/paginated',
  },
  {
    text: 'Model Lists',
    icon: 'list-outline',
  },
  {
    text: 'Employees (Infinite)',
    url: '/list-model/infinite',
  },
  {
    text: 'Categories (Paginated)',
    url: '/list-model/paginated',
  },
  {
    text: 'Logout',
    icon: 'log-out-outline',
    url: '/login',
    color: 'danger'
  },
];

@Component({
  standalone: true,
  selector: 'app-root',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [
    ForAngularModule,
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
    IonRouterOutlet
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit {
  title = 'Decaf-ts for-angular demo';
  menu: MenuItem[] = Menu;

  platform: Platform = inject(Platform);
  router: Router = inject(Router);

  activeItem: string = '';

  adapter = inject(DbAdapterProvider);

  private menuController: MenuController = inject(MenuController);

  constructor() {
    addIcons(IonicIcons);
    this.menuController.enable(false);
  }

  async ngOnInit(): Promise<void> {
    this.initializeApp();
    this.router.events.subscribe(event => {
      if(event instanceof NavigationEnd) {
        const {url} = event;
        if(url.includes('login'))
          this.menuController.enable(false);
      }
      if (event instanceof NavigationStart)
        removeFocusTrap();
    });
  }

  async initializeApp(): Promise<void> {
    const isDevelopment = isDevelopmentMode();
    if(isDevelopment) {
      for(let model of [new CategoryModel(), new EmployeeModel()] ) {
        const repository = new ForAngularRepository<typeof model>(this.adapter as DecafRepositoryAdapter, model);
        await repository.init();
      }
    }
  }
}
