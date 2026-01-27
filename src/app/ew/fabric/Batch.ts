import type { Model, ModelArg } from '@decaf-ts/decorator-validation';
import { date, list, minlength, model, pattern, required } from '@decaf-ts/decorator-validation';
import { column, index, OrderDirection, pk, table } from '@decaf-ts/core';
// import { gtin } from "@pharmaledgerassoc/ptp-toolkit/shared";
// import { BatchPattern, DatePattern, TableNames } from "@pharmaledgerassoc/ptp-toolkit/shared";
import {
  BlockOperations,
  composed,
  OperationKeys,
  readonly,
  serialize,
} from '@decaf-ts/db-decorators';
import { description } from '@decaf-ts/decoration';
//  import { audit } from "@pharmaledgerassoc/ptp-toolkit/shared";
import { Cacheable } from './Cacheable';
// import { cache } from "@pharmaledgerassoc/ptp-toolkit/shared";
import {
  DecafComponent,
  hidden,
  HTML5InputTypes,
  uichild,
  uielement,
  uilayout,
  uilayoutprop,
  uilistmodel,
  uilistprop,
  uimodel,
  uionclick,
  uiorder,
  uitablecol,
} from '@decaf-ts/ui-decorators';
import { Product } from './Product';
import { DatePattern, BatchPattern, TableNames } from './constants';
import { audit } from './utils';
import { DatamatrixModalHandler } from './handlers/DatamatrixModalHandler';

@uimodel('ngx-decaf-fieldset')
@model()
class ManufacturerAddress {
  @uielement('ngx-decaf-crud-field', {
    label: 'batch.manufacturerAddress.label',
    placeholder: 'batch.manufacturerAddress.placeholder',
  })
  @uilistprop('title')
  @minlength(2)
  address?: string;
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
  @date(DatePattern)
  @column()
  @uielement('app-expiry-date-field', {
    label: 'batch.expiryDate.label',
    placeholder: 'batch.expiryDate.placeholder',
    type: HTML5InputTypes.TEXT,
  })
  @uilayoutprop('half')
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  @uitablecol(3, (value: string, instance?: DecafComponent<any>) => {
    // if(instance)
    //   instance.setValue(value);
    return value;
  })
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
  @description('Import license number for this batch.')
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
  @uitablecol(4)
  @description('Date when the batch was manufactured.')
  dateOfManufacturing?: Date;

  // @cache()
  @column()
  @uielement('ngx-decaf-crud-field', {
    label: 'batch.manufacturerName.label',
    placeholder: 'batch.manufacturerName.placeholder',
  })
  @uilayoutprop('half')
  @index([OrderDirection.ASC, OrderDirection.DSC])
  @description('Name of the product manufacturer.')
  manufacturerName?: string;

  // @cache()
  @column()
  @description('Manufacturer address')
  @uilayoutprop(1)
  @uichild(
    'ManufacturerAddress',
    'ngx-decaf-fieldset',
    {
      title: 'batch.manufacturerAddress.label',
      max: 5,
      name: 'ManufacturerAddress',
      collapsable: false,
      borders: true,
      order: 11,
    },
    true,
  )
  @uitablecol(5)
  @serialize()
  @uiorder(14)
  manufacturerAddress?: ManufacturerAddress;

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
  @column()
  @uielement('ngx-decaf-crud-field', {
    label: 'batch.packagingSiteName.label',
    placeholder: 'batch.packagingSiteName.placeholder',
  })
  @uilayoutprop('half')
  @description('Name of the site where the product was packaged.')
  packagingSiteName?: string;

  // eslint-disable-next-line @typescript-eslint/no-useless-constructor
  constructor(model?: ModelArg<Batch>) {
    super(model);
  }
}
