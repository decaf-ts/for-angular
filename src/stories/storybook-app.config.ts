import { ApplicationConfig, Component } from '@angular/core';
import { RouteReuseStrategy, provideRouter, withComponentInputBinding } from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone';
import { RootTranslateServiceConfig } from '@ngx-translate/core';
import { I18nResourceConfigType } from 'src/lib/engine';
import {
  provideDecafDynamicComponents,
  provideDecafPageTransition,
} from 'src/lib/engine/helpers';
import { provideDecafI18nConfig } from 'src/lib/i18n/Loader';
import { AppExpiryDateFieldComponent } from 'src/app/components/expiry-date/expiry-date-field.component';
import { AppSelectFieldComponent } from 'src/app/components/select-field/select-field.component';
import { AppSwitcherComponent } from 'src/app/components/switcher/switcher.component';

@Component({
  standalone: true,
  template: '',
})
export class StorybookRouteStubComponent {}

export const StorybookAppConfig: ApplicationConfig = {
  providers: [
    provideIonicAngular({
      mode: 'md',
    }),
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideRouter([{ path: '**', component: StorybookRouteStubComponent }], withComponentInputBinding()),
    provideDecafPageTransition(),
    provideDecafDynamicComponents(AppExpiryDateFieldComponent, AppSwitcherComponent, AppSelectFieldComponent),
    provideDecafI18nConfig(
      {
        fallbackLang: 'en',
        lang: 'en',
      } as RootTranslateServiceConfig,
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
