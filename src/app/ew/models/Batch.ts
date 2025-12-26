import {
  date,
  list,
  minlength,
  model,
  Model,
  ModelArg,
  pattern,
  required,
} from "@decaf-ts/decorator-validation";
import { pk } from "@decaf-ts/core";
import {  HTML5InputTypes, uichild, uielement, uilayout, uilayoutprop,  uilistmodel,  uilistprop, uimodel } from "@decaf-ts/ui-decorators";
import { Product } from "./Product";
import { CrudFieldComponent } from "src/lib/components/crud-field/crud-field.component";
import { ListItemPositions } from "src/lib/engine/constants";
import { composed, readonly } from "@decaf-ts/db-decorators";
import { EwMenu } from "src/app/utils/contants";
import { getMenuIcon } from "src/lib/utils/helpers";

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

@uilistmodel('ngx-decaf-list-item', {icon: getMenuIcon('Batches', EwMenu)})
@uilayout('ngx-decaf-crud-form', true)
@model()
export class Batch extends Model {

  @pk({ type: String, generated: false })
  @composed(["productCode", "batchNumber"], ":", true)
  id!: string;

  @uielement('app-batch-select-field', {
    label: 'batch.nameMedicinalProduct.label',
    placeholder: 'batch.nameMedicinalProduct.placeholder',
    readonly: true
  })
  @uilayoutprop('half')
  nameMedicinalProduct?: string;

  @uielement('app-batch-select-field', {
    label: 'batch.inventedName.label',
    placeholder: 'batch.inventedName.placeholder',
    readonly: true,
  })
  @uilayoutprop('half')
  inventedName?: string;

  @required()
  @uielement('app-batch-select-field', {
    label: "batch.productcode.label",
    placeholder: "batch.productcode.placeholder",
    type: HTML5InputTypes.SELECT,
    translatable: false,
    optionsMapper: (item: Product) => ({text:`${ item.inventedName}`, value: `${item.productCode}`}),
    options: () => Product
  })
  @uilistprop(ListItemPositions.description)
  @uilayoutprop('half')
  @required()
  productCode!: string;

  @required()
  @uielement('ngx-decaf-crud-field', {
    label: 'batch.batchNumber.label',
    placeholder: 'batch.batchNumber.placeholder',
  })
  @uilayoutprop('half')
  @uilistprop(ListItemPositions.title)
  batchNumber!: string;

  @uielement('ngx-decaf-crud-field', {
    label: 'batch.packagingSiteName.label',
    placeholder: 'batch.packagingSiteName.placeholder',
  })
  @uilayoutprop('half')
  packagingSiteName?: string;

  @uielement('ngx-decaf-crud-field', {
    label: 'batch.importLicenseNumber.label',
    placeholder: 'batch.importLicenseNumber.placeholder',
  })
  @uilayoutprop('half')
  importLicenseNumber?: string;

  @required()
  @pattern("^\\d{6}$")
  @uielement('app-expiry-date-field', {
    label: 'batch.expiryDate.label',
    placeholder: 'batch.expiryDate.placeholder',
    type: HTML5InputTypes.TEXT,
  })
  @uilayoutprop('half')
  @uilistprop(ListItemPositions.info)
  expiryDate!: string;

  @uielement('app-expiry-date-field', {
    label: 'batch.dayselection.label',
    placeholder: 'batch.dayselection.placeholder',
    type: HTML5InputTypes.CHECKBOX
  })
  @uilayoutprop('half')
  enableDaySelection: boolean = true;

  @uielement('ngx-decaf-crud-field', {
    label: 'batch.manufacturerName.label',
    placeholder: 'batch.manufacturerName.placeholder',
  })
  @uilayoutprop('half')
  manufacturerName?: string;

  @uielement('ngx-decaf-crud-field', {
    label: 'batch.dateOfManufacturing.label',
    placeholder: 'batch.dateOfManufacturing.placeholder',
    type: HTML5InputTypes.DATE
  })
  @date('yyyy-MM-dd')
  @uilayoutprop('half')
  dateOfManufacturing!: Date;

  @list(ManufacturerAddress, 'Array')
  @uilayoutprop(1)
  @uichild(ManufacturerAddress.name, 'ngx-decaf-fieldset', {
    title: "batch.manufacturerAddress.label",
    max: 5,
    collapsable: false,
    borders: true
  }, true)
  manufacturerAddress!: ManufacturerAddress;

  @uielement('ngx-decaf-crud-field', {
    label: 'batch.batchRecall.label',
    placeholder: 'batch.batchRecall.placeholder',
    type: HTML5InputTypes.CHECKBOX,
  } as Partial<CrudFieldComponent>)
  @uilayoutprop(1)
  batchRecall: boolean = false;


  // epiLeafletVersion?: number;

  // flagEnableEXPVerification: boolean = false;

  // flagEnableExpiredEXPCheck: boolean = false;

  // batchMessage?: string;

  // flagEnableBatchRecallMessage: boolean = false;

  // recallMessage?: string;

  // flagEnableACFBatchCheck: boolean = false;

  // acfBatchCheckURL?: string;

  // flagEnableSNVerification: boolean = false;

  // /** ACDC PATCH */
  // acdcAuthFeatureSSI?: string;

  // snValidReset: boolean = false;

  // @list(String)
  // snValid?: string[];

  // eslint-disable-next-line @typescript-eslint/no-useless-constructor
  constructor(model?: ModelArg<Batch>) {
    super(model);
  }
}
