import { CrudOperations, OperationKeys } from '@decaf-ts/db-decorators';
import { Component, CUSTOM_ELEMENTS_SCHEMA, Input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { ComponentsModule } from '../lib/components/components.module';
import { NgxRenderingEngine } from '../lib/engine';

try {
  const engine = new NgxRenderingEngine();
} catch (e: unknown) {
  throw new Error(`Failed to load rendering engine: ${e}`);
}

const props = {
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

function getProps(
  name: string,
  type = 'text',
  value: string | number | Date = '',
) {
  return Object.assign({}, props, {
    name: `field-${name}`,
    label: `Label for field ${name}`,
    placeholder: `placeholder for field ${type}`,
    type: type,
    value: value,
  });
}

const now = new Date();
const lastWeek = new Date();
const nextWeek = new Date();
lastWeek.setDate(lastWeek.getDate() - 7);
nextWeek.setDate(lastWeek.getDate() + 7);

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

  props1 = getProps('1', 'text');
  props2 = Object.assign({}, getProps('2', 'text'), {
    minlength: 10,
    maxlength: 15,
  });
  props3 = Object.assign({}, getProps('3', 'number', 10), {
    required: false,
    min: 15,
    max: 25,
    step: 5,
  });
  props4 = Object.assign({}, getProps('4', 'date', now), {
    min: lastWeek,
    max: nextWeek,
  });
  props5 = Object.assign({}, getProps('5', 'select', ''));
}
