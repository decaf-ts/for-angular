import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { DecafCrudFieldComponent } from './decaf-crud-field/decaf-crud-field.component';
import { DecafCrudFormComponent } from './decaf-crud-form/decaf-crud-form.component';
import { DecafModelRendererComponent } from './decaf-model-renderer/decaf-model-renderer.component';

const components = [
  DecafCrudFieldComponent,
  DecafCrudFormComponent,
  DecafModelRendererComponent,
];

export const ionicComponents = [IonicModule];
@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ...components, ionicComponents
  ],
  declarations: [

  ],
  exports: [...components, TranslateModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class ComponentsModule {}
