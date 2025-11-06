import { pk } from "@decaf-ts/core";
import {
  min,
  model,
  Model,
  ModelArg,
  required,
} from "@decaf-ts/decorator-validation";
import { HTML5InputTypes, uielement, uilayoutprop, uimodel } from "@decaf-ts/ui-decorators";
import { getMarkets } from "src/app/utils/helpers";
@uimodel('ngx-decaf-fieldset')
@model()
export class MarketForm extends Model {

  @pk({ type: String.name, generated: false })
  @required()
  @uielement('ngx-decaf-crud-field', {
    label: 'market.id.label',
    placeholder: 'market.id.placeholder',
    type: HTML5InputTypes.SELECT,
    options: getMarkets(true)
  })
  @uilayoutprop(1)
  marketId!: string;

  @uielement('ngx-decaf-crud-field', {
    label: 'market.nationalCode.label',
    placeholder: 'market.nationalCode.placeholder',
  })
  @uilayoutprop(1)
  @min(2)
  nationalCode?: string;

  @uielement('ngx-decaf-crud-field', {
    label: 'market.mahName.label',
    placeholder: 'market.mahName.placeholder',
  })
  @uilayoutprop(1)
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
  constructor(model?: ModelArg<MarketForm>) {
    super(model);
  }
}
