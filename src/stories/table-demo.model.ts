import { pk } from '@decaf-ts/core';
import { OperationKeys, readonly, timestamp } from '@decaf-ts/db-decorators';
import {
  Model,
  model,
  ModelArg,
  required,
} from '@decaf-ts/decorator-validation';
import {
  hideOn,
  HTML5InputTypes,
  uielement,
  uilistmodel,
  uimodel,
  uitablecol,
} from '@decaf-ts/ui-decorators';

@uilistmodel('ngx-decaf-list-item', { icon: 'ti-cup' })
@uimodel('ngx-decaf-crud-form')
@model()
export class TableDemoModel extends Model {
  @pk({ type: Number })
  @hideOn(OperationKeys.CREATE)
  @uitablecol(0)
  @readonly()
  @uielement('ngx-decaf-crud-field', {
    label: 'category.id.label',
    placeholder: 'category.id.placeholder',
  })
  id!: number;

  @uitablecol(1)
  @required()
  @uielement('ngx-decaf-crud-field', {
    label: 'category.name.label',
    placeholder: 'category.name.placeholder',
  })
  name!: string;

  @uitablecol(2)
  @uielement('ngx-decaf-crud-field', {
    label: 'category.description.label',
    placeholder: 'category.description.placeholder',
    type: HTML5InputTypes.TEXTAREA,
  })
  description!: string;

  @uitablecol(3)
  @timestamp([OperationKeys.CREATE])
  @hideOn(OperationKeys.CREATE)
  @uielement('ngx-decaf-crud-field', {
    label: 'category.created.label',
    placeholder: 'category.created.placeholder',
  })
  createdAt!: Date;

  constructor(args: ModelArg<TableDemoModel> = {}) {
    super(args);
  }
}
