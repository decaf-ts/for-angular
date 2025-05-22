import {
  date,
  Model,
  model,
  ModelArg,
} from '@decaf-ts/decorator-validation';
import { OperationKeys } from '@decaf-ts/db-decorators';
import { uilistitem, uilistprop, uimodel, uiprop } from '@decaf-ts/ui-decorators';
import { FakerRepository } from '../utils/FakerRepository';

@uilistitem('ngx-decaf-list-item', {icon: 'person-outline'})
@uimodel('ngx-decaf-crud-form')
@model()
export class EmployeeModel extends FakerRepository<EmployeeModel> {

  @uilistprop('uid')
  id!: number;

  @uilistprop('title')
  name!: string;

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
