import {
  date,
  email,
  minlength,
  model,
  Model,
  ModelArg,
  required,
  url,
} from '@decaf-ts/decorator-validation';
import { uichild, uielement, uimodel } from '@decaf-ts/ui-decorators';
import { CategoryModel } from '../models/CategoryModel';

@uimodel('ngx-decaf-steped-form', {pages: 3, startPage: 1})
@model()
export class SteppedForm extends Model {

  @required()
  @uielement('ngx-decaf-crud-field', {
    label: 'demo.contact.label',
    type: 'select',
    page: 1,
    options: [
      { value: 'morning', text: 'morning' },
      { value: 'afternoon', text: 'afternoon' },
      { value: 'evening', text: 'evening' },
      { value: 'all', text: 'all' },
    ],
  })
  contact!: string;

  @required()
  @minlength(2)
  @uielement('ngx-decaf-crud-field', {
    label: 'demo.name.label',
    placeholder: 'demo.name.placeholder',
    page: 1
  })
  name!: string;

  @required()
  @email()
  @uielement('ngx-decaf-crud-field', {
    label: 'demo.email.label',
    placeholder: 'demo.email.placeholder',
    page: 1
  })
  email!: string;

  @uichild(CategoryModel.name, 'ngx-decaf-fieldset', {page: 2})
  category!: CategoryModel;

  @required()
  @uielement('ngx-decaf-crud-field', {
    label: 'demo.gender.label',
    type: 'radio',
    page: 3,
    options: [
      { value: 'Male', text: 'male' },
      { value: 'Female', text: 'female' },
    ],
  })
  gender!: string;

  @required()
  @date('yyyy-MM-dd')
  @uielement('ngx-decaf-crud-field', {
    label: 'demo.birthdate.label',
    page: 3
  })
  birthdate!: Date;

  @url()
  @uielement('ngx-decaf-crud-field', {
    label: 'demo.website.label',
    type: 'url',
    page: 3
  })
  website!: string;

  @required()
  @uielement('ngx-decaf-crud-field', {
    label: 'demo.agree.label',
    type: 'checkbox',
    page: 3
  })
  agree!: string;

  // eslint-disable-next-line @typescript-eslint/no-useless-constructor
  constructor(arg?: ModelArg<SteppedForm>) {
    super(arg);
  }
}
