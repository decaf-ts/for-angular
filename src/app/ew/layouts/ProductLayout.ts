import { model, Model, ModelArg } from '@decaf-ts/decorator-validation';
import {
  uichild,
  uihandlers,
  uilayout,
  uilayoutprop,
  uilistmodel,
  UIMediaBreakPoints,
} from '@decaf-ts/ui-decorators';
import { EpiLayout } from '../layouts/EpiLayout';
import { FieldsetComponent, LayoutComponent } from 'src/lib/components';
import { Product } from '../models/Product';
import { ProductLayoutHandler } from '../handlers/ProductLayoutHandler';
import { ComponentEventNames } from 'src/lib/engine';

@uilistmodel('ngx-decaf-list-item', { icon: 'cafe-outline' })
@uilayout('ngx-decaf-crud-form', true, 1, {
  borders: true,
  breakpoint: UIMediaBreakPoints.XLARGE,
} as Partial<LayoutComponent>)
@model()
// @uihandlers({[ComponentEventNames.SUBMIT]: ProductLayoutHandler }) // overriding default submit handler
export class ProductLayout extends Model {

  @uilayoutprop(2)
  @uichild(Product.name, 'ngx-decaf-fieldset', {
    title: 'product.section.details.title',
    borders: false,
    required: true,
    breakpoint: UIMediaBreakPoints.XLARGE,
    ordenable: false,
  } as Partial<FieldsetComponent>)
  product!: Product;

  @uilayoutprop(1)
  @uichild(EpiLayout.name, 'app-switcher', {})
  epi!: EpiLayout;

  // eslint-disable-next-line @typescript-eslint/no-useless-constructor
  constructor(args?: ModelArg<ProductLayout>) {
    super(args);
  }
}
// {
//   product: productCode, ...
//   epi: {
//     ...
//   }
// }
// {
//   productCode,
//   ...
// }
