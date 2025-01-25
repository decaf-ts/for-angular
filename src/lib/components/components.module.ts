import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { ModelRendererComponent } from './model-renderer/model-renderer.component';
import { CrudFormFieldComponent } from './crud-form-field/crud-form-field.component';
import { FormReactiveComponent } from './form-reactive/form-reactive.component';

const components = [
  CrudFormFieldComponent,
  FormReactiveComponent,
  ModelRendererComponent,
];

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule,
    ...components,
  ],
  declarations: [],
  exports: [...components, TranslateModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class ComponentsModule {}
