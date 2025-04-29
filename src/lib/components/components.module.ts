import { NgModule, CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA } from '@angular/core';
import {
  IonCheckbox,
  IonDatetime,
  IonInput,
  IonItem,
  IonLabel,
  IonRadio,
  IonRadioGroup,
  IonSelect,
  IonSelectOption,
  IonTextarea,
  IonRange,
  IonToggle,
  IonButton
} from '@ionic/angular/standalone';
import { CrudFieldComponent } from './crud-field/crud-field.component';
import { CrudFormComponent } from './crud-form/crud-form.component';
import { ModelRendererComponent } from './model-renderer/model-renderer.component';
import { ContainerComponent } from './container/container.component';
import { MenuSideComponent } from './menu-side/menu-side.component';
import { ForAngularModule } from '../for-angular.module';
import { IconComponent } from './icon/icon.component';

export const IonicFormComponents = [
  IonInput,
  IonItem,
  IonCheckbox,
  IonRadioGroup,
  IonRadio,
  IonSelect,
  IonSelectOption,
  IonTextarea,
  IonDatetime,
  IonLabel,
  IonRange,
  IonToggle,
  IonButton,
];

const Components = [
  CrudFieldComponent,
  CrudFormComponent,
  ModelRendererComponent,
  ContainerComponent,
  MenuSideComponent,
  IconComponent
];

@NgModule({
  imports: Components,
  declarations: [],
  exports: [Components, ForAngularModule],
})
export class ComponentsModule {}
