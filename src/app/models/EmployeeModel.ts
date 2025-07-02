import { Model, model, ModelArg, required } from '@decaf-ts/decorator-validation';
import { uielement, uilistitem, uilistprop, uimodel } from '@decaf-ts/ui-decorators';
import { pk } from '@decaf-ts/core';
import { id } from '@decaf-ts/db-decorators';

@uilistitem('ngx-decaf-list-item', { icon: 'person-outline' })
@uimodel('ngx-decaf-crud-form')
@model()
export class EmployeeModel extends Model {

  @uilistprop('uid')
  @pk()
  @id()
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
  })
  @uilistprop('description')
  occupation!: string;

  @uilistprop('info')
  birthdate!: Date;

  hiredAt!: Date;

  createdAt!: Date;

  constructor(args: ModelArg<EmployeeModel> = {}) {
    super(args);
  }
}
