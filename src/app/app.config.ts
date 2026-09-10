import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, RouteReuseStrategy, withComponentInputBinding } from '@angular/router';
import { RamAdapter, RamFlavour } from '@decaf-ts/core/ram';
import { Model } from '@decaf-ts/decorator-validation';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone';
import { RootTranslateServiceConfig } from '@ngx-translate/core';
import { CronSelectorFieldComponent } from 'src/lib/components';
import { I18nResourceConfigType } from 'src/lib/engine';
import {
  provideDecafDbAdapter,
  provideDecafDynamicComponents,
  provideDecafPageTransition,
} from 'src/lib/engine/helpers';
import { provideDecafI18nConfig } from 'src/lib/i18n/Loader';
import { isDevelopmentMode } from 'src/lib/utils/helpers';
// The canonical graph module's live node catalogue source (DECAF-50 §4.12/§4.13).
import { GraphNodeCatalogApi, GRAPH_NODE_CATALOG_SOURCE } from 'src/graph';
import { routes } from './app.routes';
import { AppExpiryDateFieldComponent } from './components/expiry-date/expiry-date-field.component';
import { AppSelectFieldComponent } from './components/select-field/select-field.component';
import { AppSwitcherComponent } from './components/switcher/switcher.component';

export const isLocalDevelopmentMode = isDevelopmentMode('localhost');
// export const isLocalDevelopmentMode = false;
export const AppName = 'For Angular';
export const DbAdapterFlavour = RamFlavour;
export const AppModels = [] as Model[];

// Report mode: DECAF__I18N__ENABLED toggles translation resolution at boot.
// When set to "false"/false before the app boots (e.g. the UI i18n screenshot
// Playwright test's pre-bootstrap init script), I18nLoader.enabled is false and
// DecafTranslatePipe renders the visible key wrapper instead of the translated
// string. Additive: when unset, i18n is enabled as before.
const i18nEnabledFlag =
  (globalThis as Record<string, unknown>)['DECAF__I18N__ENABLED'] ??
  (typeof process !== 'undefined' && typeof process.env !== 'undefined'
    ? process.env['DECAF__I18N__ENABLED']
    : undefined);
export const i18nEnabled = i18nEnabledFlag !== 'false' && i18nEnabledFlag !== false;

export const AppConfig: ApplicationConfig = {
  providers: [
    // Providers from ionic angular
    provideIonicAngular({
      mode: 'md',
    }),
    provideDecafDbAdapter(RamAdapter, { user: 'user', dbName: 'for-angular' }),
    // provideDecafDbAdapter(DecafAxiosHttpAdapter, {
    //   protocol: 'https',
    //   host: 'ew-backend-pdm.ptp.internal',
    //   events: true,
    // }),
    provideZoneChangeDetection({ eventCoalescing: true }),
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideRouter(routes, withComponentInputBinding()),
    // provide dark theme
    // provideDecafDarkMode(),
    // change the default page transition
    provideDecafPageTransition(),
    // Providing Local components for dynamic rendering
    provideDecafDynamicComponents(
      AppExpiryDateFieldComponent,
      AppSwitcherComponent,
      AppSelectFieldComponent,
      CronSelectorFieldComponent
    ),
    // Canonical graph module's live node catalogue source (DECAF-50 §4.12/§4.13):
    // the root-scoped GraphNodeCatalogService dispatches node manifests,
    // dynamic-port resolutions and declared-method invocations through this
    // HTTP backend bridge; failures surface through the store's status signal.
    { provide: GRAPH_NODE_CATALOG_SOURCE, useExisting: GraphNodeCatalogApi },
    provideDecafI18nConfig(
      {
        fallbackLang: 'en',
        lang: 'en',
      } as RootTranslateServiceConfig,
      // optionally provide I18nLoader configuration, otherwise it will use default (same as setted below)
      [
        {
          prefix: './assets/i18n/',
          suffix: '.json',
        },
      ] as I18nResourceConfigType,
      false,
      i18nEnabled
    ),
  ],
};
