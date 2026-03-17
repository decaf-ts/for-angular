import { column, index, OrderDirection, pk, table } from '@decaf-ts/core';
import type { ModelArg } from '@decaf-ts/decorator-validation';
import { date, minlength, Model, model, required } from '@decaf-ts/decorator-validation';
// import { gtin } from "@pharmaledgerassoc/ptp-toolkit/shared";
// import { BatchPattern, DatePattern, TableNames } from "@pharmaledgerassoc/ptp-toolkit/shared";
import { BlockOperations, composed, OperationKeys, readonly, serialize } from '@decaf-ts/db-decorators';
import { description } from '@decaf-ts/decoration';
//  import { audit } from "@pharmaledgerassoc/ptp-toolkit/shared";
import { Cacheable } from './Cacheable';
// import { cache } from "@pharmaledgerassoc/ptp-toolkit/shared";
import {
  HTML5InputTypes,
  uielement,
  uilayout,
  uilayoutprop,
  uilistmodel,
  uilistprop,
  uimodel,
  uiorder,
  uitablecol,
} from '@decaf-ts/ui-decorators';
import { DatePattern, TableNames } from './constants';
import { audit } from './utils';

@uimodel('ngx-decaf-crud-form', { multiple: true })
@model()
export class ManufacturerAddress extends Model {
  @uielement('ngx-decaf-crud-field', {
    label: 'batch.manufacturerAddress.label',
    placeholder: 'batch.manufacturerAddress.placeholder',
  })
  @uilistprop('title')
  @minlength(2)
  address?: string;

  constructor(args?: ModelArg<ManufacturerAddress>) {
    super(args);
  }
}

//@uses(FabricFlavour)
@description('Represents a product batch')
@BlockOperations([OperationKeys.DELETE])
@table(TableNames.Batch)
@uilistmodel('ngx-decaf-list-item', { icon: 'ti-package' })
@uilayout('ngx-decaf-crud-form', true, 1, { empty: { showButton: false } })
@model()
export class Batch extends Cacheable {
  @pk()
  @audit()
  @composed(['productCode', 'batchNumber'], ':')
  @description('Unique identifier composed of product code and batch number.')
  id!: string;

  // @gtin()
  @readonly()
  // @manyToOne(
  //   () => Product,
  //   { update: Cascade.NONE, delete: Cascade.NONE },
  //   false
  // )
  @index([OrderDirection.ASC, OrderDirection.DSC])
  @description('Code of the product associated with this batch.')
  productCode!: string;

  // @cache()
  @column()
  @readonly()
  // @pattern(BatchPattern)
  @index([OrderDirection.ASC, OrderDirection.DSC])
  @description('Batch number assigned to the product.')
  batchNumber!: string;

  // @cache()
  @required()
  @date('yyyy-MM-dd HH:mm:ss')
  @index([OrderDirection.ASC, OrderDirection.DSC])
  @description('Date when the batch expires.')
  expiryDate!: Date;

  // @cache()
  @column()
  @uielement('ngx-decaf-crud-field', {
    label: 'batch.importLicenseNumber.label',
    placeholder: 'batch.importLicenseNumber.placeholder',
  })
  @uilayoutprop('half')
  @uiorder(5)
  importLicenseNumber?: string;

  // @cache()
  @column()
  @date(DatePattern)
  @uielement('ngx-decaf-crud-field', {
    label: 'batch.dateOfManufacturing.label',
    placeholder: 'batch.dateOfManufacturing.placeholder',
    type: HTML5InputTypes.DATE,
  })
  @uilayoutprop('half')
  @uiorder(10)
  @uitablecol(7)
  dateOfManufacturing?: Date;

  // @cache()
  @column()
  @description('Name of the product manufacturer.')
  @uielement('ngx-decaf-crud-field', {
    label: 'batch.manufacturerName.label',
    placeholder: 'batch.manufacturerName.placeholder',
  })
  @uilayoutprop('half')
  @uiorder(9)
  manufacturerName?: string;

  // @cache()
  @column()
  @description('Manufacturer address')
  @serialize()
  manufacturerAddress?: ManufacturerAddress[];

  @column()
  @uielement('ngx-decaf-crud-field', {
    label: 'batch.packagingSiteName.label',
    placeholder: 'batch.packagingSiteName.placeholder',
  })
  @uilayoutprop('half')
  @uiorder(5)
  packagingSiteName?: string;

  // @cache()
  @column()
  @uielement('ngx-decaf-crud-field', {
    label: 'batch.batchRecall.label',
    placeholder: 'batch.batchRecall.placeholder',
    type: HTML5InputTypes.CHECKBOX,
  })
  @uilayoutprop(1)
  @index([OrderDirection.ASC, OrderDirection.DSC])
  @description('Indicates whether this batch has been recalled.')
  batchRecall: boolean = false;

  // @cache()

  // eslint-disable-next-line @typescript-eslint/no-useless-constructor
  constructor(model?: ModelArg<Batch>) {
    super(model);
  }
}
