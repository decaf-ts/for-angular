import {
  eq,
  model,
  ModelArg, password,
  prop,
  required,
} from '@decaf-ts/decorator-validation';
import { uilistprop, uielement, uilistitem, uimodel, uiprop } from '@decaf-ts/ui-decorators';
import { FakerRepository } from '../utils/FakerRepository';
import { EmployeeModel } from './EmployeeModel';

@uilistitem('ngx-decaf-list-item', {icon: 'cafe-outline'})
@uimodel('ngx-decaf-crud-form')
@model()
export class UserModel extends FakerRepository<UserModel> {

  @required()
  @password()
  // @eq("../password")
  @uielement('ngx-decaf-crud-field', { label: 'user.passwordRepeat.label' })
  passwordRepeat!: string;

  @required()
  @uielement('ngx-decaf-crud-field', {
    label: 'user.username.label',
    placeholder: 'user.username.placeholder',
  })
  username!: string;

  constructor(args: ModelArg<UserModel> = {}) {
    super('users', args);
  }
}

