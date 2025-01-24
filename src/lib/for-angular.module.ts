import {
  NgModule,
  CUSTOM_ELEMENTS_SCHEMA,
  ModuleWithProviders,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { ComponentsModule } from './components/components.module';
import { NgxCrudFormFieldComponent } from './components/ngx-crud-form-field/ngx-crud-form-field.component';
import { NgxModelRendererComponent } from './components/ngx-model-renderer/ngx-model-renderer.component';

const components = [NgxCrudFormFieldComponent, NgxModelRendererComponent];

@NgModule({
  imports: [
    CommonModule,
    IonicModule,
    FormsModule,
    ReactiveFormsModule,
    TranslateModule,
    ...components,
  ],
  declarations: [],
  exports: [...components],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class ForAngularModule {
  static forRoot(): ModuleWithProviders<ForAngularModule> {
    return {
      ngModule: ForAngularModule,
    };
  }
}
