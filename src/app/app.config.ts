import { ApplicationConfig } from '@angular/core';
import {
  provideRouter,
  withComponentInputBinding,
  RouteReuseStrategy,
  withPreloading,
  PreloadAllModules,
  PreloadingStrategy,
} from '@angular/router';
import { HttpClient, provideHttpClient } from '@angular/common/http';
import { RamAdapter } from '@decaf-ts/core';
import { provideTranslateParser, provideTranslateService, RootTranslateServiceConfig, TranslateLoader } from '@ngx-translate/core';
import {
  IonicRouteStrategy,
  provideIonicAngular,
} from '@ionic/angular/standalone';
import {
  I18nLoaderFactory,
  provideI18n,
  provideI18nLoader,
} from 'src/lib/i18n/Loader';
import { routes } from './app.routes';
import { provideDbAdapter } from 'src/lib/for-angular-common.module';
import { Product } from './models/Product';
import { Batch } from './models/Batch';
import { AIModel } from './models/AIVendorModel';
import { sf } from '@decaf-ts/logging';
import { I18nResourceConfigType } from 'src/lib/engine';

export const DbAdapterFlavour = 'ram';
export const AppModels = [new Product(), new Batch(), new AIModel()];

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
