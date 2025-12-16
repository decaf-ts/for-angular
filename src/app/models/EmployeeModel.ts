import {
  Model,
  model,
  ModelArg,
  required,
} from '@decaf-ts/decorator-validation';
import {
  HTML5InputTypes,
  uielement,
  uilistmodel,
  uilistprop,
  uimodel,
} from '@decaf-ts/ui-decorators';
import { pk } from '@decaf-ts/core';
import { OperationKeys, timestamp } from '@decaf-ts/db-decorators';

@uilistmodel('ngx-decaf-list-item', { icon: 'person-outline' })
@uimodel('ngx-decaf-crud-form', { rows: 1, cols: 1 })
@model()
export class EmployeeModel extends Model {
  @uilistprop('uid')
  @uielement('ngx-decaf-crud-field', {
    label: 'employee.id.label',
    placeholder: 'employee.id.placeholder',
  })
 @pk({ type: Number })
  id!: number;

  @required()
  @uielement('ngx-decaf-crud-field', {
    label: 'employee.name.label',
    placeholder: 'employee.name.placeholder',
  })
  @uilistprop('title')
  name!: string;

  // @required()
  // @email()
  // @eq('../../email')
  // @uielement('ngx-decaf-crud-field', {
  //   label: 'employee.companyEmail.label',
  //   placeholder: 'employee.companyEmail.placeholder',
  // })
  // companyEmail!: string;

  @required()
  @uielement('ngx-decaf-crud-field', {
    label: 'employee.occupation.label',
    placeholder: 'employee.occupation.placeholder',
    type: HTML5InputTypes.SELECT,
    options: [
      { text: 'Software Engineer', value: 'Software Engineer' },
      { text: 'Frontend Developer', value: 'Frontend Developer' },
      { text: 'Backend Developer', value: 'Backend Developer' },
      { text: 'QA Engineer', value: 'QA Engineer' },
      { text: 'Product Manager', value: 'Product Manager' },
    ],
  })
  occupation!: string;

  @uilistprop('info')
  birthdate!: Date | string;

  hiredAt!: Date;

  @timestamp([OperationKeys.CREATE])
  createdAt!: Date;

  @timestamp()
  updateAt!: Date;

  constructor(args: ModelArg<EmployeeModel> = {}) {
    super(args);
  }
}
