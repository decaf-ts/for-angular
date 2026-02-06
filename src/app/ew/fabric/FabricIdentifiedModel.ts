import { type ModelArg } from '@decaf-ts/decorator-validation';
import { column, createdBy, index, OrderDirection, updatedBy } from '@decaf-ts/core';
import { description, uses } from '@decaf-ts/decoration';
import { FabricBaseModel } from './FabricBaseModel';
import { hideOn, uielement, uiorder } from '@decaf-ts/ui-decorators';
import { OperationKeys } from '@decaf-ts/db-decorators';

//@uses(FabricFlavour)
export class FabricIdentifiedModel extends FabricBaseModel {
  @column()
  @createdBy()
  @index([OrderDirection.ASC, OrderDirection.DSC])
  @description('stores the user who created the record')
  @uielement('ngx-decaf-crud-field', {
    label: 'fabric.createdBy.label',
    readonly: true,
  })
  @hideOn(OperationKeys.CREATE, OperationKeys.UPDATE)
  @uiorder('last')
  createdBy!: string;

  @column()
  @updatedBy()
  @index([OrderDirection.ASC, OrderDirection.DSC])
  @description('stores the user who last updated the record')
  @uielement('ngx-decaf-crud-field', {
    label: 'fabric.updatedBy.label',
    readonly: true,
  })
  @hideOn(OperationKeys.CREATE, OperationKeys.UPDATE)
  @uiorder('last')
  updatedBy!: string;
  constructor(arg?: ModelArg<FabricIdentifiedModel>) {
    super(arg);
  }
}
