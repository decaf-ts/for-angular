import { Component, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import {
  IonApp,
  IonSplitPane,
  IonMenu,
  IonContent,
  IonList,
  IonMenuToggle,
  IonItem,
  IonIcon,
  IonLabel,
  IonRouterOutlet,
  IonRouterLink,
} from '@ionic/angular/standalone';

import {
  Model,
  ModelConstructor,
  ModelKeys,
} from '@decaf-ts/decorator-validation';

import * as IonicIcons from 'ionicons/icons';
import { addIcons } from 'ionicons';

import { IMenuItem, NgxPageDirective } from '../lib/engine';
import { isDevelopmentMode } from '../lib/utils';
import { FakerRepository } from 'src/app/utils/FakerRepository';
import { LogoComponent } from './components/logo/logo.component';
import { AppModels, AppName, DbAdapterFlavour } from './app.config';
import { uses } from '@decaf-ts/decoration';
import {
  AppMenu,
  DashboardMenuItem,
  EwMenu,
  LogoutMenuItem,
} from './utils/contants';
import { TranslatePipe } from '@ngx-translate/core';
import { IconComponent } from 'src/lib/components';

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
    IconComponent,
    LogoComponent,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent extends NgxPageDirective implements OnInit {

  menuCollapsed: boolean = false;

  showCollapseButton: boolean = true;

  constructor() {
    super('', true);
    this.title = 'Decaf-ts for-angular demo';
    this.appName = AppName;
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
    const populate = ['Product', 'CategoryModel', 'AIVendorModel', 'ProductStrength'];
    const menu = [];
    const models = AppModels;
    for (let model of models) {
      uses(DbAdapterFlavour)(model);
      if (model instanceof Function)
        model = new (model as unknown as ModelConstructor<typeof model>)();
      const name = model.constructor.name.replace(/[0-9]/g, '');
      if (isDevelopment) {
        if (populate.includes(name))
          await new FakerRepository(model, 36).initialize();
      }
      const label = name.toLowerCase().replace(ModelKeys.MODEL, '');
      if (!menu.length) menu.push({ label: 'menu.models' });
      menu.push({
        label: `menu.${label}`,
        url: `/model/${Model.tableName(model)}`,
        icon: 'cube-outline',
      });
    }
    this.initialized = true;
    this.menu = [
      DashboardMenuItem,
      ...EwMenu,
      ...(menu as IMenuItem[]),
      ...AppMenu,
      LogoutMenuItem,
    ];
    await super.ngOnInit();
  }

  handleCollapseMenu() {
    this.menuCollapsed = !this.menuCollapsed;
    this.changeDetectorRef.detectChanges();
  }
}
