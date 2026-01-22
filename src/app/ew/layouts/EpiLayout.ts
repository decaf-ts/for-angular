import { list, model, Model, ModelArg } from '@decaf-ts/decorator-validation';
import { Condition } from '@decaf-ts/core';
import { uichild, uimodel, uionrender } from '@decaf-ts/ui-decorators';
import { FieldsetComponent } from 'src/lib/components';
import { getDocumentProperties, ProductEpiHandler } from '../handlers/ProductEpiHandler';

import { ProductStrength } from '../fabric/ProductStrength';
import { Leaflet } from '../fabric/Leaflet';
import { ProductMarket } from '../fabric/ProductMarket';

// import { ProductStrength, Leaflet, ProductMarket } from "@pharmaledgerassoc/ptp-toolkit/shared";

const filter = Condition.attribute<Leaflet>('productCode');
const commonProps = {
  borders: false,
  required: false,
  ordenable: false,
  editable: false,
  multiple: true,
  filter,
};
@uimodel('ngx-decaf-crud-form', {})
@model()
export class EpiLayout extends Model {
  @uichild(Leaflet.name, 'ngx-decaf-list', getDocumentProperties('productCode'))
  @uionrender(() => ProductEpiHandler)
  document!: Leaflet;

  @list(ProductStrength, 'Array')
  @uichild(
    ProductStrength.name,
    'ngx-decaf-fieldset',
    {
      title: 'product.strengths.label',
      showTitle: false,
      ...commonProps,
    },
    true,
  )
  @uionrender(() => ProductEpiHandler)
  strengths!: ProductStrength;

  @list(ProductMarket, 'Array')
  @uichild(
    ProductMarket.name,
    'ngx-decaf-fieldset',
    {
      title: 'product.markets.label',
      showTitle: false,
      ...commonProps,
    } as Partial<FieldsetComponent>,
    true,
  )
  @uionrender(() => ProductEpiHandler)
  markets!: ProductMarket;

  // eslint-disable-next-line @typescript-eslint/no-useless-constructor
  constructor(args?: ModelArg<EpiLayout>) {
    super(args);
  }
}
