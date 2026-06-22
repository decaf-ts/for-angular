import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import {
  PreloadAllModules,
  provideRouter,
  RouteReuseStrategy,
  withComponentInputBinding,
  withPreloading,
} from '@angular/router';
import { RamAdapter, RamFlavour } from '@decaf-ts/core/ram';
import { Model } from '@decaf-ts/decorator-validation';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone';
import { RootTranslateServiceConfig } from '@ngx-translate/core';
import { I18nResourceConfigType } from 'src/lib/engine';
import {
  provideDecafDbAdapter,
  provideDecafDynamicComponents,
  provideDecafPageTransition,
} from 'src/lib/engine/helpers';
import { provideDecafI18nConfig } from 'src/lib/i18n/Loader';
import { isDevelopmentMode } from 'src/lib/utils/helpers';
import { routes } from './app.routes';
import { AppExpiryDateFieldComponent } from './components/expiry-date/expiry-date-field.component';
import { AppSelectFieldComponent } from './components/select-field/select-field.component';
import { AppSwitcherComponent } from './components/switcher/switcher.component';

export const isLocalDevelopmentMode = isDevelopmentMode('localhost');
// export const isLocalDevelopmentMode = false;
export const AppName = 'For Angular';
export const DbAdapterFlavour = RamFlavour;
export const AppModels = [] as Model[];

export const AppConfig: ApplicationConfig = {
  providers: [
    // Providers from ionic angular
    provideIonicAngular({
      mode: 'md',
    }),
    provideDecafDbAdapter(RamAdapter, { user: 'user' }),
    // provideDecafDbAdapter(DecafAxiosHttpAdapter, {
    //   protocol: 'https',
    //   host: 'ew-backend-pdm.ptp.internal',
    //   events: false,
    // }),
    provideZoneChangeDetection({ eventCoalescing: true }),
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideRouter(routes, withPreloading(PreloadAllModules), withComponentInputBinding()),
    // provide dark theme
    // provideDecafDarkMode(),
    // change the default page transition
    provideDecafPageTransition(),
    // Providing Local components for dynamic rendering
    provideDecafDynamicComponents(AppExpiryDateFieldComponent, AppSwitcherComponent, AppSelectFieldComponent),
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
