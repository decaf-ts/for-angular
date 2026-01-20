import type { Model, ModelArg } from '@decaf-ts/decorator-validation';
import { date, list, minlength, model, pattern, required } from '@decaf-ts/decorator-validation';
import { column, index, OrderDirection, pk, table } from '@decaf-ts/core';
// import { gtin } from "@pharmaledgerassoc/ptp-toolkit/shared";
// import { BatchPattern, DatePattern, TableNames } from "@pharmaledgerassoc/ptp-toolkit/shared";
import { BlockOperations, composed, OperationKeys, readonly } from '@decaf-ts/db-decorators';
import { description, uses } from '@decaf-ts/decoration';
//  import { audit } from "@pharmaledgerassoc/ptp-toolkit/shared";
import { Cacheable } from './Cacheable';
// import { cache } from "@pharmaledgerassoc/ptp-toolkit/shared";
import {
  DecafComponent,
  HTML5InputTypes,
  uichild,
  uielement,
  uilayout,
  uilayoutprop,
  uilistmodel,
  uilistprop,
  uimodel,
  uitablecol,
} from '@decaf-ts/ui-decorators';
import { Product } from './Product';
import { DatePattern, TableNames } from './constants';
import { audit } from './utils';

@uimodel('ngx-decaf-fieldset')
@model()
class ManufacturerAddress {
  @uielement('ngx-decaf-crud-field', {
    label: 'batch.manufacturerAddress.label',
    placeholder: 'batch.manufacturerAddress.placeholder',
  })
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
  //@audit()
  @composed(['productCode', 'batchNumber'], ':')
  @description('Unique identifier composed of product code and batch number.')
  id!: string;

  // Only for ui
  @uielement('app-select-field', {
    label: 'batch.nameMedicinalProduct.label',
    placeholder: 'batch.nameMedicinalProduct.placeholder',
    readonly: true,
  })
  @uilayoutprop('half')
  @uitablecol(2)
  nameMedicinalProduct?: string;

  // Only for ui
  @uielement('app-select-field', {
    label: 'batch.inventedName.label',
    placeholder: 'batch.inventedName.placeholder',
    readonly: true,
  })
  @uilayoutprop('half')
  inventedName?: string;

  //@gtin()
  @readonly()
  // @manyToOne(
  //   () => Product,
  //   { update: Cascade.NONE, delete: Cascade.NONE },
  //   false
  // )
  @index([OrderDirection.ASC, OrderDirection.DSC])
  @description('Code of the product associated with this batch.')
  @uielement('app-select-field', {
    label: 'batch.productcode.label',
    placeholder: 'batch.productcode.placeholder',
    type: HTML5InputTypes.SELECT,
    translatable: false,
    optionsMapper: (item: Product) => ({
      text: `${item.inventedName}`,
      value: `${item.productCode}`,
    }),
    options: () => Product,
  })
  @uilayoutprop('half')
  @required()
  productCode!: string;

  //@cache()
  @column()
  // @readonly()
  @required()
  // @pattern(BatchPattern)
  @index([OrderDirection.ASC, OrderDirection.DSC])
  @description('Batch number assigned to the product.')
  @uielement('ngx-decaf-crud-field', {
    label: 'batch.batchNumber.label',
    placeholder: 'batch.batchNumber.placeholder',
  })
  @uilayoutprop('half')
  @uitablecol(1)
  @uilistprop('uid')
  batchNumber!: string;

  //@cache()
  @column()
  @description('Name of the site where the product was packaged.')
  @uielement('ngx-decaf-crud-field', {
    label: 'batch.packagingSiteName.label',
    placeholder: 'batch.packagingSiteName.placeholder',
  })
  @uilayoutprop('half')
  packagingSiteName?: string;

  //@cache()
  @column()
  @description('Import license number for this batch.')
  @uielement('ngx-decaf-crud-field', {
    label: 'batch.importLicenseNumber.label',
    placeholder: 'batch.importLicenseNumber.placeholder',
  })
  @uilayoutprop('half')
  importLicenseNumber?: string;

  //@cache()
  @required()
  // @date(DatePattern) // ver com tiago, não é uma data
  @column()
  @index([OrderDirection.ASC, OrderDirection.DSC])
  @description('Date when the batch expires.')
  @pattern('^\\d{6}$')
  @uielement('app-expiry-date-field', {
    label: 'batch.expiryDate.label',
    placeholder: 'batch.expiryDate.placeholder',
    type: HTML5InputTypes.TEXT,
  })
  @uilayoutprop('half')
  @uitablecol(3, (value: string, instance?: DecafComponent<Model>) => {
    // if(instance)
    //   instance.setValue(value);
    return value;
  })
  expiryDate!: string;

