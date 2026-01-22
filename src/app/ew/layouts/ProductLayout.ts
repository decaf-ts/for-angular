import { model, Model, ModelArg } from '@decaf-ts/decorator-validation';
import {
  uichild,
  uihandlers,
  uilayout,
  uilayoutprop,
  UIMediaBreakPoints,
  ComponentEventNames,
  TransactionHooks,
} from '@decaf-ts/ui-decorators';
import { LayoutComponent } from 'src/lib/components';
import { EpiLayout } from './EpiLayout';
import { Product } from '../fabric';
import { ProductHandler } from '../handlers/ProductHandler';

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
    title: 'product.section.details.title',
    borders: false,
    required: true,
    breakpoint: UIMediaBreakPoints.XLARGE,
    ordenable: false,
  })
  @uilayoutprop(2)
  product!: Product;

  @uichild(EpiLayout.name, 'app-switcher', {
    type: 'column',
  })
  @uilayoutprop(1)
  epi!: EpiLayout;

  // @uichild(Batch.name, 'ngx-decaf-fieldset', {
  //   title: 'product.section.batch.title',
  //   borders: false,
  //   required: false,
  //   breakpoint: UIMediaBreakPoints.XLARGE,
  //   ordenable: false,
  //   multiple: true,
  // } as Partial<FieldsetComponent>)
  // @uilayoutprop(3)
  // @hideOn(OperationKeys.CREATE, OperationKeys.UPDATE)
  // batch!: Product;

  // eslint-disable-next-line @typescript-eslint/no-useless-constructor
  constructor(args?: ModelArg<ProductLayout>) {
    super(args);
  }
}
