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

@uimodel('ngx-decaf-crud-form', {'test': 'asdf'})
@model()
export class ForAngularModel extends Model {
  @id()
  @uielement('ngx-decaf-crud-field', {
    label: 'demo.id.label',
    placeholder: 'demo.id.placeholder',
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
  @minlength(5)
  @maxlength(6)
  @uielement('ngx-decaf-crud-field', {
    label: 'demo.slug.label',
    placeholder: 'demo.slug.placeholder',
  })
  slug!: string;

  @date('yyyy/MM/dd')
  @required()
  @uielement('ngx-decaf-crud-field', { label: 'demo.birthdate.label', format: 'YYYY-MM-DD' })
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
