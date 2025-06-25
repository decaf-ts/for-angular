import { ApplicationConfig, InjectionToken } from '@angular/core';
import {
  provideRouter,
  withComponentInputBinding,
  RouteReuseStrategy,
  withPreloading,
  PreloadAllModules
} from '@angular/router';
import { HttpClient, provideHttpClient } from '@angular/common/http';
import { IonicRouteStrategy, provideIonicAngular} from '@ionic/angular/standalone';
import { provideTranslateService, TranslateLoader } from '@ngx-translate/core';
import { RamAdapter } from '@decaf-ts/core/ram';
import { I18nLoader } from 'src/lib/i18n/Loader';
import { routes } from './app.routes';

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
