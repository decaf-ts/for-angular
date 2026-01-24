import type { Model, ModelArg } from '@decaf-ts/decorator-validation';
import { date, list, minlength, model, pattern, required } from '@decaf-ts/decorator-validation';
import { column, index, OrderDirection, pk, table } from '@decaf-ts/core';
import { BlockOperations, composed, OperationKeys, readonly } from '@decaf-ts/db-decorators';
import { description } from '@decaf-ts/decoration';
import { Cacheable } from '../Cacheable';
import {
  ComponentEventNames,
  DecafComponent,
  hidden,
  HTML5InputTypes,
  uichild,
  uielement,
  uihandlers,
  uilayout,
  uilayoutprop,
  uilistmodel,
  uilistprop,
  uimodel,
  uionclick,
  uionrender,
  uitablecol,
} from '@decaf-ts/ui-decorators';
import { DatePattern, TableNames } from '../constants';
import { audit } from '../utils';
import { Product } from '../Product';
import { DatamatrixModalHandler } from '../handlers/DatamatrixModalHandler';
import { BatchHandler } from '../handlers/BatchHandler';

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
@uihandlers({
  [ComponentEventNames.Render]: BatchHandler,
})
@model()
export class BatchForm extends Cacheable {
  @pk()
  @audit()
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
  // @uitablecol(1, (instance: NgxRepositoryDirective<Model>): string => {
  //   if (instance._query) {
  //     const { inventedName } =
  //       (instance._query as Product[]).find(
  //         (item) => item['productCode'] === (instance.model as Batch).productCode,
  //       ) || {};
  //     if (inventedName) {
  //       return inventedName;
  //     }
  //   }
  //   return '';
  // })
  @uitablecol(1)
  @uionrender(() => BatchHandler)
  nameMedicinalProduct?: string;

  // Only for ui
  @uielement('app-select-field', {
    label: 'batch.inventedName.label',
    placeholder: 'batch.inventedName.placeholder',
    readonly: true,
  })
  @uilayoutprop('half')
  @uitablecol(0)
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
      text: `${item.nameMedicinalProduct} (${item.inventedName})`,
      value: `${item.productCode}`,
    }),
    options: () => Product,
  })
  @uilayoutprop('half')
  @required()
  @uitablecol(2)
  productCode!: string;

  //@cache()
  @column()
  // @readonly()
  @required()
  // @pattern(BatchPattern)
  @index([OrderDirection.ASC, OrderDirection.DSC])
  @uielement('ngx-decaf-crud-field', {
    label: 'batch.batchNumber.label',
    placeholder: 'batch.batchNumber.placeholder',
  })
  @uilayoutprop('half')
  @uitablecol(3)
  batchNumber!: string;

  //@cache()
  @column()
  @uielement('ngx-decaf-crud-field', {
    label: 'batch.packagingSiteName.label',
    placeholder: 'batch.packagingSiteName.placeholder',
  })
  @uilayoutprop('half')
  packagingSiteName?: string;

  //@cache()
  @column()
  @uielement('ngx-decaf-crud-field', {
    label: 'batch.importLicenseNumber.label',
    placeholder: 'batch.importLicenseNumber.placeholder',
  })
  @uilayoutprop('half')
  importLicenseNumber?: string;

  //@cache()
  @required()
  @index([OrderDirection.ASC, OrderDirection.DSC])
  @pattern('^\\d{6}$')
  @uielement('app-expiry-date-field', {
    label: 'batch.expiryDate.label',
    placeholder: 'batch.expiryDate.placeholder',
    type: HTML5InputTypes.TEXT,
  })
  @uilayoutprop('half')
  @uitablecol(4, (instance: DecafComponent<Model>, prop: 'expiryDate', value: string) => {
    // if(instance)
    //   instance.setValue(value);
    return value;
  })
  expiryDate!: string;

  //only for ui (table view)
  @uielement('')
  @hidden()
  @uitablecol(5, async (instance: DecafComponent<Model>, value: string) => {
    return `<span class="ti ti-qrcode"></span> ${await instance.translate('batch.datamatrix.view')} `;
  })
  @uionclick(() => DatamatrixModalHandler)
  dataMatrix!: string;

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
  @uielement('ngx-decaf-crud-field', {
    label: 'batch.manufacturerName.label',
    placeholder: 'batch.manufacturerName.placeholder',
  })
  @uilayoutprop('half')
  manufacturerName?: string;

  //@cache()
  @date(DatePattern)
  @uielement('ngx-decaf-crud-field', {
    label: 'batch.dateOfManufacturing.label',
    placeholder: 'batch.dateOfManufacturing.placeholder',
    type: HTML5InputTypes.DATE,
  })
  @uilayoutprop('half')
  @uitablecol(6)
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
  @description('Manufacturer address line 4.')
  manufacturerAddress4?: string;

  @description('Manufacturer address line 5.')
  manufacturerAddress5?: string;

  //@cache()
  @index([OrderDirection.ASC, OrderDirection.DSC])
  @description('Indicates whether this batch has been recalled.')
  @uielement('ngx-decaf-crud-field', {
    label: 'batch.batchRecall.label',
    placeholder: 'batch.batchRecall.placeholder',
    type: HTML5InputTypes.CHECKBOX,
  })
  @uilayoutprop(1)
  batchRecall: boolean = false;

  // eslint-disable-next-line @typescript-eslint/no-useless-constructor
  constructor(model?: ModelArg<BatchForm>) {
    super(model);
  }
}
