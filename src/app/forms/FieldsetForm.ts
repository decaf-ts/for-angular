import { pk } from '@decaf-ts/core';
import { list, Model, model, ModelArg, required } from '@decaf-ts/decorator-validation';
import { uichild, uielement, uilistitem, uimodel } from '@decaf-ts/ui-decorators';

@uilistitem('ngx-decaf-list-item', { icon: 'cafe-outline' })
@uimodel('ngx-decaf-crud-form')
@model()
export class Person extends Model {

  // @pk({type: 'Number' })
  // id!: number;

  @pk({type: 'String'})
  @required()
  @uielement('ngx-decaf-crud-field', {
    label: 'user.name.label'
  })
  name!: string;

  @uielement('ngx-decaf-crud-field', {
    label: 'user.occupation.label'
  })
  occupation!: string;

  constructor(args: ModelArg<Person> = {}) {
    super(args);
  }
}


@uilistitem('ngx-decaf-list-item', { icon: 'cafe-outline' })
@uimodel('ngx-decaf-crud-form')
@model()
export class FieldSetForm extends Model {

  // must keep id to prevent pk error from repository
  // @pk({type: 'Number' })
  // id!: number;

  @list(Person, 'Array')
  @uichild(Person.name, 'ngx-decaf-fieldset', {}, true)
  person!: Person;

  constructor(args: ModelArg<FieldSetForm> = {}) {
    super(args);
  }
}




