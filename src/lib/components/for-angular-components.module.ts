import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CrudFieldComponent } from './crud-field/crud-field.component';
import { CrudFormComponent } from './crud-form/crud-form.component';
import { ModelRendererComponent } from './model-renderer/model-renderer.component';
import { ForAngularModule } from '../for-angular.module';
import { IconComponent } from './icon/icon.component';

const Components = [
  CrudFieldComponent,
  CrudFormComponent,
  ModelRendererComponent,
  IconComponent
];

@NgModule({
  imports: Components,
  declarations: [],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  exports: [Components, ForAngularModule],
})
export class ForAngularComponentsModule {}
