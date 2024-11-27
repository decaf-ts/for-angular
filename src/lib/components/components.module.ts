import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { NgxCrudFormFieldComponent } from './ngx-crud-form-field/ngx-crud-form-field.component';
import { NgxModelRendererComponent } from './ngx-model-renderer/ngx-model-renderer.component';

const components = [NgxCrudFormFieldComponent, NgxModelRendererComponent];
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
