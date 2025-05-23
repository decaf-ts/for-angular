import {
  date,
  Model,
  model,
  ModelArg,
  prop,
  required,
} from '@decaf-ts/decorator-validation';
import { OperationKeys } from '@decaf-ts/db-decorators';
import { uielement, uilistitem, uilistprop, uimodel, uiprop } from '@decaf-ts/ui-decorators';
import { FakerRepository } from '../utils/FakerRepository';
import { CategoryModel } from './CategoryModel';

@uilistitem('ngx-decaf-list-item', {icon: 'person-outline'})
@uimodel('ngx-decaf-crud-form')
@model()
export class EmployeeModel extends FakerRepository<EmployeeModel> {

  @uilistprop('uid')
  id!: number;

  @required()
  @uielement('ngx-decaf-crud-field', {
    label: 'employee.name.label',
    placeholder: 'employee.name.placeholder',
  })
  @uilistprop('title')
  name!: string;

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
    super('employees', args);
  }
}
