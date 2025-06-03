import {
  model,
  ModelArg,
  prop,
  required
} from '@decaf-ts/decorator-validation';
import { uilistprop, uielement, uilistitem, uimodel, uiprop } from '@decaf-ts/ui-decorators';
import { FakerRepository } from '../utils/FakerRepository';
import { EmployeeModel } from './EmployeeModel';

@uilistitem('ngx-decaf-list-item', {icon: 'cafe-outline', className: 'testing'})
@uimodel('ngx-decaf-crud-form')
@model()
export class CategoryModel extends FakerRepository<CategoryModel> {

  @required()
  @uielement('ngx-decaf-crud-field', {
    label: 'category.name.label',
    placeholder: 'category.name.placeholder',
  })
  @uilistprop('title')
  name!: string;

  @required()
  @uielement('ngx-decaf-crud-field', {
    label: 'category.description.label',
    placeholder: 'category.description.placeholder',
    type: 'textarea',
  })
  @uilistprop()
  description!: string;

  constructor(args: ModelArg<CategoryModel> = {}) {
    super('categories', args);
  }
}
