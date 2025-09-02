import { pk } from '@decaf-ts/core';
import { eq, minlength, Model, model, ModelArg, password, required } from '@decaf-ts/decorator-validation';
import { uielement, uilistitem, uimodel } from '@decaf-ts/ui-decorators';

@uilistitem('ngx-decaf-list-item', { icon: 'cafe-outline' })
@uimodel('ngx-decaf-crud-form')
@model()
export class UserModel extends Model {

  @pk({type: 'Number' })
  id!: number;

  @required()
  @uielement('ngx-decaf-crud-field', {
    label: 'user.username.label'
  })
  @minlength(5)
  username!: string;

  // @required()
  // @password()
  // @eq('../password')
  // @uielement('ngx-decaf-crud-field', { label: 'user.secret.label' })
  // secret!: string;

  constructor(args: ModelArg<UserModel> = {}) {
    super(args);
  }
}

