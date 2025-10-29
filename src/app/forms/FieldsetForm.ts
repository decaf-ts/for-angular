import { pk } from '@decaf-ts/core';
import { id } from '@decaf-ts/db-decorators';
import { list, max, Model, model, ModelArg, required } from '@decaf-ts/decorator-validation';
import { uichild, uielement, uilayoutprop, uilistmodel, uimodel } from '@decaf-ts/ui-decorators';

@uilistmodel('ngx-decaf-list-item', { icon: 'cafe-outline' })
@uimodel('ngx-decaf-crud-form', {cols: 2})
@model()
export class User extends Model {

  // @pk({type: 'Number' })
  // id!: number;
  @id()
  @required()
  @uielement('ngx-decaf-crud-field', {
    label: 'user.id.label',
    placeholder: 'user.id.placeholder'
  })
  @uilayoutprop(1)
  id!: string;


  @uielement('ngx-decaf-crud-field', {
    label: 'user.username.label',
    placeholder: 'user.username.placeholder'
  })
  @uilayoutprop(1)
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


  @list(User, 'Array')
  @max(4)
  @uichild(User.name, 'ngx-decaf-fieldset', {cols: 2}, true)
  user!: User;

  constructor(args: ModelArg<FieldSetForm> = {}) {
    super(args);
  }
}




