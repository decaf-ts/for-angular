import {
  NgModule,
  CUSTOM_ELEMENTS_SCHEMA,
  ModuleWithProviders,
  NO_ERRORS_SCHEMA,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgxCrudFormFieldComponent } from './ngx-crud-form-field/ngx-crud-form-field.component';
import { NgxModelRendererComponent } from './ngx-model-renderer/ngx-model-renderer.component';
import { TranslateModule } from '@ngx-translate/core';

const components = [NgxCrudFormFieldComponent, NgxModelRendererComponent];

// caso sejam stand alone, importar em vez de declarar
@NgModule({
  imports: [
    CommonModule,
    IonicModule,
    FormsModule,
    ReactiveFormsModule,
    TranslateModule,
    ...components,
  ],
  exports: [...components, TranslateModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA],
})
export class ForAngularModule {
  static forRoot(): ModuleWithProviders<ForAngularModule> {
    return {
      ngModule: ForAngularModule,
    };
  }

  constructor() {}
}
