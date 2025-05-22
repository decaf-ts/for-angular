import { id } from '@decaf-ts/db-decorators';
import {
  date,
  email,
  minlength,
  model,
  Model,
  ModelArg,
  required,
  url,
  password,
  list,
  maxlength,
} from '@decaf-ts/decorator-validation';
import { uielement, uimodel } from '@decaf-ts/ui-decorators';

@uimodel('ngx-decaf-crud-form')
@model()
export class ForAngularModel extends Model {
  @id()
  @uielement('ngx-decaf-crud-field', {
    label: 'demo.id.label',
    placeholder: 'demo.id.placeholder',
    value: 1
  })
  id!: number;

  @required()
  @minlength(5)
  @uielement('ngx-decaf-crud-field', {
    label: 'demo.name.label',
    placeholder: 'demo.name.placeholder',
  })
  name!: string;

  @required()
  @uielement('ngx-decaf-crud-field', {
    label: 'demo.gender.label',
    type: 'radio',
    options: [
      {value: 'Male', text: 'Is Male' },
      {value: 'Femae', text: 'Is Female' },
    ]
  })
  gender!: string;

  @required()
  @date('yyyy-MM-dd')
  @uielement('ngx-decaf-crud-field', { label: 'demo.birthdate.label' })
  birthdate!: Date;

  @required()
  @email()
  @uielement('ngx-decaf-crud-field', {
    label: 'demo.email.label',
    placeholder: 'demo.email.placeholder',
  })
  email!: string;

  @url()
  @uielement('ngx-decaf-crud-field', { label: 'demo.website.label' })
  website!: string;

  @required()
  @password()
  @uielement('ngx-decaf-crud-field', { label: 'demo.password.label' })
  password!: string;


  @required()
  @uielement('ngx-decaf-crud-field', {
    label: 'demo.agree.label',
    type: 'checkbox'
  })
  agree!: string;

  // @list(OtherModel)
  // @minlength(1)
  // @maxlength(3)
  // @uielement('ngx-decaf-crud-field', {
  //   label: 'demo.id.label',
  //   placeholder: 'demo.id.placeholder',
  // })
  // children: OtherModel[] = [];

  constructor(arg?: ModelArg<ForAngularModel>) {
    super(arg);
  }
}
