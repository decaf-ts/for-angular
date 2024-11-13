import { Component } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { Dynamic } from './decorators';

describe('decorators', () => {
  @Dynamic()
  @Component({
    // eslint-disable-next-line @angular-eslint/component-selector
    selector: 'ngx-decorator-test-form-field',
    standalone: true,
    imports: [ReactiveFormsModule, IonicModule],
    templateUrl:
      '../../../src/lib/components/ngx-crud-form-field/ngx-crud-form-field.component.html',
    styleUrl:
      '../../../src/lib/components/ngx-crud-form-field/ngx-crud-form-field.component.scss',
  })
  class DecoratorTestFormField {}

  beforeEach(() => {});

  it('should populate from @Component Metadata', () => {});
});
