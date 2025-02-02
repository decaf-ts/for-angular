import {
  NgModule,
  CUSTOM_ELEMENTS_SCHEMA,
  ModuleWithProviders,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { DecafCrudFieldComponent } from './components/decaf-crud-field/decaf-crud-field.component';
import { DecafCrudFormComponent } from './components/decaf-crud-form/decaf-crud-form.component';
import { DecafModelRendererComponent } from './components/decaf-model-renderer/decaf-model-renderer.component';

const components = [
  DecafCrudFieldComponent,
  DecafCrudFormComponent,
  DecafModelRendererComponent,
];

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
