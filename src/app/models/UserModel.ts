import {
  eq,
  Model,
  model,
  ModelArg, password,
  required,
} from '@decaf-ts/decorator-validation';
import {uielement, uilistitem, uimodel } from '@decaf-ts/ui-decorators';

@uilistitem('ngx-decaf-list-item', {icon: 'cafe-outline'})
@uimodel('ngx-decaf-crud-form')
@model()
export class UserModel extends Model {

  @required()
  @password()
  @eq("../password")
  @uielement('ngx-decaf-crud-field', { label: 'user.passwordRepeat.label' })
  passwordRepeat!: string;

  @required()
  @uielement('ngx-decaf-crud-field', {
    label: 'user.username.label',
    placeholder: 'user.username.placeholder',
  })
  username!: string;

  constructor(args: ModelArg<UserModel> = {}) {
    super(args);
  }
}

