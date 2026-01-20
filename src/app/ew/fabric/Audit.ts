import { model, type ModelArg, Primitives, required, type } from '@decaf-ts/decorator-validation';
import { column, createdBy, index, OrderDirection, pk, table } from '@decaf-ts/core';
import {
  BlockOperations,
  composed,
  OperationKeys,
  readonly,
  serialize,
} from '@decaf-ts/db-decorators';
import { description, uses } from '@decaf-ts/decoration';
import { FabricBaseModel } from './FabricBaseModel';
import {
  DecafComponent,
  uielement,
  UIFunctionLike,
  uilayout,
  uilistmodel,
  uiprop,
  uitablecol,
} from '@decaf-ts/ui-decorators';
import { DecafComponentConstructor, NgxComponentDirective } from 'src/lib/engine';
import { AuditOperations, TableNames, UserGroup } from './constants';

@description('Logs user activity for auditing purposes.')
@BlockOperations([OperationKeys.CREATE, OperationKeys.UPDATE, OperationKeys.DELETE])
@table(TableNames.Audit)
@uilistmodel('ngx-decaf-list-item', { icon: 'ti-shield-plus' })
@uilayout('ngx-decaf-crud-form', true, 1, { empty: { showButton: false } })
@model()
export class Audit extends FabricBaseModel {
  @pk({ type: String, generated: false })
  @composed(['transaction', 'action', 'diffs'], ':', false, true)
  @description('Unique identifier of the audit record.')
  id!: string;

  @column()
  @createdBy()
  @index([OrderDirection.ASC, OrderDirection.DSC])
  @description('Identifier of the user who performed the action.')
  @uielement('', { label: 'audit.userId' })
  @uitablecol(0)
  userId!: string;

  @column()
  @required()
  @readonly()
  @index([OrderDirection.ASC, OrderDirection.DSC])
  @type(String)
  @description('Group or role of the user who performed the action.')
  @uielement('', { label: 'audit.userGroup' })
  @uitablecol(1)
  userGroup!: UserGroup;

  @column()
  @required()
  @readonly()
  @description('the transaction the audit record was created in')
  @uielement('', { label: 'audit.transaction' })
  @uitablecol(2)
  transaction!: string;

  @column()
  @required()
  @readonly()
  @type(String)
  @index([OrderDirection.ASC, OrderDirection.DSC])
  @description('Type of action performed by the user.')
  @uielement('', { label: 'audit.action' })
  @uitablecol(3)
  action!: AuditOperations;

  @column()
  @readonly()
  @serialize()
  @description('the diffs for the action.')
  @uielement('', { label: 'audit.diffs' })
  @uitablecol(
    4,
    async (
      value: string | object,
      instance: DecafComponentConstructor & { translate: UIFunctionLike },
    ) => {
      if (typeof value === 'object') value = JSON.stringify(value);
      return value.length ? await instance.translate('audit.view_diffs') : '';
    },
  )
  diffs?: Record<string, any>;

  // eslint-disable-next-line @typescript-eslint/no-useless-constructor
  constructor(model?: ModelArg<Audit>) {
    super(model);
  }
}
