import {
  CUSTOM_ELEMENTS_SCHEMA,
  Component,
  NO_ERRORS_SCHEMA,
} from '@angular/core';
import { Dynamic } from './decorators';
import { NgxRenderingEngine } from './NgxRenderingEngine';
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
import { NgxRenderingEngine2 } from 'dist/for-angular/cli/lib/engine';


describe('decorators', () => {
  @Dynamic()
  @Component({
    selector: 'ngx-decorator-test-form-field',
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
  class DecoratorTestFormField {}

  // beforeEach(() => {});

  xit('should populate from @Component Metadata', () => {
    expect(
      NgxRenderingEngine2.components('ngx-decorator-test-form-field'),
    ).toBeDefined();
  });
});
