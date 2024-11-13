import { id } from '@decaf-ts/db-decorators';
import {
  date,
  minlength,
  model,
  Model,
  ModelArg,
  required,
} from '@decaf-ts/decorator-validation';
import { uielement, uimodel } from '@decaf-ts/ui-decorators';

@uimodel()
@model()
export class ForAngularModel extends Model {
  @id()
  @uielement('ngx-crud-form-field')
  id!: number;

  @required()
  @minlength(5)
  @uielement('ngx-crud-form-field')
  name!: string;

  @date('yyyy/MM/dd')
  @required()
  @uielement('ngx-crud-form-field')
  birthdate!: Date;

  constructor(arg?: ModelArg<ForAngularModel>) {
    super(arg);
  }
}
