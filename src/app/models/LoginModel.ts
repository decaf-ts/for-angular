import { inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  minlength,
  model,
  Model,
  ModelArg,
  password,
  required
} from '@decaf-ts/decorator-validation';
import {  uielement, uimodel, uihandlers } from '@decaf-ts/ui-decorators';
import { ToastController } from '@ionic/angular';

type Credenciais = { username: string; password: string };


export class LoginHandler {
  async login(credentials: Credenciais): Promise<boolean> {
    const { username, password } = credentials;
    return !!username && !!password;
  }
}

@uimodel('ngx-decaf-crud-form')
@uihandlers({
  login: async (data: Credenciais) => new LoginHandler().login(data)
})
@model()
export class LoginModel extends Model {

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
  // @password()
  @required()
  password!: string;

  constructor(args: ModelArg<LoginModel> = {}) {
    super(args);
  }
}
