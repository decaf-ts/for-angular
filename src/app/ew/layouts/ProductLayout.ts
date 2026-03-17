import { model, Model, ModelArg } from '@decaf-ts/decorator-validation';
import {
  ComponentEventNames,
  TransactionHooks,
  uichild,
  uihandlers,
  uilayout,
  uilayoutprop,
  UIMediaBreakPoints
} from '@decaf-ts/ui-decorators';
import { LayoutComponent } from 'src/lib/components';
import { Product } from '../fabric';
import { ProductHandler } from '../fabric/handlers/ProductHandler';
import { EpiLayout } from './EpiLayout';

@uilayout('ngx-decaf-crud-form', true, 1, {
  borders: true,
  breakpoint: UIMediaBreakPoints.XLARGE,
} as Partial<LayoutComponent>)
@uihandlers({
  [ComponentEventNames.Submit]: ProductHandler,
  [TransactionHooks.BeforeUpdate]: ProductHandler,
  [TransactionHooks.BeforeCreate]: ProductHandler,
})
@model()
export class ProductLayout extends Model {
  @uichild(Product.name, 'ngx-decaf-fieldset', {
    borders: false,
    required: true,
    breakpoint: UIMediaBreakPoints.XLARGE,
    ordenable: false,
    pk: 'productCode',
  })
  @uilayoutprop(2)
  product!: Product;

  @uichild(EpiLayout.name, 'app-switcher', {
    type: 'column',
  })
  @uilayoutprop(1)
  epi!: EpiLayout;

  // eslint-disable-next-line @typescript-eslint/no-useless-constructor
  constructor(args?: ModelArg<ProductLayout>) {
    super(args);
  }
}
