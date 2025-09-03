import { id, OperationKeys } from '@decaf-ts/db-decorators';
import {
  date,
  email,
  eq,
  list,
  max,
  min,
  minlength,
  model,
  Model,
  ModelArg,
  password,
  required,
  type,
  url,
} from '@decaf-ts/decorator-validation';
import { hideOn, uichild, uielement, uimodel } from '@decaf-ts/ui-decorators';
import { CategoryModel } from './CategoryModel';
import { UserModel } from './UserModel';
import { pk } from '@decaf-ts/core';


@uimodel('ngx-decaf-crud-form')
@model()
export class ForAngularModel extends Model {

  @pk({type: 'Number' })
  @min(1)
  @max(100)
  @uielement('ngx-decaf-crud-field', {
    label: 'demo.id.label',
    placeholder: 'demo.id.placeholder',
    value: 1,
  })
  @hideOn(OperationKeys.CREATE, OperationKeys.UPDATE)
  id!: number;

  // @required()
  // @minlength(5)
  // @uielement('ngx-decaf-crud-field', {
  //   label: 'demo.name.label',
  //   placeholder: 'demo.name.placeholder',
  // })
  // name!: string;

  // @required()
  // @uielement('ngx-decaf-crud-field', {
  //   label: 'demo.gender.label',
  //   type: 'radio',
  //   options: [
  //     { value: 'Male', text: 'Is Male' },
  //     { value: 'Female', text: 'Is Female' },
  //   ],
  // })
  // gender!: string;

  // @uichild(CategoryModel.name, 'ngx-decaf-fieldset', {mapper: {title: 'name'}, pk: 'name', multiple: true})
  // category!: CategoryModel;

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

  @list(UserModel, 'Array')
  @uichild(UserModel.name, 'ngx-decaf-fieldset', {mapper: {title: 'username'}, pk: 'username'}, true)
  user!: UserModel;

  // @required()
  // @uielement('ngx-decaf-crud-field', {
  //   label: 'demo.agree.label',
  //   type: 'checkbox',
  // })
  // agree!: string;

  // @list(OtherModel)
  // @minlength(1)
  // @maxlength(3)
  // @uielement('ngx-decaf-crud-field', {
  //   label: 'demo.id.label',
  //   placeholder: 'demo.id.placeholder',
  // })
  // children: OtherModel[] = [];

  // eslint-disable-next-line @typescript-eslint/no-useless-constructor
  constructor(arg?: ModelArg<ForAngularModel>) {
    super(arg);
  }
}
