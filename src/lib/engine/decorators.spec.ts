import {
  CUSTOM_ELEMENTS_SCHEMA,
  Component,
  NO_ERRORS_SCHEMA,
} from '@angular/core';
import { Dynamic } from './decorators';
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
  IonButton,
  IonDatetimeButton,
} from '@ionic/angular/standalone';
import { ForAngularModule } from '../for-angular.module';
import { NgxRenderingEngine } from './NgxRenderingEngine';

describe('decorators', () => {
  @Dynamic()
  @Component({
    selector: 'ngx-decaf-decorator-test-form-field-component',
    standalone: true,
    imports: [
      ForAngularModule,
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
      IonDatetimeButton,
    ],
    schemas: [CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA],
    templateUrl:
      '../components/crud-field/crud-field.component.html',
    styleUrl: '../components/crud-field/crud-field.component.scss',
  })
  class DecoratorTestFormFieldComponent {}

  // beforeEach(() => {});

  xit('should populate from @Component Metadata', () => {
    expect(
      NgxRenderingEngine.components('ngx-decaf-decorator-test-form-field-component') as DecoratorTestFormFieldComponent,
    ).toBeDefined();
  });
});
