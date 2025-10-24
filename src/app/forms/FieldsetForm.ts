import { pk } from '@decaf-ts/core';
import { id, OperationKeys } from '@decaf-ts/db-decorators';
import { list, max, Model, model, ModelArg, required } from '@decaf-ts/decorator-validation';
import { hideOn, uichild, uielement, uilistitem, uimodel } from '@decaf-ts/ui-decorators';
import { CategoryModel } from '../models/CategoryModel';

@uilistitem('ngx-decaf-list-item', { icon: 'cafe-outline' })
@uimodel('ngx-decaf-crud-form')
@model()
export class User extends Model {

  // @pk({type: 'Number' })
  // id!: number;
  @id()
  @required()
  @uielement('ngx-decaf-crud-field', {
    label: 'user.id.label'
  })
  iaad!: string;


  @uielement('ngx-decaf-crud-field', {
    label: 'user.username.label'
  })
  username!: string;


  constructor(args: ModelArg<User> = {}) {
    super(args);
  }
}


@uilistitem('ngx-decaf-list-item', { icon: 'cafe-outline' })
@uimodel('ngx-decaf-crud-form')
@model()
export class FieldSetForm extends Model {

  @pk({type: 'Number' })
  id!: number;


  @list(User, 'Array')
  @max(4)
  @uichild(User.name, 'ngx-decaf-fieldset', {}, true)
  user!: User;

  constructor(args: ModelArg<FieldSetForm> = {}) {
    super(args);
  }
}




