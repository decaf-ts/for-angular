import { Component, CUSTOM_ELEMENTS_SCHEMA,  OnInit } from '@angular/core';
import {  RouterLink, RouterLinkActive } from '@angular/router';
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

import { NgxBasePage } from '../lib/engine';
import { isDevelopmentMode } from '../lib/helpers';
import { ForAngularRepository } from './utils/ForAngularRepository';
import { LogoComponent } from './components/logo/logo.component';
import { AppModels, DbAdapterFlavour } from './app.config';
import { uses } from '@decaf-ts/core';
import { AppMenu } from './utils/contants';


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
    TranslatePipe,
    LogoComponent
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent extends NgxBasePage implements OnInit {

  constructor() {
    super();
    this.title = "Decaf-ts for-angular demo";
    this.menu = AppMenu;
    addIcons(IonicIcons);
  }

  /**
   * @description Lifecycle hook that is called after data-bound properties of a directive are initialized
   * @summary Sets up router event subscriptions and initializes the application
   * @return {Promise<void>}
   */
  async ngOnInit(): Promise<void> {
    await this.initialize();
  }

  /**
   * @description Initializes the application
   * @summary Sets the initialized flag and sets up repositories if in development mode
   * @return {Promise<void>}
   */
  override async initialize(): Promise<void> {

    super.initialize();

    const isDevelopment = isDevelopmentMode();
    const populate = ['CategoryModel', 'EmployeeModel'];
    if(isDevelopment) {
      // const aiVendorModel = new AIVendorModel();
      // const models = [aiModel, new CategoryModel(), new EmployeeModel()];
      const models = AppModels;
      for(let model of models) {
        if(model instanceof Function)
          model = new (model as unknown as ModelConstructor<any>)();
        const name = model.constructor.name.replace(/[0-9]/g, '');
        uses(DbAdapterFlavour)(model);
        if(populate.includes(name as string)) {
          const repository = new ForAngularRepository(model, 3);
          await repository.init();
        }
      }
    }
  }

}
