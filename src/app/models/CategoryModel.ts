import {
  Model,
  model,
  ModelArg,
  required
} from '@decaf-ts/decorator-validation';
import { uilistprop, uielement, uilistitem, uimodel, uiprop } from '@decaf-ts/ui-decorators';
import { ForAngularRepository } from '../utils/ForAngularRepository';
import { id } from '@decaf-ts/db-decorators';
import { pk } from '@decaf-ts/core';
@uilistitem('ngx-decaf-list-item', {icon: 'cafe-outline', className: 'testing'})
@uimodel('ngx-decaf-crud-form')
@model()
export class CategoryModel extends Model {

  @pk()
  @id()
  id!: number;

  @required()
  @uielement('ngx-decaf-crud-field', {
    label: 'category.name.label',
    placeholder: 'category.name.placeholder',
  })
  @uilistprop('title')
  name!: string;

  @uielement('ngx-decaf-crud-field', {
    label: 'category.description.label',
    placeholder: 'category.description.placeholder',
    type: 'textarea',
  })
  @uilistprop()
  description!: string;

  constructor(args: ModelArg<CategoryModel> = {}) {
    super(args);
  }
}
