import {
  model,
  Model,
  ModelArg,
  required,
} from "@decaf-ts/decorator-validation";
import { pk } from "@decaf-ts/core";
import { HTML5InputTypes, uielement,  uilayout,  uilayoutprop, uilistmodel, uilistprop } from "@decaf-ts/ui-decorators";
import { CardComponent, CrudFieldComponent, FileUploadComponent } from "src/lib/components";

export enum ProductNames {
  aspirin = "Aspirin",
  ibuprofen = "Ibuprofen",
  paracetamol = "Paracetamol",
  amoxicillin = "Amoxicillin",
  azithromycin = "Azithromycin",
  // metformin = "Metformin",
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
@uilayout('ngx-decaf-crud-form', true)
@model()
export class Product extends Model {

  // @uielement('ngx-decaf-card', {
  //   title: 'product.section.details.title',
  //   separator: true,
  //   name: 'separator',
  // } as Partial<CardComponent>)
  // @uipageprop(1)
  // @uilayoutprop(1)
  // productDetailsTitle!: string;

  @pk({type: "String", generated: false })
  @uilistprop('uid')
  @required()
  @uielement('ngx-decaf-crud-field', {
    label: 'product.productCode.label',
    placeholder: 'product.productCode.placeholder',
  } as Partial<CrudFieldComponent>)
  @uilayoutprop(2)
  productCode!: string;

  @required()
  @uielement('ngx-decaf-crud-field', {
    label: 'product.inventedName.label',
    placeholder: 'product.inventedName.placeholder',
  } as Partial<CrudFieldComponent>)
  @uilistprop('title')
  @uilayoutprop(2)
  inventedName!: string;

  @uielement('ngx-decaf-crud-field', {
    label: 'product.internalMaterialCode.label',
    placeholder: 'product.internalMaterialCode.placeholder',
  } as Partial<CrudFieldComponent>)
  @uilayoutprop(2)
  internalMaterialCode?: string;

  @uielement('ngx-decaf-crud-field', {
    label: 'product.importLicenseNumber.label',
    placeholder: 'product.importLicenseNumber.placeholder',
  } as Partial<CrudFieldComponent>)
  @uilayoutprop(2)
  importLicenseNumber?: string;

  @required()
  @uielement('ngx-decaf-crud-field', {
    label: 'product.nameMedicinalProduct.label',
    placeholder: 'product.nameMedicinalProduct.placeholder',
    type: 'textarea',
  } as Partial<CrudFieldComponent>)
  @uilistprop('description')
  @uilayoutprop(1)
  nameMedicinalProduct!: string;


  @uielement('ngx-decaf-crud-field', {
    label: 'product.productRecall.label',
    placeholder: 'product.productRecall.placeholder',
    type: HTML5InputTypes.CHECKBOX,
  } as Partial<CrudFieldComponent>)
  @uilistprop('description')
  @uilayoutprop(1)
  productRecall?: boolean;

  @uielement('ngx-decaf-card', {
    title: 'product.section.image.title',
    name: 'separator',
    separator: true
  } as Partial<CardComponent>)
  @uilayoutprop(1)
  productImageTitle!: string;

  @uielement('ngx-decaf-file-upload', {
    label: 'product.productImage.label',
  } as Partial<FileUploadComponent>)
  @uilistprop('description')
  @uilayoutprop(1)
  productImage!: string;


  // @uipageprop(3)
  // @uilayoutprop('full')
  // @uichild(EpiForm.name, 'app-switcher', {}, false)
  // epi!: EpiForm;



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
