import { pk } from "@decaf-ts/core";
import {
  min,
  model,
  Model,
  ModelArg,
  required,
} from "@decaf-ts/decorator-validation";
import { HTML5InputTypes, uielement, uilayoutprop, uimodel } from "@decaf-ts/ui-decorators";
import { getMarkets } from "../../utils/helpers";
@uimodel('ngx-decaf-fieldset')
@model()
export class ProductMarket extends Model {

  @pk({ type: String.name, generated: false })
  @required()
  @uielement('ngx-decaf-crud-field', {
    label: 'product.market.id.label',
    placeholder: 'product.market.id.placeholder',
    type: HTML5InputTypes.SELECT,
    options: getMarkets(true)
  })
  @uilayoutprop(1)
  marketId!: string;

  @uielement('ngx-decaf-crud-field', {
    label: 'product.market.nationalCode.label',
    placeholder: 'product.market.nationalCode.placeholder',
  })
  @uilayoutprop(1)
  @min(2)
  nationalCode?: string;

  @uielement('ngx-decaf-crud-field', {
    label: 'product.market.mahName.label',
    placeholder: 'product.market.mahName.placeholder',
  })
  @uilayoutprop(1)
  mahName?: string;

  @uielement('ngx-decaf-crud-field', {
    label: 'product.market.legalEntityName.label',
    placeholder: 'product.market.legalEntityName.placeholder',
  })
  @uilayoutprop(1)
  legalEntityName?: string;

  @uielement('ngx-decaf-crud-field', {
    label: 'product.market.mahAddress.label',
    placeholder: 'product.market.mahAddress.placeholder',
  })
  @uilayoutprop(1)
  mahAddress?: string;

  // eslint-disable-next-line @typescript-eslint/no-useless-constructor
  constructor(model?: ModelArg<ProductMarket>) {
    super(model);
  }
}
