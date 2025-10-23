import { ApplicationConfig } from '@angular/core';
import {
  provideRouter,
  withComponentInputBinding,
  RouteReuseStrategy,
  withPreloading,
  PreloadAllModules,
} from '@angular/router';
import { HttpClient, provideHttpClient } from '@angular/common/http';
import { RamAdapter } from '@decaf-ts/core';
import { provideTranslateService, TranslateLoader } from '@ngx-translate/core';
import {
  IonicRouteStrategy,
  provideIonicAngular,
} from '@ionic/angular/standalone';
import {
  I18nLoaderFactory,
  provideI18nLoader,
} from 'src/lib/i18n/Loader';
import { routes } from './app.routes';
import { provideDbAdapter } from 'src/lib/for-angular-common.module';
// import { Product } from './models/Product';
// import { Batch } from './models/Batch';
import { CategoryModel } from './models/CategoryModel';
import { EmployeeModel } from './models/EmployeeModel';

export const DbAdapterFlavour = 'ram';
export const AppModels = [new CategoryModel(), new EmployeeModel()];

export const AppConfig: ApplicationConfig = {
  providers: [
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
    provideHttpClient(),
    provideTranslateService({
      fallbackLang: 'en',
      lang: "en",
      loader: {
        provide: TranslateLoader,
        useFactory: I18nLoaderFactory,
        deps: [HttpClient],
      },
    }),
    // optionally provide I18nLoader configuration, otherwise it will use default (same as setted below)
    provideI18nLoader({
      prefix: './app/assets/i18n/',
      suffix: '.json',
    }),
  ],
};
