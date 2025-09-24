import { pk } from '@decaf-ts/core';
import { OperationKeys } from '@decaf-ts/db-decorators';
import { list, Model, model, ModelArg, required } from '@decaf-ts/decorator-validation';
import { hideOn, uichild, uielement, uilistitem, uimodel } from '@decaf-ts/ui-decorators';
import { CategoryModel } from '../models/CategoryModel';

@uilistitem('ngx-decaf-list-item', { icon: 'cafe-outline' })
@uimodel('ngx-decaf-crud-form')
@model()
export class User extends Model {

  @pk({type: 'Number' })
  id!: number;

  @required()
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
  @hideOn(OperationKeys.CREATE, OperationKeys.UPDATE)
  id!: number;


  @list(User, 'Array')
  @uichild(CategoryModel.name, 'ngx-decaf-fieldset', {pk: 'name'}, true)
  category!: CategoryModel;

  constructor(args: ModelArg<FieldSetForm> = {}) {
    super(args);
  }
}




