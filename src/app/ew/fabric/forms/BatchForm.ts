import { column, index, OrderDirection, table } from '@decaf-ts/core';
import { readonly } from '@decaf-ts/db-decorators';
import { description } from '@decaf-ts/decoration';
import { date, Model, model, ModelArg, required } from '@decaf-ts/decorator-validation';
import {
  DecafComponent,
  hidden,
  HTML5InputTypes,
  uielement,
  uilayout,
  uilayoutprop,
  uilistmodel,
  uionclick,
  uionrender,
  uiorder,
  uitablecol,
} from '@decaf-ts/ui-decorators';
import { Batch } from '../Batch';
import { Product } from '../Product';
import { DatePattern, TableNames } from '../constants';
import { BatchHandler } from '../handlers/BatchHandler';
import { DatamatrixModalHandler } from '../handlers/DatamatrixModalHandler';

//@uses(FabricFlavour)

@table(TableNames.Batch)
@uilistmodel('ngx-decaf-list-item', { icon: 'ti-package' })
@uilayout('ngx-decaf-crud-form', true, 1, { empty: { showButton: false } })
@model()
export class BatchForm extends Batch {
  //only for ui (table view)
  @uielement('')
  @hidden()
  @uitablecol(5, async (instance: DecafComponent<Model>, value: string) => {
    return `<span class="ti ti-qrcode"></span> ${await instance.translate('batch.datamatrix.view')} `;
  })
  @uionclick(() => DatamatrixModalHandler)
  @uiorder(7)
  dataMatrix!: string;
  // @pk()
  // @audit()
  // @composed(['productCode', 'batchNumber'], ':')
  // @description('Unique identifier composed of product code and batch number.')
  // override id!: string;

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
  @uionrender(() => BatchHandler)
  @uiorder(0)
  @uitablecol(1)
  nameMedicinalProduct?: string;

  // Only for ui
  @uielement('app-select-field', {
    label: 'batch.inventedName.label',
    placeholder: 'batch.inventedName.placeholder',
    readonly: true,
  })
  @uilayoutprop('half')
  @uionrender(() => BatchHandler)
  @uitablecol(0)
  @uiorder(1)
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
  @uiorder(2)
  override productCode!: string;

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
  @uiorder(3)
  override batchNumber!: string;

  //@cache()
  @column()
  @uielement('ngx-decaf-crud-field', {
    label: 'batch.packagingSiteName.label',
    placeholder: 'batch.packagingSiteName.placeholder',
  })
  @uilayoutprop('half')
  @uiorder(4)
  override packagingSiteName?: string;

  //@cache()
  @column()
  @uielement('ngx-decaf-crud-field', {
    label: 'batch.importLicenseNumber.label',
    placeholder: 'batch.importLicenseNumber.placeholder',
  })
  @uilayoutprop('half')
  @uiorder(5)
  override importLicenseNumber?: string;

  //@cache()
  @required()
  @index([OrderDirection.ASC, OrderDirection.DSC])
  // @pattern('^\\d{6}$')
  @uielement('app-expiry-date-field', {
    label: 'batch.expiryDate.label',
    placeholder: 'batch.expiryDate.placeholder',
    type: HTML5InputTypes.TEXT,
  })
  @uilayoutprop('half')
  @uitablecol(4, (instance: DecafComponent<Model>, prop: 'expiryDate', value: string) => {
    return value;
  })
  @uiorder(6)
  override expiryDate!: Date;

  // Only for ui
  @uielement('app-expiry-date-field', {
    label: 'batch.dayselection.label',
    placeholder: 'batch.dayselection.placeholder',
    type: HTML5InputTypes.CHECKBOX,
  })
  @uilayoutprop('half')
  @uiorder(8)
  enableDaySelection: boolean = true;

  //@cache()
  @column()
  @index([OrderDirection.ASC, OrderDirection.DSC])
  @uielement('ngx-decaf-crud-field', {
    label: 'batch.manufacturerName.label',
    placeholder: 'batch.manufacturerName.placeholder',
  })
  @uilayoutprop('half')
  @uiorder(9)
  override manufacturerName?: string;

  //@cache()
  @date(DatePattern)
  @uielement('ngx-decaf-crud-field', {
    label: 'batch.dateOfManufacturing.label',
    placeholder: 'batch.dateOfManufacturing.placeholder',
    type: HTML5InputTypes.DATE,
  })
  @uilayoutprop('half')
  @uitablecol(6)
  @uiorder(10)
  override dateOfManufacturing?: Date;

  // Only for ui
  // @uilayoutprop(1)
  // @uichild(
  //   ManufacturerAddress.name,
  //   'ngx-decaf-fieldset',
  //   {
  //     title: 'batch.manufacturerAddress.label',
  //     max: 5,
  //     required: false,
  //     collapsable: false,
  //     borders: true,
  //     order: 11,
  //   },
  //   true,
  // )
  // override manufacturerAddress!: ManufacturerAddress;

  //@cache()
  @index([OrderDirection.ASC, OrderDirection.DSC])
  @description('Indicates whether this batch has been recalled.')
  @uielement('ngx-decaf-crud-field', {
    label: 'batch.batchRecall.label',
    placeholder: 'batch.batchRecall.placeholder',
    type: HTML5InputTypes.CHECKBOX,
  })
  @uilayoutprop(1)
  @uiorder(12)
  override batchRecall: boolean = false;

  // eslint-disable-next-line @typescript-eslint/no-useless-constructor
  constructor(model?: ModelArg<BatchForm>) {
    super(model);
  }
}
