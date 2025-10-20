import { list, Model, model, required, type } from "@decaf-ts/decorator-validation";
import type { ModelArg } from "@decaf-ts/decorator-validation";
import { pk, table } from "@decaf-ts/core";
import { HTML5InputTypes, uielement, uilistitem, uilistprop, uimodel } from "@decaf-ts/ui-decorators";
import {AIFeatures, AIVendors} from '../utils/contants';


@table("ai_vendors")
@uimodel('ngx-decaf-crud-form')
@uilistitem('ngx-decaf-list-item', {icon: 'globe-outline', className: 'testing'})
@model()
export class AIVendorModel extends Model {

  /**
   * @description Unique identifier for the AI provider
   * @summary The provider's unique identifier string
   */
  @pk({ type: "String", generated: false })
  @type(String.name)
  @uielement('ngx-decaf-crud-field', {
    label: "aivendors.name.label",
    placeholder: "aivendors.name.placeholder",
    type: HTML5InputTypes.SELECT,
    options: Object.values(AIVendors).map(item => ({text: item, value: item})),
  })
  @uilistprop('title')
  name!: string;


  @uielement('ngx-decaf-crud-field', {
    label: "aivendors.models.label",
    placeholder: "aivendors.models.placeholder",
    type: HTML5InputTypes.SELECT,
    optionsMapper: (item: AIModel) => ({text: item.name, value: item.name}),
    options: () => AIModel
  })
  @uilistprop('title')
  @required()
  models!: string[];

  // eslint-disable-next-line @typescript-eslint/no-useless-constructor
  constructor(arg?: ModelArg<AIVendorModel>) {
    super(arg);
  }
}



@table("ai_models")
@uimodel('ngx-decaf-crud-form')
@uilistitem('ngx-decaf-list-item', {icon: 'globe-outline', className: 'testing'})
@model()
export class AIModel extends Model {
  /**
   * @description Unique identifier for the AI model
   * @summary The model's unique identifier string
   */
  @pk({ type: "String", generated: false })
  @uielement('ngx-decaf-crud-field', {
    label: "aimodel.name.label",
    placeholder: "aimodel.name.placeholder",
  })
  @uilistprop('title')
  name!: string;


  @uielement('ngx-decaf-crud-field', {
    label: "aimodel.features.label",
    placeholder: "aimodel.features.placeholder",
    type: 'checkbox',
    options: Object.values(AIFeatures).map(item => ({text: item, value: item})),
  })
  @uilistprop('description')
  @required()
  @list(String)
  features!: AIFeatures[];



  // eslint-disable-next-line @typescript-eslint/no-useless-constructor
  constructor(arg?: ModelArg<AIModel>) {
    super(arg);
  }


}

