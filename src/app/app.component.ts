import { CrudOperations, OperationKeys } from '@decaf-ts/db-decorators';
import { Component, CUSTOM_ELEMENTS_SCHEMA, Input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { ComponentsModule } from '../lib/components/components.module';

@Component({
  standalone: true,
  selector: 'app-root',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [ComponentsModule, TranslatePipe],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  title = 'Decaf-ts for-angular demo';

  @Input()
  protected readonly OperationKeys: CrudOperations = OperationKeys.CREATE;

  operation: CrudOperations = OperationKeys.CREATE;

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
