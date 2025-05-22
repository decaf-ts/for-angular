import {
  model,
  ModelArg,
  required
} from '@decaf-ts/decorator-validation';
import { uilistprop, uielement, uilistitem, uimodel } from '@decaf-ts/ui-decorators';
import { FakerRepository } from '../utils/FakerRepository';

@uilistitem('ngx-decaf-list-item', {icon: 'cafe-outline', className: 'testing'})
@uimodel('ngx-decaf-crud-form')
@model()
export class CategoryModel extends FakerRepository<CategoryModel> {

  @required()
  @uielement('ngx-decaf-crud-field', {
    label: 'demo.name.label',
    placeholder: 'demo.name.placeholder',
  })
  @uilistprop('title')
  name!: string;

  @required()
  @uielement('ngx-decaf-crud-field', {
    label: 'demo.description.label',
    placeholder: 'demo.description.placeholder',
    type: 'textarea',
  })
  @uilistprop()
  description!: string;

  constructor(args: ModelArg<CategoryModel> = {}) {
    super('categories', args);
  }
}
