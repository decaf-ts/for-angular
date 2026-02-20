import { ApplicationConfig, provideAppInitializer } from '@angular/core';
import {
  PreloadAllModules,
  provideRouter,
  RouteReuseStrategy,
  withComponentInputBinding,
  withPreloading,
} from '@angular/router';
import { RamAdapter, RamFlavour } from '@decaf-ts/core/ram';
import { Model } from '@decaf-ts/decorator-validation';
import { AxiosFlavour } from '@decaf-ts/for-http';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone';
import { RootTranslateServiceConfig } from '@ngx-translate/core';
import { I18nResourceConfigType } from 'src/lib/engine';
import {
  getLogger,
  provideDecafDbAdapter,
  provideDecafDynamicComponents,
  provideDecafPageTransition,
} from 'src/lib/engine/helpers';
import { DecafAxiosHttpAdapter } from 'src/lib/engine/overrides';
import { provideDecafI18nConfig } from 'src/lib/i18n/Loader';
import { isDevelopmentMode } from 'src/lib/utils/helpers';
import { routes } from './app.routes';
import { AppExpiryDateFieldComponent } from './components/expiry-date/expiry-date-field.component';
import { AppSelectFieldComponent } from './components/select-field/select-field.component';
import { AppSwitcherComponent } from './components/switcher/switcher.component';
import { Batch } from './ew/fabric/Batch';
import { Leaflet } from './ew/fabric/Leaflet';
import { Product } from './ew/fabric/Product';
import { ProductStrength } from './ew/fabric/ProductStrength';
import { populateSampleData } from './utils/FakerRepository';

export const isLocalDevelopmentMode = isDevelopmentMode('local');
export const AppName = 'For Angular';
export const DbAdapterFlavour = !isLocalDevelopmentMode ? AxiosFlavour : RamFlavour;
export const AppModels = [] as Model[];

export const AppConfig: ApplicationConfig = {
  providers: [
    provideAppInitializer(async () => {
      const logger = getLogger(provideAppInitializer);
      const isDevMode = isLocalDevelopmentMode && DbAdapterFlavour.includes(RamFlavour);
      if (isDevMode) {
        try {
          AppModels.push(new Product(), new ProductStrength(), new Batch(), new Leaflet());
          logger.debug(`AppConfig: Loaded ${AppModels.length} models. Initializing sample data...`);
          await populateSampleData(AppModels, ['Product', 'Batch', 'Leaflet'], 6);
        } catch (error: unknown) {
          logger.error((error as Error)?.message);
        }
      }
    }),
    isLocalDevelopmentMode
      ? provideDecafDbAdapter(RamAdapter, { user: 'user' }, DbAdapterFlavour)
      : provideDecafDbAdapter(DecafAxiosHttpAdapter, {
          protocol: 'https',
          host: 'ew-backend.ptp.internal',
        }),
    // Providers from ionic angular
    provideIonicAngular(),
    // provideZoneChangeDetection({ eventCoalescing: true }),
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
