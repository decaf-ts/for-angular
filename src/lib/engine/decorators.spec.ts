import { CUSTOM_ELEMENTS_SCHEMA, Component, NO_ERRORS_SCHEMA } from '@angular/core';
import {
  IonButton,
  IonCheckbox,
  IonDatetime,
  IonDatetimeButton,
  IonInput,
  IonItem,
  IonLabel,
  IonRadio,
  IonRadioGroup,
  IonRange,
  IonSelect,
  IonSelectOption,
  IonTextarea,
  IonToggle,
} from '@ionic/angular/standalone';
import { CrudFieldComponent } from '../components/crud-field/crud-field.component';
import { ForAngularCommonModule } from '../for-angular-common.module';
import { Dynamic } from './decorators';
import { NgxRenderingEngine } from './NgxRenderingEngine';

describe('decorators', () => {
  @Dynamic()
  @Component({
    selector: 'ngx-decaf-decorator-test-form-field-component',
    standalone: true,
    imports: [
      ForAngularCommonModule,
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
    template: '<div><input /></div>',
    styleUrl: '../components/crud-field/crud-field.component.scss',
  })
  class DecoratorTestFormFieldComponent extends CrudFieldComponent {}

  // beforeEach(() => {});

  xit('should populate from @Component Metadata', () => {
    expect(
      NgxRenderingEngine.components('ngx-decaf-decorator-test-form-field-component') as DecoratorTestFormFieldComponent
    ).toBeDefined();
  });
});
