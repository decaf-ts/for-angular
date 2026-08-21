import {
  model,
  Model,
  ModelArg,
  required,
} from '@decaf-ts/decorator-validation';
import { uielement, uipageprop, uisteppedmodel } from '@decaf-ts/ui-decorators';

/**
 * @module app/models/user-data-form
 * @summary Stepped form model behind the `user-data` request modal.
 * @description Rendered through `ngx-decaf-model-renderer` so the library
 * engine wires the page FormGroups and per-field FormControls automatically.
 */
@uisteppedmodel(
  'ngx-decaf-stepped-form',
  [
    { title: 'user-request.step1.title', description: 'user-request.step1.description' },
    { title: 'user-request.step2.title', description: 'user-request.step2.description' },
  ],
  true,
)
@model()
export class UserDataForm extends Model {
  @required()
  @uielement('ngx-decaf-crud-field', {
    label: 'user-request.name.label',
    placeholder: 'user-request.name.placeholder',
  })
  @uipageprop(1)
  name!: string;

  @required()
  @uielement('ngx-decaf-crud-field', {
    label: 'user-request.email.label',
    placeholder: 'user-request.email.placeholder',
  })
  @uipageprop(2)
  email!: string;

  // eslint-disable-next-line @typescript-eslint/no-useless-constructor
  constructor(arg?: ModelArg<UserDataForm>) {
    super(arg);
  }
}
