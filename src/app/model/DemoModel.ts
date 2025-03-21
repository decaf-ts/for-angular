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
} from '@decaf-ts/decorator-validation';
import { uielement, uimodel } from '@decaf-ts/ui-decorators';

@uimodel('decaf-crud-form')
@model()
export class ForAngularModel extends Model {
  @id()
  @uielement('decaf-crud-field', {
    label: 'demo.id.label',
    placeholder: 'demo.id.placeholder',
  })
  id!: number;

  @required()
  @minlength(5)
  @uielement('decaf-crud-field', {
    label: 'demo.name.label',
    placeholder: 'demo.name.placeholder',
  })
  name!: string;
  //
  // @date('yyyy/MM/dd')
  // @required()
  // @uielement('decaf-crud-field', { label: 'demo.birthdate.label' })
  // birthdate!: Date;

  @required()
  @email()
  @uielement('decaf-crud-field', {
    label: 'demo.email.label',
    placeholder: 'demo.email.placeholder',
  })
  email!: string;

  @url()
  @uielement('decaf-crud-field', { label: 'demo.website.label' })
  website!: string;

  @required()
  @password()
  @uielement('decaf-crud-field', { label: 'demo.password.label' })
  password!: string;

  constructor(arg?: ModelArg<ForAngularModel>) {
    super(arg);
  }
}
