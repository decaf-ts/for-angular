import {
  Model,
  model,
  ModelArg,
  required
} from '@decaf-ts/decorator-validation';
import { uilistprop, uielement, uilistitem, uimodel } from '@decaf-ts/ui-decorators';
import { OperationKeys, timestamp } from '@decaf-ts/db-decorators';
import { index, pk } from '@decaf-ts/core';
@uilistitem('ngx-decaf-list-item', {icon: 'cafe-outline', className: 'testing'})
@uimodel('ngx-decaf-crud-form')
@model()
export class CategoryModel extends Model {

  @pk({type: 'Number' })
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
  @uilistprop('description')
  @index()
  description!: string;

  @uielement('ngx-decaf-crud-field', {
    label: 'category.created.label',
    placeholder: 'category.created.placeholder',
    type: 'textarea',
  })
  @uilistprop('info')
  @timestamp([OperationKeys.CREATE])
  createdAt!: Date;

  @timestamp()
  updateAt!: Date;

  constructor(args: ModelArg<CategoryModel> = {}) {
    super(args);
  }
}
