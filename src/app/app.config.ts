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
import {
  IonicRouteStrategy,
  provideIonicAngular,
} from '@ionic/angular/standalone';
import {
  provideI18n,
} from 'src/lib/i18n/Loader';
import { routes } from './app.routes';
import { provideDbAdapter, provideDynamicComponents } from 'src/lib/for-angular-common.module';
import { AIModel, AIVendorModel } from './models/AIVendorModel';
import { I18nResourceConfigType } from 'src/lib/engine';
import { CategoryModel } from './models/CategoryModel';
import { EmployeeModel } from './models/EmployeeModel';
import { User } from './forms/FieldsetForm';
import { Product } from './ew/models/Product';
import { ImageUploadComponent } from './components/image-upload/image-upload.component';
import { SwitcherComponent } from './components/switcher/switcher.component';
import { Batch } from './ew/models/Batch';

export const DbAdapterFlavour = 'ram';
export const AppName = 'Decaf For Angular';
// export const AppModels = [new CategoryModel(), new EmployeeModel(), new AIModel(), new AIVendorModel()];
export const AppModels = [new Batch(), new Product(), new User(), new CategoryModel(), new EmployeeModel(), new AIModel(), new AIVendorModel()];

export const AppConfig: ApplicationConfig = {
  providers: [
    // Providing Local components for dynamic rendering
    provideDynamicComponents(ImageUploadComponent, SwitcherComponent),
    // Providing RamAdapter as the database adapter for Decaf
    provideDbAdapter(RamAdapter, {user: "user"}, DbAdapterFlavour),
    // provideZoneChangeDetection({ eventCoalescing: true }),
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideIonicAngular(),
    provideRouter(
      routes,
      withPreloading(PreloadAllModules),
      withComponentInputBinding()
    ),
    provideI18n(
      {
        fallbackLang: 'en',
        lang: "en",
      } as RootTranslateServiceConfig,
      // optionally provide I18nLoader configuration, otherwise it will use default (same as setted below)
      {
        prefix: './app/assets/i18n/',
        suffix: '.json',
      } as I18nResourceConfigType
    )
  ],
};
