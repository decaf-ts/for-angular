import { pk } from '@decaf-ts/core';
import { OperationKeys } from '@decaf-ts/db-decorators';
import { list, Model, model, ModelArg, required } from '@decaf-ts/decorator-validation';
import { hideOn, uichild, uielement, uilayoutprop, uilistmodel, uilistprop, uimodel } from '@decaf-ts/ui-decorators';
import { CategoryModel } from '../models/CategoryModel';

@uilistmodel('ngx-decaf-list-item', { icon: 'cafe-outline' })
@uimodel('ngx-decaf-crud-form')
@model()
export class User extends Model {

  // @pk({type: 'Number' })
  // id!: number;
  @pk({type: 'Number' })
  @required()
  @uielement('ngx-decaf-crud-field', {
    label: 'user.id.label',
    placeholder: 'user.id.placeholder'
  })
  @hideOn(OperationKeys.CREATE)
  @uilayoutprop(1)
  @uilistprop('uid')
  id!: number;


  @uielement('ngx-decaf-crud-field', {
    label: 'user.username.label',
    placeholder: 'user.username.placeholder'
  })
  @uilayoutprop(1)
  @uilistprop('title')
  @required()
  username!: string;


  constructor(args: ModelArg<User> = {}) {
    super(args);
  }
}


@uilistmodel('ngx-decaf-list-item', { icon: 'cafe-outline' })
@uimodel('ngx-decaf-crud-form')
@model()
export class FieldSetForm extends Model {

  @pk({type: 'Number' })
  id!: number;


  @list(CategoryModel, 'Array')
  @uichild(CategoryModel.name, 'ngx-decaf-fieldset', {max: 2, borders: true}, true)
  user!: CategoryModel;

  constructor(args: ModelArg<FieldSetForm> = {}) {
    super(args);
  }
}




