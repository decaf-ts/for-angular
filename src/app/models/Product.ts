import {
  list,
  model,
  Model,
  ModelArg,
  required,
  url,
} from "@decaf-ts/decorator-validation";
import { pk } from "@decaf-ts/core";
import { hideOn, uielement, uilistitem, uilistprop, uimodel } from "@decaf-ts/ui-decorators";
import { OperationKeys } from "@decaf-ts/db-decorators";
// import { ProductStrength } from "./ProductStrength";
// import { ProductMarket } from "./ProductMarket";


export enum ProductNames {
  aspirin = "Aspirin",
  ibuprofen = "Ibuprofen",
  paracetamol = "Paracetamol",
  amoxicillin = "Amoxicillin",
  azithromycin = "Azithromycin",
  metformin = "Metformin",
  atorvastatin = "Atorvastatin",
  omeprazole = "Omeprazole",
  simvastatin = "Simvastatin",
  levothyroxine = "Levothyroxine",
  lisinopril = "Lisinopril",
  losartan = "Losartan",
  hydrochlorothiazide = "Hydrochlorothiazide",
  prednisone = "Prednisone",
  sertraline = "Sertraline",
  fluoxetine = "Fluoxetine",
  alprazolam = "Alprazolam",
  diazepam = "Diazepam",
  tramadol = "Tramadol",
  codeine = "Codeine",
  sildenafil = "Sildenafil",
  insulin = "Insulin",
  clopidogrel = "Clopidogrel",
  furosemide = "Furosemide"
};

@uilistitem('ngx-decaf-list-item', {icon: 'cafe-outline'})
// @uimodel('ngx-decaf-stepped-form', {
//   paginated: false,
//   pages: 1,
//   startPage: 1,
//   pageTitles: [
//     {title: 'stepped-form.step1.title', description: 'stepped-form.step1.description'},
//     {title: 'stepped-form.step2.title', description: 'stepped-form.step2.description'},
//     {title: 'stepped-form.step3.title', description: 'stepped-form.step3.description'},
//   ]
// })
@uimodel('ngx-decaf-crud-form')
@model()
export class Product extends Model {

  @pk({type: 'Number' })
  @uilistprop('uid')
  @required()
  @uielement('ngx-decaf-crud-field', {
    label: 'product.productCode.label',
    placeholder: 'product.productCode.placeholder',
    className: 'dcf-width-1-2@s dcf-width-1-1',
    page: 1,
  })
  productCode!: number;

  @required()
  @uielement('ngx-decaf-crud-field', {
    label: 'product.inventedName.label',
    placeholder: 'product.inventedName.placeholder',
    className: 'dcf-width-1-2@s dcf-width-1-1',
    page: 1,
  })
  @uilistprop('title')
  inventedName!: string;

  @uielement('ngx-decaf-crud-field', {
    label: 'product.internalMaterialCode.label',
    placeholder: 'product.internalMaterialCode.placeholder',
    className: 'dcf-width-1-2@s dcf-width-1-1',
    page: 1,
  })
  internalMaterialCode?: string;

  @uielement('ngx-decaf-crud-field', {
    label: 'product.importLicenseNumber.label',
    placeholder: 'product.importLicenseNumber.placeholder',
    className: 'dcf-width-1-2@s dcf-width-1-1',
    page: 1,
  })
  importLicenseNumber?: string;

  @required()
  @uielement('ngx-decaf-crud-field', {
    label: 'product.nameMedicinalProduct.label',
    placeholder: 'product.nameMedicinalProduct.placeholder',
    className: 'dcf-width-1-1',
    type: 'textarea',
    page: 1,
  })
  @uilistprop('description')
  nameMedicinalProduct!: string;

  // productRecall: boolean = false;

  // flagEnableAdverseEventReporting?: boolean;

  // adverseEventReportingURL?: string;

  // flagEnableACFProductCheck?: boolean;

  // @url()
  // acfProductCheckURL?: string;

  // patientSpecificLeaflet?: string;

  // healthcarePractitionerInfo?: string;

  // @list(ProductStrength)
  // strengths?: ProductStrength[];

  // @list(ProductMarket)
  // markets?: ProductMarket[];

  constructor(args?: ModelArg<Product>) {
    super(args);
  }
}
