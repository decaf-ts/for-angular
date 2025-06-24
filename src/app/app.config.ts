import { ApplicationConfig, InjectionToken } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import '@decaf-ts/ui-decorators';
import { HttpClient, provideHttpClient } from '@angular/common/http';
import { provideTranslateService, TranslateLoader } from '@ngx-translate/core';
import { I18nLoader } from '../lib/i18n/Loader';
import {
  RouteReuseStrategy,
  withPreloading,
  PreloadAllModules,
} from '@angular/router';
import {
  IonicRouteStrategy,
  provideIonicAngular,
} from '@ionic/angular/standalone';
import { routes } from './app.routes';
import { RamAdapter } from '@decaf-ts/core/ram';

export const DbAdapterProvider = new InjectionToken<RamAdapter>('DbAdapterProvider');

export const appConfig: ApplicationConfig = {
  providers: [
    // provideZoneChangeDetection({ eventCoalescing: true }),
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    { provide: DbAdapterProvider, useValue: new RamAdapter() },
    provideIonicAngular(),
    provideRouter(routes, withPreloading(PreloadAllModules), withComponentInputBinding()),
    provideHttpClient(),
    provideTranslateService({
      defaultLanguage: 'en',
      useDefaultLang: true,
      loader: {
        provide: TranslateLoader,
        useFactory: I18nLoader.loadFromHttp,
        deps: [HttpClient],
      },
    }),
  ],
};
