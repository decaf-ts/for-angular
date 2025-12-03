import {
  date,
  list,
  minlength,
  model,
  Model,
  ModelArg,
  required,
} from "@decaf-ts/decorator-validation";
import { pk } from "@decaf-ts/core";
import {  HTML5InputTypes, uichild, uielement, uilayout, uilayoutprop,  uilistmodel,  uilistprop, uimodel } from "@decaf-ts/ui-decorators";
import { Product } from "./Product";
import { CrudFieldComponent } from "src/lib/components/crud-field/crud-field.component";
import { ListItemPositions } from "src/lib/engine/constants";

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

@uilistmodel('ngx-decaf-list-item', {icon: 'cafe-outline'})
@uilayout('ngx-decaf-crud-form', true)
@model()
export class Batch extends Model {

  @required()
  @uielement('ngx-decaf-crud-field', {
    label: "batch.productcode.label",
    placeholder: "batch.productcode.placeholder",
    type: HTML5InputTypes.SELECT,
    optionsMapper: (item: Product) => ({text:`${item.productCode} - ${ item.inventedName}`, value: `${item.productCode}`}),
    options: () => Product
  })
  @uilistprop(ListItemPositions.description)
  @uilayoutprop('half')
  @required()
  productCode!: string;

  @pk({type: String.name,  generated: false  })
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
  importLicenseNumber2?: string;

  @uielement('ngx-decaf-crud-field', {
    label: 'batch.expiryDate.label',
    placeholder: 'batch.expiryDate.placeholder',
  })
  // @required()
  // @date('yyyy-MM-dd')
  @uilayoutprop('half')
  @uilistprop(ListItemPositions.info)
  expiryDate!: string;

  @uielement('ngx-decaf-crud-field', {
    label: 'batch.dayselection.label',
    placeholder: 'batch.dayselection.placeholder',
    type: HTML5InputTypes.CHECKBOX
  })
  @uilayoutprop('half')
  enableDaySelection!: string;

  @uielement('ngx-decaf-crud-field', {
    label: 'batch.manufacturerName.label',
    placeholder: 'batch.manufacturerName.placeholder',
  })
  @uilayoutprop('half')
  manufacturerName?: string;

  @uielement('ngx-decaf-crud-field', {
    label: 'batch.dateOfManufacturing.label',
    placeholder: 'batch.dateOfManufacturing.placeholder',
  })
  // @date('yyyy-MM-dd')
  @uilayoutprop('half')
  dateOfManufacturing!: string;

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
