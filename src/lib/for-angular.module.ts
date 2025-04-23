import {
  NgModule,
  CUSTOM_ELEMENTS_SCHEMA,
  ModuleWithProviders,
  NO_ERRORS_SCHEMA,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule, TranslatePipe } from '@ngx-translate/core';
import { CrudFieldComponent } from './components/crud-field/crud-field.component';
import { CrudFormComponent } from './components/crud-form/crud-form.component';
import { ModelRendererComponent } from './components/model-renderer/model-renderer.component';

const commonModules = [
  CommonModule,
  IonicModule,
  FormsModule,
  ReactiveFormsModule,
  TranslateModule,
  TranslatePipe
];


@NgModule({
  imports: commonModules,
  declarations: [],
  exports: commonModules,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class ForAngularModule {
  static forRoot(): ModuleWithProviders<ForAngularModule> {
    return {
      ngModule: ForAngularModule,
    };
  }
}
