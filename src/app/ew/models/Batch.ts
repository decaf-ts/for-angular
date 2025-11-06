import {
  date,
  list,
  max,
  minlength,
  model,
  Model,
  ModelArg,
  required,
} from "@decaf-ts/decorator-validation";
import { pk } from "@decaf-ts/core";
import { hideOn, HTML5InputTypes, uichild, uielement, uilayout, uilayoutprop,  uilistprop, uimodel, uipageprop } from "@decaf-ts/ui-decorators";
import { Product } from "./Product";
import { OperationKeys } from "@decaf-ts/db-decorators";
import { EpiForm } from "../forms/EpiForm";

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


@uilayout('ngx-decaf-crud-form', true)
@model()
export class Batch extends Model {

  @required()
  @uielement('ngx-decaf-crud-field', {
    label: "batch.productcode.label",
    placeholder: "batch.productcode.placeholder",
    type: HTML5InputTypes.SELECT,
    optionsMapper: (item: Product) => ({text: item.inventedName, value: `${item.productCode}`}),
    options: () => Product
  })
  @uilistprop('title')
  @uilayoutprop('half', 1)
  @required()
  productCode!: string;

  @pk({type: String.name })
  @uielement('ngx-decaf-crud-field', {
    label: 'batch.batchNumber.label',
    placeholder: 'batch.batchNumber.placeholder',
  })
  @required()
  @uilayoutprop('half', 1)
  batchNumber!: string;


  @uilayoutprop('full', 5)
  @uichild(ManufacturerAddress.name, 'ngx-decaf-fieldset', {title: "batch.manufacturerAddress.label", max: 6,  collapsable: false, borders: false}, true)
  manufacturerAddress!: ManufacturerAddress;


  // @uielement('ngx-decaf-crud-field', {
  //   label: 'batch.packagingSiteName.label',
  //   placeholder: 'batch.packagingSiteName.placeholder',
  // })
  // @uilayoutprop('half', 2)
  // @minlength(2)
  // packagingSiteName?: string;

  // @uielement('ngx-decaf-crud-field', {
  //   label: 'batch.importLicenseNumber.label',
  //   placeholder: 'batch.importLicenseNumber.placeholder',
  // })
  // @uilayoutprop('half', 2)
  // importLicenseNumber2?: string;

  //  @uielement('ngx-decaf-crud-field', {
  //   label: 'batch.expiryDate.label',
  //   placeholder: 'batch.expiryDate.placeholder',
  // })
  // @required()
  // @date('yyyy-MM-dd')
  // @uilayoutprop(2, 3)
  // expiryDate!: string;

  // @uielement('ngx-decaf-crud-field', {
  //   label: 'batch.dayselection.label',
  //   placeholder: 'batch.dayselection.placeholder',
  //   page: 1,
  //   type: HTML5InputTypes.CHECKBOX
  // })
  // @uilayoutprop(1, 3)
  // enableDaySelection!: string;

  // @uielement('ngx-decaf-crud-field', {
  //   label: 'batch.manufacturerName.label',
  //   placeholder: 'batch.manufacturerName.placeholder',
  //   page: 1,
  // })
  // @uilayoutprop(2, 4)
  // manufacturerName?: string;

  // @uielement('ngx-decaf-crud-field', {
  //   label: 'batch.dateOfManufacturing.label',
  //   placeholder: 'batch.dateOfManufacturing.placeholder',
  // })
  // @date('yyyy-MM-dd')
  // @uilayoutprop(1, 4)
  // dateOfManufacturing!: string;

  // @uilayoutprop('full', 5)
  // @uichild(ManufacturerAddress.name, 'ngx-decaf-fieldset', {title: "batch.manufacturerAddress.label",  collapsable: false, borders: false}, true)
  // manufacturerAddress!: ManufacturerAddress;

  // @uilayoutprop('full', 6)
  // @uichild(EpiForm.name, 'app-switcher', {}, false)
  // epi!: EpiForm;


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

