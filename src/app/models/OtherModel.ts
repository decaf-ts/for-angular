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
import { ForAngularModel } from './DemoModel';

@uimodel('ngx-decaf-crud-form')
@model()
export class OtherModel extends Model {

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

  constructor(arg?: ModelArg<ForAngularModel>) {
    super(arg);
  }

}
