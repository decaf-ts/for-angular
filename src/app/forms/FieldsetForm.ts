import { pk } from '@decaf-ts/core';
import { id } from '@decaf-ts/db-decorators';
import { list, max, Model, model, ModelArg, required } from '@decaf-ts/decorator-validation';
import { uichild, uielement, uilayout, uilayoutitem, uilistitem, uimodel } from '@decaf-ts/ui-decorators';

@uilistitem('ngx-decaf-list-item', { icon: 'cafe-outline' })
@uimodel('ngx-decaf-crud-form', {cols: 2, rows: 1})
@model()
export class User extends Model {

  // @pk({type: 'Number' })
  // id!: number;
  @id()
  @required()
  @uielement('ngx-decaf-crud-field', {
    label: 'user.id.label'
  })
  @uilayoutitem(1)
  id!: string;


  @uielement('ngx-decaf-crud-field', {
    label: 'user.username.label'
  })
  @uilayoutitem(1)
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
  @uichild(User.name, 'ngx-decaf-fieldset', {cols: 2, rows: 1}, true)
  user!: User;

  constructor(args: ModelArg<FieldSetForm> = {}) {
    super(args);
  }
}




