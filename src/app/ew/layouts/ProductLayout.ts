import { model, Model, ModelArg } from '@decaf-ts/decorator-validation';
import { pk } from '@decaf-ts/core';
import {
  uichild,
  uilayout,
  uilayoutprop,
  uilistmodel,
  uipageprop,
} from '@decaf-ts/ui-decorators';
import { EpiLayout } from '../layouts/EpiLayout';
import { FieldsetComponent, LayoutComponent } from 'src/lib/components';
import { Product } from '../models/Product';

@uilistmodel('ngx-decaf-list-item', { icon: 'cafe-outline' })
@uilayout('ngx-decaf-crud-form', true, 1, {
  borders: true,
  breakpoint: 'xlarge',
} as LayoutComponent)
@model()
export class ProductLayout extends Model {
  @uipageprop(1)
  @uichild(Product.name, 'ngx-decaf-fieldset', {
    title: 'product.section.details.title',
    borders: false,
    required: true,
    rows: 1,
    cols: 2,
    breakpoint: 'xlarge',
    ordenable: false,
  } as Partial<FieldsetComponent>)
  @uilayoutprop(2)
  product!: Product;

  @uilayoutprop(1)
  @uichild(EpiLayout.name, 'app-switcher', {})
  epi!: EpiLayout;

  // eslint-disable-next-line @typescript-eslint/no-useless-constructor
  constructor(args?: ModelArg<ProductLayout>) {
    super(args);
  }
}
