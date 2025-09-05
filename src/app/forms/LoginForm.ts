import {
  minlength,
  model,
  Model,
  ModelArg,
  password,
  required
} from '@decaf-ts/decorator-validation';
import { uielement, uimodel, uihandlers } from '@decaf-ts/ui-decorators';
import { LoginHandler } from '../utils/handlers';


@uimodel('ngx-decaf-crud-form')
@uihandlers({
  login: LoginHandler
})
@model()
export class LoginForm extends Model {

  @required()
  @minlength(4)
  @uielement('ngx-decaf-crud-field', {
    label: 'login.username.label',
    placeholder: 'login.username.placeholder',
  })
  username!: string;

  @uielement('ngx-decaf-crud-field', {
    label: 'login.password.label',
    placeholder: 'login.password.placeholder',
    type: 'textarea',
  })
  @password()
  @required()
  password!: string;

  constructor(args: ModelArg<LoginForm> = {}) {
    super(args);
  }
}
