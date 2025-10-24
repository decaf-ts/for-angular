import { id, OperationKeys } from '@decaf-ts/db-decorators';
import {
  date,
  email,
  eq,
  max,
  min,
  minlength,
  model,
  Model,
  ModelArg,
  password,
  required,
  url,
} from '@decaf-ts/decorator-validation';
import { hideOn, uichild, uielement, uilayout, uilayoutitem, uimodel } from '@decaf-ts/ui-decorators';
import { CategoryModel } from './CategoryModel';
import { UserModel } from './UserModel';
import { pk } from '@decaf-ts/core';


@uimodel('ngx-decaf-crud-form', {cols: 2, rows: 1})
// or just
// @uilayout('ngx-decaf-crud-form', 2, 1)
@model()
export class ForAngularModel extends Model {

  @pk({type: Number.name})
  @min(1)
  @max(100)
  @uielement('ngx-decaf-crud-field', {
    label: 'demo.id.label',
    placeholder: 'demo.id.placeholder',
    // className: 'dcf-width-1-2@s dcf-width-1-1',
  })
  @uilayoutitem(1, 1)
  id!: number;

  // @uilayoutitem(1, 1)
  // @required()
  // @minlength(5)
  // @uielement('ngx-decaf-crud-field', {
  //   label: 'demo.name.label',
  //   placeholder: 'demo.name.placeholder',
  //   // className: 'dcf-width-1-2@s dcf-width-1-1',
  // })
  // name!: string;

  // @required()
  // @uielement('ngx-decaf-crud-field', {
  //   label: 'demo.gender.label',
  //   type: 'radio',
  //   options: [
  //     { value: 'Male', text: 'male' },
  //     { value: 'Female', text: 'female' },
  //   ],
  // })
  // gender!: string;

  // @required()
  // @uielement('ngx-decaf-crud-field', {
  //   label: 'demo.contact.label',
  //   type: 'select',
  //   options: [
  //     { value: 'morning', text: 'morning' },
  //     { value: 'afternoon', text: 'afternoon' },
  //     { value: 'evening', text: 'evening' },
  //     { value: 'all', text: 'all' },
  //   ],
  // })
  // contact!: string;

  @uichild(CategoryModel.name, 'ngx-decaf-fieldset', {collapsable: false})
  category!: CategoryModel;

  // @required()
  // @date('yyyy-MM-dd')
  // @uielement('ngx-decaf-crud-field', { label: 'demo.birthdate.label' })
  // birthdate!: Date;

  // @required()
  // @email()
  // @uielement('ngx-decaf-crud-field', {
  //   label: 'demo.email.label',
  //   placeholder: 'demo.email.placeholder',
  // })
  // email!: string;

  // @url()
  // @uielement('ngx-decaf-crud-field', { label: 'demo.website.label' })
  // website!: string;

  // @required()
  // @password()
  // @eq('user.secret')
  // @uielement('ngx-decaf-crud-field', { label: 'demo.password.label' })
  // password!: string;

  // @uichild(UserModel.name, 'ngx-decaf-fieldset')
  // user!: UserModel;

  // @required()
  // @uielement('ngx-decaf-crud-field', {
  //   label: 'demo.agree.label',
  //   type: 'checkbox',
  // })
  // @hideOn(OperationKeys.DELETE, OperationKeys.UPDATE, OperationKeys.READ)
  // agree!: string;

  // eslint-disable-next-line @typescript-eslint/no-useless-constructor
  constructor(arg?: ModelArg<ForAngularModel>) {
    super(arg);
  }
}
