import { Component, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { uses } from '@decaf-ts/decoration';
import {
  IonApp,
  IonSplitPane,
  IonMenu,
  IonContent,
  IonList,
  IonMenuToggle,
  IonItem,
  IonLabel,
  IonRouterOutlet,
  IonRouterLink,
} from '@ionic/angular/standalone';
import { Model, ModelConstructor, ModelKeys } from '@decaf-ts/decorator-validation';
import { IMenuItem, NgxPageDirective } from '../lib/engine';
import { isDevelopmentMode } from '../lib/utils';
import { FakerRepository } from 'src/app/utils/FakerRepository';
import { LogoComponent } from './components/logo/logo.component';
import { AppModels, AppName } from './app.config';
import { IconComponent } from 'src/lib/components';
import { getDbAdapterFlavour } from 'src/lib/engine/helpers';
import { RamFlavour } from '@decaf-ts/core/ram';
import { AppMenu } from './ew/utils/constants';
import { IAppMenuItem } from './ew/utils/interfaces';

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

  /**
   * @description Lifecycle hook that is called after data-bound properties of a directive are initialized
   * @summary Sets up router event subscriptions and initializes the application
   * @return {Promise<void>}
   */
  async ngOnInit(): Promise<void> {
    this.hasMenu = true;
    this.title = 'Decaf-ts for-angular demo';
    this.appName = AppName;
    await this.initialize();
  }

  /**
   * @description Initializes the application
   * @summary Sets the initialized flag and sets up repositories if in development mode
   * @return {Promise<void>}
   */
  override async initialize(): Promise<void> {
    const isDevelopment = isDevelopmentMode();
    const populate = [
      'Product',
      'Batch',
      'Leaflet',
      'CategoryModel',
      'AIVendorModel',
      'ProductStrength',
      'ProductImage',
    ];
    const menu = [];
    const models = AppModels;
    const dbAdapterFlavour = getDbAdapterFlavour();
    for (let model of models) {
      uses(dbAdapterFlavour)(model);
      if (model instanceof Function)
        model = new (model as unknown as ModelConstructor<typeof model>)();
      const name = model.constructor.name.replace(/[0-9]/g, '');
      if (isDevelopment && dbAdapterFlavour.includes(RamFlavour)) {
        if (populate.includes(name)) await new FakerRepository(model, 36).initialize();
      }
      const label = name.toLowerCase().replace(ModelKeys.MODEL, '');
      if (!menu.length) menu.push({ label: 'models' });
      menu.push({
        label: `${label}`,
        url: `/model/${Model.tableName(model)}`,
        icon: 'cube-outline',
      });
    }
    this.initialized = true;
    this.menu = [
      // DashboardMenuItem,
      // ...EwMenu,
      // ...(menu as IMenuItem[]),
      ...AppMenu,
      // LogoutMenuItem,
    ];
    await super.initialize();
  }

  isMenuActive(item: IAppMenuItem & { activeWhen: string[] }): boolean {
    const { url, activeWhen } = item;
    return (
      (url?.length &&
        (url === this.currentRoute || (activeWhen || []).includes(this.currentRoute as string))) ||
      false
    );
  }

  handleCollapseMenu() {
    this.menuCollapsed = !this.menuCollapsed;
    this.changeDetectorRef.detectChanges();
  }
}
