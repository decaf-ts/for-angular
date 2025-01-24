import {
  CUSTOM_ELEMENTS_SCHEMA,
  NgModule,
  NO_ERRORS_SCHEMA,
} from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { RouteReuseStrategy } from '@angular/router';
import { IonicModule, IonicRouteStrategy } from '@ionic/angular';
import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';

import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { Model } from '@decaf-ts/decorator-validation';
import { ForAngularModule } from '../lib/for-angular.module';
import { ComponentsModule } from '../lib/components/components.module';
import { NgxCrudFormFieldComponent } from '../lib/components/ngx-crud-form-field/ngx-crud-form-field.component';
import { HttpClient } from '@angular/common/http';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';

const createTranslateLoader = function (http: HttpClient) {
  function getSuffix() {
    const today = new Date();
    return `.json?version=${today.getFullYear()}${today.getMonth()}${today.getDay()}` as string;
  }
  return new TranslateHttpLoader(http, './assets/data/i18n/', getSuffix());
};

Model.setBuilder(Model.fromModel);

@NgModule({
  // declarations: [AppComponent],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    IonicModule.forRoot(),
    AppRoutingModule,
    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useFactory: createTranslateLoader,
        deps: [HttpClient],
      },
    }),
    ForAngularModule.forRoot(),
    ComponentsModule,
    NgxCrudFormFieldComponent,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA],
  providers: [{ provide: RouteReuseStrategy, useClass: IonicRouteStrategy }],
  // bootstrap: [AppComponent],
})
export class AppModule {}
