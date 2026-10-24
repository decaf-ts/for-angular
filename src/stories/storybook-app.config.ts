import { ApplicationConfig, Component } from '@angular/core';
import { RamFlavour } from '@decaf-ts/core/ram';
import { RouteReuseStrategy, provideRouter, withComponentInputBinding } from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone';
import { RootTranslateServiceConfig } from '@ngx-translate/core';
import { DB_ADAPTER_FLAVOUR_TOKEN } from 'src/lib/engine/constants';
import { I18nResourceConfigType } from 'src/lib/engine';
import { GraphNodeCatalogApi } from 'diagrams/src/lib/graph/catalog/GraphNodeCatalogApi';
import { GRAPH_NODE_CATALOG_SOURCE } from 'diagrams/src/lib/graph/catalog/GraphNodeCatalogService';
import { GraphEngineCapabilityApi } from 'diagrams/src/lib/graph/capabilities/GraphEngineCapabilityApi';
import { GRAPH_ENGINE_CAPABILITY_SOURCE } from 'diagrams/src/lib/graph/capabilities/GraphEngineCapabilityService';
import { GRAPH_BACKEND_URL } from 'diagrams/src/lib/graph/execution/GraphExecutionService';

/**
 * Storybook's graph backend origin: the `?graphBackend=` URL parameter when
 * present, otherwise the development default. Supplied on the application
 * injector so every root-scoped graph client (node catalogue, validation, run,
 * capability manifest, save) resolves the same origin.
 */
function storybookGraphBackendUrl(): string {
  if (typeof location === 'undefined') return 'http://localhost:3000';
  return new URLSearchParams(location.search).get('graphBackend') || 'http://localhost:3000';
}
import {
  provideDecafDynamicComponents,
  provideDecafPageTransition,
} from 'src/lib/engine/providers';
import { provideDecafI18nConfig } from 'src/lib/i18n/Loader';
import { setOnWindow } from 'src/lib/utils/helpers';
import { AppExpiryDateFieldComponent } from 'src/app/components/expiry-date/expiry-date-field.component';
import { AppSelectFieldComponent } from 'src/app/components/select-field/select-field.component';
import { AppSwitcherComponent } from 'src/app/components/switcher/switcher.component';

@Component({
  standalone: true,
  template: '<div style="padding: 1rem"></div>',
})
export class StorybookRouteStubComponent {}

// app.config.ts is evaluated transitively via the shared app components (LogoComponent, ...)
// used by the Storybook stories. Its module-scope provideDecafDbAdapter(...) call registers the
// axios adapter as the application's Db Provider, which would make getModelAndRepository() resolve
// repositories against the remote backend instead of the seeded RamAdapter. This module is imported
// after those components, so re-asserting the `ram` flavour here makes the seeded stories win.
setOnWindow(DB_ADAPTER_FLAVOUR_TOKEN, RamFlavour);

export const StorybookAppConfig: ApplicationConfig = {
  providers: [
    provideIonicAngular({
      mode: 'md',
    }),
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideRouter([{ path: '**', component: StorybookRouteStubComponent }], withComponentInputBinding()),
    provideDecafPageTransition(),
    provideDecafDynamicComponents(AppExpiryDateFieldComponent, AppSwitcherComponent, AppSelectFieldComponent),
    // Mirror the app's graph bindings so root-scoped graph clients talk to the
    // real backend the story URL selects instead of stopping at a missing
    // capability source or the fixture-only catalogue.
    { provide: GRAPH_BACKEND_URL, useFactory: storybookGraphBackendUrl },
    { provide: GRAPH_NODE_CATALOG_SOURCE, useExisting: GraphNodeCatalogApi },
    { provide: GRAPH_ENGINE_CAPABILITY_SOURCE, useExisting: GraphEngineCapabilityApi },
    provideDecafI18nConfig(
      {
        fallbackLang: 'en',
        lang: 'en',
      } as RootTranslateServiceConfig,
      [
        {
          prefix: './assets/i18n/',
        },
      ] as I18nResourceConfigType
    ),
  ],
};
