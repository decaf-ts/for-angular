import {
  CUSTOM_ELEMENTS_SCHEMA,
  Component,
  NO_ERRORS_SCHEMA,
} from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { Dynamic } from './decorators';
import { NgxRenderingEngine } from './NgxRenderingEngine';
import { DecafFieldDirective } from '../directives/decaf-field.directive';
import { IonItem } from '@ionic/angular';

describe('decorators', () => {
  @Dynamic()
  @Component({
    // eslint-disable-next-line @angular-eslint/component-selector
    selector: 'ngx-decorator-test-form-field',
    standalone: true,
    imports: [ReactiveFormsModule, IonItem, DecafFieldDirective],
    schemas: [CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA],
    templateUrl:
      '../components/crud-form-field/crud-field.component.html',
    styleUrl: '../components/crud-form-field/crud-field.component.scss',
  })
  class DecoratorTestFormField {}

  // beforeEach(() => {});

  it('should populate from @Component Metadata', () => {
    expect(
      NgxRenderingEngine.components('ngx-decorator-test-form-field'),
    ).toBeDefined();
  });
});
