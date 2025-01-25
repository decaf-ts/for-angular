import { OperationKeys } from '@decaf-ts/db-decorators';
import { Component, CUSTOM_ELEMENTS_SCHEMA, Input } from '@angular/core';
import { CrudFormFieldComponent } from '../lib/components/crud-form-field/crud-form-field.component';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  standalone: true,
  selector: 'app-root',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [CrudFormFieldComponent, TranslatePipe],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  title = 'Decaf-ts for-angular demo';

  @Input()
  protected readonly OperationKeys = OperationKeys.CREATE;

  operation = OperationKeys.CREATE;

  props = {
    name: 'field-name',
    label: 'field label',
    placeholder: 'field placeholder',
    type: 'text',
    hidden: false,
    // Validation
    required: true,
    // readonly: false,
    // maxLength: number;
    // minLength?: number;
    // max?: number | Date;
    // min?: number | Date;
    // pattern?: string;
    // step?: number;
    // custom?: string[];
  };
}
