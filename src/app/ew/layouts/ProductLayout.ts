import { model, Model, ModelArg } from '@decaf-ts/decorator-validation';
import {
  uichild,
  uilayout,
  uilayoutprop,
  uilistmodel,
  UIMediaBreakPoints,
} from '@decaf-ts/ui-decorators';
import { EpiLayout } from '../layouts/EpiLayout';
import { FieldsetComponent, LayoutComponent } from 'src/lib/components';
import { Product } from '../models/Product';

@uilistmodel('ngx-decaf-list-item', { icon: 'cafe-outline' })
@uilayout('ngx-decaf-crud-form', true, 1, {
  borders: true,
  breakpoint: UIMediaBreakPoints.XLARGE,
} as Partial<LayoutComponent>)
@model()
export class ProductLayout extends Model {

  @uichild(Product.name, 'ngx-decaf-fieldset', {
    title: 'product.section.details.title',
    borders: false,
    required: true,
    breakpoint: UIMediaBreakPoints.XLARGE,
    ordenable: false,
  } as Partial<FieldsetComponent>)
  @uilayoutprop(2)
  product!: Product;

  @uichild(EpiLayout.name, 'app-switcher', {})
  @uilayoutprop(1)
  epi!: EpiLayout;

  // eslint-disable-next-line @typescript-eslint/no-useless-constructor
  constructor(args?: ModelArg<ProductLayout>) {
    super(args);
  }
}
