import {
  Model,
  model,
  ModelArg,
  required
} from '@decaf-ts/decorator-validation';
import { uilistprop, uielement, uilistmodel, uimodel, hideOn, uilayoutprop } from '@decaf-ts/ui-decorators';
import { OperationKeys, timestamp } from '@decaf-ts/db-decorators';
import { index, pk } from '@decaf-ts/core';
@uilistmodel('ngx-decaf-list-item', {icon: 'cafe-outline', className: 'testing'})
@uimodel('ngx-decaf-crud-form')
@model()
export class CategoryModel extends Model {

  @pk({type: Number.name })
  @uilistprop('uid')
  id!: number;

  @required()
  @uielement('ngx-decaf-crud-field', {
    label: 'category.name.label',
    placeholder: 'category.name.placeholder',
  })
  @uilistprop('title')
  @uilayoutprop(1,2)
  name!: string;

  @uielement('ngx-decaf-crud-field', {
    label: 'category.description.label',
    placeholder: 'category.description.placeholder',
    type: 'textarea',
  })
  @uilistprop('description')
  @index()
  @uilayoutprop(1,2)
  description!: string;

  @uielement('ngx-decaf-crud-field', {
    label: 'category.created.label',
    placeholder: 'category.created.placeholder',
    type: 'textarea',
  })
  @uilistprop('info')
  @timestamp([OperationKeys.CREATE])
  @hideOn(OperationKeys.CREATE)
  createdAt!: Date;


  constructor(args: ModelArg<CategoryModel> = {}) {
    super(args);
  }
}
