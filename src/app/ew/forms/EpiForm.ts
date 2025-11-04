import {
  model,
  Model,
  ModelArg
} from "@decaf-ts/decorator-validation";
import { pk } from "@decaf-ts/core";
import { uichild, uimodel, uiorder, uipageprop } from "@decaf-ts/ui-decorators";
import { Leaflet } from "../models/Leaflet";
import { ProductMarket } from "../models/ProductMarket";
import { SubstanceForm } from "./SubstanceForm";

@uimodel('ngx-decaf-form', {})
@model()
export class EpiForm extends Model {
  @pk({type: 'Number' })
  id!: number;

  @uipageprop(1)
  @uichild(Leaflet.name, 'ngx-decaf-fieldset', {
    title: "Documents",
    borders: false,
    collapsable: false,
    rows: 1,
    cols: 2
  }, false)
  @uiorder(1)
  document!: Leaflet;

  @uipageprop(1)
  @uichild(SubstanceForm.name, 'ngx-decaf-fieldset', {
    title: "Strengths",
    borders: false,
    collapsable: false
  }, false)
  @uiorder(2)
  strengths!: SubstanceForm;

  @uipageprop(1)
  @uichild(ProductMarket.name, 'ngx-decaf-fieldset', {
    title: "Markets",
    borders: false,
    collapsable: false
  }, false)
  @uiorder(3)
  markets!: ProductMarket;

  // eslint-disable-next-line @typescript-eslint/no-useless-constructor
  constructor(args?: ModelArg<EpiForm>) {
    super(args);
  }
}
