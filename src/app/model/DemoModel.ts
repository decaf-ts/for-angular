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
} from '@decaf-ts/decorator-validation';
import { uielement, uimodel } from '@decaf-ts/ui-decorators';

@uimodel('decaf-crud-form')
@model()
export class ForAngularModel extends Model {
  @id()
  @uielement('decaf-crud-field')
  id!: number;
  //
  // @required()
  // @minlength(5)
  // @uielement('decaf-crud-field')
  // name!: string;
  //
  // @date('yyyy/MM/dd')
  // @required()
  // @uielement('decaf-crud-field')
  // birthdate!: Date;
  //
  // @required()
  // @email()
  // @uielement('decaf-crud-field')
  // email!: string;
  //
  // @url()
  // @uielement('decaf-crud-field')
  // website!: string;
  //
  // @required()
  // @uielement('decaf-crud-field', { type: 'password' })
  // password!: string;

  constructor(arg?: ModelArg<ForAngularModel>) {
    super(arg);
  }
}
