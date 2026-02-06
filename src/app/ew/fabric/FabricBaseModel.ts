import { Model, type ModelArg } from '@decaf-ts/decorator-validation';
import {
  column,
  createdAt,
  createdBy,
  index,
  OrderDirection,
  updatedAt,
  updatedBy,
} from '@decaf-ts/core';
import { description, uses } from '@decaf-ts/decoration';
import { hideOn, uielement, uiorder } from '@decaf-ts/ui-decorators';
import { OperationKeys, version } from '@decaf-ts/db-decorators';

//@uses(FabricFlavour)
export class FabricBaseModel extends Model {
  @column()
  @createdAt()
  @index([OrderDirection.ASC, OrderDirection.DSC])
  @description('stores the date of creation')
  @uielement('ngx-decaf-crud-field', {
    label: 'fabric.createdAt.label',
    readonly: true,
  })
  @hideOn(OperationKeys.CREATE, OperationKeys.UPDATE)
  @uiorder('last')
  createdAt!: Date;

  @column()
  @updatedAt()
  @index([OrderDirection.ASC, OrderDirection.DSC])
  @description('stores the date of last update')
  @uielement('ngx-decaf-crud-field', {
    label: 'fabric.updatedAt.label',
    readonly: true,
  })
  @hideOn(OperationKeys.CREATE, OperationKeys.UPDATE)
  @uiorder('last')
  updatedAt!: Date;

  @column()
  @version()
  @description('stores the version number')
  @uielement('ngx-decaf-crud-field', {
    label: 'fabric.version.label',
    readonly: true,
  })
  @hideOn(OperationKeys.CREATE, OperationKeys.UPDATE)
  @uiorder('last')
  version!: number;

  constructor(arg?: ModelArg<FabricBaseModel>) {
    super(arg);
  }
}
