import { pk } from "@decaf-ts/core";
import { composed } from "@decaf-ts/db-decorators";
import {
  min,
  model,
  Model,
  ModelArg,
  required,
} from "@decaf-ts/decorator-validation";
import { HTML5InputTypes, uielement, uilayoutprop, uilistprop, uimodel, uiprop } from "@decaf-ts/ui-decorators";
import { getMarkets } from "src/app/utils/helpers";
import { ListItemPositions } from "src/lib/engine/constants";
@uimodel('ngx-decaf-fieldset')
@model()
export class ProductMarket extends Model {

  @pk({type: String, generated: false})
  @composed(["productCode", "marketId"], ":", true)
  id!: string;

  @uiprop()
  productCode!: string;

  @required()
  @uielement('ngx-decaf-crud-field', {
    label: 'market.id.label',
    placeholder: 'market.id.placeholder',
    type: HTML5InputTypes.SELECT,
    options: getMarkets()
  })
  @uilayoutprop(1)
  @uilistprop(ListItemPositions.title)
  marketId!: string;

  @uielement('ngx-decaf-crud-field', {
    label: 'market.nationalCode.label',
    placeholder: 'market.nationalCode.placeholder',
  })
  @uilayoutprop(1)
  @min(2)
  @uilistprop(ListItemPositions.description)
  nationalCode?: string;

  @uielement('ngx-decaf-crud-field', {
    label: 'market.mahName.label',
    placeholder: 'market.mahName.placeholder',
  })
  @uilayoutprop(1)
  @uilistprop(ListItemPositions.info)
  mahName?: string;

  @uielement('ngx-decaf-crud-field', {
    label: 'market.legalEntityName.label',
    placeholder: 'market.legalEntityName.placeholder',
  })
  @uilayoutprop(1)
  legalEntityName?: string;

  @uielement('ngx-decaf-crud-field', {
    label: 'market.mahAddress.label',
    placeholder: 'market.mahAddress.placeholder',
  })
  @uilayoutprop(1)
  mahAddress?: string;

  // eslint-disable-next-line @typescript-eslint/no-useless-constructor
  constructor(model?: ModelArg<ProductMarket>) {
    super(model);
  }
}
