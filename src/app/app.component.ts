import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
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
import { addIcons } from 'ionicons';
import * as IonicIcons from 'ionicons/icons';
import { Model, ModelBuilderFunction } from '@decaf-ts/decorator-validation';
import { ForAngularModule } from 'src/lib/for-angular.module';
import { NgxRenderingEngine2 } from 'src/lib/engine';
import { MenuItem } from 'src/app/utils/types';
import { FakerRepository } from './utils/FakerRepository';


try {
  new NgxRenderingEngine2();
  Model.setBuilder(Model.fromModel as ModelBuilderFunction);
} catch (e: unknown) {
  throw new Error(`Failed to load rendering engine: ${e}`);
}

const Menu: MenuItem[] = [
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
  }
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
export class AppComponent {
  title = 'Decaf-ts for-angular demo';
  menu: MenuItem[] = Menu;

  constructor() {
    new FakerRepository();
    addIcons(IonicIcons);
  }

}
