import { type ModelArg, required } from '@decaf-ts/decorator-validation';
import { maxlength, minlength, model } from '@decaf-ts/decorator-validation';
// import { TableNames } from "@pharmaledgerassoc/ptp-toolkit/shared";
import { column, index, OrderDirection, pk, table } from '@decaf-ts/core';
import { description, uses } from '@decaf-ts/decoration';
//  import { gtin } from "@pharmaledgerassoc/ptp-toolkit/shared";
import { composed } from '@decaf-ts/db-decorators';
import { Cacheable } from './Cacheable';
// import { cache } from "@pharmaledgerassoc/ptp-toolkit/shared";
import {
  DecafComponent,
  HTML5InputTypes,
  uielement,
  uilayoutprop,
  uilistprop,
  uimodel,
  uionrender,
} from '@decaf-ts/ui-decorators';
import { getMarkets } from 'src/app/ew/utils/helpers';
import { TableNames } from './constants';
import { ProductEpiHandler, renderMakets } from '../handlers/ProductEpiHandler';
import { CrudFieldComponent, FieldsetComponent } from 'src/lib/components';

@description('Links a product to a specific market.')
//@uses(FabricFlavour)
@table(TableNames.Market)
@uimodel('ngx-decaf-crud-form', { multiple: true })
@model()
export class ProductMarket extends Cacheable {
  @pk({ type: String, generated: false })
  @composed(['productCode', 'marketId'], ':', true)
  @description('Unique identifier composed of product code and market ID.')
  id!: string;

  //@cache()
  @column()
  @required()
  // @pattern(LocaleHelper.getMarketRegex())
  @index([OrderDirection.ASC, OrderDirection.DSC])
  @description('Identifier of the market where the product is registered or sold.')
  @uielement('ngx-decaf-crud-field', {
    label: 'market.id.label',
    placeholder: 'market.id.placeholder',
    type: HTML5InputTypes.SELECT,
    translatable: false,
    options: getMarkets(),
  })
  @uilayoutprop(1)
  @uilistprop('title')
  @uionrender(async (instance: unknown) => await renderMakets<any>(instance))
  marketId!: string;

  @column()
  //@gtin()
  @required()
  productCode!: string;

  //@cache()
  @column()
  @minlength(2)
  @maxlength(2)
  @description("Two-letter national code (ISO format) representing the market's country.")
  @uielement('ngx-decaf-crud-field', {
    label: 'market.nationalCode.label',
    placeholder: 'market.nationalCode.placeholder',
  })
  @uilayoutprop(1)
  @uilistprop('description')
  nationalCode?: string;

  //@cache()
  @column()
  @description('Name of the Marketing Authorization Holder (MAH).')
  @uielement('ngx-decaf-crud-field', {
    label: 'market.mahName.label',
    placeholder: 'market.mahName.placeholder',
  })
  @uilayoutprop(1)
  @uilistprop('info')
  mahName?: string;

  //@cache()
  @column()
  @description('Name of the legal entity responsible for the product in this market.')
  @uielement('ngx-decaf-crud-field', {
    label: 'market.legalEntityName.label',
    placeholder: 'market.legalEntityName.placeholder',
  })
  @uilayoutprop(1)
  legalEntityName?: string;

  //@cache()
  @column()
  @description('Address of the Marketing Authorization Holder or responsible legal entity.')
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
