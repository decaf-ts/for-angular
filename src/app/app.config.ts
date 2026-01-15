import { ApplicationConfig } from '@angular/core';
import {
  provideRouter,
  withComponentInputBinding,
  RouteReuseStrategy,
  withPreloading,
  PreloadAllModules,
} from '@angular/router';
import { RamAdapter } from '@decaf-ts/core/ram';
import { RootTranslateServiceConfig } from '@ngx-translate/core';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone';
import { provideDecafI18nConfig } from 'src/lib/i18n/Loader';
import { routes } from './app.routes';
import {
  provideDecafDbAdapter,
  provideDecafPageTransition,
  provideDecafDynamicComponents,
} from 'src/lib/engine/helpers';
import { AIModel, AIVendorModel } from './models/AIVendorModel';
import { I18nResourceConfigType } from 'src/lib/engine';
import { CategoryModel } from './models/CategoryModel';
import { EmployeeModel } from './models/EmployeeModel';
import { User } from './forms/FieldsetForm';
import { Product } from './ew/fabric/Product';
import { Leaflet } from './ew/fabric/Leaflet';
import { ProductStrength } from './ew/fabric/ProductStrength';
import { Batch } from './ew/fabric/Batch';
import { AppSelectFieldComponent } from './components/select-field/select-field.component';
import { AppExpiryDateFieldComponent } from './components/expiry-date/expiry-date-field.component';
import { AppSwitcherComponent } from './components/switcher/switcher.component';
// import { AxiosHttpAdapter, HttpAdapter, HttpStatement } from '@decaf-ts/for-http';

export const AppName = 'For Angular';
// Removed unused Adapter variable and fixed HttpAdapter instantiation issues
// const adapter = new HttpAdapter({
//     protocol: "http",
//     host: 'localhost:3000',
//   });

// export const AppModels = [new CategoryModel(), new EmployeeModel(), new AIModel(), new AIVendorModel()];

export const AppModels = [
  new User(),
  new CategoryModel(),
  new Product(),
  new Batch(),
  new Leaflet(),
  new EmployeeModel(),
  new AIModel(),
  new AIVendorModel(),
  new ProductStrength(),
];

export const AppConfig: ApplicationConfig = {
  providers: [
    // Providers from ionic angular
    provideIonicAngular(),
    // provide dark theme
    // provideDecafDarkMode(),
    // change the default page transition
    provideDecafPageTransition(),

    // Providing Local components for dynamic rendering
    provideDecafDynamicComponents(AppExpiryDateFieldComponent, AppSwitcherComponent, AppSelectFieldComponent),
    // Providing RamAdapter as the database adapter for Decaf
    // provideDecafDbAdapter(AxiosHttpAdapter, {
    //   protocol: "http",
    //   host: 'localhost:3000',
    //   responseParser: new NestJSResponseParser()
    // }),

    provideDecafDbAdapter(RamAdapter, { user: 'user' }),

    // provideZoneChangeDetection({ eventCoalescing: true }),
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },

    provideRouter(routes, withPreloading(PreloadAllModules), withComponentInputBinding()),
    provideDecafI18nConfig(
      {
        fallbackLang: 'en',
        lang: 'en',
      } as RootTranslateServiceConfig,
      // optionally provide I18nLoader configuration, otherwise it will use default (same as setted below)
      [
        {
          prefix: './assets/i18n/',
        },
        {
          prefix: './assets/i18n/ew/',
          suffix: '.json',
        },
      ] as I18nResourceConfigType
    ),
  ],
};
