import {
  date,
  list,
  model,
  Model,
  ModelArg,
  pattern,
  required,
  url,
} from "@decaf-ts/decorator-validation";
import { pk } from "@decaf-ts/core";
import { HTML5InputTypes, uichild, uielement, uilayoutitem, uilistitem, uilistprop, uimodel, uiorder } from "@decaf-ts/ui-decorators";
import { Product } from "./Product";

@uimodel('ngx-decaf-crud-form')
@model()
class ManufacturerForm {
  @required()
  @uielement('ngx-decaf-crud-field', {
    label: 'batch.manufacturerName.label',
    placeholder: 'batch.manufacturerName.placeholder',
    className: 'dcf-width-1-2@s dcf-width-1-1',
    page: 1,
  })
  @uilayoutitem(1, 1)
  name!: string;

  @uielement('ngx-decaf-crud-field', {
    label: 'batch.manufacturerAddress.label',
    placeholder: 'batch.manufacturerAddress.placeholder',
    className: 'dcf-width-1-2@s dcf-width-1-1',
    page: 1,
  })
  @uilayoutitem(2, 1)
  address?: string;
}



@uimodel('ngx-decaf-crud-form')
@model()
class manuFacturerAddress {

  @pk({type: String.name })
  @uielement('ngx-decaf-crud-field', {
    label: 'manuFacturerAddress.name.label',
    placeholder: 'manuFacturerAddress.name.placeholder',
    className: 'dcf-width-1-1',
    page: 1,
  })
  name!: string;
}


@uilistitem('ngx-decaf-list-item', {icon: 'cafe-outline'})
// @uimodel('ngx-decaf-crud-form')
@uimodel('ngx-decaf-stepped-form', {
  paginated: false,
  pages: 1,
  startPage: 1,
  pageTitles: [
    {title: 'stepped-form.step1.title', description: 'stepped-form.step1.description'},
    {title: 'stepped-form.step2.title', description: 'stepped-form.step2.description'},
    {title: 'stepped-form.step3.title', description: 'stepped-form.step3.description'},
  ]
})
@model()
export class Batch extends Model {

  @required()
  @uielement('ngx-decaf-crud-field', {
    label: "batch.productCode.label",
    placeholder: "batch.productCode.placeholder",
     className: 'dcf-width-1-2@s dcf-width-1-1',
    type: HTML5InputTypes.SELECT,
    optionsMapper: (item: Product) => ({text: item.inventedName, value: item.productCode}),
    options: () => Product,
    page: 1,
  })
  @uilistprop('title')
  @required()
  productCode!: string;

  @pk({type: String.name })
  @uielement('ngx-decaf-crud-field', {
    label: 'batch.batchNumber.label',
    placeholder: 'batch.batchNumber.placeholder',
    className: 'dcf-width-1-2@s dcf-width-1-1',
    page: 1,
  })
  @required()
  batchNumber!: string;

  // @uielement('ngx-decaf-crud-field', {
  //   label: 'batch.packagingSiteName.label',
  //   placeholder: 'batch.packagingSiteName.placeholder',
  //   className: 'dcf-width-1-2@s dcf-width-1-1',
  //   page: 1,
  // })
  // @url()
  // packagingSiteName?: string;


  // @uielement('ngx-decaf-crud-field', {
  //   label: 'batch.packagingSiteName.label',
  //   placeholder: 'batch.packagingSiteName.placeholder',
  //   className: 'dcf-width-1-2@s dcf-width-1-1',
  //   page: 1,
  // })
  // @required()
  // @date('yyyy-MM-dd')
  // expiryDate!: string;

  // @uielement('ngx-decaf-crud-field', {
  //   label: 'batch.importLicenseNumber.label',
  //   placeholder: 'batch.importLicenseNumber.placeholder',
  //   className: 'dcf-width-1-2@s dcf-width-1-1',
  //   page: 1,
  // })
  // importLicenseNumber?: string;

  // // @uichild(ManufacturerForm.name, 'ngx-decaf-layout', {page: 1, cols: 2, rows: 1})
  // // manufacturer?: ManufacturerForm;


  // @uiorder(10)
  // @uielement('ngx-decaf-crud-field', {
  //   label: 'batch.batchRecall.label',
  //   placeholder: 'batch.batchRecall.placeholder',
  //   className: 'dcf-width-1-1',
  //   page: 1,
  //   type: HTML5InputTypes.CHECKBOX
  // })
  // batchRecall: boolean = false;


  // @uielement('ngx-decaf-crud-field', {
  //   label: 'batch.manufacturerName.label',
  //   placeholder: 'batch.manufacturerName.placeholder',
  //   className: 'dcf-width-1-2@s dcf-width-1-1',
  //   page: 2,
  // })
  // manufacturerName?: string;

  // @uielement('ngx-decaf-crud-field', {
  //   label: 'batch.packagingSiteName.label',
  //   placeholder: 'batch.packagingSiteName.placeholder',
  //   className: 'dcf-width-1-2@s dcf-width-1-1',
  //   page: 2,
  // })
  // @required()
  // @date('yyyy-MM-dd')
  // dateOfManufacturing?: string;

  @list(manuFacturerAddress, 'Array')
  @uichild(manuFacturerAddress.name, 'ngx-decaf-fieldset', {page: 2, collapsable: false, max: 5, borders: false}, true)
  manuFacturerAddress?: manuFacturerAddress;

  // dateOfManufacturing?: string;

  // manufacturerAddress1?: string;

  // manufacturerAddress2?: string;

  // manufacturerAddress3?: string;

  // manufacturerAddress4?: string;

  // manufacturerAddress5?: string;


  epiLeafletVersion?: number;

  flagEnableEXPVerification: boolean = false;

  flagEnableExpiredEXPCheck: boolean = false;

  batchMessage?: string;

  flagEnableBatchRecallMessage: boolean = false;

  recallMessage?: string;

  flagEnableACFBatchCheck: boolean = false;

  acfBatchCheckURL?: string;

  flagEnableSNVerification: boolean = false;

  /** ACDC PATCH */
  acdcAuthFeatureSSI?: string;

  snValidReset: boolean = false;

  @list(String)
  snValid?: string[];

  // eslint-disable-next-line @typescript-eslint/no-useless-constructor
  constructor(model?: ModelArg<Batch>) {
    super(model);
  }
}
