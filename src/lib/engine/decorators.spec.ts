import { Component } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { Dynamic } from './decorators';
import { NgxRenderingEngine } from './NgxRenderingEngine';
import { FormElementNameDirective } from '../directives/form-element-name.directive';
import { IonItem } from '@ionic/angular';

describe('decorators', () => {
  @Dynamic()
  @Component({
    // eslint-disable-next-line @angular-eslint/component-selector
    selector: 'ngx-decorator-test-form-field',
    standalone: true,
    imports: [
      ReactiveFormsModule,
      NgClass,
      IonInput,
      IonItem,
      IonCheckbox,
      IonRadioGroup,
      IonRadio,
      IonSelect,
      TranslatePipe,
      IonSelectOption,
      FormElementNameDirective,
    ],
    schemas: [CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA],
    templateUrl:
      '../../../src/lib/components/crud-form-field/crud-form-field.component.html',
    styleUrl:
      '../../../src/lib/components/crud-form-field/crud-form-field.component.scss',
  })
  class DecoratorTestFormField {}

  beforeEach(() => {});

  it('should populate from @Component Metadata', () => {
    expect(
      NgxRenderingEngine.components('ngx-decorator-test-form-field'),
    ).toBeDefined();
  });
});
