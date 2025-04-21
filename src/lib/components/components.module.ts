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
// import { ForAngularModule } from '../for-angular.module';
// import { IonButton, IonCard, IonCheckbox, IonDatetime, IonInput, IonIcon, IonRadioGroup, IonRange, IonSearchbar, IonSegment, IonSelect, IonTextarea, IonToggle } from '@ionic/angular/standalone';

export const ionicFormComponents = [
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
  IonButton
];

const components = [
  CrudFieldComponent,
  CrudFormComponent,
  ModelRendererComponent,
  ContainerComponent
];


@NgModule({
  imports: components,
  declarations: [],
  exports: [components],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class ComponentsModule {}
