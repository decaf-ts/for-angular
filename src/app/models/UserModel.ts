import { pk } from '@decaf-ts/core';
import { eq, Model, model, ModelArg, password, required } from '@decaf-ts/decorator-validation';
import { uichild, uielement, uilistmodel, uimodel } from '@decaf-ts/ui-decorators';
import { CategoryModel } from './CategoryModel';

@uilistmodel('ngx-decaf-list-item', { icon: 'cafe-outline' })
@uimodel('ngx-decaf-crud-form')
@model()
export class UserModel extends Model {

  @pk({type: 'Number' })
  id!: number;

  @required()
  @uielement('ngx-decaf-crud-field', {
    label: 'user.username.label'
  })
  username!: string;

  @required()
  @password()
  @eq('../password')
  @uielement('ngx-decaf-crud-field', { label: 'user.secret.label' })
  secret!: string;

  @uichild(CategoryModel.name, 'ngx-decaf-fieldset', {collapsable: false})
  category!: CategoryModel;

  constructor(args: ModelArg<UserModel> = {}) {
    super(args);
  }
}