  // Only for ui
  @uielement('app-expiry-date-field', {
    label: 'batch.dayselection.label',
    placeholder: 'batch.dayselection.placeholder',
    type: HTML5InputTypes.CHECKBOX,
  })
  @uilayoutprop('half')
  enableDaySelection: boolean = true;

  //@cache()
  @column()
  @index([OrderDirection.ASC, OrderDirection.DSC])
  @description('Name of the product manufacturer.')
  @uielement('ngx-decaf-crud-field', {
    label: 'batch.manufacturerName.label',
    placeholder: 'batch.manufacturerName.placeholder',
  })
  @uilayoutprop('half')
  manufacturerName?: string;

  //@cache()
  @column()
  @date(DatePattern)
  @description('Date when the batch was manufactured.')
  @uielement('ngx-decaf-crud-field', {
    label: 'batch.dateOfManufacturing.label',
    placeholder: 'batch.dateOfManufacturing.placeholder',
    type: HTML5InputTypes.DATE,
  })
  @uilayoutprop('half')
  @uitablecol(4)
  dateOfManufacturing?: Date;

  // Only for ui
  @list(ManufacturerAddress, 'Array')
  @uilayoutprop(1)
  @uichild(
    ManufacturerAddress.name,
    'ngx-decaf-fieldset',
    {
      title: 'batch.manufacturerAddress.label',
      max: 5,
      required: false,
      collapsable: false,
      borders: true,
    },
    true,
  )
  @uitablecol(5)
  manufacturerAddress!: ManufacturerAddress;

  //@cache()
  @column()
  @description('Manufacturer address line 1.')
  manufacturerAddress1?: string;

  //@cache()
  @column()
  @description('Manufacturer address line 2.')
  manufacturerAddress2?: string;

  //@cache()
  @column()
  @description('Manufacturer address line 3.')
  manufacturerAddress3?: string;

  //@cache()
  @column()
  @description('Manufacturer address line 4.')
  manufacturerAddress4?: string;

  //@cache()
  @column()
  @description('Manufacturer address line 5.')
  manufacturerAddress5?: string;

  //@cache()
  @column()
  @index([OrderDirection.ASC, OrderDirection.DSC])
  @description('Indicates whether this batch has been recalled.')
  @uielement('ngx-decaf-crud-field', {
    label: 'batch.batchRecall.label',
    placeholder: 'batch.batchRecall.placeholder',
    type: HTML5InputTypes.CHECKBOX,
  })
  @uilayoutprop(1)
  batchRecall: boolean = false;

  //
  // @column()
  // @description("Version of the electronic product information leaflet.")
  // epiLeafletVersion?: number;
  //
  // @column()
  // @description("Enables expiry date verification feature.")
  // flagEnableEXPVerification: boolean = false;
  //
  // @column()
  // @description("Allows checking for expired batches.")
  // flagEnableExpiredEXPCheck: boolean = false;
  //
  // @column()
  // @description("Custom message displayed for this batch.")
  // batchMessage?: string;
  //
  // @column()
  // @description("Enables display of recall messages for this batch.")
  // flagEnableBatchRecallMessage: boolean = false;
  //
  // @column()
  // @description("Message shown when the batch is recalled.")
  // recallMessage?: string;
  //
  // @column()
  // @description("Enables ACF batch verification feature.")
  // flagEnableACFBatchCheck: boolean = false;
  //
  // @column()
  // @description("URL for ACF batch verification.")
  // acfBatchCheckURL?: string;
  //
  // @column()
  // @description("Enables serial number (SN) verification feature.")
  // flagEnableSNVerification: boolean = false;
  //
  // /** ACDC PATCH */
  // @column()
  // @description("Identifier of the ACDC authentication feature (SSI).")
  // acdcAuthFeatureSSI?: string;
  //
  // @column()
  // @description("Indicates if serial number validation was reset.")
  // snValidReset: boolean = false;

  // TODO -> Uncomment and fix
  // @column({ type: "text", array: true })
  // @list(String)
  // @description("List of valid serial numbers for the batch.")
  // snValid?: string[];

  // eslint-disable-next-line @typescript-eslint/no-useless-constructor
  constructor(model?: ModelArg<Batch>) {
    super(model);
  }
}
