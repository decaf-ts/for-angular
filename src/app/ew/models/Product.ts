import {
  model,
  Model,
  ModelArg,
  required,
} from "@decaf-ts/decorator-validation";
import { pk } from "@decaf-ts/core";
import {  HTML5InputTypes, uichild, uielement,  uilayoutprop, uilistmodel, uilistprop, uiorder, uipageprop, uisteppedmodel } from "@decaf-ts/ui-decorators";
import { EpiForm } from "../forms/EpiForm";

// import { ProductStrength } from "./ProductStrength";
// import { MarketForm } from "../forms/MarketForm";


export enum ProductNames {
  aspirin = "Aspirin",
  ibuprofen = "Ibuprofen",
  paracetamol = "Paracetamol",
  amoxicillin = "Amoxicillin",
  azithromycin = "Azithromycin",
  metformin = "Metformin",
  // atorvastatin = "Atorvastatin",
  // omeprazole = "Omeprazole",
  // simvastatin = "Simvastatin",
  // levothyroxine = "Levothyroxine",
  // lisinopril = "Lisinopril",
  // losartan = "Losartan",
  // hydrochlorothiazide = "Hydrochlorothiazide",
  // prednisone = "Prednisone",
  // sertraline = "Sertraline",
  // fluoxetine = "Fluoxetine",
  // alprazolam = "Alprazolam",
  // diazepam = "Diazepam",
  // tramadol = "Tramadol",
  // codeine = "Codeine",
  // sildenafil = "Sildenafil",
  // insulin = "Insulin",
  // clopidogrel = "Clopidogrel",
  // furosemide = "Furosemide"
};

@uilistmodel('ngx-decaf-list-item', {icon: 'cafe-outline'})
@uisteppedmodel('ngx-decaf-stepped-form', [
  {title: 'product.steps.1.title' },
  {title: 'product.steps.2.title'},
  {title: 'product.steps.3.title'},
], false, {cols: 2})
@model()
export class Product extends Model {

  @pk({type: 'Number' })
  @uilistprop('uid')
  @required()
  @uielement('ngx-decaf-crud-field', {
    label: 'product.productCode.label',
    placeholder: 'product.productCode.placeholder',
  })
  @uipageprop(1)
  @uilayoutprop(1)
  productCode!: number;

  @required()
  @uielement('ngx-decaf-crud-field', {
    label: 'product.inventedName.label',
    placeholder: 'product.inventedName.placeholder',
  })
  @uilistprop('title')
  @uipageprop(1)
  @uilayoutprop(1)
  inventedName!: string;

  @uielement('ngx-decaf-crud-field', {
    label: 'product.internalMaterialCode.label',
    placeholder: 'product.internalMaterialCode.placeholder',
  })
  @uipageprop(1)
  @uilayoutprop(1)
  internalMaterialCode?: string;

  @uielement('ngx-decaf-crud-field', {
    label: 'product.importLicenseNumber.label',
    placeholder: 'product.importLicenseNumber.placeholder',
  })
  @uipageprop(1)
  @uilayoutprop(1)
  importLicenseNumber?: string;

  @required()
  @uielement('ngx-decaf-crud-field', {
    label: 'product.nameMedicinalProduct.label',
    placeholder: 'product.nameMedicinalProduct.placeholder',
    type: 'textarea',
  })
  @uilistprop('description')
  @uipageprop(1)
  @uilayoutprop(2)
  nameMedicinalProduct!: string;


  @uielement('ngx-decaf-crud-field', {
    label: 'product.productRecall.label',
    placeholder: 'product.productRecall.placeholder',
    type: HTML5InputTypes.CHECKBOX,
  })
  @uilistprop('description')
  @uipageprop(1)
  @uilayoutprop(2)
  @uiorder(100)
  productRecall: boolean = false;

  // @required()
  @uielement('app-image-upload', {
    label: 'product.nameMedicinalProduct.label',
    placeholder: 'product.nameMedicinalProduct.placeholder',
    type: 'file',
  })
  @uilistprop('description')
  @uipageprop(2)
  @uilayoutprop(2)
  productImage!: string;


  @uipageprop(3)
  @uichild(EpiForm.name, 'app-switcher', {}, false)
  epi!: EpiForm;



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

  // @list(MarketForm)
  // markets?: MarketForm[];

  // eslint-disable-next-line @typescript-eslint/no-useless-constructor
  constructor(args?: ModelArg<Product>) {
    super(args);
  }
}
