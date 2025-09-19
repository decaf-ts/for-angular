import { ApplicationConfig } from '@angular/core';
import {
  provideRouter,
  withComponentInputBinding,
  RouteReuseStrategy,
  withPreloading,
  PreloadAllModules,
} from '@angular/router';
import { HttpClient, provideHttpClient } from '@angular/common/http';
import {
  IonicRouteStrategy,
  provideIonicAngular,
} from '@ionic/angular/standalone';
import { provideTranslateService, TranslateLoader } from '@ngx-translate/core';
import { RamAdapter } from '@decaf-ts/core';
import {
  getI18nLoaderFactoryProviderConfig,
  I18nLoaderFactory,
} from 'src/lib/i18n/Loader';
import { routes } from './app.routes';
import { getWindow } from '../lib/helpers';
import { DB_ADAPTER_PROVIDER_TOKEN } from 'src/lib/for-angular-common.module';


/**
 * Factory function to create and configure the database adapter
 * Sets the adapter name on the window object for global access
 */
function createDbAdapter(): RamAdapter {
  const adapter = new RamAdapter({ user: 'user' });
  // Set adapter name on window for global access
  getWindow()['dbAdapterFlavour'] = adapter.flavour;
  return adapter;
}

export const appConfig: ApplicationConfig = {
  providers: [
    // provideZoneChangeDetection({ eventCoalescing: true }),
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    { provide: DB_ADAPTER_PROVIDER_TOKEN, useFactory: createDbAdapter },
    provideIonicAngular(),
    provideRouter(
      routes,
      withPreloading(PreloadAllModules),
      withComponentInputBinding()
    ),
    provideHttpClient(),
    provideTranslateService({
      defaultLanguage: 'en',
      useDefaultLang: true,
      loader: {
        provide: TranslateLoader,
        useFactory: I18nLoaderFactory,
        deps: [HttpClient],
      },
    }),
    {
      ...getI18nLoaderFactoryProviderConfig({
        prefix: './app/assets/i18n/',
        suffix: '.json',
      }),
    },
  ],
};
